import { jest } from '@jest/globals';
import { generateLectureOutline } from '../../src/services/generation/lectureOutlineService.js';
import { generateOutline } from '../../src/services/generation/outlineService.js';
import {
  generateQuestions,
  normalizeKey,
  shuffleOptions,
} from '../../src/services/generation/questionService.js';

const chunks = [
  { id: 'k1', documentId: 'd1', fileName: 'Sinh 11.pdf', pageNumber: 3, text: 'Quang hợp tạo chất hữu cơ.' },
  { id: 'k2', documentId: 'd1', fileName: 'Sinh 11.pdf', pageNumber: 4, text: 'Hô hấp giải phóng năng lượng.' },
];
// bỏ qua bước đọc DB: loadSourceChunks dùng prisma.document/chunk -> dựng prisma giả trả đúng 2 đoạn
const sourcePrisma = (extra = {}) => ({
  document: { findMany: async () => [{ id: 'd1', fileName: 'Sinh 11.pdf' }] },
  chunk: {
    findMany: async () =>
      chunks.map((c, i) => ({ id: c.id, documentId: 'd1', chunkIndex: i, text: c.text, pageNumber: c.pageNumber })),
  },
  ...extra,
});

const goodQuestion = (over = {}) => ({
  text: 'Quang hợp tạo ra gì?',
  options: ['Chất hữu cơ', 'Kim loại', 'Đá vôi', 'Muối ăn'],
  correctIndex: 0,
  explanation: 'Theo tài liệu.',
  topic: 'Quang hợp',
  difficulty: 1,
  sourceRef: 1,
  ...over,
});

describe('shuffleOptions / normalizeKey', () => {
  test('xáo trộn nhưng correctIndex vẫn trỏ đúng phương án đúng', () => {
    const q = goodQuestion();
    for (let seed = 0; seed < 20; seed += 1) {
      let s = seed + 1;
      const random = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
      const out = shuffleOptions(q, random);
      expect(out.options[out.correctIndex]).toBe('Chất hữu cơ');
      expect([...out.options].sort()).toEqual([...q.options].sort());
    }
  });

  test('normalizeKey bỏ khác biệt hoa/thường, khoảng trắng, dấu cuối câu', () => {
    expect(normalizeKey('Quang hợp  là gì?')).toBe(normalizeKey('quang hợp là gì'));
  });
});

describe('generateQuestions', () => {
  function setup(rawQuestions, existing = []) {
    const created = [];
    const prisma = sourcePrisma({
      question: {
        findMany: async () => existing,
        create: jest.fn(({ data }) => {
          created.push(data);
          return { id: `q${created.length}`, ...data, status: 'draft' };
        }),
      },
      $transaction: async (ops) => Promise.all(ops),
    });
    const generateJson = jest.fn(async () => ({ questions: rawQuestions }));
    return { prisma, generateJson, created };
  }

  test('lưu câu hợp lệ ở trạng thái draft, gắn đoạn nguồn, xáo trộn phương án', async () => {
    const { prisma, generateJson, created } = setup([goodQuestion(), goodQuestion({ text: 'Hô hấp để làm gì?', sourceRef: 2 })]);
    const res = await generateQuestions({ classId: 'c1', count: 5 }, { prisma, generateJson, random: () => 0 });

    expect(res).toMatchObject({ requested: 5, created: 2 });
    expect(created[0].sourceChunkId).toBe('k1');
    expect(created[1].sourceChunkId).toBe('k2');
    created.forEach((d) => {
      expect(d.classId).toBe('c1');
      expect(d.status).toBeUndefined(); // để DB đặt mặc định draft
      expect(d.options[d.correctIndex]).toBeDefined();
    });
    expect(created[0].options[created[0].correctIndex]).toBe('Chất hữu cơ');
  });

  test('loại câu sai cấu trúc, trỏ nguồn bịa, phương án kiểu "cả A và B", trùng câu cũ và trùng trong lô', async () => {
    const { prisma, generateJson, created } = setup(
      [
        goodQuestion({ text: 'Câu hợp lệ số một?' }),
        goodQuestion({ text: 'Thiếu phương án?', options: ['a', 'b'] }),
        goodQuestion({ text: 'Nguồn không tồn tại?', sourceRef: 99 }),
        goodQuestion({ text: 'Phương án mập mờ?', options: ['Chất hữu cơ', 'Cả A và B', 'Đá vôi', 'Muối ăn'] }),
        goodQuestion({ text: 'Đã có trong ngân hàng?' }),
        goodQuestion({ text: 'câu hợp lệ SỐ MỘT' }), // trùng trong cùng lô
      ],
      [{ text: 'Đã có trong ngân hàng' }],
    );
    const res = await generateQuestions({ classId: 'c1', count: 10 }, { prisma, generateJson });
    expect(res.created).toBe(1);
    expect(res.skipped).toEqual({ invalid: 1, badSource: 1, badOptions: 1, duplicate: 2 });
    expect(created).toHaveLength(1);
  });

  test('không lấy quá số câu yêu cầu', async () => {
    const raw = Array.from({ length: 6 }, (_, i) => goodQuestion({ text: `Câu số ${i} khác nhau hoàn toàn?` }));
    const { prisma, generateJson } = setup(raw);
    const res = await generateQuestions({ classId: 'c1', count: 3 }, { prisma, generateJson });
    expect(res.created).toBe(3);
  });

  test('AI không trả được câu hợp lệ nào -> GENERATION_INVALID, không ghi gì', async () => {
    const { prisma, generateJson } = setup([{ text: 'x' }]);
    await expect(generateQuestions({ classId: 'c1' }, { prisma, generateJson })).rejects.toMatchObject({
      code: 'GENERATION_INVALID',
    });
    expect(prisma.question.create).not.toHaveBeenCalled();
  });
});

