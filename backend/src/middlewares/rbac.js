import { AppError } from '../utils/AppError.js';
import prisma from '../config/db.js';

export const requireRole = (...allowedRoles) => async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError('Cần xác thực trước khi kiểm tra quyền', 401, 'AUTHENTICATION_REQUIRED'),
    );
  }

  if (!allowedRoles.includes(req.user.role)) {
    if (allowedRoles.includes('teacher') && ['student', 'parent'].includes(req.user.role)) {
      await prisma.securityEvent.create({
        data: {
          type: 'teacher_role_misuse',
          actorUserId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')?.slice(0, 500),
          riskScore: 55,
          riskReasons: ['Tài khoản đã xác định cố truy cập chức năng giáo viên'],
          metadata: { requestedRoles: allowedRoles },
        },
      }).catch((error) => console.error('Không thể ghi nhận sự kiện lạm dụng quyền', error));
    }
    return next(new AppError('Bạn không có quyền thực hiện thao tác này', 403, 'FORBIDDEN'));
  }

  return next();
};
