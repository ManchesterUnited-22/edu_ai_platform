import client from './client.js';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (body) => client.post('/auth/register', body).then((r) => r.data);

export const me = () => client.get('/auth/me').then((r) => r.data.user);

export const setupMfa = (mfaToken) =>
  client.post('/auth/mfa/setup', { mfaToken }).then((r) => r.data);

export const confirmMfaSetup = (mfaToken, code) =>
  client.post('/auth/mfa/confirm', { mfaToken, code }).then((r) => r.data);

export const verifyMfa = (mfaToken, code) =>
  client.post('/auth/mfa/verify', { mfaToken, code }).then((r) => r.data);

export const getTeacherVerification = () =>
  client.get('/teacher-verification').then((r) => r.data.verification);

export const createTeacherVerification = (track) =>
  client.post('/teacher-verification', { track }).then((r) => r.data.verification);

export const uploadTeacherVerificationDocument = (verificationId, kind, file) => {
  const form = new FormData();
  form.append('kind', kind);
  form.append('file', file);
  return client.post(`/teacher-verification/${verificationId}/documents`, form)
    .then((r) => r.data.document);
};

export const submitTeacherVerification = (verificationId) =>
  client.post(`/teacher-verification/${verificationId}/submit`).then((r) => r.data.verification);