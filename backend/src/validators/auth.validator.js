import { z } from 'zod';

const password = z.string().min(8).max(128);
const email = z.string().trim().toLowerCase().email().max(254);

export const registerSchema = z.object({
  email,
  password,
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(['student', 'parent', 'teacher']).default('student'),
  teacherType: z.enum(['institution', 'independent', 'online']).optional(),
  teacherBio: z.string().trim().max(1000).optional(),
  teacherSubjects: z.string().trim().max(300).optional(),
  teacherExperienceYears: z.coerce.number().int().min(0).max(80).optional(),
  inviteCode: z.string().trim().max(100).optional(),
}).refine((value) => value.role !== 'teacher' || Boolean(value.teacherType), {
  message: 'Vui lòng chọn loại hình giảng dạy',
  path: ['teacherType'],
});

export const loginSchema = z.object({
  email,
  password,
});

export const mfaTokenSchema = z.object({
  mfaToken: z.string().min(20).max(2048),
});

export const mfaCodeSchema = mfaTokenSchema.extend({
  code: z.string().trim().min(6).max(20),
});

export const verificationSchema = z.object({
  track: z.enum(['active_teacher', 'retired_teacher', 'teaching_student', 'new_graduate', 'language_teacher']),
});