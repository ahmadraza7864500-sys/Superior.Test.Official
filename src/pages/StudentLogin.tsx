import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { GraduationCap, ArrowLeft, Mail, Shield } from 'lucide-react';

export default function StudentLogin() {
  const navigate = useNavigate();
  const { requestOTP, login } = useAuth();
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const result = await requestOTP(email);
    if (result.success && result.otp) {
      setGeneratedOTP(result.otp);
      setStep('otp');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, otp);
    if (result.success) {
      navigate('/student');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    const result = await requestOTP(email);
    if (result.success && result.otp) {
      setGeneratedOTP(result.otp);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Student Login</h2>
            <p className="text-gray-600 mt-1">Login with your registered email</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestOTP}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                <strong>Your OTP:</strong> {generatedOTP}
                <p className="text-xs mt-1 text-amber-600">(In production, this would be sent to your email)</p>
              </div>

              <form onSubmit={handleLogin}>
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
                  <p className="text-xs text-gray-500 mt-1">OTP expires in 10 minutes</p>
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50">
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setStep('email')} className="text-sm text-gray-600 hover:text-gray-900">
                  Change Email
                </button>
                <button onClick={handleResendOTP} disabled={loading} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Resend OTP
                </button>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Not registered? <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
