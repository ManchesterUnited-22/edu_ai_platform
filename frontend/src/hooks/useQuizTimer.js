import { useEffect, useRef, useState } from 'react';

/** Đếm ngược đến `deadline` (ISO string). Hết giờ thì gọi onExpire đúng một lần. */
export default function useQuizTimer(deadline, onExpire) {
  const [left, setLeft] = useState(() => Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000)));
  const fired = useRef(false);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    fired.current = false;
    const tick = () => {
      const s = Math.max(0, Math.floor((new Date(deadline) - Date.now()) / 1000));
      setLeft(s);
      if (s === 0 && !fired.current) {
        fired.current = true;
        expireRef.current?.();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return { left, label: `${mm}:${ss}` };
}