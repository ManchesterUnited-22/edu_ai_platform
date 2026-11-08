import {
  attemptDeadline,
  getAttempt,
  hasActiveAttempt,
  listMyAttempts,
  saveAnswers,
  startAttempt,
  submitAttempt,
} from '../../src/services/quiz/officialQuizService.js';
import { createFakeQuizPrisma } from '../helpers/fakeQuizPrisma.js';

const T0 = new Date('2026-11-10T08:00:00Z');
const at = (minutes, seconds = 0) => new Date(T0.getTime() + minutes * 60_000 + seconds * 1000);
const student = { id: 's1', role: 'student' };

const questions = [
  { id: 'q1', text: 'Câu 1?', options: ['a', 'b', 'c', 'd'], correctIndex: 1, explanation: 'vì b', topic: 'A', difficulty: 1 },
  { id: 'q2', text: 'Câu 2?', options: ['a', 'b', 'c', 'd'], correctIndex: 2, explanation: 'vì c', topic: 'B', difficulty: 2 },
];

function setup(quizOver = {}, extra = {}) {
  return createFakeQuizPrisma({
    quizzes: [{ id: 'z1', classId: 'c1', title: 'Kiểm tra 15 phút', status: 'published', durationMinutes: 15, ...quizOver }],
    questions,
    quizQuestions: [
      { quizId: 'z1', questionId: 'q1', position: 1 },
      { quizId: 'z1', questionId: 'q2', position: 2 },
    ],
    enrollments: [{ classId: 'c1', studentId: 's1' }],
    ...extra,
  });
}
const deps = (prisma, now) => ({ prisma, now: () => now });

describe('attemptDeadline', () => {
  test('hết thời lượng hoặc tới giờ đóng quiz, cái nào đến trước', () => {
    expect(attemptDeadline({ startedAt: T0, durationMinutes: 15, closesAt: null })).toEqual(at(15));
    expect(attemptDeadline({ startedAt: T0, durationMinutes: 15, closesAt: at(5) })).toEqual(at(5));
    expect(attemptDeadline({ startedAt: T0, durationMinutes: 15, closesAt: at(60) })).toEqual(at(15));
  });
});

