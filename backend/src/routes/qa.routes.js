// [HS] Hỏi-đáp RAG có trích dẫn
import { Router } from 'express';
import { ask, history } from '../controllers/qa.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember } from '../middlewares/classAccess.js';
import { qaRateLimiter } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { askQuestionSchema } from '../validators/qa.validator.js';

const router = Router();

// Chỉ học sinh ĐÃ GHI DANH trong lớp mới hỏi được; giới hạn tần suất theo từng người
router.post(
  '/classes/:classId/qa',
  authenticate,
  requireRole('student'),
  requireClassMember,
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