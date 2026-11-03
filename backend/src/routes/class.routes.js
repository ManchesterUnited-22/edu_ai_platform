// [GV] Tạo lớp, thêm/xóa học sinh
import { Router } from 'express';
import {
  createClass,
  enrollStudent,
  getClass,
  listClasses,
  removeStudent,
} from '../controllers/class.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { createClassSchema, enrollmentSchema } from '../validators/class.validator.js';

const router = Router();

router.use(authenticate);
router.get('/', requireRole('teacher', 'student'), listClasses);
router.post('/', requireRole('teacher'), validate(createClassSchema), createClass);
router.get('/:classId', requireRole('teacher', 'student'), getClass);
router.post(
  '/:classId/enrollments',
  requireRole('teacher'),
  validate(enrollmentSchema),
  enrollStudent,
);
router.delete(
  '/:classId/enrollments/:studentId',
  requireRole('teacher'),
  removeStudent,
);

export default router;
