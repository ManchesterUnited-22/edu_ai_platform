import client from './client.js';

export const generateOutline = (classId, body) =>
  client.post(`/classes/${classId}/contents/outline`, body).then((r) => r.data.content);
export const generateLectureOutline = (classId, body) =>
  client.post(`/classes/${classId}/contents/lecture-outline`, body).then((r) => r.data.content);
export const listContents = (classId) =>
  client.get(`/classes/${classId}/contents`).then((r) => r.data.contents);
export const getContent = (contentId) => client.get(`/contents/${contentId}`).then((r) => r.data.content);
export const contentAction = (contentId, action) =>
  client.post(`/contents/${contentId}/${action}`).then((r) => r.data.content);
export const deleteContent = (contentId) => client.delete(`/contents/${contentId}`);