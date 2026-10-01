import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { useAuth } from '../auth';
import { GraduationCap, ArrowLeft, Shield } from 'lucide-react';

export default function PrincipalSetup() {
  const navigate = useNavigate();
  const { setupPrincipal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alreadyExists, setAlreadyExists] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });

  useEffect(() => {
    db.users.where('role').equals('principal').count().then(c => {
      if (c > 0) setAlreadyExists(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const result = await setupPrincipal({
      fullName: form.fullName,
      email: form.email,
      username: form.username,
      password: form.password
    });

    if (result.success) {
      navigate('/staff/login');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  if (alreadyExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <Shield className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Principal Account Exists</h2>
          <p className="text-gray-600 mb-6">A principal account has already been set up for this system. Please use the staff login to access your account.</p>
          <Link to="/staff/login" className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium">
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 text-sm">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Principal Setup</h2>
            <p className="text-gray-600 mt-1">Create the initial administrator account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Principal's full name" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="principal@school.edu" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Choose a username" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Minimum 8 characters" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" placeholder="Confirm password" required />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 mt-6">
              {loading ? 'Creating Account...' : 'Create Principal Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
