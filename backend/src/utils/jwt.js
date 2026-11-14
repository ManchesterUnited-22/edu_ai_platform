import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_SECRET);

export const signMfaToken = (user, purpose) =>
  jwt.sign(
    { sub: user.id, purpose },
    env.JWT_SECRET,
    { expiresIn: '10m' },
  );

export const verifyMfaToken = (token, purpose) => {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload !== 'object' || payload.purpose !== purpose || typeof payload.sub !== 'string') {
    throw new Error('Invalid MFA token');
  }
  return payload;
};
