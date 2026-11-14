import { Router } from 'express';
import {
  listSecurityEvents,
  listTeacherAiReviews,
  listTeacherApprovals,
  reviewTeacher,
  runTeacherAiReview,
} from '../controllers/admin.controller.js';
import {
  listVerificationQueue,
  reviewVerificationByAdmin,
  viewVerificationDocument,
} from '../controllers/teacherVerification.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();
router.use(authenticate, requireRole('admin'));
router.get('/teacher-approvals', listTeacherApprovals);
router.patch('/teacher-approvals/:userId', reviewTeacher);
router.get('/security-events', listSecurityEvents);
router.get('/teacher-ai-reviews', listTeacherAiReviews);
router.post('/teacher-ai-reviews/:userId/run', runTeacherAiReview);
router.get('/teacher-verifications', listVerificationQueue);
router.patch('/teacher-verifications/:verificationId', reviewVerificationByAdmin);
router.get('/teacher-verifications/:verificationId/documents/:documentId', viewVerificationDocument);

export default router;
