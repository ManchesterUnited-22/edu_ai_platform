import { jest } from '@jest/globals';
import { processDocument } from '../../src/services/ingestion/pipeline.js';

function makeFakePrisma(doc) {
  const log = [];
  return {
    log,
    document: {
      findUnique: jest.fn(async () => doc),
      update: jest.fn(async ({ data }) => {
        log.push(data.processStatus);
        return data;
      }),
    },
    chunk: {
      deleteMany: jest.fn(() => 'deleteMany'),
      createMany: jest.fn(({ data }) => {
        log.push(`createMany:${data.length}`);
        return 'createMany';
      }),
    },
    $transaction: jest.fn(async () => {}),
  };
}

const doc = { id: 'd1', mimeType: 'application/pdf', filePath: 'x.pdf' };

describe('processDocument', () => {
  test('thành công: processing -> lưu chunk -> ready', async () => {
    const prisma = makeFakePrisma(doc);
    const extractPages = async () => [
      { pageNumber: 1, text: 'Quang hợp là quá trình tạo chất hữu cơ.' },
      { pageNumber: 2, text: 'Hô hấp giải phóng năng lượng.' },
    ];
    const result = await processDocument('d1', { prisma, extractPages });
    expect(result).toEqual({ ok: true, chunkCount: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.log[0]).toBe('processing');
  });

  test('không trích được text -> failed kèm lời nhắn cho giáo viên', async () => {
    const prisma = makeFakePrisma(doc);
    const result = await processDocument('d1', {
      prisma,
      extractPages: async () => [{ pageNumber: 1, text: '   ' }],
    });
    expect(result.ok).toBe(false);
    expect(prisma.log.at(-1)).toBe('failed');
    expect(prisma.document.update.mock.calls.at(-1)[0].data.errorMessage).toMatch(/scan/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('lỗi khi đọc file -> failed, không ném lỗi ra ngoài', async () => {
    const prisma = makeFakePrisma(doc);
    const result = await processDocument('d1', {
      prisma,
      extractPages: async () => {
        throw new Error('hỏng file');
      },
    });
    expect(result).toMatchObject({ ok: false, reason: 'failed' });
    expect(prisma.log.at(-1)).toBe('failed');
  });

  test('tài liệu không tồn tại -> not_found', async () => {
    const prisma = makeFakePrisma(null);
    expect(await processDocument('zzz', { prisma })).toEqual({ ok: false, reason: 'not_found' });
  });
});