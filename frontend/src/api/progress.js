import client from './client.js';

export const getMyProgress = (classId) =>
  client.get(`/classes/${classId}/progress`).then((r) => r.data.progress);