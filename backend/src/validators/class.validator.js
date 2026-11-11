import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(2).max(100),
});

export const enrollmentSchema = z.union([
  z.object({ studentId: z.string().uuid() }),
  z.object({ email: z.string().trim().toLowerCase().email() }),
]);
