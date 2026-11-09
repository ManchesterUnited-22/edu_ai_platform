// [HS] Tiến độ cá nhân, [GV] tiến độ từng học sinh
import { Router } from 'express';
import { myProgress, studentProgress } from '../controllers/progress.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember, requireOwnedClass } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.get(
  '/classes/:classId/progress',
  authenticate,
  requireRole('student'),
  requireClassMember,
  myProgress,
);
router.get(
  '/classes/:classId/students/:studentId/progress',
  authenticate,
  requireRole('teacher'),
  requireOwnedClass,
  studentProgress,
);

export default router;