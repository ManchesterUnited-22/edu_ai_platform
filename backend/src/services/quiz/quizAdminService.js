// Quiz chính thức - phía giáo viên: tạo từ câu hỏi đã xuất bản, sửa, duyệt/xuất bản, xem kết quả
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { resolveTransition } from '../publishing/stateMachine.js';
import { attemptDeadline, finalizeAttempt } from './officialQuizService.js';

const quizSelect = {
  id: true,
  classId: true,
  title: true,
  durationMinutes: true,
  maxAttempts: true,
  opensAt: true,
  closesAt: true,
  status: true,
  createdAt: true,
  _count: { select: { questions: true, attempts: true } },
};

const clock = (deps) => (deps.now ?? (() => new Date()))();

async function assertQuestionsPublished(prisma, classId, ids) {
  const found = await prisma.question.findMany({
    where: { id: { in: ids }, classId, status: 'published' },
    select: { id: true },
  });
  if (found.length !== ids.length) {
    throw new AppError(
      'Có câu hỏi không thuộc lớp này hoặc chưa được xuất bản',
      400,
      'QUESTIONS_NOT_AVAILABLE',
    );
  }
}

async function loadOwnedQuiz(prisma, quizId, teacherId) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { class: { select: { teacherId: true } }, _count: { select: { attempts: true } } },
  });
  if (!quiz) throw new AppError('Không tìm thấy bài kiểm tra', 404, 'QUIZ_NOT_FOUND');
  if (quiz.class.teacherId !== teacherId) {
    throw new AppError('Bạn không có quyền với bài kiểm tra này', 403, 'FORBIDDEN');
  }
  return quiz;
}

const questionLinks = (ids) => ids.map((questionId, i) => ({ questionId, position: i + 1 }));

export async function createQuiz({ classId, data }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  await assertQuestionsPublished(prisma, classId, data.questionIds);

  return prisma.quiz.create({
    data: {
      classId,
      title: data.title,
      durationMinutes: data.durationMinutes,
      maxAttempts: data.maxAttempts,
      opensAt: data.opensAt ?? null,
      closesAt: data.closesAt ?? null,
      questions: { create: questionLinks(data.questionIds) },
    },
    select: quizSelect,
  });
}

