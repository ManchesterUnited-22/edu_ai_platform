import { z } from 'zod';
import { env } from '../config/env.js';

const dateTime = z
  .string()
  .datetime({ offset: true })
  .transform((s) => new Date(s));

const questionIds = z
  .array(z.string().uuid())
  .min(1)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, 'Câu hỏi bị trùng');

const title = z.string().trim().min(1).max(200);
const durationMinutes = z.number().int().min(5).max(180);
const maxAttempts = z.number().int().min(1).max(5);

const timeOrder = (v) => !v.opensAt || !v.closesAt || v.closesAt > v.opensAt;
const timeOrderMessage = { message: 'Giờ đóng phải sau giờ mở', path: ['closesAt'] };

export const createQuizSchema = z
  .object({
    title,
    durationMinutes,
    maxAttempts: maxAttempts.default(env.OFFICIAL_QUIZ_MAX_ATTEMPTS),
    opensAt: dateTime.nullable().optional(),
    closesAt: dateTime.nullable().optional(),
    questionIds,
  })
  .refine(timeOrder, timeOrderMessage);

export const updateQuizSchema = z
  .object({
    title: title.optional(),
    durationMinutes: durationMinutes.optional(),
    maxAttempts: maxAttempts.optional(),
    opensAt: dateTime.nullable().optional(),
    closesAt: dateTime.nullable().optional(),
    questionIds: questionIds.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Không có trường nào để cập nhật' })
  .refine(timeOrder, timeOrderMessage);

const answerMap = z.record(z.string().uuid(), z.number().int().min(0).max(3));

export const saveAnswersSchema = z.object({ answers: answerMap });
export const submitAttemptSchema = z.object({ answers: answerMap.optional() });