// Ngân hàng câu hỏi của lớp: xem, sửa, duyệt/xuất bản hàng loạt, xóa (dành cho giáo viên)
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { resolveTransition } from '../publishing/stateMachine.js';
import { QUESTION_SELECT } from './questionService.js';

async function loadOwnedQuestion(prisma, questionId, teacherId) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { class: { select: { teacherId: true } } },
  });
  if (!question) throw new AppError('Không tìm thấy câu hỏi', 404, 'QUESTION_NOT_FOUND');
  if (question.class.teacherId !== teacherId) {
    throw new AppError('Bạn không có quyền với câu hỏi này', 403, 'FORBIDDEN');
  }
  return question;
}

export function listQuestions({ classId, status, topic }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  return prisma.question.findMany({
    where: { classId, ...(status ? { status } : {}), ...(topic ? { topic } : {}) },
    select: QUESTION_SELECT,
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateQuestion({ teacherId, questionId, patch }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const question = await loadOwnedQuestion(prisma, questionId, teacherId);

  if (question.status === 'published') {
    throw new AppError('Hãy thu hồi câu hỏi trước khi sửa', 409, 'QUESTION_PUBLISHED');
  }
  const data = { ...patch };
  if (question.status === 'reviewed') data.status = 'draft'; // sửa rồi thì phải duyệt lại

  return prisma.question.update({ where: { id: question.id }, data, select: QUESTION_SELECT });
}

/** Duyệt / xuất bản / thu hồi nhiều câu. Tất cả hoặc không câu nào (không để dở dang). */
export async function transitionQuestions({ classId, ids, action }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const uniqueIds = [...new Set(ids)];

  const found = await prisma.question.findMany({
    where: { id: { in: uniqueIds }, classId },
    select: { id: true, status: true },
  });
  if (found.length !== uniqueIds.length) {
    throw new AppError('Có câu hỏi không tồn tại hoặc không thuộc lớp này', 404, 'QUESTION_NOT_FOUND');
  }
  found.forEach((q) => resolveTransition(action, q.status)); // ném 409 nếu có câu sai trạng thái

  if (action === 'unpublish') {
    // Không rút câu hỏi đang nằm trong một quiz đã xuất bản (học sinh có thể đang làm)
    const inLiveQuiz = await prisma.quizQuestion.count({
      where: { questionId: { in: uniqueIds }, quiz: { status: 'published' } },
    });
    if (inLiveQuiz > 0) {
      throw new AppError(
        'Có câu hỏi đang nằm trong quiz đã xuất bản, hãy thu hồi quiz trước',
        409,
        'QUESTION_IN_USE',
      );
    }
  }

  const rule = resolveTransition(action, found[0].status);
  const { count } = await prisma.question.updateMany({
    where: { id: { in: uniqueIds }, classId, status: { in: rule.from } },
    data: { status: rule.to },
  });
  if (count !== uniqueIds.length) {
    throw new AppError('Câu hỏi vừa bị thay đổi, hãy tải lại rồi thử lại', 409, 'QUESTION_CHANGED');
  }
  return { updated: count, status: rule.to };
}

export async function deleteQuestion({ teacherId, questionId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const question = await loadOwnedQuestion(prisma, questionId, teacherId);

  if (question.status === 'published') {
    throw new AppError('Hãy thu hồi câu hỏi trước khi xóa', 409, 'QUESTION_PUBLISHED');
  }
  const used = await prisma.quizQuestion.count({ where: { questionId: question.id } });
  if (used > 0) {
    throw new AppError('Câu hỏi đang thuộc một quiz nên không xóa được', 409, 'QUESTION_IN_USE');
  }
  await prisma.question.delete({ where: { id: question.id } });
}