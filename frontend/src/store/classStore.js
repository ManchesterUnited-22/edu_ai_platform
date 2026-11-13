import { create } from 'zustand';

const KEY = 'teacherClassId';
const read = () => {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};

// Lớp đang chọn của giáo viên, dùng chung cho Sidebar và Tổng quan
export const useClassStore = create((set) => ({
  classId: read(),
  setClassId: (id) => {
    try { localStorage.setItem(KEY, id); } catch { /* bỏ qua */ }
    set({ classId: id });
  },
}));