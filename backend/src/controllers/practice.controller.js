// Xử lý quiz luyện tập
import {
  createPracticeQuiz,
  getPracticeQuiz,
  listPracticeQuizzes,
  submitPracticeQuiz,
} from '../services/quiz/practiceQuizService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

export const create = handle(async (req, res) => {
  const data = await createPracticeQuiz({
    user: req.user,
    classId: req.classRecord.id,
    count: req.body.count,
    topic: req.body.topic,
  });
  return res.status(201).json(data);
});

export const list = handle(async (req, res) => {
  const data = await listPracticeQuizzes({ user: req.user, classId: req.classRecord.id });
  return res.json(data);
});

export const detail = handle(async (req, res) => {
  const data = await getPracticeQuiz({ user: req.user, practiceId: req.params.practiceId });
  return res.json(data);
});

export const submit = handle(async (req, res) => {
  const data = await submitPracticeQuiz({
    user: req.user,
    practiceId: req.params.practiceId,
    answers: req.body.answers,
  });
  return res.json(data);
});