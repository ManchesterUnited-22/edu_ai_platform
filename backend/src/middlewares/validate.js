import { AppError } from '../utils/AppError.js';

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    return next(
      new AppError(
        'Dữ liệu không hợp lệ',
        400,
        'VALIDATION_ERROR',
      ),
    );
  }

  req.body = result.data;
  return next();
};
