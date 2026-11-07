// Xử lý câu hỏi (giáo viên)
import {
  deleteQuestion,
  listQuestions,
  transitionQuestions,
  updateQuestion,
} from '../services/generation/questionBank.js';
import { generateQuestions } from '../services/generation/questionService.js';

const handle = (fn) => async (req, res, next) => {
  try {
    return await fn(req, res);
  } catch (error) {
    return next(error);
  }
};

export const generate = handle(async (req, res) => {
  const result = await generateQuestions({ classId: req.classRecord.id, ...req.body });
  return res.status(201).json(result);
});

export const list = handle(async (req, res) => {
  const { status, topic } = req.query;
  const questions = await listQuestions({
    classId: req.classRecord.id,
    status: ['draft', 'reviewed', 'published', 'revoked'].includes(status) ? status : undefined,
    topic: typeof topic === 'string' && topic ? topic : undefined,
  });
  return res.json({ questions });
});

export const bulkStatus = handle(async (req, res) => {
  const result = await transitionQuestions({
    classId: req.classRecord.id,
    ids: req.body.ids,
    action: req.body.action,
  });
  return res.json(result);
});

export const update = handle(async (req, res) => {
  const question = await updateQuestion({
    teacherId: req.user.id,
    questionId: req.params.questionId,
    patch: req.body,
  });
  return res.json({ question });
});

export const remove = handle(async (req, res) => {
  await deleteQuestion({ teacherId: req.user.id, questionId: req.params.questionId });
  return res.status(204).send();
});