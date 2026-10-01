import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { db, hashPassword } from '../db';
import { ArrowLeft, User, Lock, Shield, GraduationCap } from 'lucide-react';

export default function StaffLogin() {
  const navigate = useNavigate();
  const { staffLogin, requestOTP } = useAuth();
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      setLoading(false);
      return;
    }

    // Find user by username to get email for OTP
    const user = await db.users.where('username').equals(username).first();
    if (!user) {
      setError('Invalid username or password.');
      setLoading(false);
      return;
    }

    // Verify password
    const hash = await hashPassword(password);
    if (user.passwordHash !== hash) {
      setError('Invalid username or password.');
      setLoading(false);
      return;
    }

    // Request OTP for this user's email
    const otpResult = await requestOTP(user.email);
    if (otpResult.success && otpResult.otp) {
      setGeneratedOTP(otpResult.otp);
      setStep('otp');
    } else {
      setError(otpResult.message);
    }
    setLoading(false);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await staffLogin(username, password, otp);
    if (result.success) {
      const staffUser = await db.users.where('username').equals(username).first();
      if (staffUser) {
        if (staffUser.role === 'principal') navigate('/principal');
        else if (staffUser.role === 'teacher') navigate('/teacher');
      }
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    const staffUser = await db.users.where('username').equals(username).first();
    if (staffUser) {
      const otpResult = await requestOTP(staffUser.email);
      if (otpResult.success && otpResult.otp) {
        setGeneratedOTP(otpResult.otp);
      } else {
        setError(otpResult.message);
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Staff Login</h2>
            <p className="text-gray-600 mt-1">For Teachers and Principals</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {step === 'credentials' ? (
            <form onSubmit={handleCredentials} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Enter your username"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                {loading ? 'Verifying...' : 'Continue'}
              </button>
            </form>
          ) : (
            <>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <strong>Your OTP:</strong> {generatedOTP}
                <p className="text-xs mt-1 text-amber-600">(In production, this would be sent to your registered email)</p>
              </div>

              <form onSubmit={handleOTPSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enter OTP</label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      maxLength={6}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-center text-2xl tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                      placeholder="000000"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setStep('credentials')} className="text-sm text-gray-600 hover:text-gray-900">
                  Change Credentials
                </button>
                <button onClick={handleResendOTP} disabled={loading} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Resend OTP
                </button>
              </div>
            </>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">Staff accounts are created and managed by the Principal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
