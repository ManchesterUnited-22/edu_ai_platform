import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().trim().min(2).max(1000),
});
export const socraticSchema = z.object({
  problem: z.string().trim().min(5).max(1500),
  messages: z
    .array(
      z.object({
        role: z.enum(['student', 'tutor']),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .max(12)
    .default([]),
});