import client from './client.js';

// [HS] sinh mã liên kết
export const createLinkCode = () => client.post('/link-codes').then((r) => r.data);

// [PH]
export const linkChild = (code) => client.post('/parent/link', { code }).then((r) => r.data.child);
export const getChildren = () => client.get('/parent/children').then((r) => r.data.children);
export const getChildProgress = (studentId) =>
  client.get(`/parent/children/${studentId}/progress`).then((r) => r.data.classes);
export const getNotifications = (unreadOnly = false) =>
  client
    .get('/parent/notifications', { params: unreadOnly ? { unread: true } : {} })
    .then((r) => r.data.notifications);
export const markRead = (id) =>
  client.patch(`/parent/notifications/${id}/read`).then((r) => r.data.notification);