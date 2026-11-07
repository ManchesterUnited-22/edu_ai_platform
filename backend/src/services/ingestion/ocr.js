// OCR tiếng Việt cho ảnh bằng tesseract.js
import os from 'node:os';
import path from 'node:path';
import { createWorker } from 'tesseract.js';

// Lần đầu chạy sẽ tải dữ liệu ngôn ngữ 'vie' từ internet; lưu vào thư mục tạm
// (không để trong thư mục dự án vì nodemon sẽ tưởng file đổi và restart liên tục)
const cachePath = path.join(os.tmpdir(), 'edu-ai-tessdata');

export async function extractImage(filePath) {
  const worker = await createWorker('vie', 1, { cachePath });
  try {
    const { data } = await worker.recognize(filePath);
    return [{ pageNumber: 1, text: data.text }];
  } finally {
    await worker.terminate();
  }
}