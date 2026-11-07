// [GV] Duyệt / xuất bản / thu hồi tài liệu, sửa nội dung đoạn
import prisma from '../config/db.js';
import {
  publishDocument,
  reviewDocument,
  unpublishDocument,
  updateChunkText,
} from '../services/publishing/publishService.js';
import { documentSelect, loadDocumentForUser } from './document.controller.js';

const respondWithDocument = async (res, documentId) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: documentSelect,
  });
  return res.json({ document });
};

const action = (run) => async (req, res, next) => {
  try {
    const doc = await loadDocumentForUser(req.params.documentId, req.user, 'manage');
    await run(doc.id, req);
    return await respondWithDocument(res, doc.id);
  } catch (error) {
    return next(error);
  }
};

export const review = action((id) => reviewDocument(id));
export const publish = action((id) => publishDocument(id));
export const unpublish = action((id) => unpublishDocument(id));
export const updateChunk = action((id, req) =>
  updateChunkText(id, req.params.chunkId, req.body.text),
);