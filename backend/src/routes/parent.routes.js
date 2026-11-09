// [HS] Sinh mã liên kết; [PH] Liên kết con, xem tiến độ, cảnh báo
import { Router } from 'express';
import {
  childProgress,
  children,
  createLinkCode,
  linkChild,
  notifications,
  readNotification,
} from '../controllers/parent.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { linkCodeRateLimiter } from '../middlewares/rateLimit.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { redeemLinkCodeSchema } from '../validators/parent.validator.js';

const router = Router();

router.post('/link-codes', authenticate, requireRole('student'), createLinkCode);

router.post(
  '/parent/link',
  authenticate,
  requireRole('parent'),
  linkCodeRateLimiter,
  validate(redeemLinkCodeSchema),
  linkChild,
);
router.get('/parent/children', authenticate, requireRole('parent'), children);
router.get('/parent/children/:studentId/progress', authenticate, requireRole('parent'), childProgress);
router.get('/parent/notifications', authenticate, requireRole('parent'), notifications);
router.patch(
  '/parent/notifications/:notificationId/read',
  authenticate,
  requireRole('parent'),
  readNotification,
);

export default router;