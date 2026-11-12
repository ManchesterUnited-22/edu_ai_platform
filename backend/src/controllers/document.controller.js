import prisma from '../config/db.js';
import { enqueueDocument } from '../jobs/documentQueue.js';
import { deleteByDocument } from '../services/rag/vectorStore.js';
import { AppError } from '../utils/AppError.js';
import path from 'node:path';
import mammoth from 'mammoth';
import { removeUploadedFile, resolveUploadPath } from '../utils/files.js';

// Không trả filePath ra ngoài (đường dẫn nội bộ của server)
export const documentSelect = {
  id: true,
  classId: true,
  fileName: true,
  mimeType: true,
  processStatus: true,
  errorMessage: true,
  publishStatus: true,
  publishedAt: true,
  createdAt: true,
  _count: { select: { chunks: true } },
};

/** Tải tài liệu và kiểm tra user có quyền với nó. mode: 'read' | 'manage' */
export async function loadDocumentForUser(documentId, user, mode) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      class: {
        select: {
          teacherId: true,
          enrollments: { where: { studentId: user.id }, select: { id: true } },
        },
      },
    },
  });
  if (!doc) throw new AppError('Không tìm thấy tài liệu', 404, 'DOCUMENT_NOT_FOUND');

  if (user.role === 'teacher') {
    if (doc.class.teacherId !== user.id) {
      throw new AppError('Bạn không có quyền với tài liệu này', 403, 'FORBIDDEN');
    }
    return doc;
  }

  // Học sinh: chỉ ĐỌC tài liệu đã công bố của lớp mình học
  const enrolled = doc.class.enrollments.length > 0;
  if (mode !== 'read' || !enrolled || doc.publishStatus !== 'published') {
    throw new AppError('Bạn không có quyền với tài liệu này', 403, 'FORBIDDEN');
  }
  return doc;
}

export const uploadDocument = async (req, res, next) => {
  try {
    const created = await prisma.document.create({
      data: {
        classId: req.classRecord.id,
        uploaderId: req.user.id,
        fileName: req.file.originalname,
        filePath: req.file.filename,
        mimeType: req.file.mimetype,
      },
      select: documentSelect,
    });

    enqueueDocument(created.id); // xử lý nền, trả về ngay
    return res.status(202).json({ document: created });
  } catch (error) {
    await removeUploadedFile(req.file.filename).catch(() => {});
    return next(error);
  }
};

export const listDocuments = async (req, res, next) => {
  try {
    const where = { classId: req.classRecord.id };
    if (req.user.role === 'student') where.publishStatus = 'published';

    const documents = await prisma.document.findMany({
      where,
      select: documentSelect,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ documents });
  } catch (error) {
    return next(error);
  }
};

export const getDocument = async (req, res, next) => {
  try {
    const doc = await loadDocumentForUser(req.params.documentId, req.user, 'read');
    const [document, chunks] = await Promise.all([
      prisma.document.findUnique({ where: { id: doc.id }, select: documentSelect }),
      prisma.chunk.findMany({
        where: { documentId: doc.id },
        orderBy: { chunkIndex: 'asc' },
        select: { id: true, chunkIndex: true, pageNumber: true, text: true },
      }),
    ]);
    return res.json({ document, chunks });
  } catch (error) {
    return next(error);
  }
};

export const reprocessDocument = async (req, res, next) => {
  try {
    const doc = await loadDocumentForUser(req.params.documentId, req.user, 'manage');
    if (doc.publishStatus === 'published') {
      throw new AppError(
        'Hãy thu hồi tài liệu trước khi xử lý lại để vector DB không bị lệch với bản cũ',
        409,
        'DOCUMENT_PUBLISHED',
      );
    }
    if (doc.processStatus === 'processing') {
      throw new AppError('Tài liệu đang được xử lý', 409, 'DOCUMENT_PROCESSING');
    }

    await prisma.document.update({
      where: { id: doc.id },
      data: { processStatus: 'uploaded', errorMessage: null },
    });
    enqueueDocument(doc.id);
    return res.status(202).json({ message: 'Đã đưa vào hàng đợi xử lý lại' });
  } catch (error) {
    return next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await loadDocumentForUser(req.params.documentId, req.user, 'manage');

    // Xóa vector trước: nếu Chroma lỗi thì giữ nguyên tài liệu, tránh để lại vector mồ côi
    if (doc.publishStatus === 'published') await deleteByDocument(doc.id);

    await prisma.document.delete({ where: { id: doc.id } }); // chunk xóa theo (cascade)
    await removeUploadedFile(doc.filePath);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const pageHtml = (body) => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>
body{font:16px/1.7 Georgia,'Times New Roman',serif;color:#1f2a3c;max-width:760px;margin:0 auto;padding:32px 24px}
img{max-width:100%;height:auto}
table{border-collapse:collapse;width:100%}
td,th{border:1px solid #cbd5e1;padding:6px 10px;vertical-align:top}
h1,h2,h3{line-height:1.3}
</style></head><body>${body}</body></html>`;

/** Cho xem file gốc: PDF/ảnh trả nguyên file, DOCX chuyển sang HTML. */
export const viewDocumentFile = async (req, res, next) => {
  try {
    const doc = await loadDocumentForUser(req.params.documentId, req.user, 'read');
    const filePath = path.resolve(resolveUploadPath(doc.filePath));

    if (doc.mimeType === DOCX_MIME) {
      const { value } = await mammoth.convertToHtml({ path: filePath });
      return res.type('html').send(pageHtml(value));
    }

    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(doc.fileName)}`,
    );
    return res.type(doc.mimeType).sendFile(filePath);
  } catch (error) {
    return next(error);
  }
};