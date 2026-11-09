// [HS] Giải bài từng bước Socratic (mở rộng)
import { Router } from 'express';
import { solveStep } from '../controllers/socratic.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { chatLock } from '../middlewares/chatLock.js';
import { requireClassMember } from '../middlewares/classAccess.js';
import { qaRateLimiter } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { socraticSchema } from '../validators/qa.validator.js';

const router = Router();

// Cùng ràng buộc như hỏi-đáp: chỉ HS đã ghi danh, khóa khi đang làm quiz chính thức, giới hạn tần suất
router.post(
  '/classes/:classId/socratic',
  authenticate,
  requireRole('student'),
  requireClassMember,
  chatLock,
  qaRateLimiter,
  validate(socraticSchema),
  solveStep,
);

export default router;