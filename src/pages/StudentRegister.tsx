import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, ClassRecord, SectionRecord } from '../db';
import { GraduationCap, ArrowLeft, User, Mail, Phone, BookOpen, Hash } from 'lucide-react';

export default function StudentRegister() {
  const navigate = useNavigate();
  const { registerStudent, requestOTP, verifyOTP, login } = useAuth();
  const [step, setStep] = useState<'form' | 'otp' | 'success'>('form');
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    fatherName: '',
    classId: '',
    sectionId: '',
    rollNumber: '',
    phone: ''
  });

  const [otp, setOtp] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (form.classId) {
      loadSections(parseInt(form.classId));
    } else {
      setSections([]);
      setForm(f => ({ ...f, sectionId: '' }));
    }
  }, [form.classId]);

  const loadClasses = async () => {
    const cls = await db.classes.toArray();
    setClasses(cls);
  };

  const loadSections = async (classId: number) => {
    const secs = await db.sections.where('classId').equals(classId).toArray();
    setSections(secs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!form.fullName || !form.email || !form.classId || !form.sectionId || !form.rollNumber) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const result = await registerStudent({
      fullName: form.fullName,
      email: form.email,
      fatherName: form.fatherName,
      classId: parseInt(form.classId),
      sectionId: parseInt(form.sectionId),
      rollNumber: form.rollNumber,
      phone: form.phone
    });

    if (!result.success) {
      setError(result.message);
      setLoading(false);
      return;
    }

    // Request OTP
    const otpResult = await requestOTP(form.email);
    if (otpResult.success && otpResult.otp) {
      setGeneratedOTP(otpResult.otp);
      setStep('otp');
      setSuccessMsg('Registration successful! An OTP has been sent to your email.');
    } else {
      setError(otpResult.message);
    }
    setLoading(false);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const loginResult = await login(form.email, otp);
    if (loginResult.success) {
      setStep('success');
      setSuccessMsg('Email verified successfully! Your account is now active.');
    } else {
      setError(loginResult.message);
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    const otpResult = await requestOTP(form.email);
    if (otpResult.success && otpResult.otp) {
      setGeneratedOTP(otpResult.otp);
      setSuccessMsg('A new OTP has been sent to your email.');
    } else {
      setError(otpResult.message);
    }
    setLoading(false);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
          <p className="text-gray-600 mb-6">{successMsg}</p>
          <Link to="/student" className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-gray-600 mt-2">Enter the OTP sent to <strong>{form.email}</strong></p>
          </div>

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMsg}</div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {/* Display OTP for this environment (in production, this would be sent via email) */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <strong>Your OTP:</strong> {generatedOTP}
            <p className="text-xs mt-1 text-amber-600">(In production, this would be sent to your email)</p>
          </div>

          <form onSubmit={handleOTPSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="000000"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={handleResendOTP} disabled={loading} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Resend OTP
            </button>
          </div>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Student Registration</h2>
            <p className="text-gray-600 mt-1">Create your account to access tests</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="your.email@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Father's Name</label>
              <input
                type="text"
                value={form.fatherName}
                onChange={e => setForm({ ...form, fatherName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Enter father's name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={form.classId}
                    onChange={e => setForm({ ...form, classId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none bg-white"
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {classes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">No classes available. Contact your administrator.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
                <select
                  value={form.sectionId}
                  onChange={e => setForm({ ...form, sectionId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none appearance-none bg-white"
                  required
                  disabled={!form.classId}
                >
                  <option value="">Select Section</option>
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={form.rollNumber}
                    onChange={e => setForm({ ...form, rollNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Roll number"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 mt-6">
              {loading ? 'Registering...' : 'Register & Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already registered? <Link to="/student/login" className="text-indigo-600 hover:text-indigo-700 font-medium">Login here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
