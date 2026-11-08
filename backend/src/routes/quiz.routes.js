// Quiz chính thức: [GV] tạo/duyệt/xuất bản/xem kết quả, [HS] làm bài và nộp bài
import { Router } from 'express';
import {
  attemptDetail,
  create,
  detail,
  list,
  myAttempts,
  publish,
  remove,
  results,
  review,
  saveAttemptAnswers,
  start,
  submit,
  unpublish,
  update,
} from '../controllers/quiz.controller.js';
import { authenticate } from '../middlewares/auth.js';
import { requireClassMember, requireOwnedClass } from '../middlewares/classAccess.js';
import { requireRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createQuizSchema,
  saveAnswersSchema,
  submitAttemptSchema,
  updateQuizSchema,
} from '../validators/quiz.validator.js';

const router = Router();
const teacherOnly = [authenticate, requireRole('teacher')];
const studentOnly = [authenticate, requireRole('student')];

// ----- giáo viên -----
router.post(
  '/classes/:classId/quizzes',
  ...teacherOnly,
  requireOwnedClass,
  validate(createQuizSchema),
  create,
);
router.get('/quizzes/:quizId', ...teacherOnly, detail);
router.patch('/quizzes/:quizId', ...teacherOnly, validate(updateQuizSchema), update);
router.post('/quizzes/:quizId/review', ...teacherOnly, review);
router.post('/quizzes/:quizId/publish', ...teacherOnly, publish);
router.post('/quizzes/:quizId/unpublish', ...teacherOnly, unpublish);
router.delete('/quizzes/:quizId', ...teacherOnly, remove);
router.get('/quizzes/:quizId/results', ...teacherOnly, results);

// ----- cả hai vai trò (kết quả trả về khác nhau theo vai trò) -----
router.get(
  '/classes/:classId/quizzes',
  authenticate,
  requireRole('teacher', 'student'),
  requireClassMember,
  list,
);

// ----- học sinh -----
router.post('/quizzes/:quizId/start', ...studentOnly, start);
router.get('/quizzes/:quizId/my-attempts', ...studentOnly, myAttempts);
router.get('/attempts/:attemptId', ...studentOnly, attemptDetail);
router.put('/attempts/:attemptId/answers', ...studentOnly, validate(saveAnswersSchema), saveAttemptAnswers);
router.post('/attempts/:attemptId/submit', ...studentOnly, validate(submitAttemptSchema), submit);

export default router;