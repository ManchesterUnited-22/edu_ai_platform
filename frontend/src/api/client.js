import axios from 'axios';

const client = axios.create({ baseURL: '/api/v1' });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.assign('/login');
    }
    return Promise.reject(error);
  },
);

/** Lấy thông báo lỗi tiếng Việt từ backend: { error: { code, message } } */
export const errorMessage = (error) =>
  error.response?.data?.error?.message ?? 'Không kết nối được máy chủ';

export default client;