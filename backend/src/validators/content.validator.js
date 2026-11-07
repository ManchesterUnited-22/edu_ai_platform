import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);

// ---- Nội dung (body) lưu trong GeneratedContent ----
export const outlineBodySchema = z.object({
  summary: text(2000),
  sections: z
    .array(
      z.object({
        heading: text(200),
        points: z.array(text(500)).min(1).max(20),
        keyTerms: z.array(text(100)).max(15).default([]),
      }),
    )
    .min(1)
    .max(30),
  sourceDocumentIds: z.array(z.string()).default([]),
});

export const lectureOutlineBodySchema = z.object({
  objectives: z.array(text(300)).min(1).max(10),
  sections: z
    .array(
      z.object({
        title: text(200),
        minutes: z.number().int().min(1).max(180),
        points: z.array(text(500)).min(1).max(20),
        activity: z.string().trim().max(500).default(''),
      }),
    )
    .min(1)
    .max(15),
  durationMinutes: z.number().int().min(1).max(300).optional(),
  sourceDocumentIds: z.array(z.string()).default([]),
});

export const bodySchemaByType = {
  outline: outlineBodySchema,
  lecture_outline: lectureOutlineBodySchema,
};

// ---- Kết quả AI trả về (có thêm title) ----
export const generatedOutlineSchema = outlineBodySchema
  .omit({ sourceDocumentIds: true })
  .extend({ title: text(200) });

export const generatedLectureOutlineSchema = lectureOutlineBodySchema
  .omit({ sourceDocumentIds: true, durationMinutes: true })
  .extend({ title: text(200) });

// ---- Yêu cầu từ client ----
const documentIds = z.array(z.string().uuid()).max(20).optional();

export const generateOutlineSchema = z.object({
  documentIds,
  title: z.string().trim().min(1).max(200).optional(),
  focus: z.string().trim().max(500).optional(),
});

export const generateLectureOutlineSchema = z.object({
  documentIds,
  title: z.string().trim().min(1).max(200).optional(),
  focus: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(15).max(180).default(45),
});

export const updateContentSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    body: z.unknown().optional(),
  })
  .refine((v) => v.title !== undefined || v.body !== undefined, {
    message: 'Cần ít nhất một trường để cập nhật',
  });