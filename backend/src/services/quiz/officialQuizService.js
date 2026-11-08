// Quiz chính thức - phía học sinh: bắt đầu, lưu đáp án, nộp bài, xem kết quả, khóa chat.
// Đồng hồ do SERVER tính (startedAt + thời lượng); client không thể tự kéo dài thời gian.
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { gradeAnswers } from './scoring.js';

/** Cho phép nộp trễ vài giây do độ trễ mạng. Quá ngưỡng này thì chỉ tính đáp án đã lưu trước đó. */
export const SUBMIT_GRACE_MS = 30_000;

const clock = (deps) => (deps.now ?? (() => new Date()))();

/** Hạn chót của một lượt làm bài: hết thời lượng hoặc tới giờ đóng quiz, cái nào đến trước. */
export function attemptDeadline({ startedAt, durationMinutes, closesAt }) {
  const byDuration = new Date(startedAt).getTime() + durationMinutes * 60_000;
  const byClose = closesAt ? new Date(closesAt).getTime() : Number.POSITIVE_INFINITY;
  return new Date(Math.min(byDuration, byClose));
}

const deadlineOf = (attempt) => attemptDeadline({ ...attempt.quiz, startedAt: attempt.startedAt });

// ---------- đọc dữ liệu ----------

/** Toàn bộ câu hỏi của quiz theo thứ tự (kèm đáp án - chỉ dùng nội bộ để chấm). */
async function loadQuizQuestions(prisma, quizId) {
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId },
    orderBy: { position: 'asc' },
    include: { question: true },
  });
  return rows.map((r) => r.question);
}

/** Chỉ những trường học sinh được thấy khi đang làm bài: KHÔNG có đáp án đúng và lời giải. */
const toStudentQuestion = (q) => ({
  id: q.id,
  text: q.text,
  options: q.options,
  topic: q.topic ?? null,
  difficulty: q.difficulty,
});

async function loadPublishedQuizForStudent(prisma, quizId, user) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      class: { select: { enrollments: { where: { studentId: user.id }, select: { id: true } } } },
    },
  });
  if (!quiz || quiz.status !== 'published') {
    throw new AppError('Không tìm thấy bài kiểm tra', 404, 'QUIZ_NOT_FOUND');
  }
  if (quiz.class.enrollments.length === 0) {
    throw new AppError('Bạn không thuộc lớp của bài kiểm tra này', 403, 'FORBIDDEN');
  }
  return quiz;
}

async function loadOwnAttempt(prisma, attemptId, studentId) {
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: { quiz: true },
  });
  // Không phải của mình thì coi như không tồn tại
  if (!attempt || attempt.studentId !== studentId) {
    throw new AppError('Không tìm thấy lượt làm bài', 404, 'ATTEMPT_NOT_FOUND');
  }
  return attempt;
}

// ---------- chấm và chốt bài ----------

/** Chốt bài đã hết giờ: chấm theo đáp án đã lưu, ghi nhận nộp vào đúng thời điểm hết giờ. */
export async function finalizeAttempt(prisma, attempt, deps = {}) {
  const questions = await loadQuizQuestions(prisma, attempt.quizId);
  const answers = attempt.answers ?? {};
  const graded = gradeAnswers(questions, answers);
  const submittedAt = deps.submittedAt ?? deadlineOf(attempt);

  const { count } = await prisma.quizAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: { answers, score: graded.score, submittedAt },
  });
  return { finalized: count > 0, graded };
}

/** Bài đang làm dở của học sinh; bài đã quá hạn thì chốt luôn. Trả về danh sách bài CÒN hạn. */
async function activeAttempts(prisma, studentId, deps) {
  const open = await prisma.quizAttempt.findMany({
    where: { studentId, submittedAt: null },
    include: { quiz: true },
  });
  const now = clock(deps);
  const active = [];
  for (const attempt of open) {
    if (now > deadlineOf(attempt)) await finalizeAttempt(prisma, attempt);
    else active.push(attempt);
  }
  return active;
}

/** Dùng cho middleware khóa chat: chỉ ĐỌC, không sửa dữ liệu. */
export async function hasActiveAttempt(studentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const open = await prisma.quizAttempt.findMany({
    where: { studentId, submittedAt: null },
    include: { quiz: true },
  });
  const now = clock(deps);
  return open.some((attempt) => now <= deadlineOf(attempt));
}

// ---------- hiển thị ----------

function inProgressView(attempt, questions) {
  return {
    status: 'in_progress',
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      attemptNo: attempt.attemptNo,
      startedAt: attempt.startedAt,
      deadline: deadlineOf(attempt),
      answers: attempt.answers ?? {},
    },
    quiz: { id: attempt.quiz.id, title: attempt.quiz.title, durationMinutes: attempt.quiz.durationMinutes },
    questions: questions.map(toStudentQuestion),
  };
}

function resultView(attempt, questions) {
  const graded = gradeAnswers(questions, attempt.answers ?? {});
  const byId = new Map(graded.details.map((d) => [d.questionId, d]));
  return {
    status: 'submitted',
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      attemptNo: attempt.attemptNo,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      score: attempt.score ?? graded.score,
      correct: graded.correct,
      total: graded.total,
    },
    quiz: { id: attempt.quiz.id, title: attempt.quiz.title },
    // Chỉ SAU KHI nộp bài mới lộ đáp án đúng và lời giải
    questions: questions.map((q) => ({
      ...toStudentQuestion(q),
      selected: byId.get(q.id).selected,
      correctIndex: q.correctIndex,
      isCorrect: byId.get(q.id).isCorrect,
      explanation: q.explanation ?? null,
    })),
  };
}

