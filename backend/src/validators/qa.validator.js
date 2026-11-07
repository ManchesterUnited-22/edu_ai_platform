import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().trim().min(2).max(1000),
});