import { jest } from '@jest/globals';
import {
  askQuestion,
  reportAnswer,
  updateAnswerReportStatus,
} from '../../src/services/rag/qaService.js';

const generateOk = async () => 'Quang hợp tạo chất hữu cơ [1].';
const hit = { id: 'k1', documentId: 'd1', fileName: 'a.pdf', pageNumber: 2, text: 'Quang hợp...', score: 0.9 };

describe('askQuestion', () => {
  test('lưu nhật ký kèm trích dẫn và điểm', async () => {
    const prisma = { qaLog: { create: jest.fn(async () => ({ id: 'log1' })) } };
    const res = await askQuestion(
      { studentId: 's1', classId: 'c1', question: 'Quang hợp là gì?' },
      { prisma, retrieve: async () => [hit], generate: generateOk },
    );
    expect(res).toMatchObject({ qaLogId: 'log1', refused: false, topScore: 0.9 });
    expect(res.citations[0]).toMatchObject({ fileName: 'a.pdf', pageNumber: 2 });
    expect(prisma.qaLog.create.mock.calls[0][0].data).toMatchObject({
      studentId: 's1',
      classId: 'c1',
      refused: false,
    });
  });

  test('câu hỏi ngoài tài liệu -> từ chối, vẫn ghi nhật ký, không gọi mô hình', async () => {
    const prisma = { qaLog: { create: jest.fn(async () => ({ id: 'log2' })) } };
    const generate = jest.fn();
    const res = await askQuestion(
      { studentId: 's1', classId: 'c1', question: 'Thủ đô nước Pháp?' },
      { prisma, retrieve: async () => [{ ...hit, score: 0.2 }], generate },
    );
    expect(res).toMatchObject({ refused: true, refusalReason: 'no_evidence', answer: 'Hiện chưa có tài liệu về nội dung này.' });
    expect(generate).not.toHaveBeenCalled();
    expect(prisma.qaLog.create.mock.calls[0][0].data.refused).toBe(true);
  });

  test('mô hình lỗi thì không ghi nhật ký giả', async () => {
    const prisma = { qaLog: { create: jest.fn() } };
    await expect(
      askQuestion(
        { studentId: 's1', classId: 'c1', question: 'Quang hợp là gì?' },
        { prisma, retrieve: async () => [hit], generate: async () => { throw new Error('Gemini sập'); } },
      ),
    ).rejects.toThrow('Gemini sập');
    expect(prisma.qaLog.create).not.toHaveBeenCalled();
  });
});

describe('reportAnswer', () => {
  const user = { id: 's1' };

  test('báo cáo câu trả lời của chính mình', async () => {
    const prisma = {
      qaLog: { findUnique: async () => ({ id: 'log1', studentId: 's1' }) },
      answerReport: { findFirst: async () => null, create: jest.fn(async () => ({ id: 'r1', status: 'open' })) },
    };
    const res = await reportAnswer({ user, qaLogId: 'log1', reason: 'Sai công thức' }, { prisma });
    expect(res.id).toBe('r1');
  });

  test('không báo cáo được câu trả lời của người khác (404)', async () => {
    const prisma = { qaLog: { findUnique: async () => ({ id: 'log1', studentId: 'other' }) } };
    await expect(reportAnswer({ user, qaLogId: 'log1', reason: 'x' }, { prisma })).rejects.toMatchObject({
      code: 'QA_LOG_NOT_FOUND',
    });
  });

  test('báo cáo trùng khi báo cáo cũ còn mở -> 409', async () => {
    const prisma = {
      qaLog: { findUnique: async () => ({ id: 'log1', studentId: 's1' }) },
      answerReport: { findFirst: async () => ({ id: 'r0' }) },
    };
    await expect(reportAnswer({ user, qaLogId: 'log1', reason: 'x' }, { prisma })).rejects.toMatchObject({
      code: 'ALREADY_REPORTED',
    });
  });
});

describe('updateAnswerReportStatus', () => {
  const report = (teacherId) => ({ id: 'r1', qaLog: { class: { teacherId } } });

  test('giáo viên của lớp xử lý được', async () => {
    const prisma = {
      answerReport: {
        findUnique: async () => report('t1'),
        update: jest.fn(async () => ({ id: 'r1', status: 'resolved' })),
      },
    };
    expect(await updateAnswerReportStatus({ teacherId: 't1', reportId: 'r1', status: 'resolved' }, { prisma })).toEqual({
      id: 'r1',
      status: 'resolved',
    });
  });

  test('giáo viên lớp khác không xử lý được (404)', async () => {
    const prisma = { answerReport: { findUnique: async () => report('t1') } };
    await expect(
      updateAnswerReportStatus({ teacherId: 'someone-else', reportId: 'r1', status: 'resolved' }, { prisma }),
    ).rejects.toMatchObject({ code: 'REPORT_NOT_FOUND' });
  });
});