import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);
