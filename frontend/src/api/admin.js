import client from './client.js';

export const listTeacherApprovals = () =>
  client.get('/admin/teacher-approvals').then((r) => r.data.approvals);

export const reviewTeacher = (userId, action) =>
  client.patch(`/admin/teacher-approvals/${userId}`, { action }).then((r) => r.data);

export const listSecurityEvents = () =>
  client.get('/admin/security-events').then((r) => r.data.events);

export const listTeacherAiReviews = () =>
  client.get('/admin/teacher-ai-reviews').then((r) => r.data.reviews);

export const runTeacherAiReview = (userId) =>
  client.post(`/admin/teacher-ai-reviews/${userId}/run`).then((r) => r.data.review);

export const listTeacherVerifications = () =>
  client.get('/admin/teacher-verifications').then((r) => r.data.verifications);

export const reviewTeacherVerification = (verificationId, action, note = '') =>
  client.patch(`/admin/teacher-verifications/${verificationId}`, { action, note })
    .then((r) => r.data.verification);

export const openTeacherVerificationDocument = (verificationId, documentId) =>
  client.get(`/admin/teacher-verifications/${verificationId}/documents/${documentId}`, { responseType: 'blob' })
    .then((r) => URL.createObjectURL(r.data));
