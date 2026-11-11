import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addPrerequisite, createTopic, deleteTopic, listTopics, removePrerequisite,
} from '../../api/topics.js';
import { errorMessage } from '../../api/client.js';
import ClassPicker from '../../components/common/ClassPicker.jsx';

function TopicRow({ topic, topics, prereqs, onAdd, onRemove, onDelete }) {
  const [pick, setPick] = useState('');
  const nameOf = (id) => topics.find((t) => t.id === id)?.name ?? '?';
  const mine = prereqs.filter((p) => p.topicId === topic.id);
  const options = topics.filter(
    (t) => t.id !== topic.id && !mine.some((p) => p.prerequisiteId === t.id),
  );

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <strong>
          {topic.name}
          {topic.parentId && <small> (thuộc {nameOf(topic.parentId)})</small>}
        </strong>
        <button className="btn btn-light" onClick={() => onDelete(topic)}>Xóa</button>
      </div>

      <p>
        Cần biết trước:{' '}
        {mine.length === 0 && <em>không có</em>}
        {mine.map((p) => (
          <span className="tag" key={p.prerequisiteId} style={{ marginRight: 6 }}>
            {nameOf(p.prerequisiteId)}{' '}
            <button className="x" onClick={() => onRemove(topic.id, p.prerequisiteId)}>×</button>
          </span>
        ))}
      </p>

      {options.length > 0 && (
        <div className="row">
          <select value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">+ Thêm chủ đề cần biết trước</option>
            {options.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button
            className="btn"
            disabled={!pick}
            onClick={() => { onAdd(topic.id, pick); setPick(''); }}
          >
            Thêm
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopicManagePage() {
  const [classId, setClassId] = useState(null);
  const [data, setData] = useState({ topics: [], prerequisites: [] });
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      setData(await listTopics(classId));
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [classId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
      await load();
    } catch (err) {
      setError(errorMessage(err)); // ví dụ: tạo vòng tiên quyết sẽ báo lỗi ở đây
    }
  };

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      await createTopic(classId, { name: name.trim(), parentId: parentId || null });
      setName('');
      setParentId('');
    });
  };

  const remove = (topic) => {
    if (window.confirm(`Xóa chủ đề "${topic.name}"?`)) run(() => deleteTopic(classId, topic.id));
  };

  return (
    <>
      <Link to="/teacher">← Quay lại</Link>
      <h2>Quản lý chủ đề và quan hệ tiên quyết</h2>
      <ClassPicker value={classId} onChange={setClassId} />

      <form className="card" onSubmit={create}>
        <h3>Thêm chủ đề</h3>
        <div className="row">
          <input
            style={{ flex: 1 }}
            placeholder="Tên chủ đề (trùng tên chủ đề trong câu hỏi)"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Không có chủ đề cha</option>
            {data.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn" disabled={!classId}>Thêm</button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {classId && data.topics.length === 0 && <p>Lớp này chưa có chủ đề nào.</p>}
      {data.topics.map((t) => (
        <TopicRow
          key={t.id}
          topic={t}
          topics={data.topics}
          prereqs={data.prerequisites}
          onAdd={(topicId, prereqId) => run(() => addPrerequisite(classId, topicId, prereqId))}
          onRemove={(topicId, prereqId) => run(() => removePrerequisite(classId, topicId, prereqId))}
          onDelete={remove}
        />
      ))}
    </>
  );
}