import client from './client.js';

export const listClasses = () => client.get('/classes').then((r) => r.data.classes);
export const getClass = (classId) => client.get(`/classes/${classId}`).then((r) => r.data.class);
export const createClass = (body) => client.post('/classes', body).then((r) => r.data.class);
export const enrollStudent = (classId, email) =>
  client.post(`/classes/${classId}/enrollments`, { email }).then((r) => r.data.enrollment);
export const removeStudent = (classId, studentId) =>
  client.delete(`/classes/${classId}/enrollments/${studentId}`);