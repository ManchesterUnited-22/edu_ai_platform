import { z } from 'zod';

const password = z.string().min(8).max(128);
const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['student', 'parent', 'teacher']).default('student'),
  inviteCode: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email,
  password,
});