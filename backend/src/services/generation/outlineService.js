// Sinh đề cương ôn tập (RAG + Generation, structured output)
import defaultPrisma from '../../config/db.js';
import { generatedOutlineSchema } from '../../validators/content.validator.js';
import { loadPrompt } from './promptLoader.js';
import { outlineJsonSchema } from './schemas.js';
import { buildGenerationPrompt, loadSourceChunks } from './sourceChunks.js';
import { generateValidated } from './structured.js';

export async function generateOutline({ classId, authorId, documentIds, title, focus }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;

  const chunks = await loadSourceChunks({ classId, documentIds }, deps);
  const generated = await generateValidated(
    {
      system: loadPrompt('outlineGeneration'),
      prompt: buildGenerationPrompt(chunks, [focus && `Trọng tâm cần nhấn mạnh: ${focus}`]),
      jsonSchema: outlineJsonSchema,
      zodSchema: generatedOutlineSchema,
    },
    deps,
  );

  const { title: aiTitle, ...body } = generated;
  return prisma.generatedContent.create({
    data: {
      classId,
      authorId,
      type: 'outline',
      title: title ?? aiTitle,
      body: { ...body, sourceDocumentIds: [...new Set(chunks.map((c) => c.documentId))] },
    },
    select: { id: true, type: true, title: true, status: true, version: true, body: true },
  });
}