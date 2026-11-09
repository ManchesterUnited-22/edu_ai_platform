// Lấy các đoạn tài liệu làm căn cứ cho AI sinh nội dung (đề cương, câu hỏi, outline, quiz luyện tập)
import defaultPrisma from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';

export const MAX_SOURCE_CHARS = 60_000;

// Không cho nội dung tài liệu/yêu cầu tự đóng thẻ để thoát khỏi vùng "dữ liệu"
const neutralizeTags = (text) => text.replace(/<\/?\s*(tai_lieu|yeu_cau)\s*>/gi, '');

/** Nếu tổng độ dài vượt ngân sách thì lấy mẫu rải đều toàn tài liệu (giữ nguyên thứ tự). */
export function sampleChunks(chunks, maxChars = MAX_SOURCE_CHARS) {
  const total = chunks.reduce((sum, c) => sum + c.text.length, 0);
  if (total <= maxChars) return chunks;

  const keep = Math.max(1, Math.floor((maxChars / total) * chunks.length));
  const picked = new Set();
  for (let i = 0; i < keep; i += 1) picked.add(Math.floor((i * chunks.length) / keep));
  return chunks.filter((_, index) => picked.has(index));
}

/**
 * @param {{classId:string, documentIds?:string[], publishedOnly?:boolean}} options
 *   publishedOnly = true: chỉ lấy tài liệu ĐÃ XUẤT BẢN (dùng cho học sinh tự luyện tập).
 * @returns {Promise<{id:string, documentId:string, fileName:string, pageNumber:number|null, text:string}[]>}
 */
export async function loadSourceChunks({ classId, documentIds, publishedOnly = false }, deps = {}) {
  const prisma = deps.prisma ?? defaultPrisma;
  const requested = documentIds?.length ? [...new Set(documentIds)] : null;

  const documents = await prisma.document.findMany({
    where: {
      classId,
      processStatus: 'ready',
      ...(publishedOnly ? { publishStatus: 'published' } : {}),
      ...(requested ? { id: { in: requested } } : {}),
    },
    select: { id: true, fileName: true },
    orderBy: { createdAt: 'asc' },
  });

  if (requested && documents.length !== requested.length) {
    throw new AppError(
      'Có tài liệu không thuộc lớp này hoặc chưa xử lý xong',
      400,
      'DOCUMENT_NOT_AVAILABLE',
    );
  }
  if (documents.length === 0) {
    throw new AppError(
      publishedOnly
        ? 'Lớp chưa có tài liệu nào được xuất bản để luyện tập'
        : 'Lớp chưa có tài liệu nào đã xử lý xong để làm căn cứ',
      409,
      'NO_SOURCE',
    );
  }

  const rows = await prisma.chunk.findMany({
    where: { documentId: { in: documents.map((d) => d.id) } },
    select: { id: true, documentId: true, chunkIndex: true, text: true, pageNumber: true },
  });

  const order = new Map(documents.map((d, i) => [d.id, i]));
  const names = new Map(documents.map((d) => [d.id, d.fileName]));
  const sorted = rows
    .sort((a, b) => order.get(a.documentId) - order.get(b.documentId) || a.chunkIndex - b.chunkIndex)
    .map((c) => ({ ...c, fileName: names.get(c.documentId) }));

  if (sorted.length === 0) {
    throw new AppError('Tài liệu chưa có nội dung để làm căn cứ', 409, 'NO_SOURCE');
  }
  return sampleChunks(sorted);
}

/** Dựng prompt người dùng: các đoạn đánh số [n] + phần yêu cầu. */
export function buildGenerationPrompt(chunks, requestLines = []) {
  const sources = chunks
    .map((c, i) => {
      const where = c.pageNumber ? `${c.fileName}, trang ${c.pageNumber}` : c.fileName;
      return `[${i + 1}] (${neutralizeTags(where)})\n${neutralizeTags(c.text)}`;
    })
    .join('\n\n');

  const request = requestLines.filter(Boolean).map(neutralizeTags).join('\n');
  return `<tai_lieu>\n${sources}\n</tai_lieu>\n\n<yeu_cau>\n${request || 'Không có yêu cầu thêm.'}\n</yeu_cau>`;
}