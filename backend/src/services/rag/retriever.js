// Vector search top-K (cosine), lọc đúng lớp và CHỈ nội dung đang published
import defaultPrisma from '../../config/db.js';
import { env } from '../../config/env.js';
import { embedQuery as defaultEmbedQuery } from './embedder.js';
import * as defaultStore from './vectorStore.js';

/**
 * @returns {Promise<{id:string,text:string,score:number,documentId:string,
 *   chunkIndex:number,pageNumber:number|null,fileName:string}[]>} sắp theo điểm giảm dần
 */
export async function retrieve({ question, classId, topK = env.TOP_K }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const embedQuery = deps.embedQuery ?? defaultEmbedQuery;
  const store = deps.store ?? defaultStore;

  const embedding = await embedQuery(question);
  const hits = await store.queryChunks({ embedding, classId, topK });
  if (hits.length === 0) return [];

  // Lớp bảo vệ thứ hai: dù vector DB còn sót vector cũ, tài liệu không còn published thì bỏ qua
  const documents = await prisma.document.findMany({
    where: {
      id: { in: [...new Set(hits.map((h) => h.documentId))] },
      classId,
      publishStatus: 'published',
    },
    select: { id: true, fileName: true },
  });
  const nameById = new Map(documents.map((d) => [d.id, d.fileName]));

  return hits
    .filter((h) => nameById.has(h.documentId))
    .map((h) => ({ ...h, fileName: nameById.get(h.documentId) }))
    .sort((a, b) => b.score - a.score);
}