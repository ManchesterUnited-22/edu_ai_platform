// Xử lý báo cáo câu trả lời sai
import {
  listAnswerReports,
  reportAnswer,
  updateAnswerReportStatus,
} from '../services/rag/qaService.js';

export const reportWrongAnswer = async (req, res, next) => {
  try {
    const report = await reportAnswer({
      user: req.user,
      qaLogId: req.params.qaLogId,
      reason: req.body.reason,
    });
    return res.status(201).json({ report });
  } catch (error) {
    return next(error);
  }
};

export const listReports = async (req, res, next) => {
  try {
    const { status } = req.query;
    const allowed = ['open', 'resolved', 'dismissed'];
    const reports = await listAnswerReports({
      classId: req.classRecord.id,
      status: allowed.includes(status) ? status : undefined,
    });
    return res.json({ reports });
  } catch (error) {
    return next(error);
  }
};

export const resolveReport = async (req, res, next) => {
  try {
    const report = await updateAnswerReportStatus({
      teacherId: req.user.id,
      reportId: req.params.reportId,
      status: req.body.status,
    });
    return res.json({ report });
  } catch (error) {
    return next(error);
  }
};