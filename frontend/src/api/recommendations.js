import client from './client.js';

export const getRecommendations = (classId) =>
  client.get(`/classes/${classId}/recommendations`).then((r) => r.data);