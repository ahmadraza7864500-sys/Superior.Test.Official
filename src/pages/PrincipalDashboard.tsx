import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, User as UserType, ClassRecord, SectionRecord, Subject, TeacherAssignment, Test, TestAttempt, AuditLog, addAuditLog, hashPassword, addNotification } from '../db';
import { formatDateTime, formatDate, exportToCSV } from '../utils';
import { GraduationCap, LogOut, LayoutDashboard, Users, UserCheck, BookOpen, FileText, BarChart3, Bell, Settings, ClipboardList, Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type Tab = 'overview' | 'students' | 'teachers' | 'classes' | 'subjects' | 'tests' | 'results' | 'reports' | 'audit' | 'notifications';

export default function PrincipalDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<UserType[]>([]);
  const [teachers, setTeachers] = useState<UserType[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Modals
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [showAddClass, setShowAddClass] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [teacherForm, setTeacherForm] = useState({ fullName: '', email: '', username: '', password: '', phone: '' });
  const [classForm, setClassForm] = useState({ name: '', academicYear: new Date().getFullYear().toString() });
  const [sectionForm, setSectionForm] = useState({ classId: '', name: '' });
  const [subjectForm, setSubjectForm] = useState({ name: '', category: '' });
  const [assignForm, setAssignForm] = useState({ teacherId: '', classId: '', sectionId: '', subjectId: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setStudents(await db.users.where('role').equals('student').toArray());
    setTeachers(await db.users.where('role').equals('teacher').toArray());
    setClasses(await db.classes.toArray());
    setSections(await db.sections.toArray());
    setSubjects(await db.subjects.toArray());
    setAssignments(await db.teacherAssignments.toArray());
    setTests(await db.tests.toArray());
    setAttempts(await db.testAttempts.toArray());
    const logs = await db.auditLogs.reverse().sortBy('timestamp');
    setAuditLogs(logs.slice(0, 100));
    const notifs = await db.notifications.where('userId').equals(user!.id!).reverse().sortBy('createdAt');
    setNotifications(notifs.slice(0, 50));
    setLoading(false);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };
  const getClassName = (id: number) => classes.find(c => c.id === id)?.name || 'Unknown';
  const getSectionName = (id: number) => sections.find(s => s.id === id)?.name || 'Unknown';
  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || 'Unknown';
  const getTeacherName = (id: number) => teachers.find(t => t.id === id)?.fullName || 'Unknown';

  const handleAddTeacher = async () => {
    setError('');
    if (!teacherForm.fullName || !teacherForm.email || !teacherForm.username || !teacherForm.password) {
      setError('Please fill in all required fields.'); return;
    }
    const existing = await db.users.where('email').equals(teacherForm.email).first();
    if (existing) { setError('Email already exists.'); return; }
    const existingUsername = await db.users.where('username').equals(teacherForm.username).first();
    if (existingUsername) { setError('Username already exists.'); return; }

    const passwordHash = await hashPassword(teacherForm.password);
    const now = new Date().toISOString();
    await db.users.add({
      email: teacherForm.email,
      passwordHash,
      role: 'teacher',
      fullName: teacherForm.fullName,
      username: teacherForm.username,
      phone: teacherForm.phone,
      isActive: true,
      isVerified: true,
      createdAt: now,
      updatedAt: now
    });
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Create Teacher', `Teacher: ${teacherForm.fullName}`);
    setShowAddTeacher(false);
    setTeacherForm({ fullName: '', email: '', username: '', password: '', phone: '' });
    loadData();
  };

  const handleToggleTeacher = async (teacherId: number, active: boolean) => {
    await db.users.update(teacherId, { isActive: !active, updatedAt: new Date().toISOString() });
    await addAuditLog(user!.id!, user!.fullName, 'principal', active ? 'Disable Teacher' : 'Enable Teacher', `Teacher ID: ${teacherId}`);
    loadData();
  };

  const handleDeleteTeacher = async (teacherId: number) => {
    if (!confirm('Delete this teacher? This cannot be undone.')) return;
    await db.teacherAssignments.where('teacherId').equals(teacherId).delete();
    await db.users.delete(teacherId);
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Delete Teacher', `Teacher ID: ${teacherId}`);
    loadData();
  };

  const handleDeleteStudent = async (studentId: number) => {
    if (!confirm('Delete this student? Test history will be preserved.')) return;
    await db.users.update(studentId, { isActive: false, updatedAt: new Date().toISOString() });
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Delete Student', `Student ID: ${studentId} (marked inactive)`);
    loadData();
  };

  const handleAddClass = async () => {
    if (!classForm.name) { setError('Class name is required.'); return; }
    await db.classes.add({ name: classForm.name, academicYear: classForm.academicYear, createdAt: new Date().toISOString() });
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Create Class', `Class: ${classForm.name}`);
    setShowAddClass(false);
    setClassForm({ name: '', academicYear: new Date().getFullYear().toString() });
    loadData();
  };

  const handleAddSection = async () => {
    if (!sectionForm.classId || !sectionForm.name) { setError('All fields required.'); return; }
    await db.sections.add({ classId: parseInt(sectionForm.classId), name: sectionForm.name, createdAt: new Date().toISOString() });
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Create Section', `Section: ${sectionForm.name}`);
    setShowAddSection(false);
    setSectionForm({ classId: '', name: '' });
    loadData();
  };

  const handleAddSubject = async () => {
    if (!subjectForm.name) { setError('Subject name is required.'); return; }
    await db.subjects.add({ name: subjectForm.name, category: subjectForm.category, createdAt: new Date().toISOString() });
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Create Subject', `Subject: ${subjectForm.name}`);
    setShowAddSubject(false);
    setSubjectForm({ name: '', category: '' });
    loadData();
  };

  const handleAssignTeacher = async () => {
    if (!assignForm.teacherId || !assignForm.classId || !assignForm.sectionId || !assignForm.subjectId) {
      setError('All fields required.'); return;
    }
    await db.teacherAssignments.add({
      teacherId: parseInt(assignForm.teacherId),
      classId: parseInt(assignForm.classId),
      sectionId: parseInt(assignForm.sectionId),
      subjectId: parseInt(assignForm.subjectId),
      createdAt: new Date().toISOString()
    });
    await addAuditLog(user!.id!, user!.fullName, 'principal', 'Assign Teacher', `Teacher ${assignForm.teacherId} to class`);
    setShowAssignTeacher(false);
    setAssignForm({ teacherId: '', classId: '', sectionId: '', subjectId: '' });
    loadData();
  };

  const handleExportReport = (type: string) => {
    let data: any[] = [];
    if (type === 'students') {
      data = students.map(s => ({ Name: s.fullName, Email: s.email, Class: getClassName(s.classId || 0), Section: getSectionName(s.sectionId || 0), Roll: s.rollNumber, Status: s.isActive ? 'Active' : 'Inactive' }));
    } else if (type === 'tests') {
      data = tests.map(t => ({ Title: t.title, Subject: getSubjectName(t.subjectId), Class: getClassName(t.classId), Section: getSectionName(t.sectionId), Status: t.status, Start: formatDateTime(t.startTime), End: formatDateTime(t.endTime) }));
    } else if (type === 'results') {
      data = attempts.filter(a => a.status === 'submitted').map(a => {
        const test = tests.find(t => t.id === a.testId);
        const student = students.find(s => s.id === a.studentId);
        return { Student: student?.fullName || '', Test: test?.title || '', Subject: test ? getSubjectName(test.subjectId) : '', Score: `${a.obtainedMarks}/${a.totalMarks}`, Percentage: a.percentage, Date: formatDate(a.submittedAt || '') };
      });
    }
    exportToCSV(data, `${type}_report_${Date.now()}`);
  };

  const filteredStudents = students.filter(s => {
    const matchSearch = !searchTerm || s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase()) || s.rollNumber?.includes(searchTerm);
    const matchClass = !filterClass || s.classId === parseInt(filterClass);
    return matchSearch && matchClass;
  });

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview', icon: LayoutDashboard },
    { id: 'students' as Tab, label: 'Students', icon: Users },
    { id: 'teachers' as Tab, label: 'Teachers', icon: UserCheck },
    { id: 'classes' as Tab, label: 'Classes', icon: BookOpen },
    { id: 'subjects' as Tab, label: 'Subjects', icon: BookOpen },
    { id: 'tests' as Tab, label: 'Tests', icon: FileText },
    { id: 'results' as Tab, label: 'Results', icon: BarChart3 },
    { id: 'reports' as Tab, label: 'Reports', icon: ClipboardList },
    { id: 'audit' as Tab, label: 'Audit Logs', icon: ClipboardList },
    { id: 'notifications' as Tab, label: 'Notifications', icon: Bell },
  ];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  const COLORS = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#7c3aed'];

  const renderOverview = () => {
    const submittedAttempts = attempts.filter(a => a.status === 'submitted');
    const avgPercentage = submittedAttempts.length > 0 ? Math.round(submittedAttempts.reduce((s, a) => s + a.percentage, 0) / submittedAttempts.length) : 0;
    const testStatusData = [
      { name: 'Draft', value: tests.filter(t => t.status === 'draft').length },
      { name: 'Active', value: tests.filter(t => t.status === 'active' || t.status === 'upcoming').length },
      { name: 'Completed', value: tests.filter(t => t.status === 'completed' || t.status === 'expired').length },
    ].filter(d => d.value > 0);

    const classPerformance = classes.map(c => {
      const classStudents = students.filter(s => s.classId === c.id);
      const classAttempts = submittedAttempts.filter(a => classStudents.some(s => s.id === a.studentId));
      const avg = classAttempts.length > 0 ? Math.round(classAttempts.reduce((s, a) => s + a.percentage, 0) / classAttempts.length) : 0;
      return { name: c.name, avg, students: classStudents.length, tests: classAttempts.length };
    }).filter(c => c.tests > 0);

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Principal Dashboard</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="text-xs text-gray-500">Students</div><div className="text-2xl font-bold text-indigo-600">{students.length}</div></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="text-xs text-gray-500">Teachers</div><div className="text-2xl font-bold text-green-600">{teachers.length}</div></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="text-xs text-gray-500">Classes</div><div className="text-2xl font-bold text-blue-600">{classes.length}</div></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="text-xs text-gray-500">Subjects</div><div className="text-2xl font-bold text-purple-600">{subjects.length}</div></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="text-xs text-gray-500">Tests</div><div className="text-2xl font-bold text-amber-600">{tests.length}</div></div>
          <div className="bg-white border border-gray-100 rounded-xl p-4"><div className="text-xs text-gray-500">Avg Score</div><div className="text-2xl font-bold text-gray-900">{avgPercentage}%</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {testStatusData.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Test Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={testStatusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {testStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {classPerformance.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Class Performance</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={classPerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="avg" fill="#4f46e5" name="Avg %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {students.length === 0 && teachers.length === 0 && tests.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <LayoutDashboard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No data yet. Start by creating classes, subjects, and teacher accounts.</p>
          </div>
        )}
      </div>
    );
  };

  const renderStudents = () => (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Students ({students.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-48" />
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={() => handleExportReport('students')} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
        </div>
      </div>
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No students registered yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Section</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Roll No</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.slice(0, 50).map(s => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.fullName}</td>
                    <td className="px-4 py-3 text-gray-600">{s.email}</td>
                    <td className="px-4 py-3 text-gray-600">{getClassName(s.classId || 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{getSectionName(s.sectionId || 0)}</td>
                    <td className="px-4 py-3 text-gray-600">{s.rollNumber}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteStudent(s.id!)} className="text-red-500 hover:text-red-700 text-xs">Deactivate</button>
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

  const renderTeachers = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Teachers ({teachers.length})</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAssignTeacher(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Assign to Class</button>
          <button onClick={() => setShowAddTeacher(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Teacher</button>
        </div>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {teachers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No teachers yet. Add your first teacher to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teachers.map(t => {
            const tAssignments = assignments.filter(a => a.teacherId === t.id);
            return (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{t.fullName}</h4>
                    <p className="text-sm text-gray-500">{t.email} · @{t.username}</p>
                    {tAssignments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {tAssignments.map(a => (
                          <span key={a.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {getClassName(a.classId)}-{getSectionName(a.sectionId)} ({getSubjectName(a.subjectId)})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleToggleTeacher(t.id!, t.isActive)} className={`p-1.5 rounded ${t.isActive ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}>
                      {t.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleDeleteTeacher(t.id!)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Teacher Modal */}
      {showAddTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Teacher</h3>
            {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
            <div className="space-y-3">
              <input type="text" placeholder="Full Name *" value={teacherForm.fullName} onChange={e => setTeacherForm({ ...teacherForm, fullName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="email" placeholder="Email *" value={teacherForm.email} onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="text" placeholder="Username *" value={teacherForm.username} onChange={e => setTeacherForm({ ...teacherForm, username: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="password" placeholder="Password *" value={teacherForm.password} onChange={e => setTeacherForm({ ...teacherForm, password: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="tel" placeholder="Phone" value={teacherForm.phone} onChange={e => setTeacherForm({ ...teacherForm, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowAddTeacher(false); setError(''); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddTeacher} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add Teacher</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignTeacher && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Teacher to Class</h3>
            <div className="space-y-3">
              <select value={assignForm.teacherId} onChange={e => setAssignForm({ ...assignForm, teacherId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.fullName}</option>)}
              </select>
              <select value={assignForm.classId} onChange={e => setAssignForm({ ...assignForm, classId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={assignForm.sectionId} onChange={e => setAssignForm({ ...assignForm, sectionId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Select Section</option>
                {sections.filter(s => assignForm.classId && s.classId === parseInt(assignForm.classId)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={assignForm.subjectId} onChange={e => setAssignForm({ ...assignForm, subjectId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowAssignTeacher(false); setError(''); }} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAssignTeacher} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Assign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderClasses = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Classes & Sections</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddSection(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Add Section</button>
          <button onClick={() => setShowAddClass(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Class</button>
        </div>
      </div>
      {classes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No classes created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => {
            const classSections = sections.filter(s => s.classId === c.id);
            const classStudents = students.filter(s => s.classId === c.id);
            return (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900">{c.name}</h4>
                <p className="text-sm text-gray-500">Academic Year: {c.academicYear}</p>
                <p className="text-sm text-gray-500">Students: {classStudents.length}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {classSections.map(s => (
                    <span key={s.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{s.name}</span>
                  ))}
                </div>
                <button onClick={async () => { await db.classes.delete(c.id!); await db.sections.where('classId').equals(c.id!).delete(); loadData(); }} className="mt-3 text-xs text-red-500 hover:text-red-700">Delete Class</button>
              </div>
            );
          })}
        </div>
      )}

      {showAddClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Class</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Class Name *" value={classForm.name} onChange={e => setClassForm({ ...classForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="text" placeholder="Academic Year" value={classForm.academicYear} onChange={e => setClassForm({ ...classForm, academicYear: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddClass(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddClass} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
            </div>
          </div>
        </div>
      )}

      {showAddSection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Section</h3>
            <div className="space-y-3">
              <select value={sectionForm.classId} onChange={e => setSectionForm({ ...sectionForm, classId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input type="text" placeholder="Section Name *" value={sectionForm.name} onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddSection(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddSection} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSubjects = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Subjects ({subjects.length})</h2>
        <button onClick={() => setShowAddSubject(true)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Subject</button>
      </div>
      {subjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No subjects created yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjects.map(s => (
            <div key={s.id} className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{s.name}</h4>
                {s.category && <p className="text-sm text-gray-500">{s.category}</p>}
              </div>
              <button onClick={async () => { await db.subjects.delete(s.id!); loadData(); }} className="text-red-500 hover:text-red-700 text-xs">Delete</button>
            </div>
          ))}
        </div>
      )}

      {showAddSubject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add Subject</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Subject Name *" value={subjectForm.name} onChange={e => setSubjectForm({ ...subjectForm, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <input type="text" placeholder="Category (optional)" value={subjectForm.category} onChange={e => setSubjectForm({ ...subjectForm, category: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowAddSubject(false)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAddSubject} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTests = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">All Tests ({tests.length})</h2>
      {tests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tests created yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Class</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Created By</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(t => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                    <td className="px-4 py-3 text-gray-600">{getSubjectName(t.subjectId)}</td>
                    <td className="px-4 py-3 text-gray-600">{getClassName(t.classId)}-{getSectionName(t.sectionId)}</td>
                    <td className="px-4 py-3 text-gray-600">{getTeacherName(t.createdBy)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-700' : t.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-gray-600">{attempts.filter(a => a.testId === t.id).length}</td>
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">All Results</h2>
        <button onClick={() => handleExportReport('results')} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"><Download className="w-3 h-3" /> Export</button>
      </div>
      {attempts.filter(a => a.status === 'submitted').length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No results available yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Test</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Percentage</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {attempts.filter(a => a.status === 'submitted').sort((a, b) => new Date(b.submittedAt || '').getTime() - new Date(a.submittedAt || '').getTime()).slice(0, 50).map(a => {
                  const test = tests.find(t => t.id === a.testId);
                  const student = students.find(s => s.id === a.studentId);
                  return (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{student?.fullName || 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-600">{test?.title || 'Unknown'}</td>
                      <td className="px-4 py-3 text-gray-900">{a.obtainedMarks}/{a.totalMarks}</td>
                      <td className="px-4 py-3"><span className={`font-medium ${a.percentage >= 60 ? 'text-green-600' : a.percentage >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{a.percentage}%</span></td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(a.submittedAt || '')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const renderReports = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <Users className="w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Student Report</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">All student records with class and status information.</p>
          <button onClick={() => handleExportReport('students')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">Export CSV</button>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <FileText className="w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Test Report</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">All tests with details, scheduling, and status.</p>
          <button onClick={() => handleExportReport('tests')} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Export CSV</button>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <BarChart3 className="w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900">Results Report</h3>
          <p className="text-sm text-gray-500 mt-1 mb-4">All test results with scores and percentages.</p>
          <button onClick={() => handleExportReport('results')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">Export CSV</button>
        </div>
      </div>
    </div>
  );

  const renderAudit = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h2>
      {auditLogs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No audit logs recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.slice(0, 50).map(log => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{log.userName}</td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{log.role}</td>
                    <td className="px-4 py-3 text-gray-600">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{log.details}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(log.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <div key={n.id} className="p-4 bg-white border border-gray-100 rounded-xl">
              <h4 className="font-medium text-gray-900">{n.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              <p className="text-xs text-gray-400 mt-2">{formatDateTime(n.createdAt)}</p>
            </div>
          ))}
        </div>
      )}
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
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Principal</span>
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
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setError(''); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'students' && renderStudents()}
        {activeTab === 'teachers' && renderTeachers()}
        {activeTab === 'classes' && renderClasses()}
        {activeTab === 'subjects' && renderSubjects()}
        {activeTab === 'tests' && renderTests()}
        {activeTab === 'results' && renderResults()}
        {activeTab === 'reports' && renderReports()}
        {activeTab === 'audit' && renderAudit()}
        {activeTab === 'notifications' && renderNotifications()}
      </div>
    </div>
  );
}
