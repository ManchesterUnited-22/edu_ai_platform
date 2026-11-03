import prisma from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import { hashPassword, verifyPassword } from '../utils/hash.js';
import { signAccessToken } from '../utils/jwt.js';

export const publicUser = ({ id, email, fullName, role, createdAt }) => ({
  id,
  email,
  fullName,
  role,
  createdAt,
});

export const register = async (req, res, next) => {
  try {
    const { email, password, fullName } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      throw new AppError('Email đã được sử dụng', 409, 'EMAIL_ALREADY_EXISTS');
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        fullName,
        role: 'student',
      },
    });

    return res.status(201).json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new AppError(
        'Email hoặc mật khẩu không đúng',
        401,
        'INVALID_CREDENTIALS',
      );
    }

    return res.json({
      user: publicUser(user),
      accessToken: signAccessToken(user),
    });
  } catch (error) {
    return next(error);
  }
};

export const me = (req, res) => res.json({ user: publicUser(req.user) });
