// [GV] Sinh đề cương/outline, chỉnh sửa, duyệt, xuất bản/thu hồi; [HS] xem nội dung đã xuất bản
import { Router } from 'express';
import {
  createLectureOutline,
  createOutline,
  detail,
  list,
  publish,
  remove,
  review,
  unpublish,
  update,
} from '../controllers/content.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember, requireOwnedClass } from '../middlewares/classAccess.js';
import { generationRateLimiter } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  generateLectureOutlineSchema,
  generateOutlineSchema,
  updateContentSchema,
} from '../validators/content.validator.js';

const router = Router();
const teacherOnly = [authenticate, requireRole('teacher')];

router.post(
  '/classes/:classId/contents/outline',
  ...teacherOnly,
  requireOwnedClass,
  generationRateLimiter,
  validate(generateOutlineSchema),
  createOutline,
);
router.post(
  '/classes/:classId/contents/lecture-outline',
  ...teacherOnly,
  requireOwnedClass,
  generationRateLimiter,
  validate(generateLectureOutlineSchema),
  createLectureOutline,
);
router.get(
  '/classes/:classId/contents',
  authenticate,
  requireRole('teacher', 'student'),
  requireClassMember,
  list,
);
router.get('/contents/:contentId', authenticate, requireRole('teacher', 'student'), detail);
router.patch('/contents/:contentId', ...teacherOnly, validate(updateContentSchema), update);
router.post('/contents/:contentId/review', ...teacherOnly, review);
router.post('/contents/:contentId/publish', ...teacherOnly, publish);
router.post('/contents/:contentId/unpublish', ...teacherOnly, unpublish);
router.delete('/contents/:contentId', ...teacherOnly, remove);

export default router;