describe('startAttempt', () => {
  test('bắt đầu: có hạn chót, câu hỏi KHÔNG lộ đáp án đúng hay lời giải', async () => {
    const prisma = setup();
    const res = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    expect(res.status).toBe('in_progress');
    expect(res.attempt).toMatchObject({ attemptNo: 1, deadline: at(15) });
    expect(res.questions).toHaveLength(2);
    res.questions.forEach((q) => {
      expect(q).not.toHaveProperty('correctIndex');
      expect(q).not.toHaveProperty('explanation');
    });
    expect(JSON.stringify(res)).not.toContain('vì b');
  });

  test('bấm bắt đầu lần nữa khi đang làm dở -> tiếp tục lượt cũ, không tốn thêm lượt', async () => {
    const prisma = setup();
    const first = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    const second = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, at(3)));
    expect(second.attempt.id).toBe(first.attempt.id);
    expect(prisma.db.attempts).toHaveLength(1);
  });

  test('hai yêu cầu bắt đầu cùng lúc (P2002) -> dùng lại lượt đã tạo', async () => {
    const prisma = setup();
    prisma.raceOnce = true;
    const res = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    expect(res.status).toBe('in_progress');
    expect(prisma.db.attempts).toHaveLength(1);
  });

  test('chưa ghi danh -> 403; quiz chưa xuất bản -> 404', async () => {
    const prisma = setup();
    await expect(
      startAttempt({ user: { id: 'other', role: 'student' }, quizId: 'z1' }, deps(prisma, T0)),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    const draft = setup({ status: 'draft' });
    await expect(startAttempt({ user: student, quizId: 'z1' }, deps(draft, T0))).rejects.toMatchObject({
      code: 'QUIZ_NOT_FOUND',
    });
  });

  test('chưa tới giờ mở / đã quá giờ đóng', async () => {
    const prisma = setup({ opensAt: at(60), closesAt: at(120) });
    await expect(startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0))).rejects.toMatchObject({ code: 'QUIZ_NOT_OPEN' });
    await expect(startAttempt({ user: student, quizId: 'z1' }, deps(prisma, at(130)))).rejects.toMatchObject({ code: 'QUIZ_CLOSED' });
    await expect(startAttempt({ user: student, quizId: 'z1' }, deps(prisma, at(90)))).resolves.toBeDefined();
  });

  test('hết số lượt làm bài', async () => {
    const prisma = setup({ maxAttempts: 2 });
    for (const [i, when] of [at(0), at(30)].entries()) {
      const s = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, when));
      await submitAttempt({ user: student, attemptId: s.attempt.id, answers: {} }, deps(prisma, at(i * 30 + 5)));
    }
    await expect(startAttempt({ user: student, quizId: 'z1' }, deps(prisma, at(60)))).rejects.toMatchObject({
      code: 'NO_ATTEMPTS_LEFT',
    });
  });

  test('đang làm quiz khác thì không bắt đầu quiz mới', async () => {
    const prisma = setup({}, {});
    prisma.db.quizzes.push({ id: 'z2', classId: 'c1', title: 'Quiz 2', status: 'published', durationMinutes: 10, maxAttempts: 2, opensAt: null, closesAt: null });
    await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    await expect(startAttempt({ user: student, quizId: 'z2' }, deps(prisma, at(2)))).rejects.toMatchObject({
      code: 'ANOTHER_QUIZ_IN_PROGRESS',
    });
  });

  test('bài cũ đã quá hạn được tự chốt, không chặn việc làm quiz mới', async () => {
    const prisma = setup({ maxAttempts: 3 });
    const old = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    await saveAnswers({ user: student, attemptId: old.attempt.id, answers: { q1: 1 } }, deps(prisma, at(5)));

    const fresh = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, at(40)));
    expect(fresh.attempt.attemptNo).toBe(2);
    const closed = prisma.db.attempts.find((a) => a.id === old.attempt.id);
    expect(closed.submittedAt).toEqual(at(15)); // ghi nhận nộp đúng lúc hết giờ
    expect(closed.score).toBe(5); // đúng 1/2 câu đã lưu
  });
});

