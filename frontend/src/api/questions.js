import client from './client.js';

export const generateQuestions = (classId, body) =>
  client.post(`/classes/${classId}/questions/generate`, body).then((r) => r.data);
export const listQuestions = (classId, status) =>
  client
    .get(`/classes/${classId}/questions`, { params: status ? { status } : {} })
    .then((r) => r.data.questions);
export const bulkStatus = (classId, ids, action) =>
  client.post(`/classes/${classId}/questions/status`, { ids, action }).then((r) => r.data);
export const deleteQuestion = (questionId) => client.delete(`/questions/${questionId}`);