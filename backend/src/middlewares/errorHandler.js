import { Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError.js';

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return res.status(409).json({
      error: { code: 'CONFLICT', message: 'Dữ liệu đã tồn tại' },
    });
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const message =
    error instanceof AppError ? error.message : 'Đã xảy ra lỗi máy chủ';

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ error: { code, message } });
};
