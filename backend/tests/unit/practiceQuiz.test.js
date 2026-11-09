import { jest } from '@jest/globals';
import {
  createPracticeQuiz,
  getPracticeQuiz,
  getPracticeQuota,
  listPracticeQuizzes,
  submitPracticeQuiz,
} from '../../src/services/quiz/practiceQuizService.js';

const NOW = new Date('2026-11-10T03:00:00Z'); // 10:00 sáng giờ VN
const student = { id: 's1', role: 'student' };

const chunks = [
  { id: 'k1', documentId: 'd1', chunkIndex: 0, text: 'Quang hợp tạo chất hữu cơ.', pageNumber: 3 },
  { id: 'k2', documentId: 'd1', chunkIndex: 1, text: 'Hô hấp giải phóng năng lượng.', pageNumber: 4 },
];

const rawQuestion = (n, over = {}) => ({
  text: `Câu hỏi luyện tập số ${n} là gì?`,
  options: [`đúng ${n}`, `sai a ${n}`, `sai b ${n}`, `sai c ${n}`],
  correctIndex: 0,
  explanation: 'Theo tài liệu.',
  topic: n % 2 ? 'Quang hợp' : 'Hô hấp',
  difficulty: 1,
  sourceRef: n % 2 ? 1 : 2,
  ...over,
});
const goodRaw = () => ({ questions: [1, 2, 3, 4, 5].map((n) => rawQuestion(n)) });

function setup({ now = NOW, docs = [{ id: 'd1', fileName: 'Sinh 11.pdf' }] } = {}) {
  const db = { practice: [], now };
  let counter = 0;
  const prisma = {
    db,
    document: { findMany: jest.fn(async () => docs) },
    chunk: { findMany: jest.fn(async () => chunks) },
    practiceQuiz: {
      count: jest.fn(async ({ where }) =>
        db.practice.filter((p) => p.studentId === where.studentId && p.createdAt >= where.createdAt.gte).length,
      ),
      create: jest.fn(async ({ data }) => {
        counter += 1;
        db.practice.push({ id: `p${counter}`, createdAt: db.now, answers: null, score: null, submittedAt: null, ...data });
        return { id: `p${counter}` };
      }),
      delete: jest.fn(async ({ where }) => {
        db.practice = db.practice.filter((p) => p.id !== where.id);
      }),
      update: jest.fn(async ({ where, data }) => {
        const row = db.practice.find((p) => p.id === where.id);
        Object.assign(row, data);
        return { ...row };
      }),
      findMany: jest.fn(async ({ where }) =>
        db.practice.filter((p) => p.studentId === where.studentId && p.classId === where.classId).reverse(),
      ),
      findUnique: jest.fn(async ({ where }) => db.practice.find((p) => p.id === where.id) ?? null),
      updateMany: jest.fn(async ({ where, data }) => {
        const rows = db.practice.filter((p) => p.id === where.id && p.submittedAt === where.submittedAt);
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      }),
    },
  };
  const deps = (over = {}) => ({
    prisma,
    now: () => db.now,
    generateJson: async () => goodRaw(),
    random: () => 0,
    limit: 5,
    ...over,
  });
  return { prisma, db, deps };
}

describe('createPracticeQuiz', () => {
  test('chỉ lấy tài liệu ĐÃ XUẤT BẢN; câu hỏi gửi về không lộ đáp án/lời giải/nguồn', async () => {
    const { prisma, deps } = setup();
    const res = await createPracticeQuiz({ user: student, classId: 'c1', count: 5 }, deps());

    expect(prisma.document.findMany.mock.calls[0][0].where).toMatchObject({ classId: 'c1', publishStatus: 'published' });
    expect(res.status).toBe('in_progress');
    expect(res.questions).toHaveLength(5);
    res.questions.forEach((q) => {
      expect(q.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(q).not.toHaveProperty('correctIndex');
      expect(q).not.toHaveProperty('explanation');
      expect(q).not.toHaveProperty('source');
    });
    expect(res.quota).toMatchObject({ limit: 5, used: 1, remaining: 4 });
  });

  test('đưa chủ đề học sinh chọn vào yêu cầu gửi AI', async () => {
    const { deps } = setup();
    const generateJson = jest.fn(async () => goodRaw());
    await createPracticeQuiz({ user: student, classId: 'c1', count: 3, topic: 'Quang hợp' }, deps({ generateJson }));
    const prompt = generateJson.mock.calls[0][0].prompt;
    expect(prompt).toContain('Chủ đề trọng tâm: Quang hợp');
    expect(prompt).toContain('Số câu hỏi cần soạn: 3');
  });

  test('hết hạn mức trong ngày -> 429, sang ngày mới (giờ VN) được tạo lại', async () => {
    const { db, deps } = setup();
    for (let i = 0; i < 5; i += 1) await createPracticeQuiz({ user: student, classId: 'c1' }, deps());

    await expect(createPracticeQuiz({ user: student, classId: 'c1' }, deps())).rejects.toMatchObject({
      statusCode: 429,
      code: 'DAILY_LIMIT_REACHED',
    });
    expect(await getPracticeQuota({ studentId: 's1' }, deps())).toMatchObject({ used: 5, remaining: 0 });

    db.now = new Date('2026-11-10T17:05:00Z'); // 00:05 sáng hôm sau giờ VN
    await expect(createPracticeQuiz({ user: student, classId: 'c1' }, deps())).resolves.toBeDefined();
  });

  test('hạn mức tính riêng từng học sinh', async () => {
    const { deps } = setup();
    for (let i = 0; i < 5; i += 1) await createPracticeQuiz({ user: student, classId: 'c1' }, deps());
    await expect(
      createPracticeQuiz({ user: { id: 's2', role: 'student' }, classId: 'c1' }, deps()),
    ).resolves.toBeDefined();
  });

  test('AI lỗi hoặc không soạn được câu nào -> không tốn lượt của học sinh', async () => {
    const { db, deps } = setup();
    await expect(
      createPracticeQuiz({ user: student, classId: 'c1' }, deps({ generateJson: async () => ({ questions: [] }) })),
    ).rejects.toMatchObject({ code: 'GENERATION_INVALID' });
    expect(db.practice).toHaveLength(0);

    await expect(
      createPracticeQuiz(
        { user: student, classId: 'c1' },
        deps({ generateJson: async () => { throw Object.assign(new Error('Gemini sập'), { code: 'GENERATION_FAILED' }); } }),
      ),
    ).rejects.toThrow('Gemini sập');
    expect(await getPracticeQuota({ studentId: 's1' }, deps())).toMatchObject({ used: 0, remaining: 5 });
  });

  test('lớp chưa có tài liệu xuất bản -> NO_SOURCE và không tốn lượt', async () => {
    const { db, deps } = setup({ docs: [] });
    await expect(createPracticeQuiz({ user: student, classId: 'c1' }, deps())).rejects.toMatchObject({ code: 'NO_SOURCE' });
    expect(db.practice).toHaveLength(0);
  });

  test('nhiều yêu cầu cùng lúc vẫn không vượt hạn mức', async () => {
    const { db, deps } = setup();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => createPracticeQuiz({ user: student, classId: 'c1' }, deps({ limit: 3 }))),
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    const saved = db.practice.filter((p) => p.questions.length > 0).length;
    expect(ok).toBeLessThanOrEqual(3);
    expect(saved).toBe(ok);
    expect(db.practice.length).toBe(ok); // không còn bản nháp rỗng nào sót lại
  });
});

