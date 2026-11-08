// Xử lý quiz chính thức (giáo viên quản lý, học sinh làm bài)
import {
  getAttempt,
  listMyAttempts,
  saveAnswers,
  startAttempt,
  submitAttempt,
} from '../services/quiz/officialQuizService.js';
import {
  createQuiz,
  deleteQuiz,
  getQuizForTeacher,
  listQuizzes,
  quizResults,
  transitionQuiz,
  updateQuiz,
} from '../services/quiz/quizAdminService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

// ----- giáo viên -----
export const create = handle(async (req, res) => {
  const quiz = await createQuiz({ classId: req.classRecord.id, data: req.body });
  return res.status(201).json({ quiz });
});

export const list = handle(async (req, res) => {
  const quizzes = await listQuizzes({ user: req.user, classId: req.classRecord.id });
  return res.json({ quizzes });
});

export const detail = handle(async (req, res) => {
  const quiz = await getQuizForTeacher({ teacherId: req.user.id, quizId: req.params.quizId });
  return res.json({ quiz });
});

export const update = handle(async (req, res) => {
  const quiz = await updateQuiz({
    teacherId: req.user.id,
    quizId: req.params.quizId,
    patch: req.body,
  });
  return res.json({ quiz });
});

const transition = (action) =>
  handle(async (req, res) => {
    const quiz = await transitionQuiz({ teacherId: req.user.id, quizId: req.params.quizId, action });
    return res.json({ quiz });
  });

export const review = transition('review');
export const publish = transition('publish');
export const unpublish = transition('unpublish');

export const remove = handle(async (req, res) => {
  await deleteQuiz({ teacherId: req.user.id, quizId: req.params.quizId });
  return res.status(204).send();
});

export const results = handle(async (req, res) => {
  const data = await quizResults({ teacherId: req.user.id, quizId: req.params.quizId });
  return res.json(data);
});

// ----- học sinh -----
export const start = handle(async (req, res) => {
  const data = await startAttempt({ user: req.user, quizId: req.params.quizId });
  return res.status(201).json(data);
});

export const myAttempts = handle(async (req, res) => {
  const attempts = await listMyAttempts({ user: req.user, quizId: req.params.quizId });
  return res.json({ attempts });
});

export const attemptDetail = handle(async (req, res) => {
  const data = await getAttempt({ user: req.user, attemptId: req.params.attemptId });
  return res.json(data);
});

export const saveAttemptAnswers = handle(async (req, res) => {
  const data = await saveAnswers({
    user: req.user,
    attemptId: req.params.attemptId,
    answers: req.body.answers,
  });
  return res.json(data);
});

export const submit = handle(async (req, res) => {
  const data = await submitAttempt({
    user: req.user,
    attemptId: req.params.attemptId,
    answers: req.body.answers,
  });
  return res.json(data);
});