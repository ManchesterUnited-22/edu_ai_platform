import { z } from 'zod';

export const redeemLinkCodeSchema = z.object({
  code: z.string().trim().min(6).max(16),
});