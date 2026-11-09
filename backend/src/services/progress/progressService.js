// Tiến độ học tập: điểm theo thời gian và chủ đề yếu
import defaultPrisma from '../../config/db.js';
import { gradeAnswers, summarizeByTopic } from '../quiz/scoring.js';

/** Chủ đề bị coi là yếu khi đúng dưới 60% (và đã có đủ số câu để kết luận). */
export const WEAK_ACCURACY = 0.6;
export const MIN_ANSWERS = 3;

const round2 = (n) => Math.round(n * 100) / 100;

export const mean = (values) =>
  values.length ? round2(values.reduce((sum, v) => sum + v, 0) / values.length) : null;

/** Cộng dồn thống kê theo chủ đề: { "Quang hợp": {correct, total} }. */
export function mergeTopicStats(target, source) {
  for (const [topic, { correct, total }] of Object.entries(source)) {
    target[topic] ??= { correct: 0, total: 0 };
    target[topic].correct += correct;
    target[topic].total += total;
  }
  return target;
}

/** Biến thống kê thành danh sách có tỉ lệ đúng, sắp từ yếu nhất; gắn cờ `weak`. */
export function toTopicList(stats, { weakAccuracy = WEAK_ACCURACY, minAnswers = MIN_ANSWERS } = {}) {
  return Object.entries(stats)
    .map(([topic, { correct, total }]) => {
      const accuracy = total ? round2(correct / total) : 0;
      return { topic, correct, total, accuracy, weak: total >= minAnswers && accuracy < weakAccuracy };
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

/** quizId -> danh sách câu hỏi (đủ trường để chấm). */
export function groupQuestionsByQuiz(rows) {
  const map = new Map();
  for (const { quizId, question } of rows) {
    if (!map.has(quizId)) map.set(quizId, []);
    map.get(quizId).push(question);
  }
  return map;
}

/** Thống kê chủ đề từ các lượt quiz chính thức đã nộp. */
export function topicStatsFromAttempts(attempts, questionsByQuiz) {
  const stats = {};
  for (const attempt of attempts) {
    const questions = questionsByQuiz.get(attempt.quizId) ?? [];
    const { details } = gradeAnswers(questions, attempt.answers ?? {});
    mergeTopicStats(stats, summarizeByTopic(details));
  }
  return stats;
}

/** Điểm tốt nhất của mỗi học sinh ở mỗi quiz: Map("studentId|quizId" -> điểm). */
export function bestScores(attempts) {
  const best = new Map();
  for (const a of attempts) {
    const key = `${a.studentId}|${a.quizId}`;
    best.set(key, Math.max(best.get(key) ?? 0, a.score ?? 0));
  }
  return best;
}

export async function loadQuestionsByQuiz(prisma, quizIds) {
  if (quizIds.length === 0) return new Map();
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId: { in: quizIds } },
    orderBy: { position: 'asc' },
    select: {
      quizId: true,
      question: { select: { id: true, text: true, topic: true, options: true, correctIndex: true } },
    },
  });
  return groupQuestionsByQuiz(rows);
}

/**
 * Tiến độ của MỘT học sinh trong MỘT lớp. Nhận studentId tường minh để phụ huynh/giáo viên
 * dùng lại được sau khi đã kiểm tra quyền xem.
 */
export async function getStudentProgress({ studentId, classId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const [attempts, practices] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { studentId, submittedAt: { not: null }, quiz: { classId } },
      orderBy: { submittedAt: 'asc' },
      select: {
        id: true,
        quizId: true,
        studentId: true,
        attemptNo: true,
        score: true,
        answers: true,
        submittedAt: true,
        quiz: { select: { title: true } },
      },
    }),
    prisma.practiceQuiz.findMany({
      where: { studentId, classId, submittedAt: { not: null } },
      orderBy: { submittedAt: 'asc' },
      select: { id: true, topic: true, score: true, questions: true, answers: true, submittedAt: true },
    }),
  ]);

  const questionsByQuiz = await loadQuestionsByQuiz(prisma, [...new Set(attempts.map((a) => a.quizId))]);

  // Chủ đề: gộp cả quiz chính thức và quiz luyện tập
  const stats = topicStatsFromAttempts(attempts, questionsByQuiz);
  for (const p of practices) {
    const { details } = gradeAnswers(p.questions, p.answers ?? {});
    mergeTopicStats(stats, summarizeByTopic(details));
  }
  const topics = toTopicList(stats);

  const bestPerQuiz = [...bestScores(attempts).values()];
  return {
    official: {
      count: attempts.length,
      average: mean(bestPerQuiz), // trung bình điểm tốt nhất của từng bài kiểm tra
      attempts: attempts.map((a) => ({
        attemptId: a.id,
        quizId: a.quizId,
        quizTitle: a.quiz.title,
        attemptNo: a.attemptNo,
        score: a.score,
        submittedAt: a.submittedAt,
      })),
    },
    practice: {
      count: practices.length,
      average: mean(practices.map((p) => p.score ?? 0)),
      recent: practices
        .slice(-10)
        .map((p) => ({ id: p.id, topic: p.topic, score: p.score, submittedAt: p.submittedAt })),
    },
    topics,
    weakTopics: topics.filter((t) => t.weak),
  };
}