import { create } from 'zustand';

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch {
    return null;
  }
};

export const useAuthStore = create((set) => ({
  user: readUser(),
  token: localStorage.getItem('accessToken'),
  setSession: ({ user, accessToken }) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token: accessToken });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },
}));