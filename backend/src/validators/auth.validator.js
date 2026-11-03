import { z } from 'zod';

const password = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: z.string().trim().email().max(254),
  password,
  fullName: z.string().trim().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password,
});
