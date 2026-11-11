import client from './client.js';

export const listTopics = (classId) =>
  client.get(`/classes/${classId}/topics`).then((r) => r.data);

export const createTopic = (classId, body) =>
  client.post(`/classes/${classId}/topics`, body).then((r) => r.data.topic);

export const deleteTopic = (classId, topicId) =>
  client.delete(`/classes/${classId}/topics/${topicId}`);

export const addPrerequisite = (classId, topicId, prerequisiteId) =>
  client.post(`/classes/${classId}/topics/${topicId}/prerequisites`, { prerequisiteId });

export const removePrerequisite = (classId, topicId, prerequisiteId) =>
  client.delete(`/classes/${classId}/topics/${topicId}/prerequisites/${prerequisiteId}`);