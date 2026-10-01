import Dexie, { Table } from 'dexie';

export interface User {
  id?: number;
  email: string;
  passwordHash?: string;
  role: 'student' | 'teacher' | 'principal';
  fullName: string;
  phone?: string;
  fatherName?: string;
  classId?: number;
  sectionId?: number;
  rollNumber?: string;
  username?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OTPRecord {
  id?: number;
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  used: boolean;
  createdAt: string;
}

export interface ClassRecord {
  id?: number;
  name: string;
  academicYear: string;
  createdAt: string;
}

export interface SectionRecord {
  id?: number;
  classId: number;
  name: string;
  createdAt: string;
}

export interface Subject {
  id?: number;
  name: string;
  category?: string;
  createdAt: string;
}

export interface TeacherAssignment {
  id?: number;
  teacherId: number;
  classId: number;
  sectionId: number;
  subjectId: number;
  createdAt: string;
}

export interface Test {
  id?: number;
  title: string;
  subjectId: number;
  classId: number;
  sectionId: number;
  createdBy: number;
  status: 'draft' | 'upcoming' | 'active' | 'completed' | 'expired';
  startTime: string;
  endTime: string;
  duration: number; // minutes
  marksPerQuestion: number;
  negativeMarking: number; // negative marks per wrong answer
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  showResultImmediately: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id?: number;
  testId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string; // 'A', 'B', 'C', 'D'
  order: number;
}

export interface QuestionBankItem {
  id?: number;
  teacherId: number;
  subjectId: number;
  classId?: number;
  chapter?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  createdAt: string;
}

export interface TestAttempt {
  id?: number;
  testId: number;
  studentId: number;
  attemptNumber: number;
  startedAt: string;
  submittedAt?: string;
  status: 'in_progress' | 'submitted' | 'expired' | 'auto_submitted';
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  tabSwitchCount: number;
}

export interface StudentAnswer {
  id?: number;
  attemptId: number;
  questionId: number;
  selectedAnswer: string; // 'A', 'B', 'C', 'D', or '' for unanswered
  isCorrect: boolean;
  marksObtained: number;
  savedAt: string;
}

export interface Notification {
  id?: number;
  userId: number;
  title: string;
  message: string;
  type: 'test_assigned' | 'test_reminder' | 'test_closing' | 'result_available' | 'system' | 'account';
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id?: number;
  userId: number;
  userName: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Session {
  id?: number;
  userId: number;
  token: string;
  expiresAt: number;
  createdAt: string;
}

class SuperiorTestDB extends Dexie {
  users!: Table<User>;
  otpRecords!: Table<OTPRecord>;
  classes!: Table<ClassRecord>;
  sections!: Table<SectionRecord>;
  subjects!: Table<Subject>;
  teacherAssignments!: Table<TeacherAssignment>;
  tests!: Table<Test>;
  questions!: Table<Question>;
  questionBank!: Table<QuestionBankItem>;
  testAttempts!: Table<TestAttempt>;
  studentAnswers!: Table<StudentAnswer>;
  notifications!: Table<Notification>;
  auditLogs!: Table<AuditLog>;
  sessions!: Table<Session>;

  constructor() {
    super('SuperiorTestDB');
    this.version(1).stores({
      users: '++id, email, role, username, isActive',
      otpRecords: '++id, email, expiresAt',
      classes: '++id, name',
      sections: '++id, classId, name',
      subjects: '++id, name, category',
      teacherAssignments: '++id, teacherId, classId, sectionId, subjectId',
      tests: '++id, subjectId, classId, sectionId, createdBy, status, startTime, endTime',
      questions: '++id, testId, order',
      questionBank: '++id, teacherId, subjectId, classId, difficulty',
      testAttempts: '++id, testId, studentId, status',
      studentAnswers: '++id, attemptId, questionId',
      notifications: '++id, userId, isRead, type',
      auditLogs: '++id, userId, role, timestamp',
      sessions: '++id, userId, token',
    });
  }
}

export const db = new SuperiorTestDB();

// Helper functions
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_superior_test_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(): string {
  return crypto.randomUUID ? crypto.randomUUID() : 
    Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export async function addAuditLog(userId: number, userName: string, role: string, action: string, details: string) {
  await db.auditLogs.add({
    userId,
    userName,
    role,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}

export async function addNotification(userId: number, title: string, message: string, type: Notification['type']) {
  await db.notifications.add({
    userId,
    title,
    message,
    type,
    isRead: false,
    createdAt: new Date().toISOString()
  });
}
