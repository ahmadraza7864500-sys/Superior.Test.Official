import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, Test, TestAttempt, Notification, ClassRecord, SectionRecord, Subject } from '../db';
import { formatDateTime, formatDate } from '../utils';
import { GraduationCap, LogOut, LayoutDashboard, Calendar, Clock, CheckCircle, XCircle, History, BarChart3, Bell, User, FileText, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Tab = 'dashboard' | 'upcoming' | 'active' | 'completed' | 'missed' | 'history' | 'performance' | 'notifications' | 'profile';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [tests, setTests] = useState<Test[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    const allTests = await db.tests.where('status').anyOf(['upcoming', 'active', 'completed']).toArray();
    const studentTests = allTests.filter(t => t.classId === user.classId && t.sectionId === user.sectionId);
    setTests(studentTests);

    const studentAttempts = await db.testAttempts.where('studentId').equals(user.id!).toArray();
    setAttempts(studentAttempts);

    const notifs = await db.notifications.where('userId').equals(user.id!).reverse().sortBy('createdAt');
    setNotifications(notifs.slice(0, 50));

    setSubjects(await db.subjects.toArray());
    setClasses(await db.classes.toArray());
    setSections(await db.sections.toArray());
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || 'Unknown';
  const getClassName = (id: number) => classes.find(c => c.id === id)?.name || 'Unknown';
  const getSectionName = (id: number) => sections.find(s => s.id === id)?.name || 'Unknown';

  const now = new Date();
  const upcomingTests = tests.filter(t => new Date(t.startTime) > now && t.status !== 'completed' && t.status !== 'expired');
  const activeTests = tests.filter(t => {
    const start = new Date(t.startTime);
    const end = new Date(t.endTime);
    return start <= now && end >= now && (t.status === 'active' || t.status === 'upcoming');
  });
  const completedTests = tests.filter(t => t.status === 'completed' || t.status === 'expired');
  const missedTests = completedTests.filter(t => {
    const testAttempts = attempts.filter(a => a.testId === t.id);
    return testAttempts.length === 0;
  });

  const markNotificationRead = async (id: number) => {
    await db.notifications.update(id, { isRead: true });
    loadData();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const tabs = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upcoming' as Tab, label: 'Upcoming', icon: Calendar },
    { id: 'active' as Tab, label: 'Active Tests', icon: Clock },
    { id: 'completed' as Tab, label: 'Completed', icon: CheckCircle },
    { id: 'missed' as Tab, label: 'Missed', icon: XCircle },
    { id: 'history' as Tab, label: 'History', icon: History },
    { id: 'performance' as Tab, label: 'Performance', icon: BarChart3 },
    { id: 'notifications' as Tab, label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: Bell },
    { id: 'profile' as Tab, label: 'Profile', icon: User },
  ];

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  const renderTestCard = (test: Test, showAction: boolean = true) => {
    const testAttempts = attempts.filter(a => a.testId === test.id);
    const attemptCount = testAttempts.length;
    const canAttempt = attemptCount < test.maxAttempts;

    return (
      <div key={test.id} className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{test.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{getSubjectName(test.subjectId)}</p>
          </div>
          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
            test.status === 'active' ? 'bg-green-100 text-green-700' :
            test.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {test.status}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>Start: {formatDateTime(test.startTime)}</div>
          <div>End: {formatDateTime(test.endTime)}</div>
          <div>Duration: {test.duration} min</div>
          <div>Attempts: {attemptCount}/{test.maxAttempts}</div>
        </div>
        {testAttempts.length > 0 && (
          <div className="mt-2 text-sm">
            <span className="text-gray-600">Last Score: </span>
            <span className="font-medium text-gray-900">{testAttempts[testAttempts.length - 1].obtainedMarks}/{testAttempts[testAttempts.length - 1].totalMarks} ({testAttempts[testAttempts.length - 1].percentage}%)</span>
          </div>
        )}
        {showAction && canAttempt && (test.status === 'active' || test.status === 'upcoming') && (
          <Link to={`/test/${test.id}`} className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
            {attemptCount > 0 ? 'Retake Test' : 'Start Test'}
          </Link>
        )}
        {testAttempts.length > 0 && test.showResultImmediately && (
          <Link to={`/result/${testAttempts[testAttempts.length - 1].id}`} className="mt-3 ml-2 inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
            View Result
          </Link>
        )}
      </div>
    );
  };

  const renderDashboard = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Welcome, {user?.fullName}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="text-sm text-gray-500">Active Tests</div>
          <div className="text-3xl font-bold text-indigo-600 mt-1">{activeTests.length}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="text-sm text-gray-500">Upcoming Tests</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">{upcomingTests.length}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="text-sm text-gray-500">Completed Tests</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{attempts.filter(a => a.status === 'submitted').length}</div>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="text-sm text-gray-500">Average Score</div>
          <div className="text-3xl font-bold text-purple-600 mt-1">
            {attempts.filter(a => a.status === 'submitted').length > 0
              ? Math.round(attempts.filter(a => a.status === 'submitted').reduce((sum, a) => sum + a.percentage, 0) / attempts.filter(a => a.status === 'submitted').length) + '%'
              : '—'}
          </div>
        </div>
      </div>

      {activeTests.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tests Available Now</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTests.map(t => renderTestCard(t))}
          </div>
        </div>
      )}

      {activeTests.length === 0 && upcomingTests.length === 0 && completedTests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No tests available yet. Your assigned tests will appear here.</p>
        </div>
      )}
    </div>
  );

  const renderPerformance = () => {
    const submittedAttempts = attempts.filter(a => a.status === 'submitted');
    const chartData = submittedAttempts.map(a => {
      const test = tests.find(t => t.id === a.testId);
      return {
        name: test?.title?.substring(0, 20) || 'Test',
        percentage: a.percentage,
        date: formatDate(a.submittedAt || '')
      };
    });

    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance</h2>
        {submittedAttempts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No performance data available yet. Complete some tests to see your performance trends.</p>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="percentage" stroke="#4f46e5" strokeWidth={2} dot={{ fill: '#4f46e5' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="text-sm text-gray-500">Highest Score</div>
                <div className="text-2xl font-bold text-green-600 mt-1">{Math.max(...submittedAttempts.map(a => a.percentage))}%</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="text-sm text-gray-500">Lowest Score</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{Math.min(...submittedAttempts.map(a => a.percentage))}%</div>
              </div>
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <div className="text-sm text-gray-500">Average Score</div>
                <div className="text-2xl font-bold text-indigo-600 mt-1">{Math.round(submittedAttempts.reduce((s, a) => s + a.percentage, 0) / submittedAttempts.length)}%</div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

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
          {notifications.map(n => (
            <div key={n.id} className={`p-4 rounded-xl border ${n.isRead ? 'bg-white border-gray-100' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className={`font-medium ${n.isRead ? 'text-gray-700' : 'text-indigo-900'}`}>{n.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-2">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <button onClick={() => markNotificationRead(n.id!)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                    Mark read
                  </button>
                )}
              </div>
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
          <div><span className="text-sm text-gray-500">Father's Name</span><p className="font-medium text-gray-900">{user?.fatherName || '—'}</p></div>
          <div><span className="text-sm text-gray-500">Phone</span><p className="font-medium text-gray-900">{user?.phone || '—'}</p></div>
          <div><span className="text-sm text-gray-500">Class</span><p className="font-medium text-gray-900">{getClassName(user?.classId || 0)}</p></div>
          <div><span className="text-sm text-gray-500">Section</span><p className="font-medium text-gray-900">{getSectionName(user?.sectionId || 0)}</p></div>
          <div><span className="text-sm text-gray-500">Roll Number</span><p className="font-medium text-gray-900">{user?.rollNumber}</p></div>
          <div><span className="text-sm text-gray-500">Account Status</span><p className="font-medium text-green-600">Active</p></div>
        </div>
        <p className="text-sm text-gray-500 mt-6">To update your information, please contact your class teacher or principal.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 hidden sm:block">Superior Test</span>
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
        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'upcoming' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Tests</h2>
            {upcomingTests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No upcoming tests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingTests.map(t => renderTestCard(t, false))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'active' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Tests</h2>
            {activeTests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No tests currently active.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTests.map(t => renderTestCard(t))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'completed' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Completed Tests</h2>
            {attempts.filter(a => a.status === 'submitted').length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No completed tests yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {attempts.filter(a => a.status === 'submitted').map(a => {
                  const test = tests.find(t => t.id === a.testId);
                  if (!test) return null;
                  return (
                    <div key={a.id} className="bg-white border border-gray-100 rounded-xl p-5">
                      <h3 className="font-semibold text-gray-900">{test.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{getSubjectName(test.subjectId)}</p>
                      <div className="mt-3 flex items-center gap-4">
                        <span className="text-lg font-bold text-indigo-600">{a.obtainedMarks}/{a.totalMarks}</span>
                        <span className="text-sm text-gray-600">({a.percentage}%)</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-500">
                        ✓ {a.correctCount} correct · ✗ {a.wrongCount} wrong · — {a.unansweredCount} unanswered
                      </div>
                      {test.showResultImmediately && (
                        <Link to={`/result/${a.id}`} className="mt-3 inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors">
                          View Details
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'missed' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Missed Tests</h2>
            {missedTests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No missed tests. Great job!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {missedTests.map(t => renderTestCard(t, false))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Test History</h2>
            {attempts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No test history yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Test</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Subject</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Attempt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map(a => {
                        const test = tests.find(t => t.id === a.testId) || { title: 'Unknown', subjectId: 0 };
                        return (
                          <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{test.title}</td>
                            <td className="px-4 py-3 text-gray-600">{getSubjectName(test.subjectId)}</td>
                            <td className="px-4 py-3 text-gray-600">{formatDate(a.startedAt)}</td>
                            <td className="px-4 py-3 text-gray-900">{a.status === 'submitted' ? `${a.obtainedMarks}/${a.totalMarks} (${a.percentage}%)` : '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                a.status === 'submitted' ? 'bg-green-100 text-green-700' :
                                a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>{a.status}</span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">#{a.attemptNumber}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'performance' && renderPerformance()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'profile' && renderProfile()}
      </div>
    </div>
  );
}
