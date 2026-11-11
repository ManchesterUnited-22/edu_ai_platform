import client from './client.js';

// messages: [{ role: 'student' | 'tutor', content }], tin cuối phải là của học sinh (hoặc rỗng ở lượt đầu)
export const askSocratic = (classId, problem, messages) =>
  client.post(`/classes/${classId}/socratic`, { problem, messages }).then((r) => r.data);