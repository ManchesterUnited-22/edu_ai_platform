import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getChildProgress, getChildren, getNotifications, markRead } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';
import Icon from '../../components/common/Icon.jsx';
import Loading from '../../components/common/Loading.jsx';

const ALERT_LABEL = { inactive: 'Lâu không học', low_quiz: 'Điểm thấp', score_drop: 'Điểm giảm' };
const PAGE_SIZE = 5;

const fmt1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const initials = (name = '') => name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
const dayLabel = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
const avg = (list) => {
  const v = list.filter((x) => x != null).map(Number);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

/** Gộp tiến độ của con ở tất cả các lớp thành một bộ số liệu để hiển thị. */
function summarize(classes) {
  const attempts = [];
  const practice = [];
  const topics = [];
  classes.forEach(({ class: cls, progress }) => {
    progress.official.attempts.forEach((a) => attempts.push({ ...a, className: cls.name }));
    (progress.practice.recent ?? []).forEach((p) => practice.push({ ...p, className: cls.name }));
    progress.topics.forEach((t) => topics.push({ ...t, className: cls.name }));
  });
  attempts.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const points = [
    ...attempts.filter((a) => a.submittedAt).map((a) => ({
      t: new Date(a.submittedAt).getTime(), official: Number(a.score), title: `${a.quizTitle} #${a.attemptNo}`,
    })),
    ...practice.filter((p) => p.submittedAt && p.score != null).map((p) => ({
      t: new Date(p.submittedAt).getTime(), practice: Number(p.score), title: `Luyện tập: ${p.topic ?? ''}`,
    })),
  ].sort((a, b) => a.t - b.t).map((p) => ({ ...p, name: dayLabel(p.t) }));
  return {
    attempts,
    points,
    topics: topics.sort((a, b) => a.accuracy - b.accuracy),
    weakTopics: topics.filter((t) => t.weak),
    officialAvg: avg(classes.map((c) => c.progress.official.average)),
    practiceAvg: avg(classes.map((c) => c.progress.practice.average)),
    attemptCount: classes.reduce((s, c) => s + c.progress.official.count, 0),
  };
}

function StatCard({ tone, icon, label, value, unit, hint }) {
  return (
    <div className={`pd-stat ${tone}`}>
      <div className="pd-stat-top">
        <span className="pd-stat-icon"><Icon name={icon} /></span>
        <span>{label}</span>
      </div>
      <div className="pd-stat-value">{value}{unit && <small>{unit}</small>}</div>
      <div className="pd-stat-hint">{hint}</div>
    </div>
  );
}

const Empty = ({ children }) => <p className="pd-empty">{children}</p>;

export default function ParentDashboard() {
  const [children, setChildren] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getChildren(), getNotifications(false)])
      .then(([c, n]) => {
        setChildren(c);
        setAlerts(n);
        if (c.length > 0) setSelectedId(c[0].id);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    if (!selectedId || progressMap[selectedId]) return;
    getChildProgress(selectedId)
      .then((data) => setProgressMap((m) => ({ ...m, [selectedId]: { data } })))
      .catch((err) => setProgressMap((m) => ({ ...m, [selectedId]: { error: errorMessage(err) } })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  useEffect(() => { setPage(1); }, [selectedId]);

  const entry = selectedId ? progressMap[selectedId] : null;
  const classes = entry?.data ?? null;
  const sum = useMemo(() => (classes ? summarize(classes) : null), [classes]);
  const child = children?.find((c) => c.id === selectedId);
  const unread = alerts.filter((n) => !n.readAt).length;

  const read = async (id) => {
    try {
      const updated = await markRead(id);
      setAlerts((list) => list.map((n) => (n.id === id ? { ...n, readAt: updated.readAt } : n)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (error && !children) return <p className="error">{error}</p>;
  if (!children) return <Loading />;

  const pages = sum ? Math.max(1, Math.ceil(sum.attempts.length / PAGE_SIZE)) : 1;
  const rows = sum ? sum.attempts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];
  const loading = selectedId && !entry;

  return (
    <div className="pd">
      <div className="pd-head">
        <div>
          <h2>Trang phụ huynh 👨‍👩‍👧</h2>
          <p className="pd-muted">Theo dõi việc học của con và nhận cảnh báo khi cần quan tâm thêm.</p>
        </div>
        <div className="pd-actions">
          <Link className="btn" to="/parent/link">+ Liên kết con</Link>
          <Link className="btn btn-light" to="/parent/alerts">
            Cảnh báo{unread > 0 && <span className="badge">{unread}</span>}
          </Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      {children.length === 0 ? (
        <div className="pd-card"><Empty>Chưa liên kết với học sinh nào. Hãy nhập mã do con cung cấp.</Empty>
          <Link className="btn" to="/parent/link">Nhập mã liên kết</Link>
        </div>
      ) : (
        <div className="pd-grid">
          <div className="pd-main">
            {/* Thẻ tổng quan */}
            <div className="pd-stats">
              <StatCard tone="orange" icon="users" label="Con đã liên kết" value={children.length}
                hint={child ? `Đang xem: ${child.fullName}` : ''} />
              <StatCard tone="blue" icon="award" label="Điểm TB kiểm tra" unit="/10"
                value={sum ? fmt1(sum.officialAvg) : '…'} hint={sum ? `${sum.attemptCount} lượt làm bài` : 'Đang tải'} />
              <StatCard tone="purple" icon="target" label="Chủ đề cần ôn"
                value={sum ? sum.weakTopics.length : '…'} hint="Đúng dưới 60%" />
              <StatCard tone="teal" icon="bell" label="Cảnh báo chưa đọc" value={unread}
                hint={`${alerts.length} cảnh báo tất cả`} />
            </div>

            {/* Biểu đồ */}
            <div className="pd-card">
              <div className="pd-card-head"><h3>Điểm số theo thời gian</h3></div>
              {loading ? <Empty>Đang tải...</Empty> : entry?.error ? <p className="error">{entry.error}</p> : !sum || sum.points.length === 0 ? (
                <Empty>Con chưa có bài kiểm tra hoặc luyện tập nào được nộp.</Empty>
              ) : (
                <>
                  <div className="pd-legend">
                    <span><i className="dot blue" /> Điểm TB kiểm tra: <strong>{fmt1(sum.officialAvg)}</strong></span>
                    <span><i className="dot orange" /> Điểm TB luyện tập: <strong>{fmt1(sum.practiceAvg)}</strong></span>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={sum.points}>
                      <defs>
                        <linearGradient id="pdBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4f7cff" stopOpacity={0.35} /><stop offset="100%" stopColor="#4f7cff" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="pdOrange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff9f2e" stopOpacity={0.35} /><stop offset="100%" stopColor="#ff9f2e" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#edf0f4" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b7585' }} />
                      <YAxis domain={[0, 10]} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 12, fill: '#6b7585' }} />
                      <Tooltip formatter={(v, k) => [`${v}/10`, k === 'official' ? 'Kiểm tra' : 'Luyện tập']} labelFormatter={(_, p) => p?.[0]?.payload.title} />
                      <Area type="monotone" dataKey="official" connectNulls stroke="#4f7cff" strokeWidth={2.5} fill="url(#pdBlue)" dot={{ r: 3 }} />
                      <Area type="monotone" dataKey="practice" connectNulls stroke="#ff9f2e" strokeWidth={2.5} fill="url(#pdOrange)" dot={{ r: 3 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Chủ đề + cảnh báo */}
            <div className="pd-two">
              <div className="pd-card">
                <div className="pd-card-head"><h3>Tỷ lệ đúng theo chủ đề</h3></div>
                {loading ? <Empty>Đang tải...</Empty> : !sum || sum.topics.length === 0 ? (
                  <Empty>Chưa đủ dữ liệu theo chủ đề.</Empty>
                ) : (
                  <ul className="pd-bars">
                    {sum.topics.slice(0, 6).map((t) => {
                      const pct = Math.round(t.accuracy * 100);
                      return (
                        <li key={`${t.className}-${t.topic}`}>
                          <div className="pd-bar-label">
                            <span>{t.topic}</span>
                            <strong className={t.weak ? 'bad' : ''}>{pct}%</strong>
                          </div>
                          <div className="pd-bar"><span className={t.weak ? 'bad' : ''} style={{ width: `${pct}%` }} /></div>
                          <small>{t.correct}/{t.total} câu đúng{t.weak ? ' · cần ôn thêm' : ''}</small>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="pd-card">
                <div className="pd-card-head">
                  <h3>Cảnh báo</h3>
                  <Link to="/parent/alerts" className="pd-link">Xem tất cả →</Link>
                </div>
                {alerts.length === 0 ? <Empty>Chưa có cảnh báo nào.</Empty> : (
                  <ul className="pd-alerts">
                    {alerts.slice(0, 4).map((n) => (
                      <li key={n.id} className={n.readAt ? 'read' : 'unread'}>
                        <div>
                          <span className="pd-pill warn">{ALERT_LABEL[n.type] ?? n.type}</span>
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt).toLocaleString('vi-VN')}</small>
                        </div>
                        {!n.readAt && <button className="btn btn-light pd-sm" onClick={() => read(n.id)}>Đã đọc</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Bảng kết quả */}
            <div className="pd-card">
              <div className="pd-card-head">
                <h3>Kết quả kiểm tra</h3>
                {child && <Link to={`/parent/children/${child.id}`} className="pd-link">Chi tiết tiến độ →</Link>}
              </div>
              {loading ? <Empty>Đang tải...</Empty> : !sum || sum.attempts.length === 0 ? (
                <Empty>Chưa có lần làm bài kiểm tra nào.</Empty>
              ) : (
                <>
                  <div className="pd-table-wrap">
                    <table className="pd-table">
                      <thead><tr><th>Bài kiểm tra</th><th>Lớp</th><th>Lần</th><th>Điểm</th><th>Nộp lúc</th><th>Kết quả</th></tr></thead>
                      <tbody>
                        {rows.map((a) => (
                          <tr key={a.attemptId}>
                            <td><strong>{a.quizTitle}</strong></td>
                            <td>{a.className}</td>
                            <td>{a.attemptNo}</td>
                            <td>{fmt1(a.score)}/10</td>
                            <td>{a.submittedAt ? new Date(a.submittedAt).toLocaleString('vi-VN') : '—'}</td>
                            <td><span className={`pd-pill ${Number(a.score) >= 5 ? 'ok' : 'bad'}`}>{Number(a.score) >= 5 ? 'Đạt' : 'Chưa đạt'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="pd-pager">
                    <small>Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sum.attempts.length)} / {sum.attempts.length} lượt</small>
                    <div>
                      <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Trang trước">‹</button>
                      <span>{page}/{pages}</span>
                      <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Trang sau">›</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cột phải */}
          <aside className="pd-side">
            <div className="pd-card">
              <div className="pd-card-head"><h3>Con của tôi</h3></div>
              <div className="pd-kids">
                {children.map((c) => (
                  <div key={c.id} className={`pd-kid${c.id === selectedId ? ' active' : ''}`}>
                    <button className="pd-kid-main" onClick={() => setSelectedId(c.id)} aria-pressed={c.id === selectedId}>
                      <span className="pd-avatar">{initials(c.fullName)}</span>
                      <span>
                        <strong>{c.fullName}</strong>
                        <small>{c.email}</small>
                      </span>
                    </button>
                    <Link className="btn btn-light pd-sm" to={`/parent/children/${c.id}`}>Xem tiến độ →</Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="pd-card">
              <div className="pd-card-head"><h3>Lớp của {child?.fullName.split(' ').pop()}</h3></div>
              {loading ? <Empty>Đang tải...</Empty> : !classes || classes.length === 0 ? (
                <Empty>Con chưa tham gia lớp nào.</Empty>
              ) : (
                <ul className="pd-classes">
                  {classes.map(({ class: cls, progress }) => (
                    <li key={cls.id}>
                      <span className="pd-class-icon"><Icon name="class" /></span>
                      <span>
                        <strong>{cls.name}</strong>
                        <small>{cls.subject} · TB kiểm tra {fmt1(progress.official.average)}/10</small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}