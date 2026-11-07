// [GV] Sinh & duyệt bộ câu hỏi
import { Router } from 'express';
import {
  bulkStatus,
  generate,
  list,
  remove,
  update,
} from '../controllers/question.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireOwnedClass } from '../middlewares/classAccess.js';
import { generationRateLimiter } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  bulkStatusSchema,
  generateQuestionsSchema,
  updateQuestionSchema,
} from '../validators/question.validator.js';

const router = Router();
const teacherOnly = [authenticate, requireRole('teacher')];

router.post(
  '/classes/:classId/questions/generate',
  ...teacherOnly,
  requireOwnedClass,
  generationRateLimiter,
  validate(generateQuestionsSchema),
  generate,
);
router.get('/classes/:classId/questions', ...teacherOnly, requireOwnedClass, list);
router.post(
  '/classes/:classId/questions/status',
  ...teacherOnly,
  requireOwnedClass,
  validate(bulkStatusSchema),
  bulkStatus,
);
router.patch('/questions/:questionId', ...teacherOnly, validate(updateQuestionSchema), update);
router.delete('/questions/:questionId', ...teacherOnly, remove);

export default router;