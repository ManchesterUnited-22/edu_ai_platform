// Xử lý Socratic
import { socraticStep } from '../services/generation/socraticService.js';

export const solveStep = async (req, res, next) => {
  try {
    return res.json(await socraticStep({ problem: req.body.problem, messages: req.body.messages }));
  } catch (error) {
    return next(error);
  }
};