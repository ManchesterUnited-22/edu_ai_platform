import { z } from 'zod';

export const reportAnswerSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const updateReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
});