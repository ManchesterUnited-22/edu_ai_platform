import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createClass, listClasses } from '../../api/classes.js';
import { errorMessage } from '../../api/client.js';

export default function ClassListPage() {
  const [classes, setClasses] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [error, setError] = useState('');

  const load = () => listClasses().then(setClasses).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createClass({ name: name.trim(), subject: subject.trim() });
      setName('');
      setSubject('');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <Link to="/teacher">← Quay lại</Link>
      <h2>Lớp học của tôi</h2>
      <form className="card" onSubmit={create}>
        <h3>Tạo lớp mới</h3>
        <div className="row">
          <input style={{ flex: 1 }} placeholder="Tên lớp" value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          <input style={{ flex: 1 }} placeholder="Môn học" value={subject} onChange={(e) => setSubject(e.target.value)} minLength={2} required />
          <button className="btn">Tạo</button>
        </div>
      </form>
      {error && <p className="error">{error}</p>}
      {classes?.length === 0 && <p>Chưa có lớp nào.</p>}
      {classes?.map((c) => (
        <div className="card" key={c.id}>
          <Link to={`/teacher/classes/${c.id}`}><strong>{c.name}</strong></Link>{' '}
          <small>{c.subject} · {c._count.enrollments} học sinh</small>
        </div>
      ))}
    </>
  );
}