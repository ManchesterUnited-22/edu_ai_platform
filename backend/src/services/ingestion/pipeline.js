// Upload -> trích text -> chuẩn hóa -> chunking -> lưu Chunk (Postgres).
// Embedding và đưa vào vector DB chỉ diễn ra khi giáo viên XUẤT BẢN (bước publish).
import defaultPrisma from '../../config/db.js';
import { chunkPages } from '../rag/chunker.js';
import { resolveUploadPath } from '../../utils/files.js';
import { extractDocx } from './extractDocx.js';
import { extractImage } from './ocr.js';
import { extractPdf } from './extractPdf.js';
import { normalizePages } from './normalizer.js';
import { checkTextSafety } from '../safety/contentSafety.js'; 
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const SUPPORTED_MIME_TYPES = Object.freeze({
  'application/pdf': extractPdf,
  [DOCX_MIME]: extractDocx,
  'image/png': extractImage,
  'image/jpeg': extractImage,
});

export async function extractPages(mimeType, filePath) {
  const extractor = SUPPORTED_MIME_TYPES[mimeType];
  if (!extractor) throw new Error(`Loại file không được hỗ trợ: ${mimeType}`);
  return extractor(filePath);
}

/**
 * Xử lý một tài liệu. Không ném lỗi ra ngoài: lỗi được ghi vào Document (failed + errorMessage).
 * `deps` chỉ để test.
 */
export async function processDocument(documentId, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const extract = deps.extractPages ?? extractPages;

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { ok: false, reason: 'not_found' };

  await prisma.document.update({
    where: { id: doc.id },
    data: { processStatus: 'processing', errorMessage: null },
  });

  try {
    const rawPages = await extract(doc.mimeType, resolveUploadPath(doc.filePath));
    const pages = normalizePages(rawPages);
    const safety = checkTextSafety(pages.map((p) => p.text).join('\n'), { skip: ['self_harm'] });
    if (!safety.safe) {
      throw new Error(`Tài liệu bị chặn vì có nội dung không phù hợp (${safety.categories.join(', ')})`);
    }
    const chunks = chunkPages(pages);

    if (chunks.length === 0) {
      throw new Error(
        'Không trích xuất được nội dung. Nếu là PDF dạng ảnh scan, hãy tải lên dưới dạng ảnh PNG/JPG để OCR.',
      );
    }

    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { documentId: doc.id } }),
      prisma.chunk.createMany({
        data: chunks.map((c) => ({
          documentId: doc.id,
          chunkIndex: c.chunkIndex,
          text: c.text,
          pageNumber: c.pageNumber,
        })),
      }),
      prisma.document.update({
        where: { id: doc.id },
        data: { processStatus: 'ready', errorMessage: null },
      }),
    ]);

    return { ok: true, chunkCount: chunks.length };
  } catch (error) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { processStatus: 'failed', errorMessage: String(error.message).slice(0, 500) },
    });
    return { ok: false, reason: 'failed', message: error.message };
  }
}