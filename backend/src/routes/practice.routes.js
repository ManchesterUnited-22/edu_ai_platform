// [HS] Quiz luyện tập (giới hạn/ngày)
import { Router } from 'express';
import { create, detail, list, submit } from '../controllers/practice.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { chatLock } from '../middlewares/chatLock.js';
import { requireClassMember } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { createPracticeSchema, submitPracticeSchema } from '../validators/practice.validator.js';

const router = Router();
const studentOnly = [authenticate, requireRole('student')];

// Tạo quiz tốn lượt gọi AI: phải là học sinh của lớp, không đang làm bài chính thức, và còn hạn mức ngày
router.post(
  '/classes/:classId/practice',
  ...studentOnly,
  requireClassMember,
  chatLock,
  validate(createPracticeSchema),
  create,
);
router.get('/classes/:classId/practice', ...studentOnly, requireClassMember, list);
router.get('/practice/:practiceId', ...studentOnly, detail);
router.post('/practice/:practiceId/submit', ...studentOnly, validate(submitPracticeSchema), submit);

export default router;