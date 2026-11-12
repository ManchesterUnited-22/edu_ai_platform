import client from './client.js';

export const listDocuments = (classId) =>
  client.get(`/classes/${classId}/documents`).then((r) => r.data.documents);
export const getDocument = (documentId) => client.get(`/documents/${documentId}`).then((r) => r.data);

export const uploadDocument = (classId, file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post(`/classes/${classId}/documents`, form).then((r) => r.data.document);
};
// action: review | publish | unpublish | reprocess
export const documentAction = (documentId, action) =>
  client.post(`/documents/${documentId}/${action}`).then((r) => r.data);
export const deleteDocument = (documentId) => client.delete(`/documents/${documentId}`);
// Lấy file gốc dạng blob (axios gắn sẵn token đăng nhập, iframe thì không gắn được)
export const fetchDocumentFile = (documentId) =>
  client.get(`/documents/${documentId}/file`, { responseType: 'blob' }).then((r) => r.data);