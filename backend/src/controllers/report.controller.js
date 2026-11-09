// Xử lý báo cáo lớp
import { getClassReport } from '../services/progress/classReportService.js';

export const classReport = async (req, res, next) => {
  try {
    const report = await getClassReport({ classId: req.classRecord.id });
    return res.json({ report });
  } catch (error) {
    return next(error);
  }
};