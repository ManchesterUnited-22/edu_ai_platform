// [GV] Upload/quản lý/xuất bản tài liệu, [HS] xem tài liệu đã công bố
import { Router } from 'express';
import {
  deleteDocument,
  getDocument,
  listDocuments,
  reprocessDocument,
  uploadDocument,
} from '../controllers/document.controller.js';
import {
  publish,
  review,
  unpublish,
  updateChunk,
} from '../controllers/documentPublish.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember, requireOwnedClass } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';
import { uploadSingleFile } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { updateChunkSchema } from '../validators/document.validator.js';

const router = Router();
const teacherOnly = [authenticate, requireRole('teacher')];

// Thứ tự quan trọng: xác thực -> phân quyền -> kiểm tra lớp -> MỚI nhận file
router.post(
  '/classes/:classId/documents',
  ...teacherOnly,
  requireOwnedClass,
  uploadSingleFile,
  uploadDocument,
);
router.get(
  '/classes/:classId/documents',
  authenticate,
  requireRole('teacher', 'student'),
  requireClassMember,
  listDocuments,
);
router.get('/documents/:documentId', authenticate, requireRole('teacher', 'student'), getDocument);
router.post('/documents/:documentId/reprocess', ...teacherOnly, reprocessDocument);
router.delete('/documents/:documentId', ...teacherOnly, deleteDocument);

// Bước duyệt bắt buộc -> xuất bản -> thu hồi
router.post('/documents/:documentId/review', ...teacherOnly, review);
router.post('/documents/:documentId/publish', ...teacherOnly, publish);
router.post('/documents/:documentId/unpublish', ...teacherOnly, unpublish);
router.patch(
  '/documents/:documentId/chunks/:chunkId',
  ...teacherOnly,
  validate(updateChunkSchema),
  updateChunk,
);

export default router;