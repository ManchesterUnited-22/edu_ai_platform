// [HS] Hỏi-đáp RAG có trích dẫn
import { Router } from 'express';
import { ask, history } from '../controllers/qa.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { chatLock } from '../middlewares/chatLock.js';
import { requireClassMember } from '../middlewares/classAccess.js';
import { qaRateLimiter } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { askQuestionSchema } from '../validators/qa.validator.js';

const router = Router();

// Chỉ học sinh ĐÃ GHI DANH mới hỏi được; bị khóa khi đang làm quiz chính thức; giới hạn tần suất từng người
router.post(
  '/classes/:classId/qa',
  authenticate,
  requireRole('student'),
  requireClassMember,
  chatLock,
  qaRateLimiter,
  validate(askQuestionSchema),
  ask,
);
router.get(
  '/classes/:classId/qa/history',
  authenticate,
  requireRole('teacher', 'student'),
  requireClassMember,
  history,
);

export default router;