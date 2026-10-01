import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, Test, Question, TestAttempt, StudentAnswer } from '../db';
import { submitTest, formatTimeRemaining, shuffleArray } from '../utils';
import { Clock, Wifi, WifiOff, AlertTriangle, Maximize, Minimize } from 'lucide-react';

export default function TestTaking() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0, total: 0 });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const MAX_TAB_SWITCHES = 5;

  useEffect(() => {
    initializeTest();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        const newCount = tabSwitchCount + 1;
        setTabSwitchCount(newCount);
        if (newCount >= MAX_TAB_SWITCHES) {
          handleAutoSubmit();
        } else {
          setShowWarning(true);
          setTimeout(() => setShowWarning(false), 5000);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [tabSwitchCount]);

  useEffect(() => {
    const handleContextMenu = (e: Event) => e.preventDefault();
    const handleCopy = (e: Event) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const initializeTest = async () => {
    if (!user || !attemptId) { navigate('/student'); return; }

    // Check if this is a test ID (starting new attempt) or attempt ID
    const testId = parseInt(attemptId);
    const test = await db.tests.get(testId);
    
    if (!test) {
      // Maybe it's an attempt ID - check if resuming
      const existingAttempt = await db.testAttempts.get(testId);
      if (existingAttempt && existingAttempt.studentId === user.id && existingAttempt.status === 'in_progress') {
        const test = await db.tests.get(existingAttempt.testId);
        if (test) {
          setTest(test);
          setAttempt(existingAttempt);
          const questions = await db.questions.where('testId').equals(test.id!).sortBy('order');
          const orderedQuestions = test.randomizeQuestions ? shuffleArray(questions) : questions;
          setQuestions(orderedQuestions);
          
          // Load saved answers
          const savedAnswers = await db.studentAnswers.where('attemptId').equals(existingAttempt.id!).toArray();
          const answerMap: { [key: number]: string } = {};
          savedAnswers.forEach(a => { answerMap[a.questionId] = a.selectedAnswer; });
          setAnswers(answerMap);
          
          startTimer(test, existingAttempt);
          startAutoSave(existingAttempt.id!);
          setLoading(false);
          return;
        }
      }
      navigate('/student');
      return;
    }

    // Validate test availability
    const now = new Date();
    const startTime = new Date(test.startTime);
    const endTime = new Date(test.endTime);

    if (now < startTime) {
      alert('This test has not started yet.');
      navigate('/student');
      return;
    }
    if (now > endTime) {
      alert('This test has expired.');
      navigate('/student');
      return;
    }

    // Check attempts
    const existingAttempts = await db.testAttempts
      .where('testId').equals(test.id!)
      .filter(a => a.studentId === user.id)
      .toArray();

    if (existingAttempts.length >= test.maxAttempts) {
      alert('You have reached the maximum number of attempts for this test.');
      navigate('/student');
      return;
    }

    // Check for in-progress attempt
    const inProgress = existingAttempts.find(a => a.status === 'in_progress');
    if (inProgress) {
      setTest(test);
      setAttempt(inProgress);
      const questions = await db.questions.where('testId').equals(test.id!).sortBy('order');
      const orderedQuestions = test.randomizeQuestions ? shuffleArray(questions) : questions;
      setQuestions(orderedQuestions);
      
      const savedAnswers = await db.studentAnswers.where('attemptId').equals(inProgress.id!).toArray();
      const answerMap: { [key: number]: string } = {};
      savedAnswers.forEach(a => { answerMap[a.questionId] = a.selectedAnswer; });
      setAnswers(answerMap);
      
      startTimer(test, inProgress);
      startAutoSave(inProgress.id!);
      setLoading(false);
      return;
    }

    // Create new attempt
    const newAttemptId = await db.testAttempts.add({
      testId: test.id!,
      studentId: user.id!,
      attemptNumber: existingAttempts.length + 1,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
      totalMarks: 0,
      obtainedMarks: 0,
      percentage: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      tabSwitchCount: 0
    });

    const newAttempt = await db.testAttempts.get(newAttemptId as number);
    setTest(test);
    setAttempt(newAttempt!);

    const questions = await db.questions.where('testId').equals(test.id!).sortBy('order');
    let orderedQuestions = test.randomizeQuestions ? shuffleArray(questions) : questions;
    
    if (test.randomizeOptions) {
      orderedQuestions = orderedQuestions.map(q => {
        const options = [
          { key: 'A', text: q.optionA },
          { key: 'B', text: q.optionB },
          { key: 'C', text: q.optionC },
          { key: 'D', text: q.optionD }
        ];
        const shuffled = shuffleArray(options);
        const newCorrectIndex = shuffled.findIndex(o => o.key === q.correctAnswer);
        const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex];
        return {
          ...q,
          optionA: shuffled[0].text,
          optionB: shuffled[1].text,
          optionC: shuffled[2].text,
          optionD: shuffled[3].text,
          correctAnswer: newCorrectAnswer
        };
      });
    }
    
    setQuestions(orderedQuestions);
    startTimer(test, newAttempt!);
    startAutoSave(newAttemptId as number);
    setLoading(false);
  };

  const startTimer = (test: Test, att: TestAttempt) => {
    const updateTimer = () => {
      const remaining = formatTimeRemaining(test.endTime, test.duration, att.startedAt);
      setTimeRemaining(remaining);
      if (remaining.total <= 0) {
        handleAutoSubmit();
      }
    };
    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
  };

  const startAutoSave = (attId: number) => {
    saveTimerRef.current = setInterval(async () => {
      if (!isOnline) return;
      await saveAnswersToDB(attId);
    }, 10000); // Auto-save every 10 seconds
  };

  const saveAnswersToDB = async (attId: number) => {
    for (const [questionId, answer] of Object.entries(answers)) {
      const qId = parseInt(questionId);
      const existing = await db.studentAnswers.where('attemptId').equals(attId).and(a => a.questionId === qId).first();
      if (existing) {
        await db.studentAnswers.update(existing.id!, { selectedAnswer: answer, savedAt: new Date().toISOString() });
      } else {
        await db.studentAnswers.add({
          attemptId: attId,
          questionId: qId,
          selectedAnswer: answer,
          isCorrect: false,
          marksObtained: 0,
          savedAt: new Date().toISOString()
        });
      }
    }
    // Also save to localStorage as backup
    localStorage.setItem(`test_answers_${attId}`, JSON.stringify(answers));
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    // Save to localStorage immediately
    if (attempt) {
      localStorage.setItem(`test_answers_${attempt.id}`, JSON.stringify(newAnswers));
    }
  };

  const handleSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    
    try {
      await saveAnswersToDB(attempt.id!);
      await submitTest(attempt.id!);
      
      // Update tab switch count
      await db.testAttempts.update(attempt.id!, { tabSwitchCount });
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      
      // Clean up localStorage
      localStorage.removeItem(`test_answers_${attempt.id}`);
      
      navigate(`/result/${attempt.id}`);
    } catch (e) {
      console.error('Submit error:', e);
      alert('Error submitting test. Please try again.');
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (!attempt || submitting) return;
    setSubmitting(true);
    
    try {
      await saveAnswersToDB(attempt.id!);
      await db.testAttempts.update(attempt.id!, { status: 'auto_submitted', tabSwitchCount });
      await submitTest(attempt.id!);
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      localStorage.removeItem(`test_answers_${attempt.id}`);
      
      navigate(`/result/${attempt.id}`);
    } catch (e) {
      console.error('Auto-submit error:', e);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (!test || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Test not found or access denied.</p>
          <button onClick={() => navigate('/student')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Back to Dashboard</button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.values(answers).filter(a => a).length;

  return (
    <div className="min-h-screen bg-gray-50 select-none" onCopy={e => e.preventDefault()}>
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-gray-900 text-sm sm:text-base">{test.title}</h1>
            <p className="text-xs text-gray-500">{answeredCount}/{questions.length} answered</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Status */}
            <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span className="hidden sm:inline">{isOnline ? 'Connected' : 'Offline'}</span>
            </div>
            {/* Timer */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold ${
              timeRemaining.total < 300000 ? 'bg-red-50 text-red-700 animate-pulse' : 'bg-indigo-50 text-indigo-700'
            }`}>
              <Clock className="w-4 h-4" />
              {String(timeRemaining.minutes).padStart(2, '0')}:{String(timeRemaining.seconds).padStart(2, '0')}
            </div>
            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switch Warning */}
      {showWarning && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-sm font-medium">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          Warning: Tab switch detected! ({tabSwitchCount}/{MAX_TAB_SWITCHES}) — Test will auto-submit after {MAX_TAB_SWITCHES} warnings.
        </div>
      )}

      {/* Offline Warning */}
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
          <WifiOff className="w-4 h-4 inline mr-1" />
          Connection lost. Your answers are saved locally and will sync when connection is restored.
        </div>
      )}

      {/* Questions */}
      <div className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="space-y-6">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white border border-gray-100 rounded-xl p-5 sm:p-6">
              <p className="font-medium text-gray-900 mb-4">
                <span className="text-indigo-600 mr-2">Q{index + 1}.</span>
                {q.questionText}
                <span className="text-xs text-gray-400 ml-2">[{test.marksPerQuestion} mark{test.marksPerQuestion !== 1 ? 's' : ''}]</span>
              </p>
              <div className="space-y-2">
                {[
                  { key: 'A', text: q.optionA },
                  { key: 'B', text: q.optionB },
                  { key: 'C', text: q.optionC },
                  { key: 'D', text: q.optionD }
                ].map(option => (
                  <label
                    key={option.key}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                      answers[q.id!] === option.key
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={option.key}
                      checked={answers[q.id!] === option.key}
                      onChange={() => handleAnswerSelect(q.id!, option.key)}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="font-medium text-sm w-6">{option.key})</span>
                    <span className="text-sm">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-3 px-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{answeredCount}</span>/{questions.length} answered
            {test.negativeMarking > 0 && <span className="ml-2 text-red-500 text-xs">Negative marking: -{test.negativeMarking}</span>}
          </div>
          <button
            onClick={() => setShowConfirmSubmit(true)}
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Test'}
          </button>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Submit Test?</h3>
            <p className="text-gray-600 text-sm mb-1">You have answered {answeredCount} out of {questions.length} questions.</p>
            {answeredCount < questions.length && (
              <p className="text-amber-600 text-sm mb-4">{questions.length - answeredCount} questions are unanswered.</p>
            )}
            <p className="text-gray-500 text-xs mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">Continue Test</button>
              <button onClick={() => { setShowConfirmSubmit(false); handleSubmit(); }} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
