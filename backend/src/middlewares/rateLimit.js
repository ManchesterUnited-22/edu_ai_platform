// Giới hạn tần suất request
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/** Hỏi-đáp RAG: tối đa QA_PER_MINUTE câu/phút cho MỖI người dùng (không tính theo IP). */
export const qaRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.QA_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? 'anonymous',
  handler: (req, res, next) =>
    next(
      new AppError(
        `Bạn hỏi quá nhanh, tối đa ${env.QA_PER_MINUTE} câu mỗi phút. Hãy thử lại sau ít giây.`,
        429,
        'RATE_LIMITED',
      ),
    ),
});