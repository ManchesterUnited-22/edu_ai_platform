import { jest } from '@jest/globals';
import {
  deleteContent,
  getContent,
  listContents,
  transitionContent,
  updateContent,
} from '../../src/services/generation/contentService.js';
import {
  deleteQuestion,
  transitionQuestions,
  updateQuestion,
} from '../../src/services/generation/questionBank.js';

const teacher = { id: 't1', role: 'teacher' };
const student = { id: 's1', role: 'student' };

function contentPrisma(content, extra = {}) {
  return {
    generatedContent: {
      findUnique: jest.fn(async () => content),
      findMany: jest.fn(async () => []),
      updateMany: jest.fn(async () => ({ count: 1 })),
      update: jest.fn(async ({ data }) => ({ id: content?.id, ...data })),
      delete: jest.fn(async () => ({})),
    },
    ...extra,
  };
}
const outline = (over = {}) => ({
  id: 'ct1',
  type: 'outline',
  status: 'draft',
  class: { teacherId: 't1', enrollments: [] },
  ...over,
});
const validBody = {
  summary: 'Tóm tắt',
  sections: [{ heading: 'A', points: ['ý 1'], keyTerms: [] }],
};

describe('contentService - phân quyền', () => {
  test('giáo viên lớp khác bị chặn', async () => {
    const prisma = contentPrisma(outline({ class: { teacherId: 'khac', enrollments: [] } }));
    await expect(getContent({ user: teacher, contentId: 'ct1' }, { prisma })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('học sinh chỉ đọc được nội dung đã xuất bản của lớp mình', async () => {
    const enrolled = { teacherId: 't1', enrollments: [{ id: 'e1' }] };
    const draft = contentPrisma(outline({ class: enrolled }));
    await expect(getContent({ user: student, contentId: 'ct1' }, { prisma: draft })).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const published = contentPrisma(outline({ class: enrolled, status: 'published' }));
    await expect(getContent({ user: student, contentId: 'ct1' }, { prisma: published })).resolves.toBeDefined();

    const notEnrolled = contentPrisma(outline({ status: 'published' }));
    await expect(getContent({ user: student, contentId: 'ct1' }, { prisma: notEnrolled })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('học sinh không bao giờ sửa/xuất bản/xóa', async () => {
    const prisma = contentPrisma(outline({ class: { teacherId: 't1', enrollments: [{ id: 'e' }] }, status: 'published' }));
    await expect(updateContent({ user: student, contentId: 'ct1', title: 'x' }, { prisma })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(transitionContent({ user: student, contentId: 'ct1', action: 'unpublish' }, { prisma })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(deleteContent({ user: student, contentId: 'ct1' }, { prisma })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('danh sách của học sinh luôn chỉ gồm nội dung published', async () => {
    const prisma = contentPrisma(outline());
    await listContents({ user: student, classId: 'c1', status: 'draft' }, { prisma });
    expect(prisma.generatedContent.findMany.mock.calls[0][0].where).toMatchObject({ status: 'published' });
  });
});

describe('contentService - sửa và duyệt', () => {
  test('đang published thì không được sửa/xóa', async () => {
    const prisma = contentPrisma(outline({ status: 'published' }));
    await expect(updateContent({ user: teacher, contentId: 'ct1', title: 'x' }, { prisma })).rejects.toMatchObject({ code: 'CONTENT_PUBLISHED' });
    await expect(deleteContent({ user: teacher, contentId: 'ct1' }, { prisma })).rejects.toMatchObject({ code: 'CONTENT_PUBLISHED' });
  });

  test('sửa nội dung đã duyệt -> về draft, tăng version, body được kiểm tra lại', async () => {
    const prisma = contentPrisma(outline({ status: 'reviewed' }));
    await updateContent({ user: teacher, contentId: 'ct1', body: validBody }, { prisma });
    const { data } = prisma.generatedContent.update.mock.calls[0][0];
    expect(data.status).toBe('draft');
    expect(data.version).toEqual({ increment: 1 });
    expect(data.body.sections[0].keyTerms).toEqual([]);
  });

  test('body sai cấu trúc -> 400, không ghi', async () => {
    const prisma = contentPrisma(outline());
    await expect(
      updateContent({ user: teacher, contentId: 'ct1', body: { summary: '', sections: [] } }, { prisma }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(prisma.generatedContent.update).not.toHaveBeenCalled();
  });

  test('luồng duyệt -> xuất bản -> thu hồi và các lối đi bị cấm', async () => {
    await expect(
      transitionContent({ user: teacher, contentId: 'ct1', action: 'publish' }, { prisma: contentPrisma(outline({ status: 'draft' })) }),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });

    const prisma = contentPrisma(outline({ status: 'reviewed' }));
    await transitionContent({ user: teacher, contentId: 'ct1', action: 'publish' }, { prisma });
    const call = prisma.generatedContent.updateMany.mock.calls[0][0];
    expect(call.data.status).toBe('published');
    expect(call.data.publishedAt).toBeInstanceOf(Date);
    expect(call.where.status).toEqual({ in: ['reviewed'] });
  });

  test('trạng thái bị đổi giữa chừng (updateMany = 0) -> 409', async () => {
    const prisma = contentPrisma(outline({ status: 'reviewed' }));
    prisma.generatedContent.updateMany = jest.fn(async () => ({ count: 0 }));
    await expect(
      transitionContent({ user: teacher, contentId: 'ct1', action: 'publish' }, { prisma }),
    ).rejects.toMatchObject({ code: 'CONTENT_CHANGED' });
  });
});

describe('questionBank', () => {
  const q = (status = 'draft', teacherId = 't1') => ({ id: 'q1', status, class: { teacherId } });

  function qPrisma(question, extra = {}) {
    return {
      question: {
        findUnique: jest.fn(async () => question),
        findMany: jest.fn(async ({ where }) => where.id.in.map((id) => ({ id, status: question.status }))),
        update: jest.fn(async ({ data }) => data),
        updateMany: jest.fn(async ({ where }) => ({ count: where.id.in.length })),
        delete: jest.fn(),
      },
      quizQuestion: { count: jest.fn(async () => 0) },
      ...extra,
    };
  }

  test('giáo viên khác không sửa được; đang published không sửa được', async () => {
    await expect(
      updateQuestion({ teacherId: 't1', questionId: 'q1', patch: { text: 'abcdef' } }, { prisma: qPrisma(q('draft', 'khac')) }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      updateQuestion({ teacherId: 't1', questionId: 'q1', patch: { text: 'abcdef' } }, { prisma: qPrisma(q('published')) }),
    ).rejects.toMatchObject({ code: 'QUESTION_PUBLISHED' });
  });

  test('sửa câu đã duyệt -> quay về draft', async () => {
    const prisma = qPrisma(q('reviewed'));
    await updateQuestion({ teacherId: 't1', questionId: 'q1', patch: { topic: 'Mới' } }, { prisma });
    expect(prisma.question.update.mock.calls[0][0].data).toMatchObject({ topic: 'Mới', status: 'draft' });
  });

  test('duyệt hàng loạt thành công khi mọi câu đúng trạng thái', async () => {
    const prisma = qPrisma(q('draft'));
    const res = await transitionQuestions({ classId: 'c1', ids: ['a', 'b', 'b'], action: 'review' }, { prisma });
    expect(res).toEqual({ updated: 2, status: 'reviewed' });
  });

  test('có câu sai trạng thái thì không câu nào bị đổi', async () => {
    const prisma = qPrisma(q('draft'));
    await expect(
      transitionQuestions({ classId: 'c1', ids: ['a'], action: 'publish' }, { prisma }),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    expect(prisma.question.updateMany).not.toHaveBeenCalled();
  });

  test('id không thuộc lớp -> 404', async () => {
    const prisma = qPrisma(q('draft'));
    prisma.question.findMany = jest.fn(async () => []);
    await expect(
      transitionQuestions({ classId: 'c1', ids: ['a'], action: 'review' }, { prisma }),
    ).rejects.toMatchObject({ code: 'QUESTION_NOT_FOUND' });
  });

  test('không thu hồi câu đang nằm trong quiz đã xuất bản', async () => {
    const prisma = qPrisma(q('published'));
    prisma.quizQuestion.count = jest.fn(async () => 1);
    await expect(
      transitionQuestions({ classId: 'c1', ids: ['a'], action: 'unpublish' }, { prisma }),
    ).rejects.toMatchObject({ code: 'QUESTION_IN_USE' });
  });

  test('không xóa câu đang published hoặc đã thuộc một quiz', async () => {
    await expect(
      deleteQuestion({ teacherId: 't1', questionId: 'q1' }, { prisma: qPrisma(q('published')) }),
    ).rejects.toMatchObject({ code: 'QUESTION_PUBLISHED' });

    const used = qPrisma(q('draft'));
    used.quizQuestion.count = jest.fn(async () => 1);
    await expect(deleteQuestion({ teacherId: 't1', questionId: 'q1' }, { prisma: used })).rejects.toMatchObject({ code: 'QUESTION_IN_USE' });

    const ok = qPrisma(q('draft'));
    await deleteQuestion({ teacherId: 't1', questionId: 'q1' }, { prisma: ok });
    expect(ok.question.delete).toHaveBeenCalled();
  });
});