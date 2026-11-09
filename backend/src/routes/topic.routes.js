// [GV] Quản lý cây chủ đề và quan hệ tiên quyết; [GV, HS] xem
import { Router } from 'express';
import {
  addPrereq,
  create,
  list,
  remove,
  removePrereq,
  update,
} from '../controllers/topic.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember, requireOwnedClass } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createTopicSchema,
  prerequisiteSchema,
  updateTopicSchema,
} from '../validators/topic.validator.js';

const router = Router();
const teacher = [authenticate, requireRole('teacher'), requireOwnedClass];

router.get('/classes/:classId/topics', authenticate, requireRole('teacher', 'student'), requireClassMember, list);
router.post('/classes/:classId/topics', ...teacher, validate(createTopicSchema), create);
router.patch('/classes/:classId/topics/:topicId', ...teacher, validate(updateTopicSchema), update);
router.delete('/classes/:classId/topics/:topicId', ...teacher, remove);
router.post(
  '/classes/:classId/topics/:topicId/prerequisites',
  ...teacher,
  validate(prerequisiteSchema),
  addPrereq,
);
router.delete('/classes/:classId/topics/:topicId/prerequisites/:prerequisiteId', ...teacher, removePrereq);

export default router;