describe('generateOutline / generateLectureOutline', () => {
  test('đề cương: lưu draft kèm danh sách tài liệu nguồn, ưu tiên title do giáo viên đặt', async () => {
    const create = jest.fn(async ({ data }) => ({ id: 'ct1', ...data }));
    const prisma = sourcePrisma({ generatedContent: { create } });
    const generateJson = async () => ({
      title: 'Đề cương AI',
      summary: 'Tóm tắt.',
      sections: [{ heading: 'Quang hợp', points: ['Tạo chất hữu cơ'], keyTerms: ['diệp lục'] }],
    });

    await generateOutline({ classId: 'c1', authorId: 't1', title: 'Tên do GV đặt' }, { prisma, generateJson });
    const { data } = create.mock.calls[0][0];
    expect(data).toMatchObject({ classId: 'c1', authorId: 't1', type: 'outline', title: 'Tên do GV đặt' });
    expect(data.body.sourceDocumentIds).toEqual(['d1']);
    expect(data.body.sections[0].heading).toBe('Quang hợp');
    expect(data.body.title).toBeUndefined();
  });

  test('đề cương: AI trả sai cấu trúc hai lần -> GENERATION_INVALID, không lưu', async () => {
    const create = jest.fn();
    const prisma = sourcePrisma({ generatedContent: { create } });
    await expect(
      generateOutline({ classId: 'c1', authorId: 't1' }, { prisma, generateJson: async () => ({ title: 'x' }) }),
    ).rejects.toMatchObject({ code: 'GENERATION_INVALID' });
    expect(create).not.toHaveBeenCalled();
  });

  test('outline bài giảng: lưu type lecture_outline kèm thời lượng, thời lượng được đưa vào prompt', async () => {
    const create = jest.fn(async ({ data }) => ({ id: 'ct2', ...data }));
    const prisma = sourcePrisma({ generatedContent: { create } });
    const generateJson = jest.fn(async () => ({
      title: 'Bài giảng quang hợp',
      objectives: ['Nêu được khái niệm quang hợp'],
      sections: [{ title: 'Mở đầu', minutes: 10, points: ['Đặt vấn đề'], activity: 'Hỏi đáp nhanh' }],
    }));

    await generateLectureOutline({ classId: 'c1', authorId: 't1', durationMinutes: 45 }, { prisma, generateJson });
    expect(generateJson.mock.calls[0][0].prompt).toContain('45 phút');
    const { data } = create.mock.calls[0][0];
    expect(data.type).toBe('lecture_outline');
    expect(data.body.durationMinutes).toBe(45);
  });
});