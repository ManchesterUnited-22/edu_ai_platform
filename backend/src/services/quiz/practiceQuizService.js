// Quiz luyện tập học sinh TỰ TẠO từ tài liệu đã xuất bản. Không tính điểm chính thức, có hạn mức mỗi ngày.
import { randomUUID } from 'node:crypto';
import defaultPrisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { nextResetVN, startOfDayVN } from '../../utils/quota.js';
import { filterGeneratedQuestions, requestRawQuestions } from '../generation/questionService.js';
import { loadSourceChunks } from '../generation/sourceChunks.js';
import { gradeAnswers } from './scoring.js';

const clock = (deps) => (deps.now ?? (() => new Date()))();
const dailyLimit = (deps) => deps.limit ?? env.PRACTICE_QUIZ_PER_DAY;

/** Chỉ những trường học sinh được thấy khi đang làm: KHÔNG có đáp án đúng, lời giải, nguồn. */
const toStudentQuestion = (q) => ({
  id: q.id,
  text: q.text,
  options: q.options,
  topic: q.topic ?? null,
  difficulty: q.difficulty,
});

function resultView(practice) {
  const graded = gradeAnswers(practice.questions, practice.answers ?? {});
  const byId = new Map(graded.details.map((d) => [d.questionId, d]));
  return {
    status: 'submitted',
    practice: {
      id: practice.id,
      classId: practice.classId,
      topic: practice.topic,
      score: practice.score ?? graded.score,
      correct: graded.correct,
      total: graded.total,
      submittedAt: practice.submittedAt,
    },
    questions: practice.questions.map((q) => ({
      ...toStudentQuestion(q),
      selected: byId.get(q.id).selected,
      correctIndex: q.correctIndex,
      isCorrect: byId.get(q.id).isCorrect,
      explanation: q.explanation ?? null,
      source: q.source ?? null, // chỉ lộ sau khi nộp: để học sinh mở lại đúng chỗ trong tài liệu
    })),
  };
}

function inProgressView(practice, quota) {
  return {
    status: 'in_progress',
    practice: { id: practice.id, classId: practice.classId, topic: practice.topic, createdAt: practice.createdAt },
    questions: practice.questions.map(toStudentQuestion),
    ...(quota ?? {}),
  };
}

async function usedToday(prisma, studentId, now) {
  return prisma.practiceQuiz.count({
    where: { studentId, createdAt: { gte: startOfDayVN(now) } },
  });
}

const quotaInfo = (limit, used, now) => ({
  quota: { limit, used, remaining: Math.max(0, limit - used), resetsAt: nextResetVN(now) },
});

const limitReached = (limit) =>
  new AppError(
    `Bạn đã tạo đủ ${limit} quiz luyện tập hôm nay. Hạn mức được làm mới lúc 0 giờ.`,
    429,
    'DAILY_LIMIT_REACHED',
  );

export async function getPracticeQuota({ studentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  return quotaInfo(dailyLimit(deps), await usedToday(prisma, studentId, now), now).quota;
}

export async function createPracticeQuiz({ user, classId, count = 5, topic }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const limit = dailyLimit(deps);

  if ((await usedToday(prisma, user.id, now)) >= limit) throw limitReached(limit);

  // Lấy chỗ TRƯỚC khi gọi AI (tốn tiền): nhiều yêu cầu song song cũng không vượt được hạn mức
  const placeholder = await prisma.practiceQuiz.create({
    data: { studentId: user.id, classId, topic: topic ?? null, questions: [] },
    select: { id: true },
  });

  try {
    if ((await usedToday(prisma, user.id, now)) > limit) throw limitReached(limit);

    const chunks = await loadSourceChunks({ classId, publishedOnly: true }, deps);
    const raw = await requestRawQuestions({ chunks, count, topic }, deps);
    const { accepted } = filterGeneratedQuestions(raw, chunks, { count, random: deps.random });
    if (accepted.length === 0) {
      throw new AppError('AI không soạn được câu hỏi hợp lệ nào, hãy thử lại', 502, 'GENERATION_INVALID');
    }

    const questions = accepted.map((q) => {
      const chunk = chunks[q.sourceIndex];
      return {
        id: randomUUID(),
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        topic: q.topic || null,
        difficulty: q.difficulty,
        source: { chunkId: chunk.id, fileName: chunk.fileName, pageNumber: chunk.pageNumber ?? null },
      };
    });

    const saved = await prisma.practiceQuiz.update({
      where: { id: placeholder.id },
      data: { questions },
      select: { id: true, classId: true, topic: true, questions: true, createdAt: true },
    });
    const used = await usedToday(prisma, user.id, now);
    return inProgressView(saved, quotaInfo(limit, used, now));
  } catch (error) {
    // Tạo không thành công thì KHÔNG tốn lượt của học sinh
    await prisma.practiceQuiz.delete({ where: { id: placeholder.id } }).catch(() => {});
    throw error;
  }
}

export async function listPracticeQuizzes({ user, classId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const items = await prisma.practiceQuiz.findMany({
    where: { studentId: user.id, classId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: { id: true, topic: true, score: true, createdAt: true, submittedAt: true },
  });
  return { practiceQuizzes: items, ...quotaInfo(dailyLimit(deps), await usedToday(prisma, user.id, now), now) };
}

async function loadOwnPractice(prisma, practiceId, studentId) {
  const practice = await prisma.practiceQuiz.findUnique({ where: { id: practiceId } });
  // Của người khác, hoặc bản nháp chưa có câu hỏi, đều coi như không tồn tại
  if (!practice || practice.studentId !== studentId || practice.questions.length === 0) {
    throw new AppError('Không tìm thấy quiz luyện tập', 404, 'PRACTICE_NOT_FOUND');
  }
  return practice;
}

export async function getPracticeQuiz({ user, practiceId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const practice = await loadOwnPractice(prisma, practiceId, user.id);
  return practice.submittedAt ? resultView(practice) : inProgressView(practice);
}

export async function submitPracticeQuiz({ user, practiceId, answers }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const practice = await loadOwnPractice(prisma, practiceId, user.id);

  if (practice.submittedAt) throw new AppError('Bạn đã nộp quiz này rồi', 409, 'ALREADY_SUBMITTED');

  const valid = new Set(practice.questions.map((q) => q.id));
  const finalAnswers = Object.fromEntries(Object.entries(answers ?? {}).filter(([id]) => valid.has(id)));
  const graded = gradeAnswers(practice.questions, finalAnswers);

  const { count } = await prisma.practiceQuiz.updateMany({
    where: { id: practice.id, submittedAt: null },
    data: { answers: finalAnswers, score: graded.score, submittedAt: now },
  });
  if (count === 0) throw new AppError('Bạn đã nộp quiz này rồi', 409, 'ALREADY_SUBMITTED');

  return resultView({ ...practice, answers: finalAnswers, score: graded.score, submittedAt: now });
}