// Xử lý gợi ý ôn tập
import { getRecommendations } from '../services/graph/recommendationService.js';

export const recommendations = async (req, res, next) => {
  try {
    const result = await getRecommendations({
      studentId: req.user.id,
      classId: req.classRecord.id,
      useGraph: req.useGraph,
    });
    return res.json(result);
  } catch (error) {
    return next(error);
  }
};