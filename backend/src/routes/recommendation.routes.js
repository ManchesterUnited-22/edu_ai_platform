// [HS] Gợi ý ôn tập theo chủ đề yếu
import { Router } from 'express';
import { recommendations } from '../controllers/recommendation.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember } from '../middlewares/classAccess.js';
import { graphGuard } from '../middlewares/graphGuard.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.get(
  '/classes/:classId/recommendations',
  authenticate,
  requireRole('student'),
  requireClassMember,
  graphGuard,
  recommendations,
);

export default router;