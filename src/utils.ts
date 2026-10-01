import { db, Test, Question, TestAttempt, StudentAnswer, addNotification } from './db';

export interface ParsedQuestion {
  number: number;
  text: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
}

export interface ParseError {
  questionNumber: number;
  message: string;
  expected: string;
}

export function parseMCQText(text: string): { questions: ParsedQuestion[]; errors: ParseError[] } {
  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];

  // Normalize text: remove markdown, extra spaces, normalize line endings
  let normalized = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\*\*/g, '')
    .replace(/---+/g, '\n')
    .replace(/___+/g, '\n')
    .replace(/\t/g, '  ');

  // Split into question blocks - look for numbered questions
  const questionBlocks = normalized.split(/(?=(?:^|\n)\s*\d+[\.\)\:]\s)/);

  let questionNum = 0;

  for (const block of questionBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    // Extract question number
    const numMatch = trimmed.match(/^(\d+)\s*[\.\)\:]\s*/);
    if (!numMatch) continue;

    questionNum++;
    const currentNum = parseInt(numMatch[1]);

    // Remove the number prefix
    let content = trimmed.replace(/^\d+\s*[\.\)\:]\s*/, '');

    // Extract options - look for A), B), C), D) patterns
    const optionPattern = /(?:^|\n)\s*[A-Da-d]\s*[\.\)\:]\s*/g;
    const optionMatches = [...content.matchAll(optionPattern)];

    if (optionMatches.length < 4) {
      errors.push({
        questionNumber: currentNum,
        message: `Question ${currentNum} has fewer than 4 options. Found ${optionMatches.length} options.`,
        expected: 'Each question must have exactly 4 options labeled A), B), C), D)'
      });
      continue;
    }

    // Extract question text (before first option)
    const firstOptionIndex = content.search(/(?:^|\n)\s*[A-Da-d]\s*[\.\)\:]\s*/);
    const questionText = content.substring(0, firstOptionIndex).trim();

    if (!questionText) {
      errors.push({
        questionNumber: currentNum,
        message: `Question ${currentNum} has no question text.`,
        expected: 'Each question must have question text before the options.'
      });
      continue;
    }

    // Extract each option
    const options: { [key: string]: string } = {};
    const letters = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < 4; i++) {
      const startMatch = optionMatches[i];
      const endMatch = i < 3 ? optionMatches[i + 1] : null;

      const startIdx = startMatch.index! + startMatch[0].length;
      const endIdx = endMatch ? endMatch.index! : content.length;

      let optionText = content.substring(startIdx, endIdx).trim();
      // Clean up the option text
      optionText = optionText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      options[letters[i]] = optionText;
    }

    // Extract correct answer
    let correctAnswer = '';
    const answerPatterns = [
      /correct\s*answer\s*[\:\:]?\s*([A-Da-d])/i,
      /answer\s*[\:\:]?\s*([A-Da-d])/i,
      /ans\s*[\:\:]?\s*([A-Da-d])/i,
    ];

    for (const pattern of answerPatterns) {
      const match = content.match(pattern);
      if (match) {
        correctAnswer = match[1].toUpperCase();
        break;
      }
    }

    if (!correctAnswer) {
      errors.push({
        questionNumber: currentNum,
        message: `Question ${currentNum} has no correct answer specified.`,
        expected: 'Add "Correct Answer: A" (or B, C, D) after the options.'
      });
      continue;
    }

    // Validate correct answer matches one of the options
    if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
      errors.push({
        questionNumber: currentNum,
        message: `Question ${currentNum} has invalid correct answer "${correctAnswer}".`,
        expected: 'Correct answer must be A, B, C, or D.'
      });
      continue;
    }

    questions.push({
      number: currentNum,
      text: questionText,
      options: { A: options.A, B: options.B, C: options.C, D: options.D },
      correctAnswer
    });
  }

  if (questions.length === 0 && errors.length === 0) {
    errors.push({
      questionNumber: 0,
      message: 'No questions could be parsed from the provided text.',
      expected: 'Format: 1. Question text\\nA) Option A\\nB) Option B\\nC) Option C\\nD) Option D\\nCorrect Answer: A'
    });
  }

  return { questions, errors };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export async function calculateResult(attemptId: number, testId: number): Promise<{
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
}> {
  const test = await db.tests.get(testId);
  if (!test) throw new Error('Test not found');

  const answers = await db.studentAnswers.where('attemptId').equals(attemptId).toArray();
  const questions = await db.questions.where('testId').equals(testId).toArray();

  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  let obtainedMarks = 0;

  for (const question of questions) {
    const answer = answers.find(a => a.questionId === question.id);
    
    if (!answer || !answer.selectedAnswer) {
      unansweredCount++;
    } else if (answer.selectedAnswer === question.correctAnswer) {
      correctCount++;
      obtainedMarks += test.marksPerQuestion;
    } else {
      wrongCount++;
      obtainedMarks -= test.negativeMarking;
    }
  }

  const totalMarks = questions.length * test.marksPerQuestion;
  const percentage = totalMarks > 0 ? Math.max(0, (obtainedMarks / totalMarks) * 100) : 0;

  return { totalMarks, obtainedMarks, percentage: Math.round(percentage * 100) / 100, correctCount, wrongCount, unansweredCount };
}

export async function submitTest(attemptId: number): Promise<void> {
  const attempt = await db.testAttempts.get(attemptId);
  if (!attempt) throw new Error('Attempt not found');

  if (attempt.status === 'submitted' || attempt.status === 'auto_submitted') {
    throw new Error('Test already submitted');
  }

  const test = await db.tests.get(attempt.testId);
  if (!test) throw new Error('Test not found');

  // Calculate and update results
  const results = await calculateResult(attemptId, attempt.testId);

  await db.testAttempts.update(attemptId, {
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    ...results
  });

  // Update all answers with correctness
  const answers = await db.studentAnswers.where('attemptId').equals(attemptId).toArray();
  const questions = await db.questions.where('testId').equals(test.id!).toArray();

  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (question) {
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      let marks = 0;
      if (!answer.selectedAnswer) {
        marks = 0;
      } else if (isCorrect) {
        marks = test.marksPerQuestion;
      } else {
        marks = -test.negativeMarking;
      }
      await db.studentAnswers.update(answer.id!, { isCorrect, marksObtained: marks });
    }
  }

  // Notify student if results are immediate
  if (test.showResultImmediately) {
    await addNotification(
      attempt.studentId,
      'Result Available',
      `Your result for "${test.title}" is now available.`,
      'result_available'
    );
  }
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTimeRemaining(endTime: string, duration: number, startTime: string): { minutes: number; seconds: number; total: number } {
  const now = Date.now();
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const elapsed = now - start;
  const durationMs = duration * 60 * 1000;
  
  const remainingByDuration = durationMs - elapsed;
  const remainingByEndTime = end - now;
  
  const total = Math.min(remainingByDuration, remainingByEndTime);
  
  if (total <= 0) return { minutes: 0, seconds: 0, total: 0 };
  
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  
  return { minutes, seconds, total };
}

export function exportToCSV(data: any[], filename: string): void {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToJSON(data: any[], filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