// ---------- thao tác của học sinh ----------

export async function startAttempt({ user, quizId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);

  const quiz = await loadPublishedQuizForStudent(prisma, quizId, user);
  const active = await activeAttempts(prisma, user.id, deps);

  const resumable = active.find((a) => a.quizId === quizId);
  if (resumable) {
    return inProgressView(resumable, await loadQuizQuestions(prisma, quizId));
  }
  if (active.length > 0) {
    throw new AppError('Bạn đang làm một bài kiểm tra khác, hãy nộp bài đó trước', 409, 'ANOTHER_QUIZ_IN_PROGRESS');
  }

  if (quiz.opensAt && now < new Date(quiz.opensAt)) {
    throw new AppError('Bài kiểm tra chưa mở', 409, 'QUIZ_NOT_OPEN');
  }
  if (quiz.closesAt && now > new Date(quiz.closesAt)) {
    throw new AppError('Bài kiểm tra đã đóng', 409, 'QUIZ_CLOSED');
  }

  const used = await prisma.quizAttempt.count({ where: { quizId, studentId: user.id } });
  if (used >= quiz.maxAttempts) {
    throw new AppError(`Bạn đã dùng hết ${quiz.maxAttempts} lượt làm bài`, 409, 'NO_ATTEMPTS_LEFT');
  }

  let attempt;
  try {
    attempt = await prisma.quizAttempt.create({
      data: { quizId, studentId: user.id, attemptNo: used + 1, startedAt: now },
      include: { quiz: true },
    });
  } catch (error) {
    // Bấm "bắt đầu" hai lần cùng lúc: bản ghi thứ hai vi phạm ràng buộc duy nhất -> dùng lại lượt vừa tạo
    if (error.code !== 'P2002') throw error;
    const again = (await activeAttempts(prisma, user.id, deps)).find((a) => a.quizId === quizId);
    if (!again) throw error;
    attempt = again;
  }
  return inProgressView(attempt, await loadQuizQuestions(prisma, quizId));
}

export async function saveAnswers({ user, attemptId, answers }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const attempt = await loadOwnAttempt(prisma, attemptId, user.id);

  if (attempt.submittedAt) {
    throw new AppError('Bài đã được nộp', 409, 'ALREADY_SUBMITTED');
  }
  if (now.getTime() > deadlineOf(attempt).getTime() + SUBMIT_GRACE_MS) {
    await finalizeAttempt(prisma, attempt);
    throw new AppError('Đã hết giờ làm bài', 409, 'ATTEMPT_EXPIRED');
  }

  const questions = await loadQuizQuestions(prisma, attempt.quizId);
  const valid = new Set(questions.map((q) => q.id));
  const incoming = Object.fromEntries(Object.entries(answers ?? {}).filter(([id]) => valid.has(id)));
  const merged = { ...(attempt.answers ?? {}), ...incoming };

  const { count } = await prisma.quizAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: { answers: merged },
  });
  if (count === 0) throw new AppError('Bài đã được nộp', 409, 'ALREADY_SUBMITTED');
  return { saved: Object.keys(merged).length };
}

export async function submitAttempt({ user, attemptId, answers }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  const attempt = await loadOwnAttempt(prisma, attemptId, user.id);

  if (attempt.submittedAt) {
    throw new AppError('Bài đã được nộp', 409, 'ALREADY_SUBMITTED');
  }

  const questions = await loadQuizQuestions(prisma, attempt.quizId);
  const valid = new Set(questions.map((q) => q.id));
  const saved = attempt.answers ?? {};
  const late = now.getTime() > deadlineOf(attempt).getTime() + SUBMIT_GRACE_MS;

  // Nộp trễ: bỏ qua đáp án gửi kèm, chỉ tính những gì đã lưu trước hạn
  const incoming = late
    ? {}
    : Object.fromEntries(Object.entries(answers ?? {}).filter(([id]) => valid.has(id)));
  const finalAnswers = { ...saved, ...incoming };
  const graded = gradeAnswers(questions, finalAnswers);

  const { count } = await prisma.quizAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: {
      answers: finalAnswers,
      score: graded.score,
      submittedAt: late ? deadlineOf(attempt) : now,
    },
  });
  if (count === 0) throw new AppError('Bài đã được nộp', 409, 'ALREADY_SUBMITTED');

  const fresh = await loadOwnAttempt(prisma, attemptId, user.id);
  return { ...resultView(fresh, questions), late };
}

export async function getAttempt({ user, attemptId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const now = clock(deps);
  let attempt = await loadOwnAttempt(prisma, attemptId, user.id);

  if (!attempt.submittedAt && now > deadlineOf(attempt)) {
    await finalizeAttempt(prisma, attempt);
    attempt = await loadOwnAttempt(prisma, attemptId, user.id);
  }
  const questions = await loadQuizQuestions(prisma, attempt.quizId);
  return attempt.submittedAt ? resultView(attempt, questions) : inProgressView(attempt, questions);
}

export async function listMyAttempts({ user, quizId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  await loadPublishedQuizForStudent(prisma, quizId, user);
  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, studentId: user.id },
    orderBy: { attemptNo: 'asc' },
    select: { id: true, attemptNo: true, score: true, startedAt: true, submittedAt: true },
  });
  return attempts;
}