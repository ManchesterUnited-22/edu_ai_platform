import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { createLinkCode } from '../../api/parents.js';
import { listClasses } from '../../api/classes.js';
import { getMyProgress } from '../../api/progress.js';
import { listQuizzes } from '../../api/quizzes.js';
import { errorMessage } from '../../api/client.js';
import Icon from '../../components/common/Icon.jsx';
import Tile, { TileGroup } from '../../components/common/Tile.jsx';
import { useAuthStore } from '../../store/authStore.js';

const DAY_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const fmt1 = (n) => (n == null ? '—' : Number(n).toFixed(1));
const sameDay = (a, b) => a.toDateString() === b.toDateString();
const initials = (name = '') => name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();

/** Thứ Hai → Chủ nhật của tuần chứa `today`. */
function weekDays(today) {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Trạng thái hiển thị của một bài kiểm tra, suy ra từ dữ liệu thật của API. */
function quizStatus(q, now) {
  const done = q.attempts.filter((a) => a.submittedAt);
  const best = done.length ? Math.max(...done.map((a) => Number(a.score ?? 0))) : null;
  if (q.attempts.some((a) => !a.submittedAt)) return { key: 'doing', label: 'Đang làm', best };
  if (q.opensAt && now < new Date(q.opensAt)) return { key: 'soon', label: 'Sắp mở', best };
  if (done.length > 0) return { key: 'done', label: 'Đã làm', best };
  if (q.closesAt && now > new Date(q.closesAt)) return { key: 'closed', label: 'Đã đóng', best };
  return { key: 'todo', label: 'Chưa làm', best };
}

/** Các mốc mở/đóng của bài kiểm tra → danh sách sự kiện theo ngày. */
function quizEvents(quizzes) {
  const events = [];
  quizzes.forEach((q) => {
    if (q.opensAt) events.push({ id: `${q.id}-o`, at: new Date(q.opensAt), kind: 'open', title: q.title });
    if (q.closesAt) events.push({ id: `${q.id}-c`, at: new Date(q.closesAt), kind: 'close', title: q.title });
  });
  return events.sort((a, b) => a.at - b.at);
}

function LinkCodeCard() {
  const [code, setCode] = useState(null);
  const [error, setError] = useState('');

  const generate = async () => {
    setError('');
    try {
      setCode(await createLinkCode());
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="dash-card">
      <h3>🔗 Liên kết với phụ huynh</h3>
      <p className="dash-muted">Tạo mã rồi đưa cho phụ huynh nhập. Mã chỉ dùng được một lần và sẽ hết hạn.</p>
      <button className="btn" onClick={generate}>Tạo mã mới</button>
      {code && (
        <p>
          Mã của em: <strong className="code">{code.code}</strong>
          <br />
          <small>Hết hạn lúc {new Date(code.expiresAt).toLocaleTimeString('vi-VN')}</small>
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function StatCard({ tone, icon, label, value, unit }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-top">
        <span className="stat-icon"><Icon name={icon} /></span>
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}{unit && <small>{unit}</small>}</div>
      <span className="stat-line" />
    </div>
  );
}

function Empty({ children }) {
  return <p className="dash-empty">{children}</p>;
}

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const [classes, setClasses] = useState(null);
  const [classId, setClassId] = useState('');
  const [progress, setProgress] = useState(null);
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const now = useMemo(() => new Date(), []);
  const days = useMemo(() => weekDays(now), [now]);

  useEffect(() => {
    listClasses()
      .then((list) => {
        setClasses(list);
        if (list.length > 0) setClassId(list[0].id);
      })
      .catch((err) => { setClasses([]); setError(errorMessage(err)); });
  }, []);

  useEffect(() => {
    if (!classId) return;
    setProgress(null);
    setQuizzes(null);
    setError('');
    Promise.allSettled([getMyProgress(classId), listQuizzes(classId)]).then(([p, q]) => {
      if (p.status === 'fulfilled') setProgress(p.value);
      if (q.status === 'fulfilled') setQuizzes(q.value);
      const failed = [p, q].find((r) => r.status === 'rejected');
      if (failed) setError(errorMessage(failed.reason));
    });
  }, [classId]);

  const events = useMemo(() => quizEvents(quizzes ?? []), [quizzes]);
  const dayEvents = events.filter((e) => sameDay(e.at, selectedDay));

  const attempts = progress?.official.attempts ?? [];
  const scoreData = attempts.slice(-7).map((a, i) => ({
    name: `Lần ${i + 1}`,
    full: `${a.quizTitle} #${a.attemptNo}`,
    score: Number(a.score),
  }));
  const topicData = (progress?.topics ?? []).map((t) => ({ name: t.topic, percent: Math.round(t.accuracy * 100) }));
  const totalAnswered = (progress?.topics ?? []).reduce((s, t) => s + t.total, 0);
  const totalCorrect = (progress?.topics ?? []).reduce((s, t) => s + t.correct, 0);
  const overallAccuracy = totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const weakTopics = progress?.weakTopics ?? [];
  const className = classes?.find((c) => c.id === classId);

  return (
    <div className="dash">
      <div className="dash-main">
        {/* Lời chào + chọn lớp */}
        <div className="dash-head">
          <div>
            <h2>Chào {user.fullName} 👋</h2>
            <p className="dash-muted">Hôm nay mình học gì nào?</p>
          </div>
          {classes?.length > 0 && (
            <label className="dash-class">
              <Icon name="class" />
              <select value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Chọn lớp">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.subject})</option>)}
              </select>
            </label>
          )}
        </div>

        {classes && classes.length === 0 && !error && (
          <div className="dash-card"><Empty>Em chưa được thêm vào lớp nào. Hãy nhờ giáo viên thêm em vào lớp nhé.</Empty></div>
        )}
        {error && <p className="error">{error}</p>}

        {/* Tổng quan */}
        {classId && (
          <>
            <h3 className="dash-title">Tổng quan{className ? ` · ${className.name}` : ''}</h3>
            <div className="stat-grid">
              <StatCard tone="peach" icon="clipboard" label="Lượt làm kiểm tra" value={progress ? progress.official.count : '…'} />
              <StatCard tone="mint" icon="award" label="Điểm TB kiểm tra" value={progress ? fmt1(progress.official.average) : '…'} unit="/10" />
              <StatCard tone="sky" icon="pencil" label="Bài luyện tập" value={progress ? progress.practice.count : '…'} />
              <StatCard tone="lavender" icon="target" label="Chủ đề cần ôn" value={progress ? weakTopics.length : '…'} />
            </div>

            {/* Biểu đồ */}
            <div className="dash-two">
              <div className="dash-card">
                <div className="dash-card-head">
                  <h3>Điểm các lần kiểm tra</h3>
                  <small>{scoreData.length > 0 ? `${scoreData.length} lần gần nhất` : ''}</small>
                </div>
                {!progress ? <Empty>Đang tải...</Empty> : scoreData.length === 0 ? (
                  <Empty>Chưa có bài kiểm tra nào được nộp.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={scoreData} barCategoryGap="28%">
                      <CartesianGrid vertical={false} stroke="#eceaf8" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7b7894' }} />
                      <YAxis domain={[0, 10]} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 12, fill: '#7b7894' }} />
                      <Tooltip cursor={{ fill: '#f3f2ff' }} formatter={(v) => [`${v}/10`, 'Điểm']} labelFormatter={(_, p) => p?.[0]?.payload.full} />
                      <Bar dataKey="score" fill="#5046e5" radius={[8, 8, 8, 8]} background={{ fill: '#f1f0fd', radius: 8 }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="dash-card">
                <div className="dash-card-head">
                  <h3>Tỷ lệ đúng theo chủ đề</h3>
                  {overallAccuracy != null && <span className="pill good">{overallAccuracy}% chung</span>}
                </div>
                {!progress ? <Empty>Đang tải...</Empty> : topicData.length === 0 ? (
                  <Empty>Chưa đủ dữ liệu theo chủ đề.</Empty>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={topicData}>
                      <defs>
                        <linearGradient id="topicFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#5046e5" stopOpacity={0.28} />
                          <stop offset="100%" stopColor="#5046e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="#eceaf8" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#7b7894' }} />
                      <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} width={40} tick={{ fontSize: 12, fill: '#7b7894' }} />
                      <Tooltip formatter={(v) => [`${v}%`, 'Đúng']} />
                      <Area type="monotone" dataKey="percent" stroke="#5046e5" strokeWidth={2.5} fill="url(#topicFill)" dot={{ r: 3, fill: '#5046e5' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {weakTopics.length > 0 && (
                  <p className="dash-note">
                    Cần ôn: <strong>{weakTopics.map((t) => t.topic).join(', ')}</strong>{' '}
                    <Link to="/student/review">Xem gợi ý ôn tập →</Link>
                  </p>
                )}
              </div>
            </div>

            {/* Bài kiểm tra của lớp */}
            <div className="dash-card">
              <div className="dash-card-head">
                <h3>Bài kiểm tra của lớp</h3>
                <Link to="/student/quizzes" className="dash-link">Xem tất cả →</Link>
              </div>
              {!quizzes ? <Empty>Đang tải...</Empty> : quizzes.length === 0 ? (
                <Empty>Chưa có bài kiểm tra nào được mở.</Empty>
              ) : (
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr><th>Bài kiểm tra</th><th>Thời gian</th><th>Điểm cao nhất</th><th>Trạng thái</th></tr>
                    </thead>
                    <tbody>
                      {quizzes.slice(0, 5).map((q) => {
                        const st = quizStatus(q, now);
                        return (
                          <tr key={q.id}>
                            <td>
                              <Link to="/student/quizzes" className="dash-quiz-name">{q.title}</Link>
                              <small>{q._count.questions} câu · {q.durationMinutes} phút</small>
                            </td>
                            <td>{q.closesAt ? `Đóng ${new Date(q.closesAt).toLocaleDateString('vi-VN')}` : 'Không giới hạn'}</td>
                            <td>{st.best == null ? '—' : <strong>{fmt1(st.best)}/10</strong>}</td>
                            <td><span className={`pill st-${st.key}`}>{st.label}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Lối tắt chức năng (giữ nguyên các mục cũ) */}
        <TileGroup title="Học">
          <Tile to="/student/materials" icon="book" title="Tài liệu">Đọc nội dung giáo viên đã đăng</Tile>
          <Tile to="/student/ask" icon="chat" title="Hỏi đáp">Hỏi điều chưa hiểu, có trích nguồn từ tài liệu</Tile>
          <Tile to="/student/socratic" icon="steps" title="Giải bài từng bước">Gia sư gợi ý dần, em tự tìm ra đáp án</Tile>
        </TileGroup>
        <TileGroup title="Kiểm tra">
          <Tile to="/student/quizzes" icon="clipboard" tone="ochre" title="Bài kiểm tra">Làm bài có tính giờ do giáo viên giao</Tile>
          <Tile to="/student/practice" icon="pencil" tone="ochre" title="Luyện tập">Tự tạo bài luyện tập, không tính điểm chính thức</Tile>
        </TileGroup>
        <TileGroup title="Theo dõi">
          <Tile to="/student/progress" icon="chart" tone="sage" title="Tiến độ">Điểm số và chủ đề cần ôn</Tile>
          <Tile to="/student/review" icon="bulb" tone="sage" title="Gợi ý ôn tập">Nên ôn gì trước, đọc ở đâu</Tile>
        </TileGroup>
      </div>

      {/* Cột phải */}
      <aside className="dash-side">
        <div className="dash-card profile-card">
          <div className="avatar">{initials(user.fullName)}</div>
          <strong>{user.fullName}</strong>
          <small>Học sinh{className ? ` · ${className.name}` : ''}</small>
        </div>

        <div className="dash-card">
          <div className="dash-card-head">
            <h3>Tuần này</h3>
            <small>Tháng {now.getMonth() + 1}/{now.getFullYear()}</small>
          </div>
          <div className="week">
            {days.map((d) => {
              const has = events.some((e) => sameDay(e.at, d));
              return (
                <button
                  key={d.toISOString()}
                  className={`day${sameDay(d, selectedDay) ? ' active' : ''}${sameDay(d, now) ? ' today' : ''}`}
                  onClick={() => setSelectedDay(d)}
                  aria-label={d.toLocaleDateString('vi-VN')}
                >
                  <small>{DAY_LABEL[d.getDay()]}</small>
                  <strong>{d.getDate()}</strong>
                  <i className={has ? 'dot' : 'dot off'} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="dash-card">
          <h3>Lịch kiểm tra · {selectedDay.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</h3>
          {!classId ? <Empty>Chưa chọn lớp.</Empty> : !quizzes ? <Empty>Đang tải...</Empty> : dayEvents.length === 0 ? (
            <Empty>Không có bài kiểm tra mở hoặc đóng trong ngày này.</Empty>
          ) : (
            <ul className="event-list">
              {dayEvents.map((e) => (
                <li key={e.id} className={e.kind}>
                  <span className="event-icon"><Icon name={e.kind === 'open' ? 'clock' : 'target'} /></span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>{e.kind === 'open' ? 'Mở' : 'Đóng'} lúc {e.at.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <LinkCodeCard />
      </aside>
    </div>
  );
}