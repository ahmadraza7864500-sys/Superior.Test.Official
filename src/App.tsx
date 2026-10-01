import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import HomePage from './pages/HomePage';
import StudentRegister from './pages/StudentRegister';
import StudentLogin from './pages/StudentLogin';
import StaffLogin from './pages/StaffLogin';
import PrincipalSetup from './pages/PrincipalSetup';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import PrincipalDashboard from './pages/PrincipalDashboard';
import TestTaking from './pages/TestTaking';
import TestResult from './pages/TestResult';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles: string[] }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<StudentRegister />} />
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/setup" element={<PrincipalSetup />} />
      
      <Route path="/student/*" element={
        <ProtectedRoute roles={['student']}>
          <StudentDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/teacher/*" element={
        <ProtectedRoute roles={['teacher']}>
          <TeacherDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/principal/*" element={
        <ProtectedRoute roles={['principal']}>
          <PrincipalDashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/test/:attemptId" element={
        <ProtectedRoute roles={['student']}>
          <TestTaking />
        </ProtectedRoute>
      } />
      
      <Route path="/result/:attemptId" element={
        <ProtectedRoute roles={['student']}>
          <TestResult />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
