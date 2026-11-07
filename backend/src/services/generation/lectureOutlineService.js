// Sinh outline bài giảng
import defaultPrisma from '../../config/db.js';
import { generatedLectureOutlineSchema } from '../../validators/content.validator.js';
import { loadPrompt } from './promptLoader.js';
import { lectureOutlineJsonSchema } from './schemas.js';
import { buildGenerationPrompt, loadSourceChunks } from './sourceChunks.js';
import { generateValidated } from './structured.js';

export async function generateLectureOutline(
  { classId, authorId, documentIds, title, focus, durationMinutes = 45 },
  deps = {},
) {
  const prisma = deps.prisma ?? defaultPrisma;

  const chunks = await loadSourceChunks({ classId, documentIds }, deps);
  const generated = await generateValidated(
    {
      system: loadPrompt('lectureOutline'),
      prompt: buildGenerationPrompt(chunks, [
        `Thời lượng tiết học: ${durationMinutes} phút`,
        focus && `Trọng tâm cần nhấn mạnh: ${focus}`,
      ]),
      jsonSchema: lectureOutlineJsonSchema,
      zodSchema: generatedLectureOutlineSchema,
    },
    deps,
  );

  const { title: aiTitle, ...body } = generated;
  return prisma.generatedContent.create({
    data: {
      classId,
      authorId,
      type: 'lecture_outline',
      title: title ?? aiTitle,
      body: {
        ...body,
        durationMinutes,
        sourceDocumentIds: [...new Set(chunks.map((c) => c.documentId))],
      },
    },
    select: { id: true, type: true, title: true, status: true, version: true, body: true },
  });
}