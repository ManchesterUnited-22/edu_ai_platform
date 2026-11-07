// Quản lý nội dung AI sinh (đề cương, outline): xem, sửa, duyệt, xuất bản, thu hồi, xóa
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { bodySchemaByType } from '../../validators/content.validator.js';
import { resolveTransition } from '../publishing/stateMachine.js';

const listSelect = {
  id: true,
  classId: true,
  type: true,
  title: true,
  status: true,
  version: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
};
const detailSelect = { ...listSelect, body: true };

/** Tải nội dung kèm kiểm tra quyền. mode: 'read' | 'manage'. */
async function loadContent(prisma, contentId, user, mode) {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    include: {
      class: {
        select: {
          teacherId: true,
          enrollments: { where: { studentId: user.id }, select: { id: true } },
        },
      },
    },
  });
  if (!content) throw new AppError('Không tìm thấy nội dung', 404, 'CONTENT_NOT_FOUND');

  if (user.role === 'teacher') {
    if (content.class.teacherId !== user.id) {
      throw new AppError('Bạn không có quyền với nội dung này', 403, 'FORBIDDEN');
    }
    return content;
  }
  // Học sinh: chỉ ĐỌC nội dung đã xuất bản của lớp mình học
  const enrolled = content.class.enrollments.length > 0;
  if (mode !== 'read' || !enrolled || content.status !== 'published') {
    throw new AppError('Bạn không có quyền với nội dung này', 403, 'FORBIDDEN');
  }
  return content;
}

export async function listContents({ user, classId, type, status }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const where = { classId };
  if (type) where.type = type;
  if (user.role === 'student') where.status = 'published';
  else if (status) where.status = status;

  return prisma.generatedContent.findMany({
    where,
    select: listSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getContent({ user, contentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const content = await loadContent(prisma, contentId, user, 'read');
  return prisma.generatedContent.findUnique({ where: { id: content.id }, select: detailSelect });
}

/** Giáo viên sửa nội dung: chỉ khi KHÔNG đang xuất bản; sửa tài liệu đã duyệt thì phải duyệt lại. */
export async function updateContent({ user, contentId, title, body }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const content = await loadContent(prisma, contentId, user, 'manage');

  if (content.status === 'published') {
    throw new AppError('Hãy thu hồi trước khi sửa nội dung', 409, 'CONTENT_PUBLISHED');
  }

  const data = { version: { increment: 1 } };
  if (title !== undefined) data.title = title;
  if (body !== undefined) {
    const parsed = bodySchemaByType[content.type].safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new AppError(
        `Nội dung không hợp lệ (${issue.path.join('.') || 'body'}: ${issue.message})`,
        400,
        'VALIDATION_ERROR',
      );
    }
    data.body = parsed.data;
  }
  if (content.status === 'reviewed') data.status = 'draft';

  return prisma.generatedContent.update({
    where: { id: content.id },
    data,
    select: detailSelect,
  });
}

export async function transitionContent({ user, contentId, action }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const content = await loadContent(prisma, contentId, user, 'manage');
  const rule = resolveTransition(action, content.status);

  const { count } = await prisma.generatedContent.updateMany({
    where: { id: content.id, status: { in: rule.from } },
    data: { status: rule.to, ...(action === 'publish' ? { publishedAt: new Date() } : {}) },
  });
  if (count === 0) {
    throw new AppError('Nội dung vừa bị thay đổi, hãy tải lại rồi thử lại', 409, 'CONTENT_CHANGED');
  }
  return prisma.generatedContent.findUnique({ where: { id: content.id }, select: listSelect });
}

export async function deleteContent({ user, contentId }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const content = await loadContent(prisma, contentId, user, 'manage');
  if (content.status === 'published') {
    throw new AppError('Hãy thu hồi trước khi xóa nội dung', 409, 'CONTENT_PUBLISHED');
  }
  await prisma.generatedContent.delete({ where: { id: content.id } });
}