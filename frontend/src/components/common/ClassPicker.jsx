import { useEffect, useState } from 'react';
import { listClasses } from '../../api/classes.js';
import { errorMessage } from '../../api/client.js';

export default function ClassPicker({ value, onChange }) {
  const [classes, setClasses] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listClasses()
      .then((list) => {
        setClasses(list);
        if (list.length > 0) onChange(list[0].id);
      })
      .catch((err) => setError(errorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!classes) return <p>Đang tải lớp...</p>;
  if (classes.length === 0) return <p>Chưa có lớp nào.</p>;

  return (
    <label className="class-picker">
      Lớp:{' '}
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>
        ))}
      </select>
    </label>
  );
}