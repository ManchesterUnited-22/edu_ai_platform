// [HS] Báo cáo câu trả lời sai, [GV] xem và xử lý báo cáo
import { Router } from 'express';
import {
  listReports,
  reportWrongAnswer,
  resolveReport,
} from '../controllers/feedback.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireOwnedClass } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { reportAnswerSchema, updateReportSchema } from '../validators/feedback.validator.js';

const router = Router();

router.post(
  '/qa/:qaLogId/report',
  authenticate,
  requireRole('student'),
  validate(reportAnswerSchema),
  reportWrongAnswer,
);
router.get(
  '/classes/:classId/answer-reports',
  authenticate,
  requireRole('teacher'),
  requireOwnedClass,
  listReports,
);
router.patch(
  '/answer-reports/:reportId',
  authenticate,
  requireRole('teacher'),
  validate(updateReportSchema),
  resolveReport,
);

export default router;