import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, Test, TestAttempt, StudentAnswer, Question } from '../db';
import { GraduationCap, CheckCircle, XCircle, MinusCircle, ArrowLeft, Award, Target, TrendingUp } from 'lucide-react';

export default function TestResult() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState<Test | null>(null);
  const [attempt, setAttempt] = useState<TestAttempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);

  useEffect(() => {
    loadResult();
  }, []);

  const loadResult = async () => {
    if (!user || !attemptId) { navigate('/student'); return; }

    const att = await db.testAttempts.get(parseInt(attemptId));
    if (!att || att.studentId !== user.id) { navigate('/student'); return; }

    const test = await db.tests.get(att.testId);
    if (!test) { navigate('/student'); return; }

    // Check if results should be shown
    if (!test.showResultImmediately && att.status !== 'submitted') {
      navigate('/student');
      return;
    }

    const questions = await db.questions.where('testId').equals(test.id!).sortBy('order');
    const studentAnswers = await db.studentAnswers.where('attemptId').equals(att.id!).toArray();

    setTest(test);
    setAttempt(att);
    setQuestions(questions);
    setAnswers(studentAnswers);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!test || !attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Result not found.</p>
      </div>
    );
  }

  const getAnswerForQuestion = (questionId: number) => answers.find(a => a.questionId === questionId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/student" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Superior Test</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Result Summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8 mb-6">
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              attempt.percentage >= 60 ? 'bg-green-100' : attempt.percentage >= 40 ? 'bg-amber-100' : 'bg-red-100'
            }`}>
              <Award className={`w-10 h-10 ${
                attempt.percentage >= 60 ? 'text-green-600' : attempt.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
              }`} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
            <p className="text-gray-500 mt-1">Attempt #{attempt.attemptNumber} · {new Date(attempt.submittedAt || attempt.startedAt).toLocaleDateString()}</p>
          </div>

          {/* Score Display */}
          <div className="text-center mb-8">
            <div className={`text-5xl font-bold ${
              attempt.percentage >= 60 ? 'text-green-600' : attempt.percentage >= 40 ? 'text-amber-600' : 'text-red-600'
            }`}>
              {attempt.percentage}%
            </div>
            <p className="text-gray-600 mt-2">{attempt.obtainedMarks} / {attempt.totalMarks} marks</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{attempt.correctCount}</div>
              <div className="text-xs text-green-600">Correct</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{attempt.wrongCount}</div>
              <div className="text-xs text-red-600">Wrong</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <MinusCircle className="w-6 h-6 text-gray-500 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-700">{attempt.unansweredCount}</div>
              <div className="text-xs text-gray-600">Unanswered</div>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-xl">
              <Target className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-indigo-700">{questions.length}</div>
              <div className="text-xs text-indigo-600">Total</div>
            </div>
          </div>

          {test.negativeMarking > 0 && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Negative marking: -{test.negativeMarking} per wrong answer
            </p>
          )}
        </div>

        {/* Detailed Answers */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Detailed Review</h2>
          <div className="space-y-4">
            {questions.map((q, index) => {
              const studentAnswer = getAnswerForQuestion(q.id!);
              const selectedAnswer = studentAnswer?.selectedAnswer || '';
              const isCorrect = selectedAnswer === q.correctAnswer;
              const isUnanswered = !selectedAnswer;

              return (
                <div key={q.id} className={`p-4 rounded-xl border ${
                  isUnanswered ? 'border-gray-200 bg-gray-50' :
                  isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      isUnanswered ? 'bg-gray-200' : isCorrect ? 'bg-green-200' : 'bg-red-200'
                    }`}>
                      {isUnanswered ? <MinusCircle className="w-3.5 h-3.5 text-gray-500" /> :
                       isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-green-700" /> :
                       <XCircle className="w-3.5 h-3.5 text-red-700" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        Q{index + 1}. {q.questionText}
                      </p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {[
                          { key: 'A', text: q.optionA },
                          { key: 'B', text: q.optionB },
                          { key: 'C', text: q.optionC },
                          { key: 'D', text: q.optionD }
                        ].map(opt => (
                          <div key={opt.key} className={`text-sm px-2 py-1 rounded ${
                            opt.key === q.correctAnswer ? 'bg-green-200 text-green-800 font-medium' :
                            opt.key === selectedAnswer && !isCorrect ? 'bg-red-200 text-red-800 line-through' :
                            'text-gray-600'
                          }`}>
                            {opt.key}) {opt.text}
                            {opt.key === q.correctAnswer && ' ✓'}
                            {opt.key === selectedAnswer && !isCorrect && ' (your answer)'}
                          </div>
                        ))}
                      </div>
                      {!isUnanswered && !isCorrect && (
                        <p className="text-xs text-red-600 mt-1">
                          Your answer: {selectedAnswer} | Correct: {q.correctAnswer}
                        </p>
                      )}
                      {isUnanswered && (
                        <p className="text-xs text-gray-500 mt-1">Not answered | Correct: {q.correctAnswer}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-6 text-center">
          <Link to="/student" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
