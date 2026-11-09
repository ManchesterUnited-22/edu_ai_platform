// Báo cáo lớp cho giáo viên: sĩ số, điểm số, chủ đề yếu, chất lượng hỏi-đáp
import defaultPrisma from '../../config/db.js';
import {
  bestScores,
  loadQuestionsByQuiz,
  mean,
  topicStatsFromAttempts,
  toTopicList,
} from './progressService.js';

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Hàm thuần: ghép dữ liệu đã đọc thành báo cáo (dễ test, không phụ thuộc DB).
 * @param {object} data
 *   students: {id, fullName}[]; quizzes: {id, title}[]; attempts: đã nộp, kèm studentId/quizId/score/answers;
 *   questionsByQuiz: Map; practice: {studentId, score}[]; qa: {total, refused, openReports, recentRefused}
 */
export function buildClassReport({ students, quizzes, attempts, questionsByQuiz, practice, qa }) {
  const best = bestScores(attempts);

  // ----- từng học sinh -----
  const studentRows = students.map((s) => {
    const scores = [...best.entries()].filter(([key]) => key.startsWith(`${s.id}|`)).map(([, v]) => v);
    const mine = practice.filter((p) => p.studentId === s.id);
    return {
      studentId: s.id,
      fullName: s.fullName,
      quizzesTaken: scores.length,
      officialAverage: mean(scores),
      practiceCount: mine.length,
    };
  });

  // ----- từng bài kiểm tra -----
  const quizRows = quizzes.map((quiz) => {
    const scores = [...best.entries()]
      .filter(([key]) => key.endsWith(`|${quiz.id}`))
      .map(([, v]) => v);
    return {
      quizId: quiz.id,
      title: quiz.title,
      students: scores.length,
      completionRate: students.length ? round2(scores.length / students.length) : 0,
      average: mean(scores),
    };
  });

  // ----- chủ đề yếu và câu hỏi khó (toàn lớp) -----
  const topics = toTopicList(topicStatsFromAttempts(attempts, questionsByQuiz));

  const perQuestion = new Map();
  for (const attempt of attempts) {
    for (const q of questionsByQuiz.get(attempt.quizId) ?? []) {
      const stat = perQuestion.get(q.id) ?? { questionId: q.id, text: q.text ?? null, topic: q.topic ?? null, correct: 0, total: 0 };
      stat.total += 1;
      if (attempt.answers?.[q.id] === q.correctIndex) stat.correct += 1;
      perQuestion.set(q.id, stat);
    }
  }
  const hardQuestions = [...perQuestion.values()]
    .filter((q) => q.total >= 3)
    .map((q) => ({ ...q, accuracy: round2(q.correct / q.total) }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const allBest = [...best.values()];
  return {
    summary: {
      studentCount: students.length,
      quizCount: quizzes.length,
      average: mean(allBest),
      highest: allBest.length ? Math.max(...allBest) : null,
      lowest: allBest.length ? Math.min(...allBest) : null,
      practiceCount: practice.length,
    },
    students: studentRows,
    quizzes: quizRows,
    weakTopics: topics.filter((t) => t.weak),
    topics,
    hardQuestions,
    qa: {
      total: qa.total,
      refused: qa.refused,
      refusalRate: qa.total ? round2(qa.refused / qa.total) : 0,
      openReports: qa.openReports,
      // Câu học sinh hỏi mà chưa có tài liệu: gợi ý giáo viên bổ sung học liệu
      recentRefusedQuestions: qa.recentRefused,
    },
  };
}

export async function getClassReport({ classId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const [enrollments, quizzes, attempts, practice, total, refused, openReports, recentRefused] =
    await Promise.all([
      prisma.enrollment.findMany({
        where: { classId },
        select: { student: { select: { id: true, fullName: true } } },
      }),
      prisma.quiz.findMany({
        where: { classId, status: 'published' },
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true },
      }),
      prisma.quizAttempt.findMany({
        where: { submittedAt: { not: null }, quiz: { classId } },
        select: { studentId: true, quizId: true, score: true, answers: true },
      }),
      prisma.practiceQuiz.findMany({
        where: { classId, submittedAt: { not: null } },
        select: { studentId: true, score: true },
      }),
      prisma.qaLog.count({ where: { classId } }),
      prisma.qaLog.count({ where: { classId, refused: true } }),
      prisma.answerReport.count({ where: { status: 'open', qaLog: { classId } } }),
      prisma.qaLog.findMany({
        where: { classId, refused: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { question: true, createdAt: true },
      }),
    ]);

  const questionsByQuiz = await loadQuestionsByQuiz(prisma, [...new Set(attempts.map((a) => a.quizId))]);
  return buildClassReport({
    students: enrollments.map((e) => e.student),
    quizzes,
    attempts,
    questionsByQuiz,
    practice,
    qa: { total, refused, openReports, recentRefused },
  });
}