export async function listQuizzes({ user, classId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const isStudent = user.role === 'student';

  return prisma.quiz.findMany({
    where: { classId, ...(isStudent ? { status: 'published' } : {}) },
    orderBy: { createdAt: 'desc' },
    select: {
      ...quizSelect,
      ...(isStudent
        ? {
            attempts: {
              where: { studentId: user.id },
              orderBy: { attemptNo: 'asc' },
              select: { id: true, attemptNo: true, score: true, submittedAt: true },
            },
          }
        : {}),
    },
  });
}

/** Giáo viên xem chi tiết quiz kèm câu hỏi và đáp án. */
export async function getQuizForTeacher({ teacherId, quizId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const quiz = await loadOwnedQuiz(prisma, quizId, teacherId);
  const rows = await prisma.quizQuestion.findMany({
    where: { quizId },
    orderBy: { position: 'asc' },
    include: { question: true },
  });
  const { class: _class, _count, ...rest } = quiz;
  return { ...rest, attemptCount: _count.attempts, questions: rows.map((r) => r.question) };
}

export async function updateQuiz({ teacherId, quizId, patch }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const quiz = await loadOwnedQuiz(prisma, quizId, teacherId);

  if (quiz.status === 'published') {
    throw new AppError('Hãy thu hồi bài kiểm tra trước khi sửa', 409, 'QUIZ_PUBLISHED');
  }
  const { questionIds, ...fields } = patch;

  // Kiểm tra thứ tự giờ mở/đóng sau khi gộp với giá trị đang có
  const opensAt = 'opensAt' in fields ? fields.opensAt : quiz.opensAt;
  const closesAt = 'closesAt' in fields ? fields.closesAt : quiz.closesAt;
  if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) {
    throw new AppError('Giờ đóng phải sau giờ mở', 400, 'VALIDATION_ERROR');
  }
  if (questionIds) await assertQuestionsPublished(prisma, quiz.classId, questionIds);

  const data = { ...fields };
  if (quiz.status === 'reviewed') data.status = 'draft'; // sửa rồi thì phải duyệt lại

  if (questionIds) {
    const [, updated] = await prisma.$transaction([
      prisma.quizQuestion.deleteMany({ where: { quizId } }),
      prisma.quiz.update({
        where: { id: quizId },
        data: { ...data, questions: { create: questionLinks(questionIds) } },
        select: quizSelect,
      }),
    ]);
    return updated;
  }
  return prisma.quiz.update({ where: { id: quizId }, data, select: quizSelect });
}

export async function transitionQuiz({ teacherId, quizId, action }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const quiz = await loadOwnedQuiz(prisma, quizId, teacherId);
  const rule = resolveTransition(action, quiz.status);

  if (action === 'publish') {
    const total = await prisma.quizQuestion.count({ where: { quizId } });
    if (total === 0) throw new AppError('Bài kiểm tra chưa có câu hỏi nào', 409, 'QUIZ_EMPTY');
    // Câu hỏi có thể đã bị thu hồi từ lúc tạo quiz -> kiểm tra lại ngay khi xuất bản
    const unpublished = await prisma.quizQuestion.count({
      where: { quizId, question: { status: { not: 'published' } } },
    });
    if (unpublished > 0) {
      throw new AppError(
        'Có câu hỏi trong bài kiểm tra không còn ở trạng thái xuất bản',
        409,
        'QUIZ_QUESTIONS_NOT_PUBLISHED',
      );
    }
  }
  if (action === 'unpublish' && quiz._count.attempts > 0) {
    throw new AppError(
      'Đã có học sinh làm bài nên không thể thu hồi. Hãy đặt giờ đóng để kết thúc bài kiểm tra.',
      409,
      'QUIZ_HAS_ATTEMPTS',
    );
  }

  const { count } = await prisma.quiz.updateMany({
    where: { id: quizId, status: { in: rule.from } },
    data: { status: rule.to },
  });
  if (count === 0) {
    throw new AppError('Bài kiểm tra vừa bị thay đổi, hãy tải lại rồi thử lại', 409, 'QUIZ_CHANGED');
  }
  return prisma.quiz.findUnique({ where: { id: quizId }, select: quizSelect });
}

export async function deleteQuiz({ teacherId, quizId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const quiz = await loadOwnedQuiz(prisma, quizId, teacherId);

  if (quiz.status === 'published') {
    throw new AppError('Hãy thu hồi bài kiểm tra trước khi xóa', 409, 'QUIZ_PUBLISHED');
  }
  if (quiz._count.attempts > 0) {
    throw new AppError('Bài kiểm tra đã có lượt làm bài nên không xóa được', 409, 'QUIZ_HAS_ATTEMPTS');
  }
  await prisma.quiz.delete({ where: { id: quizId } });
}

/** Kết quả cả lớp: điểm từng học sinh và tỉ lệ đúng của từng câu (để thấy câu nào khó). */
export async function quizResults({ teacherId, quizId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const quiz = await loadOwnedQuiz(prisma, quizId, teacherId);
  const now = clock(deps);

  // Chốt những bài đã quá hạn mà học sinh chưa nộp
  const open = await prisma.quizAttempt.findMany({
    where: { quizId, submittedAt: null },
    include: { quiz: true },
  });
  for (const attempt of open) {
    if (now > attemptDeadline({ ...attempt.quiz, startedAt: attempt.startedAt })) {
      await finalizeAttempt(prisma, attempt);
    }
  }

  const [attempts, rows] = await Promise.all([
    prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: [{ studentId: 'asc' }, { attemptNo: 'asc' }],
      select: {
        id: true,
        studentId: true,
        attemptNo: true,
        score: true,
        answers: true,
        startedAt: true,
        submittedAt: true,
        student: { select: { fullName: true } },
      },
    }),
    prisma.quizQuestion.findMany({
      where: { quizId },
      orderBy: { position: 'asc' },
      include: { question: true },
    }),
  ]);

  const submitted = attempts.filter((a) => a.submittedAt);
  const best = new Map();
  for (const a of submitted) best.set(a.studentId, Math.max(best.get(a.studentId) ?? 0, a.score ?? 0));
  const bestScores = [...best.values()];
  const average = bestScores.length
    ? Math.round((bestScores.reduce((s, v) => s + v, 0) / bestScores.length) * 100) / 100
    : null;

  const questionStats = rows.map(({ question }) => {
    const answered = submitted.filter((a) => Number.isInteger(a.answers?.[question.id]));
    const correct = answered.filter((a) => a.answers[question.id] === question.correctIndex).length;
    return {
      questionId: question.id,
      text: question.text,
      topic: question.topic ?? null,
      answered: answered.length,
      correctRate: submitted.length ? Math.round((correct / submitted.length) * 100) / 100 : null,
    };
  });

  return {
    quiz: { id: quiz.id, title: quiz.title, status: quiz.status },
    summary: {
      students: bestScores.length,
      submittedAttempts: submitted.length,
      average,
      highest: bestScores.length ? Math.max(...bestScores) : null,
      lowest: bestScores.length ? Math.min(...bestScores) : null,
    },
    attempts: attempts.map(({ answers: _answers, student, ...a }) => ({
      ...a,
      fullName: student?.fullName ?? null,
    })),
    questionStats,
  };
}