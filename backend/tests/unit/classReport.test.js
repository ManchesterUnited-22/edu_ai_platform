import { jest } from '@jest/globals';
import { buildClassReport, getClassReport } from '../../src/services/progress/classReportService.js';

const opts = ['a', 'b', 'c', 'd'];
const q1 = { id: 'q1', text: 'Câu 1', topic: 'A', options: opts, correctIndex: 1 };
const q2 = { id: 'q2', text: 'Câu 2', topic: 'B', options: opts, correctIndex: 2 };

const students = [
  { id: 's1', fullName: 'An' },
  { id: 's2', fullName: 'Bình' },
  { id: 's3', fullName: 'Chi' },
];
const quizzes = [{ id: 'z1', title: 'KT 1' }];
const attempts = [
  { studentId: 's1', quizId: 'z1', score: 5, answers: { q1: 1, q2: 0 } },
  { studentId: 's1', quizId: 'z1', score: 10, answers: { q1: 1, q2: 2 } },
  { studentId: 's2', quizId: 'z1', score: 0, answers: { q1: 0, q2: 0 } },
];
const questionsByQuiz = new Map([['z1', [q1, q2]]]);
const practice = [
  { studentId: 's1', score: 8 },
  { studentId: 's1', score: 6 },
  { studentId: 's2', score: 4 },
];
const qa = { total: 10, refused: 4, openReports: 2, recentRefused: [{ question: 'Thủ đô Pháp?', createdAt: new Date() }] };

describe('buildClassReport', () => {
  const report = buildClassReport({ students, quizzes, attempts, questionsByQuiz, practice, qa });

  test('tổng quan: sĩ số, điểm trung bình theo điểm tốt nhất mỗi em', () => {
    expect(report.summary).toEqual({
      studentCount: 3,
      quizCount: 1,
      average: 5, // s1 tốt nhất 10, s2 tốt nhất 0
      highest: 10,
      lowest: 0,
      practiceCount: 3,
    });
  });

  test('từng học sinh, kể cả em chưa làm bài nào', () => {
    const byName = Object.fromEntries(report.students.map((s) => [s.fullName, s]));
    expect(byName.An).toMatchObject({ quizzesTaken: 1, officialAverage: 10, practiceCount: 2 });
    expect(byName.Bình).toMatchObject({ quizzesTaken: 1, officialAverage: 0, practiceCount: 1 });
    expect(byName.Chi).toMatchObject({ quizzesTaken: 0, officialAverage: null, practiceCount: 0 });
  });

  test('từng bài kiểm tra: tỉ lệ hoàn thành trên sĩ số cả lớp', () => {
    expect(report.quizzes[0]).toMatchObject({ quizId: 'z1', students: 2, completionRate: 0.67, average: 5 });
  });

  test('chủ đề yếu và câu hỏi khó của cả lớp', () => {
    // A: 2/3 = 0.67 (không yếu); B: 1/3 = 0.33 (yếu)
    expect(report.weakTopics.map((t) => t.topic)).toEqual(['B']);
    expect(report.topics.find((t) => t.topic === 'A')).toMatchObject({ correct: 2, total: 3, weak: false });
    expect(report.hardQuestions[0]).toMatchObject({ questionId: 'q2', accuracy: 0.33, total: 3 });
  });

  test('chất lượng hỏi-đáp: tỉ lệ từ chối và câu học sinh hỏi mà chưa có tài liệu', () => {
    expect(report.qa).toMatchObject({ total: 10, refused: 4, refusalRate: 0.4, openReports: 2 });
    expect(report.qa.recentRefusedQuestions[0].question).toBe('Thủ đô Pháp?');
  });

  test('lớp mới tinh: không chia cho 0', () => {
    const empty = buildClassReport({
      students: [], quizzes: [], attempts: [], questionsByQuiz: new Map(), practice: [],
      qa: { total: 0, refused: 0, openReports: 0, recentRefused: [] },
    });
    expect(empty.summary).toMatchObject({ studentCount: 0, average: null, highest: null, lowest: null });
    expect(empty.qa.refusalRate).toBe(0);
    expect(empty.hardQuestions).toEqual([]);
  });
});

describe('getClassReport (đọc dữ liệu đúng lớp)', () => {
  test('mọi truy vấn đều bị giới hạn theo classId', async () => {
    const prisma = {
      enrollment: { findMany: jest.fn(async () => students.map((student) => ({ student }))) },
      quiz: { findMany: jest.fn(async () => quizzes) },
      quizAttempt: { findMany: jest.fn(async () => attempts) },
      practiceQuiz: { findMany: jest.fn(async () => practice) },
      qaLog: {
        count: jest.fn(async ({ where }) => (where.refused ? 4 : 10)),
        findMany: jest.fn(async () => qa.recentRefused),
      },
      answerReport: { count: jest.fn(async () => 2) },
      quizQuestion: {
        findMany: jest.fn(async () => [
          { quizId: 'z1', question: q1 },
          { quizId: 'z1', question: q2 },
        ]),
      },
    };
    const report = await getClassReport({ classId: 'c1' }, { prisma });

    expect(report.summary.studentCount).toBe(3);
    expect(report.weakTopics[0].topic).toBe('B');
    expect(prisma.enrollment.findMany.mock.calls[0][0].where).toEqual({ classId: 'c1' });
    expect(prisma.quizAttempt.findMany.mock.calls[0][0].where).toMatchObject({ quiz: { classId: 'c1' } });
    expect(prisma.practiceQuiz.findMany.mock.calls[0][0].where).toMatchObject({ classId: 'c1' });
    expect(prisma.answerReport.count.mock.calls[0][0].where).toMatchObject({ qaLog: { classId: 'c1' } });
    expect(prisma.qaLog.findMany.mock.calls[0][0].where).toMatchObject({ classId: 'c1', refused: true });
  });
});