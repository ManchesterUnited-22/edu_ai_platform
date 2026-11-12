import client from './client.js';

export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (body) => client.post('/auth/register', body).then((r) => r.data);

export const me = () => client.get('/auth/me').then((r) => r.data.user);