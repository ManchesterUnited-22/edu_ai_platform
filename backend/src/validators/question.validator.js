import { z } from 'zod';

const questionText = z.string().trim().min(5).max(500);
const option = z.string().trim().min(1).max(300);
const distinct = (options) => new Set(options.map((o) => o.toLowerCase())).size === options.length;

// Câu hỏi do AI sinh ra: kiểm tra chặt, câu nào sai cấu trúc thì bị loại
export const generatedQuestionSchema = z.object({
  text: questionText,
  options: z.array(option).length(4).refine(distinct, 'Các phương án phải khác nhau'),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(800).default(''),
  topic: z.string().trim().max(100).default(''),
  difficulty: z.number().int().min(1).max(3).default(1),
  sourceRef: z.number().int().min(1),
});

// Yêu cầu sinh câu hỏi
export const generateQuestionsSchema = z.object({
  documentIds: z.array(z.string().uuid()).max(20).optional(),
  count: z.number().int().min(1).max(20).default(10),
  difficulty: z.number().int().min(1).max(3).optional(),
  topic: z.string().trim().max(200).optional(),
});

// Giáo viên chỉnh sửa một câu hỏi
export const updateQuestionSchema = z
  .object({
    text: questionText.optional(),
    options: z.array(option).length(4).refine(distinct, 'Các phương án phải khác nhau').optional(),
    correctIndex: z.number().int().min(0).max(3).optional(),
    explanation: z.string().trim().max(800).optional(),
    topic: z.string().trim().max(100).optional(),
    difficulty: z.number().int().min(1).max(3).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Không có trường nào để cập nhật' });

// Duyệt / xuất bản / thu hồi nhiều câu cùng lúc
export const bulkStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(['review', 'publish', 'unpublish']),
});