import { jest } from '@jest/globals';
import { createChatLock } from '../../src/middlewares/chatLock.js';
import {
  createQuiz,
  deleteQuiz,
  quizResults,
  transitionQuiz,
  updateQuiz,
} from '../../src/services/quiz/quizAdminService.js';
import {
  createQuizSchema,
  saveAnswersSchema,
  updateQuizSchema,
} from '../../src/validators/quiz.validator.js';

const UUID = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = [UUID(1), UUID(2), UUID(3)];

const quizRow = (over = {}) => ({
  id: 'z1',
  classId: 'c1',
  status: 'draft',
  opensAt: null,
  closesAt: null,
  class: { teacherId: 't1' },
  _count: { attempts: 0 },
  ...over,
});

function prismaFor(quiz, extra = {}) {
  return {
    quiz: {
      findUnique: jest.fn(async () => quiz),
      create: jest.fn(async ({ data }) => ({ id: 'new', ...data })),
      update: jest.fn(async ({ data }) => ({ id: 'z1', ...data })),
      updateMany: jest.fn(async () => ({ count: 1 })),
      delete: jest.fn(),
    },
    quizQuestion: { count: jest.fn(async ({ where }) => (where.question ? 0 : 3)), deleteMany: jest.fn(() => 'del'), findMany: jest.fn(async () => []) },
    question: { findMany: jest.fn(async ({ where }) => where.id.in.map((id) => ({ id }))) },
    $transaction: jest.fn(async (ops) => Promise.all(ops)),
    ...extra,
  };
}

describe('createQuiz', () => {
  test('tạo quiz với các câu hỏi đã xuất bản, đánh số vị trí theo thứ tự chọn', async () => {
    const prisma = prismaFor(quizRow());
    await createQuiz(
      { classId: 'c1', data: { title: 'KT 15p', durationMinutes: 15, maxAttempts: 2, questionIds: ids } },
      { prisma },
    );
    const { data } = prisma.quiz.create.mock.calls[0][0];
    expect(data.questions.create).toEqual([
      { questionId: ids[0], position: 1 },
      { questionId: ids[1], position: 2 },
      { questionId: ids[2], position: 3 },
    ]);
    // chỉ chấp nhận câu hỏi đã published của đúng lớp
    expect(prisma.question.findMany.mock.calls[0][0].where).toMatchObject({ classId: 'c1', status: 'published' });
  });

  test('có câu hỏi chưa xuất bản/không thuộc lớp -> 400, không tạo gì', async () => {
    const prisma = prismaFor(quizRow(), { question: { findMany: jest.fn(async () => [{ id: ids[0] }]) } });
    await expect(
      createQuiz({ classId: 'c1', data: { title: 'x', durationMinutes: 10, maxAttempts: 2, questionIds: ids } }, { prisma }),
    ).rejects.toMatchObject({ code: 'QUESTIONS_NOT_AVAILABLE' });
    expect(prisma.quiz.create).not.toHaveBeenCalled();
  });
});

