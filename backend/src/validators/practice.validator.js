import { z } from 'zod';

export const createPracticeSchema = z.object({
  count: z.number().int().min(3).max(10).default(5),
  topic: z.string().trim().min(1).max(200).optional(),
});

export const submitPracticeSchema = z.object({
  answers: z.record(z.string().uuid(), z.number().int().min(0).max(3)),
});