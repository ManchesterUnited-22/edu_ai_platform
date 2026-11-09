// [GV] Báo cáo lớp
import { Router } from 'express';
import { classReport } from '../controllers/report.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireOwnedClass } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.get(
  '/classes/:classId/report',
  authenticate,
  requireRole('teacher'),
  requireOwnedClass,
  classReport,
);

export default router;