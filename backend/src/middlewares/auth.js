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
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};
