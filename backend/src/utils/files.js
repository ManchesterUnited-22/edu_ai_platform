// Lưu file, kiểm tra loại/dung lượng
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

/** filePath trong DB chỉ lưu tên file; đường dẫn đầy đủ ghép khi cần (dễ đổi nơi lưu). */
export const resolveUploadPath = (fileName) => path.join(env.UPLOAD_DIR, path.basename(fileName));

export async function removeUploadedFile(fileName) {
  try {
    await fs.unlink(resolveUploadPath(fileName));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}