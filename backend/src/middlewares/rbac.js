import { AppError } from '../utils/AppError.js';

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError('Cần xác thực trước khi kiểm tra quyền', 401, 'AUTHENTICATION_REQUIRED'),
    );
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403, 'FORBIDDEN'));
  }

  return next();
};
