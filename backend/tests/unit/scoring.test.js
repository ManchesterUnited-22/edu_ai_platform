import { gradeAnswers, summarizeByTopic } from '../../src/services/quiz/scoring.js';

const questions = [
  { id: 'q1', options: ['a', 'b', 'c', 'd'], correctIndex: 1, topic: 'Quang hợp' },
  { id: 'q2', options: ['a', 'b', 'c', 'd'], correctIndex: 0, topic: 'Quang hợp' },
  { id: 'q3', options: ['a', 'b', 'c', 'd'], correctIndex: 3, topic: null },
];

describe('gradeAnswers', () => {
  test('đúng hết -> 10 điểm', () => {
    const r = gradeAnswers(questions, { q1: 1, q2: 0, q3: 3 });
    expect(r).toMatchObject({ score: 10, correct: 3, total: 3 });
  });

  test('làm đúng 2/3 -> 6.67 (làm tròn 2 chữ số)', () => {
    expect(gradeAnswers(questions, { q1: 1, q2: 0, q3: 0 }).score).toBe(6.67);
  });

  test('bỏ trống và đáp án sai kiểu/ngoài phạm vi đều tính là sai', () => {
    const r = gradeAnswers(questions, { q1: '1', q2: 9, q3: -1 });
    expect(r.correct).toBe(0);
    expect(r.details.every((d) => d.selected === null)).toBe(true);
    expect(gradeAnswers(questions, undefined).score).toBe(0);
  });

  test('không có câu hỏi -> 0 điểm, không chia cho 0', () => {
    expect(gradeAnswers([], {}).score).toBe(0);
  });

  test('đáp án của câu không thuộc quiz bị bỏ qua', () => {
    expect(gradeAnswers(questions, { q1: 1, zzz: 2 }).correct).toBe(1);
  });
});

describe('summarizeByTopic', () => {
  test('gom đúng/sai theo chủ đề, câu không có chủ đề vào "Khác"', () => {
    const { details } = gradeAnswers(questions, { q1: 1, q2: 3, q3: 3 });
    expect(summarizeByTopic(details)).toEqual({
      'Quang hợp': { correct: 1, total: 2 },
      Khác: { correct: 1, total: 1 },
    });
  });
});