describe('updateQuiz', () => {
  test('đang published thì không sửa được', async () => {
    const prisma = prismaFor(quizRow({ status: 'published' }));
    await expect(updateQuiz({ teacherId: 't1', quizId: 'z1', patch: { title: 'x' } }, { prisma })).rejects.toMatchObject({ code: 'QUIZ_PUBLISHED' });
  });

  test('giáo viên lớp khác bị chặn', async () => {
    const prisma = prismaFor(quizRow());
    await expect(updateQuiz({ teacherId: 'khac', quizId: 'z1', patch: { title: 'x' } }, { prisma })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  test('sửa quiz đã duyệt -> về draft; đổi câu hỏi thì thay toàn bộ liên kết trong một giao dịch', async () => {
    const prisma = prismaFor(quizRow({ status: 'reviewed' }));
    await updateQuiz({ teacherId: 't1', quizId: 'z1', patch: { questionIds: [ids[2], ids[0]] } }, { prisma });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const { data } = prisma.quiz.update.mock.calls[0][0];
    expect(data.status).toBe('draft');
    expect(data.questions.create).toEqual([
      { questionId: ids[2], position: 1 },
      { questionId: ids[0], position: 2 },
    ]);
  });

  test('giờ đóng phải sau giờ mở (tính cả giá trị đang lưu)', async () => {
    const prisma = prismaFor(quizRow({ opensAt: new Date('2026-11-10T10:00:00Z') }));
    await expect(
      updateQuiz({ teacherId: 't1', quizId: 'z1', patch: { closesAt: new Date('2026-11-10T09:00:00Z') } }, { prisma }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});

describe('transitionQuiz', () => {
  test('không xuất bản quiz rỗng', async () => {
    const prisma = prismaFor(quizRow({ status: 'reviewed' }));
    prisma.quizQuestion.count = jest.fn(async () => 0);
    await expect(transitionQuiz({ teacherId: 't1', quizId: 'z1', action: 'publish' }, { prisma })).rejects.toMatchObject({ code: 'QUIZ_EMPTY' });
  });

  test('không xuất bản nếu có câu hỏi đã bị thu hồi từ lúc tạo quiz', async () => {
    const prisma = prismaFor(quizRow({ status: 'reviewed' }));
    prisma.quizQuestion.count = jest.fn(async ({ where }) => (where.question ? 1 : 3));
    await expect(transitionQuiz({ teacherId: 't1', quizId: 'z1', action: 'publish' }, { prisma })).rejects.toMatchObject({ code: 'QUIZ_QUESTIONS_NOT_PUBLISHED' });
    expect(prisma.quiz.updateMany).not.toHaveBeenCalled();
  });

  test('phải duyệt trước khi xuất bản', async () => {
    const prisma = prismaFor(quizRow({ status: 'draft' }));
    await expect(transitionQuiz({ teacherId: 't1', quizId: 'z1', action: 'publish' }, { prisma })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  test('xuất bản hợp lệ', async () => {
    const prisma = prismaFor(quizRow({ status: 'reviewed' }));
    await transitionQuiz({ teacherId: 't1', quizId: 'z1', action: 'publish' }, { prisma });
    expect(prisma.quiz.updateMany.mock.calls[0][0].data.status).toBe('published');
  });

  test('đã có học sinh làm bài thì không thu hồi/xóa được', async () => {
    const prisma = prismaFor(quizRow({ status: 'published', _count: { attempts: 4 } }));
    await expect(transitionQuiz({ teacherId: 't1', quizId: 'z1', action: 'unpublish' }, { prisma })).rejects.toMatchObject({ code: 'QUIZ_HAS_ATTEMPTS' });

    const draft = prismaFor(quizRow({ status: 'draft', _count: { attempts: 1 } }));
    await expect(deleteQuiz({ teacherId: 't1', quizId: 'z1' }, { prisma: draft })).rejects.toMatchObject({ code: 'QUIZ_HAS_ATTEMPTS' });
  });

  test('xóa quiz nháp chưa ai làm', async () => {
    const prisma = prismaFor(quizRow());
    await deleteQuiz({ teacherId: 't1', quizId: 'z1' }, { prisma });
    expect(prisma.quiz.delete).toHaveBeenCalled();
  });
});

describe('quizResults', () => {
  const T0 = new Date('2026-11-10T08:00:00Z');
  const q1 = { id: 'q1', text: 'Câu 1', topic: 'A', options: ['a', 'b', 'c', 'd'], correctIndex: 1 };
  const q2 = { id: 'q2', text: 'Câu 2', topic: 'B', options: ['a', 'b', 'c', 'd'], correctIndex: 2 };

  const attempt = (over) => ({ quizId: 'z1', startedAt: T0, answers: {}, score: null, submittedAt: null, ...over });

  test('chốt bài quá hạn, tính điểm tốt nhất mỗi học sinh và tỉ lệ đúng từng câu', async () => {
    const all = [
      attempt({ id: 'a1', studentId: 's1', attemptNo: 1, score: 5, answers: { q1: 1, q2: 0 }, submittedAt: T0, student: { fullName: 'An' } }),
      attempt({ id: 'a2', studentId: 's1', attemptNo: 2, score: 10, answers: { q1: 1, q2: 2 }, submittedAt: T0, student: { fullName: 'An' } }),
      attempt({ id: 'a3', studentId: 's2', attemptNo: 1, score: 0, answers: { q1: 0, q2: 0 }, submittedAt: T0, student: { fullName: 'Bình' } }),
    ];
    const stale = attempt({ id: 'a4', studentId: 's3', attemptNo: 1, answers: { q1: 1 }, quiz: { durationMinutes: 15, closesAt: null } });

    const prisma = {
      quiz: { findUnique: jest.fn(async () => quizRow({ title: 'KT', status: 'published' })) },
      quizAttempt: {
        findMany: jest.fn(async ({ where }) => (where.submittedAt === null ? [stale] : all)),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
      quizQuestion: {
        findMany: jest.fn(async () => [{ question: q1 }, { question: q2 }]),
      },
    };
    const res = await quizResults({ teacherId: 't1', quizId: 'z1' }, { prisma, now: () => new Date(T0.getTime() + 60 * 60_000) });

    expect(prisma.quizAttempt.updateMany).toHaveBeenCalledTimes(1); // bài s3 bị chốt
    expect(prisma.quizAttempt.updateMany.mock.calls[0][0].data.score).toBe(5);
    expect(res.summary).toEqual({ students: 2, submittedAttempts: 3, average: 5, highest: 10, lowest: 0 });
    expect(res.questionStats[0]).toMatchObject({ questionId: 'q1', correctRate: 0.67 });
    expect(res.questionStats[1]).toMatchObject({ questionId: 'q2', correctRate: 0.33 });
    expect(res.attempts[0]).toMatchObject({ fullName: 'An' });
    expect(res.attempts[0]).not.toHaveProperty('answers'); // không lộ chi tiết đáp án từng em ở danh sách
  });

  test('chưa ai nộp -> số liệu null, không lỗi chia cho 0', async () => {
    const prisma = {
      quiz: { findUnique: jest.fn(async () => quizRow({ status: 'published' })) },
      quizAttempt: { findMany: jest.fn(async () => []), updateMany: jest.fn() },
      quizQuestion: { findMany: jest.fn(async () => [{ question: q1 }]) },
    };
    const res = await quizResults({ teacherId: 't1', quizId: 'z1' }, { prisma });
    expect(res.summary).toEqual({ students: 0, submittedAttempts: 0, average: null, highest: null, lowest: null });
    expect(res.questionStats[0].correctRate).toBeNull();
  });
});

describe('quiz validators', () => {
  const base = { title: 'KT', durationMinutes: 15, questionIds: ids };

  test('tạo quiz: tự đặt số lượt mặc định, đổi chuỗi giờ thành Date', () => {
    const r = createQuizSchema.parse({ ...base, opensAt: '2026-11-10T08:00:00+07:00' });
    expect(r.maxAttempts).toBeGreaterThanOrEqual(1);
    expect(r.opensAt).toBeInstanceOf(Date);
  });

  test('từ chối câu hỏi trùng, thời lượng sai, giờ đóng trước giờ mở', () => {
    expect(createQuizSchema.safeParse({ ...base, questionIds: [ids[0], ids[0]] }).success).toBe(false);
    expect(createQuizSchema.safeParse({ ...base, durationMinutes: 1 }).success).toBe(false);
    expect(
      createQuizSchema.safeParse({ ...base, opensAt: '2026-11-10T10:00:00Z', closesAt: '2026-11-10T09:00:00Z' }).success,
    ).toBe(false);
  });

  test('cập nhật cần ít nhất một trường', () => {
    expect(updateQuizSchema.safeParse({}).success).toBe(false);
    expect(updateQuizSchema.safeParse({ title: 'mới' }).success).toBe(true);
  });

  test('đáp án phải là map id-câu-hỏi(uuid) -> chỉ số 0..3', () => {
    expect(saveAnswersSchema.safeParse({ answers: { [ids[0]]: 2 } }).success).toBe(true);
    expect(saveAnswersSchema.safeParse({ answers: { [ids[0]]: 4 } }).success).toBe(false);
    expect(saveAnswersSchema.safeParse({ answers: { khong_phai_uuid: 1 } }).success).toBe(false);
  });
});

describe('createChatLock', () => {
  const run = async (user, isLocked) => {
    const next = jest.fn();
    await createChatLock(isLocked)({ user }, {}, next);
    return next.mock.calls[0][0];
  };

  test('học sinh đang làm bài chính thức -> 423 CHAT_LOCKED', async () => {
    const err = await run({ id: 's1', role: 'student' }, async () => true);
    expect(err).toMatchObject({ statusCode: 423, code: 'CHAT_LOCKED' });
  });

  test('học sinh không làm bài -> cho qua', async () => {
    expect(await run({ id: 's1', role: 'student' }, async () => false)).toBeUndefined();
  });

  test('giáo viên không bị kiểm tra', async () => {
    const isLocked = jest.fn(async () => true);
    expect(await run({ id: 't1', role: 'teacher' }, isLocked)).toBeUndefined();
    expect(isLocked).not.toHaveBeenCalled();
  });
});