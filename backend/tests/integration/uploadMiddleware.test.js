import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';

process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'edu-upload-'));
process.env.MAX_UPLOAD_MB = '0.001'; // ~1KB để test giới hạn dung lượng

const { uploadSingleFile } = await import('../../src/middlewares/upload.js');
const { errorHandler } = await import('../../src/middlewares/errorHandler.js');

const app = express();
app.post('/upload', uploadSingleFile, (req, res) =>
  res.json({ name: req.file.originalname, stored: req.file.filename }),
);
app.use(errorHandler);

afterAll(() => fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true }));

describe('uploadSingleFile', () => {
  test('nhận PDF, lưu tên ngẫu nhiên và giữ đúng tên gốc tiếng Việt', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('%PDF-1.4 demo'), {
        filename: 'Bài giảng quang hợp.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bài giảng quang hợp.pdf');
    expect(res.body.stored).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(fs.existsSync(path.join(process.env.UPLOAD_DIR, res.body.stored))).toBe(true);
  });

  test('từ chối loại file không hỗ trợ', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  test('từ chối file quá dung lượng (413)', async () => {
    const res = await request(app)
      .post('/upload')
      .attach('file', Buffer.alloc(5000), { filename: 'big.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(413);
  });

  test('thiếu file -> 400', async () => {
    const res = await request(app).post('/upload').field('x', 'y');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });
});