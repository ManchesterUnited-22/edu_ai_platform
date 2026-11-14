import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    const header = req.get('authorization');
    const [scheme, token] = header?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new AppError(
        'Vui lòng cung cấp Bearer token',
        401,
        'AUTHENTICATION_REQUIRED',
      );
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new AppError('Token không hợp lệ hoặc đã hết hạn', 401, 'INVALID_TOKEN');
    }

    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      throw new AppError('Token không hợp lệ', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 401, 'USER_NOT_FOUND');
    }

    if (user.status !== 'active') {
      if (user.role === 'teacher' && user.status === 'pending') {
        await prisma.securityEvent.create({
          data: {
            type: 'pending_teacher_access',
            targetUserId: user.id,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')?.slice(0, 500),
            riskScore: 45,
            riskReasons: ['Tài khoản giáo viên chưa được admin duyệt nhưng vẫn gửi yêu cầu'],
          },
        }).catch((error) => console.error('Không thể ghi nhận truy cập giáo viên chờ duyệt', error));
      }
      const code = user.role === 'teacher' && user.status === 'pending'
        ? 'TEACHER_PENDING_APPROVAL'
        : 'ACCOUNT_NOT_ACTIVE';
      throw new AppError(
        user.role === 'teacher' && user.status === 'pending'
          ? 'Tài khoản giáo viên đang chờ admin duyệt'
          : 'Tài khoản chưa được phép sử dụng',
        403,
        code,
      );
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
