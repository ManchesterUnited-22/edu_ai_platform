import client from './client.js';

// ----- bài kiểm tra chính thức -----
export const listQuizzes = (classId) =>
  client.get(`/classes/${classId}/quizzes`).then((r) => r.data.quizzes);
export const startAttempt = (quizId) => client.post(`/quizzes/${quizId}/start`).then((r) => r.data);
export const getAttempt = (attemptId) => client.get(`/attempts/${attemptId}`).then((r) => r.data);
export const saveAnswers = (attemptId, answers) =>
  client.put(`/attempts/${attemptId}/answers`, { answers }).then((r) => r.data);
export const submitAttempt = (attemptId, answers) =>
  client.post(`/attempts/${attemptId}/submit`, { answers }).then((r) => r.data);

// ----- luyện tập -----
export const createPractice = (classId, body) =>
  client.post(`/classes/${classId}/practice`, body).then((r) => r.data);
export const listPractice = (classId) =>
  client.get(`/classes/${classId}/practice`).then((r) => r.data);
export const getPractice = (practiceId) =>
  client.get(`/practice/${practiceId}`).then((r) => r.data);
export const submitPractice = (practiceId, answers) =>
  client.post(`/practice/${practiceId}/submit`, { answers }).then((r) => r.data);
// ----- giáo viên -----
export const createQuiz = (classId, body) =>
  client.post(`/classes/${classId}/quizzes`, body).then((r) => r.data.quiz);
export const quizAction = (quizId, action) =>
  client.post(`/quizzes/${quizId}/${action}`).then((r) => r.data.quiz);
export const deleteQuiz = (quizId) => client.delete(`/quizzes/${quizId}`);