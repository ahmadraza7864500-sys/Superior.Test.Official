import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, Test, Question, ClassRecord, SectionRecord, Subject, TeacherAssignment, TestAttempt, StudentAnswer, QuestionBankItem, User as UserType, addAuditLog, addNotification } from '../db';
import { parseMCQText, ParsedQuestion, formatDateTime, formatDate, exportToCSV } from '../utils';
import { GraduationCap, LogOut, LayoutDashboard, Plus, FileText, BookOpen, BarChart3, Bell, User, CheckCircle, Clock, Edit, Trash2, Eye, Copy, Save, Send, AlertTriangle, Search } from 'lucide-react';

type Tab = 'overview' | 'tests' | 'create' | 'questionbank' | 'results' | 'notifications' | 'profile';

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [students, setStudents] = useState<UserType[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);

  // Test creation state
  const [creatingTest, setCreatingTest] = useState(false);
  const [mcqText, setMcqText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<any[]>([]);
  const [testForm, setTestForm] = useState({
    title: '', subjectId: '', classId: '', sectionId: '', duration: 60,
    marksPerQuestion: 1, negativeMarking: 0, maxAttempts: 1,
    randomizeQuestions: false, randomizeOptions: false, showResultImmediately: true,
    startTime: '', endTime: ''
  });
  const [editingTestId, setEditingTestId] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const myAssignments = await db.teacherAssignments.where('teacherId').equals(user.id!).toArray();
    setAssignments(myAssignments);

    const myTests = await db.tests.where('createdBy').equals(user.id!).toArray();
    setTests(myTests);

    setSubjects(await db.subjects.toArray());
    setClasses(await db.classes.toArray());
    setSections(await db.sections.toArray());

    const allAttempts = await db.testAttempts.toArray();
    const myTestIds = myTests.map(t => t.id!);
    setAttempts(allAttempts.filter(a => myTestIds.includes(a.testId)));

    const allStudents = await db.users.where('role').equals('student').toArray();
    const myClassSectionPairs = myAssignments.map(a => `${a.classId}-${a.sectionId}`);
    setStudents(allStudents.filter(s => myClassSectionPairs.includes(`${s.classId}-${s.sectionId}`)));

    const qb = await db.questionBank.where('teacherId').equals(user.id!).toArray();
    setQuestionBank(qb);

    const notifs = await db.notifications.where('userId').equals(user.id!).reverse().sortBy('createdAt');
    setNotifications(notifs.slice(0, 50));

    setLoading(false);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };
  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || 'Unknown';
  const getClassName = (id: number) => classes.find(c => c.id === id)?.name || 'Unknown';
  const getSectionName = (id: number) => sections.find(s => s.id === id)?.name || 'Unknown';

  const handleParseMCQ = () => {
    const { questions, errors } = parseMCQText(mcqText);
    setParsedQuestions(questions);
    setParseErrors(errors);
  };

  const handleSaveTest = async (status: 'draft' | 'upcoming') => {
    if (!user) return;
    if (parsedQuestions.length === 0) { alert('Please parse questions first.'); return; }
    if (!testForm.title || !testForm.subjectId || !testForm.classId || !testForm.sectionId || !testForm.startTime || !testForm.endTime) {
      alert('Please fill in all required fields.'); return;
    }

    const now = new Date().toISOString();
    let testId: number;

    if (editingTestId) {
      await db.tests.update(editingTestId, {
        title: testForm.title,
        subjectId: parseInt(testForm.subjectId),
        classId: parseInt(testForm.classId),
        sectionId: parseInt(testForm.sectionId),
        duration: testForm.duration,
        marksPerQuestion: testForm.marksPerQuestion,
        negativeMarking: testForm.negativeMarking,
        maxAttempts: testForm.maxAttempts,
        randomizeQuestions: testForm.randomizeQuestions,
        randomizeOptions: testForm.randomizeOptions,
        showResultImmediately: testForm.showResultImmediately,
        startTime: testForm.startTime,
        endTime: testForm.endTime,
        status,
        updatedAt: now
      });
      testId = editingTestId;
      await db.questions.where('testId').equals(testId).delete();
    } else {
      testId = await db.tests.add({
        title: testForm.title,
        subjectId: parseInt(testForm.subjectId),
        classId: parseInt(testForm.classId),
        sectionId: parseInt(testForm.sectionId),
        createdBy: user.id!,
        status,
        startTime: testForm.startTime,
        endTime: testForm.endTime,
        duration: testForm.duration,
        marksPerQuestion: testForm.marksPerQuestion,
        negativeMarking: testForm.negativeMarking,
        maxAttempts: testForm.maxAttempts,
        randomizeQuestions: testForm.randomizeQuestions,
        randomizeOptions: testForm.randomizeOptions,
        showResultImmediately: testForm.showResultImmediately,
        isLocked: status === 'upcoming',
        createdAt: now,
        updatedAt: now
      }) as number;
    }

    // Save questions
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      await db.questions.add({
        testId,
        questionText: q.text,
        optionA: q.options.A,
        optionB: q.options.B,
        optionC: q.options.C,
        optionD: q.options.D,
        correctAnswer: q.correctAnswer,
        order: i + 1
      });

      // Also save to question bank
      await db.questionBank.add({
        teacherId: user.id!,
        subjectId: parseInt(testForm.subjectId),
        classId: parseInt(testForm.classId),
        questionText: q.text,
        optionA: q.options.A,
        optionB: q.options.B,
        optionC: q.options.C,
        optionD: q.options.D,
        correctAnswer: q.correctAnswer,
        createdAt: now
      });
    }

    // Notify students
    if (status === 'upcoming') {
      const classStudents = students.filter(s => s.classId === parseInt(testForm.classId) && s.sectionId === parseInt(testForm.sectionId));
      for (const student of classStudents) {
        await addNotification(student.id!, 'New Test Assigned', `"${testForm.title}" has been assigned to your class.`, 'test_assigned');
      }
    }

    await addAuditLog(user.id!, user.fullName, 'teacher', status === 'draft' ? 'Save Draft' : 'Publish Test', `Test: ${testForm.title}`);

    // Reset
    setCreatingTest(false);
    setMcqText('');
    setParsedQuestions([]);
    setParseErrors([]);
    setEditingTestId(null);
    setPreviewMode(false);
    setTestForm({ title: '', subjectId: '', classId: '', sectionId: '', duration: 60, marksPerQuestion: 1, negativeMarking: 0, maxAttempts: 1, randomizeQuestions: false, randomizeOptions: false, showResultImmediately: true, startTime: '', endTime: '' });
    setActiveTab('tests');
    loadData();
  };

  const handleDeleteTest = async (testId: number) => {
    if (!confirm('Are you sure you want to delete this test? This cannot be undone.')) return;
    await db.questions.where('testId').equals(testId).delete();
    await db.tests.delete(testId);
    await addAuditLog(user!.id!, user!.fullName, 'teacher', 'Delete Test', `Test ID: ${testId}`);
    loadData();
  };

  const handleEditTest = async (test: Test) => {
    if (test.isLocked) { alert('This test is locked and cannot be edited.'); return; }
    setEditingTestId(test.id!);
    setTestForm({
      title: test.title,
      subjectId: test.subjectId.toString(),
      classId: test.classId.toString(),
      sectionId: test.sectionId.toString(),
      duration: test.duration,
      marksPerQuestion: test.marksPerQuestion,
      negativeMarking: test.negativeMarking,
      maxAttempts: test.maxAttempts,
      randomizeQuestions: test.randomizeQuestions,
      randomizeOptions: test.randomizeOptions,
      showResultImmediately: test.showResultImmediately,
      startTime: test.startTime,
      endTime: test.endTime
    });
    const questions = await db.questions.where('testId').equals(test.id!).sortBy('order');
    setParsedQuestions(questions.map((q, i) => ({
      number: i + 1,
      text: q.questionText,
      options: { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD },
      correctAnswer: q.correctAnswer
    })));
    setCreatingTest(true);
    setActiveTab('create');
  };

  const handleExportResults = (testId: number) => {
    const testAttempts = attempts.filter(a => a.testId === testId && a.status === 'submitted');
    const data = testAttempts.map(a => {
      const student = students.find(s => s.id === a.studentId);
      return {
        'Student Name': student?.fullName || 'Unknown',
        'Roll Number': student?.rollNumber || '',
        'Email': student?.email || '',
        'Attempt': a.attemptNumber,
        'Obtained Marks': a.obtainedMarks,
        'Total Marks': a.totalMarks,
        'Percentage': a.percentage,
        'Correct': a.correctCount,
        'Wrong': a.wrongCount,
        'Unanswered': a.unansweredCount,
        'Submitted At': a.submittedAt ? formatDateTime(a.submittedAt) : ''
      };
    });
    const test = tests.find(t => t.id === testId);
    exportToCSV(data, `results_${test?.title || 'test'}_${Date.now()}`);
  };

  const myAssignedClasses = [...new Set(assignments.map(a => a.classId))];

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard },
    { id: 'tests' as Tab, label: 'My Tests', icon: FileText },
    { id: 'create' as Tab, label: 'Create Test', icon: Plus },
    { id: 'questionbank' as Tab, label: 'Question Bank', icon: BookOpen },
    { id: 'results' as Tab, label: 'Results', icon: BarChart3 },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
    { id: 'profile' as Tab, label: 'Profile', icon: User },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const renderOverview = () => {
    const draftTests = tests.filter(t => t.status === 'draft');
    const activeTests = tests.filter(t => t.status === 'active' || t.status === 'upcoming');
    const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'expired');
    const totalAttempts = attempts.filter(a => a.status === 'submitted');

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Teacher Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-sm text-gray-500">Draft Tests</div>
            <div className="text-3xl font-bold text-amber-600 mt-1">{draftTests.length}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-sm text-gray-500">Active/Upcoming</div>
            <div className="text-3xl font-bold text-green-600 mt-1">{activeTests.length}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-sm text-gray-500">Completed</div>
            <div className="text-3xl font-bold text-blue-600 mt-1">{completedTests.length}</div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="text-sm text-gray-500">Total Submissions</div>
            <div className="text-3xl font-bold text-indigo-600 mt-1">{totalAttempts.length}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">My Assigned Classes</h3>
          {assignments.length === 0 ? (
            <p className="text-gray-500">No classes assigned yet. Contact the principal for assignments.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {assignments.map(a => (
                <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-medium text-gray-900">{getClassName(a.classId)} - {getSectionName(a.sectionId)}</p>
                  <p className="text-sm text-gray-600">{getSubjectName(a.subjectId)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTests = () => {
    const draftTests = tests.filter(t => t.status === 'draft');
    const upcomingTests = tests.filter(t => t.status === 'upcoming');
    const activeTests = tests.filter(t => t.status === 'active');
    const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'expired');

    const renderTestList = (testList: Test[], emptyMsg: string) => (
      testList.length === 0 ? (
        <p className="text-gray-500 py-4">{emptyMsg}</p>
      ) : (
        <div className="space-y-3">
          {testList.map(t => (
            <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{t.title}</h4>
                <p className="text-sm text-gray-500">{getSubjectName(t.subjectId)} · {getClassName(t.classId)}-{getSectionName(t.sectionId)} · {t.duration}min · {formatDateTime(t.startTime)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleEditTest(t)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteTest(t.id!)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )
    );

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Tests</h2>
          <button onClick={() => { setCreatingTest(true); setActiveTab('create'); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
            <Plus className="w-4 h-4" /> New Test
          </button>
        </div>
        <div className="space-y-6">
          <div><h3 className="font-semibold text-gray-700 mb-2">Drafts</h3>{renderTestList(draftTests, 'No draft tests.')}</div>
          <div><h3 className="font-semibold text-gray-700 mb-2">Upcoming</h3>{renderTestList(upcomingTests, 'No upcoming tests.')}</div>
          <div><h3 className="font-semibold text-gray-700 mb-2">Active</h3>{renderTestList(activeTests, 'No active tests.')}</div>
          <div><h3 className="font-semibold text-gray-700 mb-2">Completed</h3>{renderTestList(completedTests, 'No completed tests.')}</div>
        </div>
      </div>
    );
  };

  const renderCreateTest = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingTestId ? 'Edit Test' : 'Create Test'}</h2>

      {!parsedQuestions.length && !previewMode && (
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Test Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Title *</label>
                <input type="text" value={testForm.title} onChange={e => setTestForm({ ...testForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Enter test title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <select value={testForm.subjectId} onChange={e => setTestForm({ ...testForm, subjectId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <select value={testForm.classId} onChange={e => setTestForm({ ...testForm, classId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="">Select Class</option>
                  {myAssignedClasses.map(cId => <option key={cId} value={cId}>{getClassName(cId)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                <select value={testForm.sectionId} onChange={e => setTestForm({ ...testForm, sectionId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                  <option value="">Select Section</option>
                  {sections.filter(s => testForm.classId && s.classId === parseInt(testForm.classId)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date & Time *</label>
                <input type="datetime-local" value={testForm.startTime} onChange={e => setTestForm({ ...testForm, startTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date & Time *</label>
                <input type="datetime-local" value={testForm.endTime} onChange={e => setTestForm({ ...testForm, endTime: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                <input type="number" value={testForm.duration} onChange={e => setTestForm({ ...testForm, duration: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min="1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marks Per Question</label>
                <input type="number" value={testForm.marksPerQuestion} onChange={e => setTestForm({ ...testForm, marksPerQuestion: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min="0" step="0.5" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Negative Marking</label>
                <input type="number" value={testForm.negativeMarking} onChange={e => setTestForm({ ...testForm, negativeMarking: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min="0" step="0.25" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
                <input type="number" value={testForm.maxAttempts} onChange={e => setTestForm({ ...testForm, maxAttempts: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" min="1" />
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={testForm.randomizeQuestions} onChange={e => setTestForm({ ...testForm, randomizeQuestions: e.target.checked })} className="rounded border-gray-300" />
                Randomize Questions
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={testForm.randomizeOptions} onChange={e => setTestForm({ ...testForm, randomizeOptions: e.target.checked })} className="rounded border-gray-300" />
                Randomize Options
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={testForm.showResultImmediately} onChange={e => setTestForm({ ...testForm, showResultImmediately: e.target.checked })} className="rounded border-gray-300" />
                Show Result Immediately
              </label>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Paste MCQ Questions</h3>
            <p className="text-sm text-gray-500 mb-4">Paste your questions in the following format. The parser handles various formatting styles.</p>
            <textarea
              value={mcqText}
              onChange={e => setMcqText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
              placeholder={`1. What is the capital of France?\nA) London\nB) Paris\nC) Berlin\nD) Madrid\nCorrect Answer: B\n\n2. Which planet is closest to the Sun?\nA) Venus\nB) Earth\nC) Mercury\nD) Mars\nCorrect Answer: C`}
            />
            <button onClick={handleParseMCQ} className="mt-3 px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
              Parse Questions
            </button>
          </div>
        </div>
      )}

      {parseErrors.length > 0 && !parsedQuestions.length && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Parsing Errors</h4>
          {parseErrors.map((err, i) => (
            <div key={i} className="text-sm text-red-700 mb-2">
              <p className="font-medium">{err.message}</p>
              <p className="text-red-600">Expected: {err.expected}</p>
            </div>
          ))}
        </div>
      )}

      {parsedQuestions.length > 0 && !previewMode && (
        <div className="mt-6 bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Parsed Questions ({parsedQuestions.length})</h3>
            <div className="flex gap-2">
              <button onClick={() => { setParsedQuestions([]); setParseErrors([]); setMcqText(''); }} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Edit Text</button>
              <button onClick={() => setPreviewMode(true)} className="px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100">Preview Test</button>
            </div>
          </div>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {parsedQuestions.map((q, i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900">Q{i + 1}. {q.text}</p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {Object.entries(q.options).map(([key, val]) => (
                    <p key={key} className={`text-sm ${key === q.correctAnswer ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                      {key}) {val} {key === q.correctAnswer && '✓'}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => handleSaveTest('draft')} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm flex items-center gap-2">
              <Save className="w-4 h-4" /> Save as Draft
            </button>
            <button onClick={() => handleSaveTest('upcoming')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm flex items-center gap-2">
              <Send className="w-4 h-4" /> Publish Test
            </button>
          </div>
        </div>
      )}

      {previewMode && parsedQuestions.length > 0 && (
        <div className="mt-6 bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Preview: {testForm.title || 'Untitled Test'}</h3>
            <button onClick={() => setPreviewMode(false)} className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Back to Edit</button>
          </div>
          <div className="mb-4 text-sm text-gray-600">
            Duration: {testForm.duration} min · Marks/Question: {testForm.marksPerQuestion} · Negative: {testForm.negativeMarking}
          </div>
          <div className="space-y-6">
            {parsedQuestions.map((q, i) => (
              <div key={i} className="p-4 border border-gray-100 rounded-lg">
                <p className="font-medium text-gray-900 mb-3">{i + 1}. {q.text}</p>
                {Object.entries(q.options).map(([key, val]) => (
                  <label key={key} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs">{key}</div>
                    <span className="text-gray-700">{val}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={() => handleSaveTest('draft')} className="px-6 py-2.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm">Save as Draft</button>
            <button onClick={() => handleSaveTest('upcoming')} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">Publish Test</button>
          </div>
        </div>
      )}
    </div>
  );

  const renderQuestionBank = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Question Bank</h2>
      {questionBank.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No questions in your bank yet. Questions are automatically saved when you create tests.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Question</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Answer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {questionBank.map(q => (
                  <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 max-w-xs truncate">{q.questionText}</td>
                    <td className="px-4 py-3 text-gray-600">{getSubjectName(q.subjectId)}</td>
                    <td className="px-4 py-3 text-green-600 font-medium">{q.correctAnswer}</td>
                    <td className="px-4 py-3">
                      <button onClick={async () => { await db.questionBank.delete(q.id!); loadData(); }} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Results</h2>
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mr-2">Filter by Class:</label>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value ? parseInt(e.target.value as string) : '')} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="">All Classes</option>
          {myAssignedClasses.map(cId => <option key={cId} value={cId}>{getClassName(cId)}</option>)}
        </select>
      </div>
      {tests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tests created yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tests.filter(t => !selectedClass || t.classId === selectedClass).map(t => {
            const testAttempts = attempts.filter(a => a.testId === t.id && a.status === 'submitted');
            const avg = testAttempts.length > 0 ? Math.round(testAttempts.reduce((s, a) => s + a.percentage, 0) / testAttempts.length) : 0;
            return (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{t.title}</h4>
                    <p className="text-sm text-gray-500">{getSubjectName(t.subjectId)} · {getClassName(t.classId)}-{getSectionName(t.sectionId)}</p>
                  </div>
                  <button onClick={() => handleExportResults(t.id!)} className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Export CSV</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-gray-500">Submissions:</span> <span className="font-medium">{testAttempts.length}</span></div>
                  <div><span className="text-gray-500">Average:</span> <span className="font-medium">{avg}%</span></div>
                  <div><span className="text-gray-500">Highest:</span> <span className="font-medium">{testAttempts.length > 0 ? Math.max(...testAttempts.map(a => a.percentage)) : 0}%</span></div>
                  <div><span className="text-gray-500">Lowest:</span> <span className="font-medium">{testAttempts.length > 0 ? Math.min(...testAttempts.map(a => a.percentage)) : 0}%</span></div>
                </div>
                {testAttempts.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-100">
                        <th className="px-2 py-1 text-left text-gray-500">Student</th>
                        <th className="px-2 py-1 text-left text-gray-500">Roll</th>
                        <th className="px-2 py-1 text-left text-gray-500">Score</th>
                        <th className="px-2 py-1 text-left text-gray-500">%</th>
                      </tr></thead>
                      <tbody>
                        {testAttempts.slice(0, 10).map(a => {
                          const student = students.find(s => s.id === a.studentId);
                          return (
                            <tr key={a.id} className="border-b border-gray-50">
                              <td className="px-2 py-1">{student?.fullName || 'Unknown'}</td>
                              <td className="px-2 py-1">{student?.rollNumber || ''}</td>
                              <td className="px-2 py-1">{a.obtainedMarks}/{a.totalMarks}</td>
                              <td className="px-2 py-1">{a.percentage}%</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => (
            <div key={n.id} className={`p-4 rounded-xl border ${n.isRead ? 'bg-white border-gray-100' : 'bg-indigo-50 border-indigo-100'}`}>
              <h4 className="font-medium text-gray-900">{n.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              <p className="text-xs text-gray-400 mt-2">{formatDateTime(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderProfile = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile</h2>
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><span className="text-sm text-gray-500">Full Name</span><p className="font-medium text-gray-900">{user?.fullName}</p></div>
          <div><span className="text-sm text-gray-500">Email</span><p className="font-medium text-gray-900">{user?.email}</p></div>
          <div><span className="text-sm text-gray-500">Username</span><p className="font-medium text-gray-900">{user?.username}</p></div>
          <div><span className="text-sm text-gray-500">Role</span><p className="font-medium text-gray-900 capitalize">{user?.role}</p></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 hidden sm:block">Superior Test</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Teacher</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 hidden sm:block">{user?.fullName}</span>
              <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex overflow-x-auto gap-1 mb-6 pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'create') { setCreatingTest(true); setPreviewMode(false); } }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'tests' && renderTests()}
        {activeTab === 'create' && renderCreateTest()}
        {activeTab === 'questionbank' && renderQuestionBank()}
        {activeTab === 'results' && renderResults()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
}
