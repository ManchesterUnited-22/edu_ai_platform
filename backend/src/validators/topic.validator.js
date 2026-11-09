import { z } from 'zod';

const name = z.string().trim().min(1).max(100);

export const createTopicSchema = z.object({
  name,
  parentId: z.string().uuid().nullable().optional(),
});

export const updateTopicSchema = z
  .object({ name: name.optional(), parentId: z.string().uuid().nullable().optional() })
  .refine((v) => v.name !== undefined || v.parentId !== undefined, { message: 'Cần ít nhất một trường' });

export const prerequisiteSchema = z.object({ prerequisiteId: z.string().uuid() });