describe('xem, làm và nộp quiz luyện tập', () => {
  async function created() {
    const ctx = setup();
    const res = await createPracticeQuiz({ user: student, classId: 'c1', count: 5 }, ctx.deps());
    return { ...ctx, id: res.practice.id, questions: res.questions };
  }

  test('đang làm: không lộ đáp án', async () => {
    const { prisma, deps, id } = await created();
    const view = await getPracticeQuiz({ user: student, practiceId: id }, deps());
    expect(view.status).toBe('in_progress');
    expect(JSON.stringify(view)).not.toContain('correctIndex');
    expect(prisma.db.practice[0].questions[0]).toHaveProperty('correctIndex'); // nhưng DB có lưu để chấm
  });

  test('nộp bài: chấm điểm, lộ đáp án + lời giải + nguồn; nộp lần hai bị chặn', async () => {
    const { prisma, deps, id } = await created();
    const stored = prisma.db.practice[0].questions; // bản lưu trong DB có đáp án đúng
    // Trả lời đúng 3 câu đầu, sai 2 câu sau
    const answers = Object.fromEntries(
      stored.map((q, i) => [q.id, i < 3 ? q.correctIndex : (q.correctIndex + 1) % 4]),
    );

    const res = await submitPracticeQuiz({ user: student, practiceId: id, answers }, deps());
    expect(res.status).toBe('submitted');
    expect(res.practice).toMatchObject({ correct: 3, total: 5, score: 6 });
    expect(res.questions[0]).toMatchObject({
      isCorrect: true,
      correctIndex: stored[0].correctIndex,
      explanation: 'Theo tài liệu.',
    });
    expect(res.questions[4].isCorrect).toBe(false);
    expect(res.questions[0].source).toMatchObject({ fileName: 'Sinh 11.pdf' });

    await expect(submitPracticeQuiz({ user: student, practiceId: id, answers }, deps())).rejects.toMatchObject({
      code: 'ALREADY_SUBMITTED',
    });
    // xem lại sau khi nộp vẫn thấy kết quả
    expect((await getPracticeQuiz({ user: student, practiceId: id }, deps())).status).toBe('submitted');
  });

  test('bỏ qua id câu hỏi lạ; người khác không xem/nộp được; bản nháp rỗng coi như không tồn tại', async () => {
    const { prisma, deps, id } = await created();
    const res = await submitPracticeQuiz({ user: student, practiceId: id, answers: { '00000000-0000-4000-8000-000000000000': 1 } }, deps());
    expect(res.practice.correct).toBe(0);

    const other = { id: 's2', role: 'student' };
    await expect(getPracticeQuiz({ user: other, practiceId: id }, deps())).rejects.toMatchObject({ code: 'PRACTICE_NOT_FOUND' });
    await expect(submitPracticeQuiz({ user: other, practiceId: id, answers: {} }, deps())).rejects.toMatchObject({ code: 'PRACTICE_NOT_FOUND' });

    prisma.db.practice.push({ id: 'rong', studentId: 's1', classId: 'c1', questions: [], createdAt: NOW, submittedAt: null });
    await expect(getPracticeQuiz({ user: student, practiceId: 'rong' }, deps())).rejects.toMatchObject({ code: 'PRACTICE_NOT_FOUND' });
  });

  test('danh sách kèm hạn mức còn lại', async () => {
    const { deps } = await created();
    const res = await listPracticeQuizzes({ user: student, classId: 'c1' }, deps());
    expect(res.practiceQuizzes).toHaveLength(1);
    expect(res.quota).toMatchObject({ limit: 5, used: 1, remaining: 4 });
    expect(res.quota.resetsAt).toEqual(new Date('2026-11-10T17:00:00.000Z'));
  });
});