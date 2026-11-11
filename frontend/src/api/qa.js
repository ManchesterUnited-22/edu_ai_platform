import client from './client.js';

export const askQuestion = (classId, question) =>
  client.post(`/classes/${classId}/qa`, { question }).then((r) => r.data);

export const getHistory = (classId) =>
  client.get(`/classes/${classId}/qa/history`).then((r) => r.data.history);

export const reportAnswer = (qaLogId, reason) =>
  client.post(`/qa/${qaLogId}/report`, { reason }).then((r) => r.data.report);