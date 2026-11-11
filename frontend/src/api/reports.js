import client from './client.js';

export const getClassReport = (classId) =>
  client.get(`/classes/${classId}/report`).then((r) => r.data.report);

export const listAnswerReports = (classId, status) =>
  client
    .get(`/classes/${classId}/answer-reports`, { params: status ? { status } : {} })
    .then((r) => r.data.reports);

export const updateAnswerReport = (reportId, status) =>
  client.patch(`/answer-reports/${reportId}`, { status }).then((r) => r.data.report);