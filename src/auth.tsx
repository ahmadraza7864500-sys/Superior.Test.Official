import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, User, OTPRecord, generateOTP, generateToken, hashPassword, addAuditLog } from './db';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  staffLogin: (username: string, password: string, otp: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  requestOTP: (email: string) => Promise<{ success: boolean; message: string; otp?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<{ success: boolean; message: string }>;
  registerStudent: (data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  setupPrincipal: (data: { fullName: string; email: string; username: string; password: string }) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const token = localStorage.getItem('st_session_token');
      if (token) {
        const session = await db.sessions.where('token').equals(token).first();
        if (session && session.expiresAt > Date.now()) {
          const user = await db.users.get(session.userId);
          if (user && user.isActive) {
            setAuthState({ user, isAuthenticated: true, isLoading: false });
            return;
          }
        }
        localStorage.removeItem('st_session_token');
      }
    } catch (e) {
      console.error('Session load error:', e);
    }
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const requestOTP = async (email: string): Promise<{ success: boolean; message: string; otp?: string }> => {
    try {
      // Rate limiting: check if OTP was requested in last 60 seconds
      const recentOTP = await db.otpRecords
        .where('email').equals(email)
        .reverse()
        .sortBy('createdAt');
      
      if (recentOTP.length > 0) {
        const lastOTP = recentOTP[0];
        const timeSince = Date.now() - new Date(lastOTP.createdAt).getTime();
        if (timeSince < 60000) {
          const waitSeconds = Math.ceil((60000 - timeSince) / 1000);
          return { success: false, message: `Please wait ${waitSeconds} seconds before requesting a new OTP.` };
        }
      }

      const otp = generateOTP();
      const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

      await db.otpRecords.add({
        email,
        otp,
        expiresAt,
        attempts: 0,
        used: false,
        createdAt: new Date().toISOString()
      });

      // In production, this would be sent via email service
      // For this implementation, we return the OTP for verification
      return { success: true, message: 'OTP sent to your registered email.', otp };
    } catch (e) {
      return { success: false, message: 'Failed to generate OTP. Please try again.' };
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
    try {
      const records = await db.otpRecords
        .where('email').equals(email)
        .reverse()
        .sortBy('createdAt');

      if (records.length === 0) {
        return { success: false, message: 'No OTP found. Please request a new one.' };
      }

      const latestOTP = records[0];

      if (latestOTP.used) {
        return { success: false, message: 'This OTP has already been used. Please request a new one.' };
      }

      if (latestOTP.expiresAt < Date.now()) {
        return { success: false, message: 'OTP has expired. Please request a new one.' };
      }

      if (latestOTP.attempts >= 5) {
        return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
      }

      if (latestOTP.otp !== otp) {
        await db.otpRecords.update(latestOTP.id!, { attempts: latestOTP.attempts + 1 });
        const remaining = 5 - (latestOTP.attempts + 1);
        return { success: false, message: `Invalid OTP. ${remaining} attempts remaining.` };
      }

      await db.otpRecords.update(latestOTP.id!, { used: true });
      return { success: true, message: 'OTP verified successfully.' };
    } catch (e) {
      return { success: false, message: 'Verification failed. Please try again.' };
    }
  };

  const registerStudent = async (data: Partial<User>): Promise<{ success: boolean; message: string }> => {
    try {
      const existing = await db.users.where('email').equals(data.email!).first();
      if (existing) {
        return { success: false, message: 'This email is already registered.' };
      }

      const now = new Date().toISOString();
      const userId = await db.users.add({
        email: data.email!,
        role: 'student',
        fullName: data.fullName!,
        phone: data.phone || '',
        fatherName: data.fatherName || '',
        classId: data.classId,
        sectionId: data.sectionId,
        rollNumber: data.rollNumber || '',
        isActive: true,
        isVerified: false,
        createdAt: now,
        updatedAt: now
      });

      await addAuditLog(userId as number, data.fullName!, 'student', 'Registration', `Student registered: ${data.email}`);
      return { success: true, message: 'Registration successful. Please verify your email with OTP.' };
    } catch (e) {
      return { success: false, message: 'Registration failed. Please try again.' };
    }
  };

  const login = async (email: string, otp: string): Promise<{ success: boolean; message: string }> => {
    try {
      const otpResult = await verifyOTP(email, otp);
      if (!otpResult.success) {
        return otpResult;
      }

      const user = await db.users.where('email').equals(email).first();
      if (!user) {
        return { success: false, message: 'No account found with this email.' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Your account has been disabled. Contact your administrator.' };
      }

      if (user.role !== 'student') {
        return { success: false, message: 'Please use the staff login portal.' };
      }

      // Mark email as verified
      await db.users.update(user.id!, { isVerified: true, updatedAt: new Date().toISOString() });

      // Create session
      const token = generateToken();
      await db.sessions.add({
        userId: user.id!,
        token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        createdAt: new Date().toISOString()
      });

      localStorage.setItem('st_session_token', token);
      setAuthState({ user: { ...user, isVerified: true }, isAuthenticated: true, isLoading: false });
      await addAuditLog(user.id!, user.fullName, 'student', 'Login', 'Student logged in');
      return { success: true, message: 'Login successful.' };
    } catch (e) {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const staffLogin = async (username: string, password: string, otp: string): Promise<{ success: boolean; message: string }> => {
    try {
      const user = await db.users.where('username').equals(username).first();
      if (!user) {
        return { success: false, message: 'Invalid username or password.' };
      }

      if (!user.isActive) {
        return { success: false, message: 'Your account has been disabled. Contact the principal.' };
      }

      const passwordHash = await hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        return { success: false, message: 'Invalid username or password.' };
      }

      // Verify OTP
      const otpResult = await verifyOTP(user.email, otp);
      if (!otpResult.success) {
        return otpResult;
      }

      // Create session
      const token = generateToken();
      await db.sessions.add({
        userId: user.id!,
        token,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000),
        createdAt: new Date().toISOString()
      });

      localStorage.setItem('st_session_token', token);
      setAuthState({ user, isAuthenticated: true, isLoading: false });
      await addAuditLog(user.id!, user.fullName, user.role, 'Login', `${user.role} logged in`);
      return { success: true, message: 'Login successful.' };
    } catch (e) {
      return { success: false, message: 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('st_session_token');
      if (token && authState.user) {
        await db.sessions.where('token').equals(token).delete();
        await addAuditLog(authState.user.id!, authState.user.fullName, authState.user.role, 'Logout', 'User logged out');
      }
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('st_session_token');
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const setupPrincipal = async (data: { fullName: string; email: string; username: string; password: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const existing = await db.users.where('role').equals('principal').first();
      if (existing) {
        return { success: false, message: 'Principal account already exists.' };
      }

      const passwordHash = await hashPassword(data.password);
      const now = new Date().toISOString();
      const userId = await db.users.add({
        email: data.email,
        passwordHash,
        role: 'principal',
        fullName: data.fullName,
        username: data.username,
        isActive: true,
        isVerified: true,
        createdAt: now,
        updatedAt: now
      });

      await addAuditLog(userId as number, data.fullName, 'principal', 'Setup', 'Principal account created');
      return { success: true, message: 'Principal account created successfully.' };
    } catch (e) {
      return { success: false, message: 'Failed to create principal account.' };
    }
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, staffLogin, logout, requestOTP, verifyOTP, registerStudent, setupPrincipal }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
