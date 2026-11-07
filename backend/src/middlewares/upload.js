// Nhận file upload bằng multer: lưu đĩa, kiểm tra loại/dung lượng
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { SUPPORTED_MIME_TYPES } from '../services/ingestion/pipeline.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: Math.floor(env.MAX_UPLOAD_MB * 1024 * 1024), files: 1 },
  fileFilter: (req, file, cb) => {
    if (!SUPPORTED_MIME_TYPES[file.mimetype]) {
      return cb(new AppError('Chỉ hỗ trợ PDF, DOCX, PNG, JPG', 400, 'UNSUPPORTED_FILE_TYPE'));
    }
    return cb(null, true);
  },
});

export const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      if (!req.file) {
        return next(new AppError('Thiếu file (trường "file")', 400, 'FILE_REQUIRED'));
      }
      // multer đọc tên file theo latin1 -> đổi lại UTF-8 để giữ dấu tiếng Việt
      req.file.originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
      return next();
    }
    if (error instanceof multer.MulterError) {
      const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `File vượt quá ${env.MAX_UPLOAD_MB}MB`
          : 'Upload không hợp lệ';
      return next(new AppError(message, status, 'UPLOAD_ERROR'));
    }
    return next(error);
  });
};