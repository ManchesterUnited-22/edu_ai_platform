import { jest } from '@jest/globals';
import {
  bestScores,
  getStudentProgress,
  mergeTopicStats,
  toTopicList,
} from '../../src/services/progress/progressService.js';

describe('toTopicList / mergeTopicStats', () => {
  test('chủ đề yếu = đúng dưới 60% VÀ đã có ít nhất 3 câu; ít câu thì chưa kết luận', () => {
    const list = toTopicList({
      'Quang hợp': { correct: 2, total: 5 }, // 40%, đủ mẫu -> yếu
      'Hô hấp': { correct: 0, total: 2 }, // 0% nhưng mới 2 câu -> chưa kết luận
      'Di truyền': { correct: 9, total: 10 }, // 90% -> không yếu
    });
    expect(list.map((t) => t.topic)).toEqual(['Hô hấp', 'Quang hợp', 'Di truyền']); // sắp từ yếu nhất
    expect(list.find((t) => t.topic === 'Quang hợp')).toMatchObject({ accuracy: 0.4, weak: true });
    expect(list.find((t) => t.topic === 'Hô hấp').weak).toBe(false);
    expect(list.find((t) => t.topic === 'Di truyền').weak).toBe(false);
  });

  test('đúng đúng 60% thì không bị coi là yếu', () => {
    expect(toTopicList({ A: { correct: 3, total: 5 } })[0].weak).toBe(false);
  });

  test('mergeTopicStats cộng dồn', () => {
    const merged = mergeTopicStats({ A: { correct: 1, total: 2 } }, { A: { correct: 2, total: 3 }, B: { correct: 0, total: 1 } });
    expect(merged).toEqual({ A: { correct: 3, total: 5 }, B: { correct: 0, total: 1 } });
  });

  test('bestScores lấy điểm cao nhất mỗi cặp học sinh-quiz', () => {
    const best = bestScores([
      { studentId: 's1', quizId: 'z1', score: 5 },
      { studentId: 's1', quizId: 'z1', score: 10 },
      { studentId: 's2', quizId: 'z1', score: 3 },
    ]);
    expect(best.get('s1|z1')).toBe(10);
    expect(best.get('s2|z1')).toBe(3);
  });
});

describe('getStudentProgress', () => {
  const opts = ['a', 'b', 'c', 'd'];
  const q = (id, topic, correctIndex) => ({ id, topic, options: opts, correctIndex });

  function prismaWith({ attempts, practices, questions }) {
    return {
      quizAttempt: { findMany: jest.fn(async () => attempts) },
      practiceQuiz: { findMany: jest.fn(async () => practices) },
      quizQuestion: { findMany: jest.fn(async () => questions) },
    };
  }

  const questions = [
    { quizId: 'z1', question: q('q1', 'A', 1) },
    { quizId: 'z1', question: q('q2', 'B', 2) },
    { quizId: 'z1', question: q('q3', 'A', 0) },
  ];
  const attempts = [
    { id: 'a1', quizId: 'z1', studentId: 's1', attemptNo: 1, score: 6.67, answers: { q1: 1, q2: 0, q3: 0 }, submittedAt: new Date('2026-11-01'), quiz: { title: 'KT 1' } },
    { id: 'a2', quizId: 'z1', studentId: 's1', attemptNo: 2, score: 10, answers: { q1: 1, q2: 2, q3: 0 }, submittedAt: new Date('2026-11-02'), quiz: { title: 'KT 1' } },
  ];
  const practices = [
    { id: 'p1', topic: 'B', score: 0, submittedAt: new Date('2026-11-03'),
      questions: [q('p1a', 'B', 0), q('p1b', 'B', 0)], answers: { p1a: 3, p1b: 3 } },
  ];

  test('gộp quiz chính thức + luyện tập: điểm trung bình theo bài tốt nhất, chủ đề yếu', async () => {
    const prisma = prismaWith({ attempts, practices, questions });
    const p = await getStudentProgress({ studentId: 's1', classId: 'c1' }, { prisma });

    expect(p.official.count).toBe(2);
    expect(p.official.average).toBe(10); // 1 quiz, lượt tốt nhất = 10
    expect(p.official.attempts.map((a) => a.score)).toEqual([6.67, 10]);
    expect(p.practice).toMatchObject({ count: 1, average: 0 });

    // A: 4/4 đúng. B: quiz đúng 1/2, luyện tập sai 0/2 -> tổng 1/4 = 25% (đủ 3 câu) -> yếu
    expect(p.topics.find((t) => t.topic === 'A')).toMatchObject({ correct: 4, total: 4, weak: false });
    expect(p.weakTopics).toHaveLength(1);
    expect(p.weakTopics[0]).toMatchObject({ topic: 'B', correct: 1, total: 4, accuracy: 0.25 });
  });

  test('truy vấn chỉ lấy bài ĐÃ NỘP của đúng học sinh trong đúng lớp', async () => {
    const prisma = prismaWith({ attempts: [], practices: [], questions: [] });
    await getStudentProgress({ studentId: 's9', classId: 'c9' }, { prisma });
    expect(prisma.quizAttempt.findMany.mock.calls[0][0].where).toEqual({
      studentId: 's9',
      submittedAt: { not: null },
      quiz: { classId: 'c9' },
    });
    expect(prisma.practiceQuiz.findMany.mock.calls[0][0].where).toMatchObject({ studentId: 's9', classId: 'c9' });
    expect(prisma.quizQuestion.findMany).not.toHaveBeenCalled(); // không có lượt nào thì khỏi truy vấn câu hỏi
  });

  test('học sinh chưa làm gì -> số liệu rỗng, không lỗi', async () => {
    const prisma = prismaWith({ attempts: [], practices: [], questions: [] });
    const p = await getStudentProgress({ studentId: 's1', classId: 'c1' }, { prisma });
    expect(p.official).toMatchObject({ count: 0, average: null, attempts: [] });
    expect(p.practice).toMatchObject({ count: 0, average: null });
    expect(p.weakTopics).toEqual([]);
  });
});