describe('saveAnswers / submitAttempt', () => {
  async function started(prismaOver) {
    const prisma = prismaOver ?? setup();
    const s = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    return { prisma, id: s.attempt.id };
  }

  test('lưu nháp gộp dần và bỏ qua id câu hỏi lạ', async () => {
    const { prisma, id } = await started();
    await saveAnswers({ user: student, attemptId: id, answers: { q1: 1 } }, deps(prisma, at(2)));
    const res = await saveAnswers({ user: student, attemptId: id, answers: { q2: 2, khong_ton_tai: 3 } }, deps(prisma, at(4)));
    expect(res.saved).toBe(2);
    expect(prisma.db.attempts[0].answers).toEqual({ q1: 1, q2: 2 });
  });

  test('lưu nháp sau hạn chót + ân hạn -> hết giờ và bài được chốt', async () => {
    const { prisma, id } = await started();
    await expect(
      saveAnswers({ user: student, attemptId: id, answers: { q1: 1 } }, deps(prisma, at(16))),
    ).rejects.toMatchObject({ code: 'ATTEMPT_EXPIRED' });
    expect(prisma.db.attempts[0].submittedAt).not.toBeNull();
  });

  test('nộp đúng hạn: chấm điểm và chỉ lúc này mới lộ đáp án + lời giải', async () => {
    const { prisma, id } = await started();
    const res = await submitAttempt({ user: student, attemptId: id, answers: { q1: 1, q2: 0 } }, deps(prisma, at(10)));
    expect(res).toMatchObject({ status: 'submitted', late: false });
    expect(res.attempt).toMatchObject({ score: 5, correct: 1, total: 2 });
    expect(res.questions[0]).toMatchObject({ correctIndex: 1, selected: 1, isCorrect: true, explanation: 'vì b' });
    expect(res.questions[1]).toMatchObject({ correctIndex: 2, selected: 0, isCorrect: false });
  });

  test('nộp hai lần -> 409', async () => {
    const { prisma, id } = await started();
    await submitAttempt({ user: student, attemptId: id, answers: {} }, deps(prisma, at(5)));
    await expect(
      submitAttempt({ user: student, attemptId: id, answers: { q1: 1 } }, deps(prisma, at(6))),
    ).rejects.toMatchObject({ code: 'ALREADY_SUBMITTED' });
  });

  test('nộp trễ: đáp án gửi kèm bị bỏ, chỉ tính phần đã lưu trước hạn', async () => {
    const { prisma, id } = await started();
    await saveAnswers({ user: student, attemptId: id, answers: { q1: 1 } }, deps(prisma, at(5)));
    const res = await submitAttempt(
      { user: student, attemptId: id, answers: { q1: 1, q2: 2 } }, // q2 chỉ có trong lần nộp trễ
      deps(prisma, at(20)),
    );
    expect(res.late).toBe(true);
    expect(res.attempt.correct).toBe(1);
    expect(res.attempt.submittedAt).toEqual(at(15));
  });

  test('nộp trong thời gian ân hạn vẫn tính đủ đáp án', async () => {
    const { prisma, id } = await started();
    const res = await submitAttempt(
      { user: student, attemptId: id, answers: { q1: 1, q2: 2 } },
      deps(prisma, at(15, 20)),
    );
    expect(res.late).toBe(false);
    expect(res.attempt.score).toBe(10);
  });

  test('không thao tác được trên lượt làm bài của người khác', async () => {
    const { prisma, id } = await started();
    const other = { id: 's2', role: 'student' };
    await expect(getAttempt({ user: other, attemptId: id }, deps(prisma, at(1)))).rejects.toMatchObject({ code: 'ATTEMPT_NOT_FOUND' });
    await expect(saveAnswers({ user: other, attemptId: id, answers: {} }, deps(prisma, at(1)))).rejects.toMatchObject({ code: 'ATTEMPT_NOT_FOUND' });
    await expect(submitAttempt({ user: other, attemptId: id, answers: {} }, deps(prisma, at(1)))).rejects.toMatchObject({ code: 'ATTEMPT_NOT_FOUND' });
  });
});

describe('getAttempt / listMyAttempts', () => {
  test('đang làm: không lộ đáp án; quá hạn: tự chốt và hiện kết quả', async () => {
    const prisma = setup();
    const s = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    await saveAnswers({ user: student, attemptId: s.attempt.id, answers: { q2: 2 } }, deps(prisma, at(3)));

    const during = await getAttempt({ user: student, attemptId: s.attempt.id }, deps(prisma, at(4)));
    expect(during.status).toBe('in_progress');
    expect(during.attempt.answers).toEqual({ q2: 2 });
    expect(JSON.stringify(during)).not.toContain('correctIndex');

    const after = await getAttempt({ user: student, attemptId: s.attempt.id }, deps(prisma, at(30)));
    expect(after.status).toBe('submitted');
    expect(after.attempt.score).toBe(5);
  });

  test('liệt kê các lượt của chính mình', async () => {
    const prisma = setup();
    await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    const list = await listMyAttempts({ user: student, quizId: 'z1' }, deps(prisma, at(1)));
    expect(list).toHaveLength(1);
  });
});

describe('hasActiveAttempt (khóa chat)', () => {
  test('khóa trong lúc làm bài, mở lại khi nộp bài hoặc hết giờ', async () => {
    const prisma = setup();
    expect(await hasActiveAttempt('s1', deps(prisma, T0))).toBe(false);

    const s = await startAttempt({ user: student, quizId: 'z1' }, deps(prisma, T0));
    expect(await hasActiveAttempt('s1', deps(prisma, at(5)))).toBe(true);
    expect(await hasActiveAttempt('s2', deps(prisma, at(5)))).toBe(false); // học sinh khác không bị khóa

    expect(await hasActiveAttempt('s1', deps(prisma, at(16)))).toBe(false); // hết giờ dù chưa nộp

    const s2 = prisma.db.attempts[0];
    s2.submittedAt = at(8);
    expect(await hasActiveAttempt('s1', deps(prisma, at(9)))).toBe(false);
    expect(s.attempt.id).toBe(s2.id);
  });
});