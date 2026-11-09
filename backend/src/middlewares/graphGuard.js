// Gắn cờ req.useGraph. Graph tắt thì route gợi ý tự dùng đường dự phòng trên PostgreSQL, không lỗi.
import { env } from '../config/env.js';

export const graphGuard = (req, res, next) => {
  req.useGraph = env.GRAPH_ENABLED;
  return next();
};