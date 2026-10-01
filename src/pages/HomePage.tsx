import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { db } from '../db';
import { GraduationCap, BookOpen, Users, Shield, Clock, BarChart3, ChevronRight, CheckCircle2, Star, ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [hasPrincipal, setHasPrincipal] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'student') navigate('/student');
      else if (user.role === 'teacher') navigate('/teacher');
      else if (user.role === 'principal') navigate('/principal');
    }
    db.users.where('role').equals('principal').count().then(c => setHasPrincipal(c > 0));
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Superior Test</h1>
                <p className="text-xs text-gray-500 -mt-0.5">Excellence in Assessment</p>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">Features</a>
              <a href="#about" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">About</a>
              <a href="#contact" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">Contact</a>
            </nav>
            <div className="flex items-center gap-3">
              <Link to="/register" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
                Register
              </Link>
              <Link to="/student/login" className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                Student Login
              </Link>
              <Link to="/staff/login" className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Staff Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-200 rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full text-sm text-indigo-700 mb-6">
              <Star className="w-4 h-4" />
              Professional Online Examination Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Elevate Your Academic
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Assessment</span> Standards
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Superior Test provides schools and colleges with a comprehensive, secure, and intelligent platform for creating, managing, and analyzing examinations.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300">
                Student Registration
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <Link to="/student/login" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-indigo-600 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                Student Login
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Secure Authentication</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Real-time Monitoring</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-500" /> Instant Results</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Powerful Features</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Everything you need to manage examinations efficiently and securely.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: BookOpen, title: 'Test Creation', desc: 'Create tests by pasting MCQs. Smart parser handles various formats automatically.' },
              { icon: Shield, title: 'Secure Testing', desc: 'Anti-cheating measures, tab detection, auto-save, and server-side validation.' },
              { icon: Clock, title: 'Timed Assessments', desc: 'Configurable timers, auto-submission, and flexible scheduling for tests.' },
              { icon: BarChart3, title: 'Analytics & Reports', desc: 'Comprehensive performance analytics, charts, and exportable reports.' },
              { icon: Users, title: 'Role Management', desc: 'Principal, Teacher, and Student roles with granular permissions.' },
              { icon: GraduationCap, title: 'Question Bank', desc: 'Reusable question bank organized by subject, class, and difficulty.' },
            ].map((feature, i) => (
              <div key={i} className="group p-6 bg-white border border-gray-100 rounded-2xl hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50 transition-all duration-300">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-100 transition-colors">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Why Superior Test?</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Built for institutions that demand excellence in assessment management.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              'Automated test creation with intelligent MCQ parsing',
              'Real-time test monitoring for teachers',
              'Comprehensive performance analytics and reporting',
              'Secure OTP-based authentication for students',
              'Two-factor authentication for staff accounts',
              'Auto-save protection against connection issues',
              'Flexible test scheduling with multiple attempts',
              'Export results in multiple formats (CSV, PDF, Excel)',
              'Role-based access control with audit logging',
              'Responsive design for all devices',
            ].map((benefit, i) => (
              <div key={i} className="flex items-start gap-3 p-4">
                <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">About Superior Test</h2>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed">
              Superior Test is a comprehensive online examination management platform designed for schools, colleges, and educational institutions. 
              We provide a secure, reliable, and feature-rich environment for creating assessments, managing examinations, and tracking academic performance.
            </p>
            <p className="mt-4 text-lg text-gray-600 leading-relaxed">
              Our platform supports multiple user roles — Principals, Teachers, and Students — each with appropriate access levels and tools 
              to streamline the examination process from creation to analysis.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-purple-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Ready to Get Started?</h2>
          <p className="mt-4 text-lg text-indigo-100">Register as a student or contact your institution's administrator for access.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-indigo-600 bg-white rounded-xl hover:bg-gray-50 transition-all shadow-lg">
              Register Now
              <ChevronRight className="ml-2 w-5 h-5" />
            </Link>
            {hasPrincipal === false && (
              <Link to="/setup" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all">
                Setup Principal Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Contact & Support</h2>
            <p className="mt-4 text-lg text-gray-600">Need help? Contact your institution's administrator or reach out to our support team.</p>
            <div className="mt-8 p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-700">
                For technical support, account issues, or general inquiries, please contact your school/college administrator. 
                They have full access to manage accounts and resolve issues within your institution.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold">Superior Test</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} Superior Test. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
