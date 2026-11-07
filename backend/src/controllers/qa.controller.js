// Xử lý hỏi-đáp RAG
import { askQuestion, listHistory } from '../services/rag/qaService.js';

export const ask = async (req, res, next) => {
  try {
    const result = await askQuestion({
      studentId: req.user.id,
      classId: req.classRecord.id,
      question: req.body.question,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};

export const history = async (req, res, next) => {
  try {
    const logs = await listHistory({ user: req.user, classId: req.classRecord.id });
    return res.json({ history: logs });
  } catch (error) {
    return next(error);
  }
};