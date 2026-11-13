import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import client, { errorMessage } from '../../api/client.js';
import { useClassStore } from '../../store/classStore.js';
const fmt = (n) => (n == null ? '–' : Number(n).toLocaleString('vi-VN', { maximumFractionDigits: 1 }));
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

const LEVELS = [
  { key: 'gioi', label: 'Giỏi', min: 8, color: '#3f7d5c' },
  { key: 'kha', label: 'Khá', min: 6.5, color: '#2f5d8a' },
  { key: 'tb', label: 'Trung bình', min: 5, color: '#d9a93b' },
  { key: 'yeu', label: 'Yếu', min: 0, color: '#b4463d' },
];
const levelOf = (avg) => LEVELS.find((l) => avg >= l.min);
const initials = (name = '') => name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase();

function Avatar({ name, color }) {
  return <span className="avatar" style={{ background: `${color}1f`, color }}>{initials(name)}</span>;
}

function Circle({ icon, color, value, label }) {
  return (
    <div className="circle-stat">
      <span className="circle" style={{ background: `${color}1f`, color }}>
        <svg viewBox="0 0 24 24">{icon}</svg>
      </span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

const I = {
  users: <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1 M17 8a3 3 0 0 1 0 6 M21 20v-1a4 4 0 0 0-3-4" />,
  alert: <path d="M12 4l9 16H3z M12 10v4 M12 17.5v.5" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0z M8 6H4v1a3 3 0 0 0 3 3 M16 6h4v1a3 3 0 0 1-3 3 M12 13v4 M8 20h8 M10 17h4" />,
};

export default function TeacherDashboard() {
  const [classes, setClasses] = useState([]);
  const { classId, setClassId } = useClassStore();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/classes')
      .then(({ data }) => {
        setClasses(data.classes);
        if (!data.classes.some((c) => c.id === classId)) setClassId(data.classes[0]?.id ?? '');
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!classId) return;
   ;
    setReport(null);
    client.get(`/classes/${classId}/report`)
      .then(({ data }) => setReport(data.report))
      .catch((e) => setError(errorMessage(e)));
  }, [classId]);

  const view = useMemo(() => {
    if (!report) return null;
    const graded = report.students.filter((s) => s.officialAverage != null);
    const ranked = [...graded].sort((a, b) => a.officialAverage - b.officialAverage);
    const split = LEVELS.map((l) => ({ ...l, value: graded.filter((s) => levelOf(s.officialAverage).key === l.key).length }));
    const rates = report.quizzes.map((q) => q.completionRate);
    return {
      graded,
      lowest: ranked.slice(0, 3),
      top: [...ranked].reverse().slice(0, 4),
      split,
      struggling: split[3].value + split[2].value,
      excelling: split[0].value,
      completion: rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null,
    };
  }, [report]);

  if (loading) return <p>Đang tải…</p>;
  if (error) return <p className="error">{error}</p>;

  const base = `/teacher/classes/${classId}`;
  const s = report?.summary;
  const hasClass = classes.length > 0;

  return (
    <>
      <div className="dash-head">
        <h2>Tổng quan</h2>
        {hasClass && (
          <select className="class-select" value={classId} onChange={(e) => setClassId(e.target.value)} aria-label="Chọn lớp">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.subject}</option>)}
          </select>
        )}
      </div>

      {!hasClass && (
        <div className="card">
          <p>Bạn chưa có lớp nào. Tạo lớp đầu tiên để bắt đầu.</p>
          <Link className="btn" to="/teacher/classes">Tạo lớp</Link>
        </div>
      )}

      {hasClass && !report && <p>Đang tải báo cáo…</p>}

      {report && (
        <div className="dash-two">
          {/* ===== CỘT TRÁI ===== */}
          <div className="dash-col">
            <section className="card dash-card">
              <div className="card-head"><h3>Thống kê lớp</h3><Link to={`${base}/report`}>Xem chi tiết ›</Link></div>
              <div className="circles">
                <Circle icon={I.users} color="#2f5d8a" value={s.studentCount} label="Học sinh" />
                <Circle icon={I.alert} color="#b4463d" value={view.struggling} label="Cần cố gắng" />
                <Circle icon={I.star} color="#3f7d5c" value={view.excelling} label="Học giỏi" />
              </div>
              <div className="progress-box">
                <span className="pb-icon">{s.quizCount}</span>
                <div className="pb-body">
                  <small>Tỉ lệ học sinh đã làm bài kiểm tra ({s.quizCount} bài)</small>
                  <div className="bar"><span style={{ width: `${Math.round((view.completion ?? 0) * 100)}%` }} /></div>
                  <strong>{view.completion == null ? 'Chưa có bài kiểm tra xuất bản' : `${Math.round(view.completion * 100)}% học sinh đã nộp bài`}</strong>
                </div>
              </div>
            </section>

            <section className="card dash-card">
              <div className="card-head"><h3>Cần chú ý và làm tốt</h3><Link to={`${base}/report`}>Xem chi tiết ›</Link></div>
              {view.graded.length === 0 ? (
                <p className="empty">Chưa có học sinh nào nộp bài kiểm tra. Khi có điểm, danh sách sẽ hiện ở đây.</p>
              ) : (
                <>
                  <h4 className="sub warn"><span className="dot" style={{ background: '#b4463d' }} />3 học sinh điểm thấp nhất</h4>
                  <ul className="people">
                    {view.lowest.map((x) => (
                      <li key={x.studentId} className="person">
                        <Avatar name={x.fullName} color={levelOf(x.officialAverage).color} />
                        <span className="person-text"><strong>{x.fullName}</strong><small>{x.quizzesTaken} bài kiểm tra · {x.practiceCount} lượt luyện tập</small></span>
                        <Link className="pill-btn" to={`${base}/report`}>Xem</Link>
                      </li>
                    ))}
                  </ul>
                  {view.graded.length > 3 && (
                    <>
                      <h4 className="sub good"><span className="dot" style={{ background: '#3f7d5c' }} />3 học sinh điểm cao nhất</h4>
                      <ul className="people">
                        {[...view.top].slice(0, 3).map((x) => (
                          <li key={x.studentId} className="person">
                            <Avatar name={x.fullName} color={levelOf(x.officialAverage).color} />
                            <span className="person-text"><strong>{x.fullName}</strong><small>{x.quizzesTaken} bài kiểm tra · {x.practiceCount} lượt luyện tập</small></span>
                            <Link className="pill-btn" to={`${base}/report`}>Xem</Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </section>
          </div>

          {/* ===== CỘT PHẢI ===== */}
          <div className="dash-col">
            <section className="card dash-card">
              <div className="card-head"><h3>Hiệu quả cả lớp</h3><Link to={`${base}/report`}>Xem chi tiết ›</Link></div>
              {view.graded.length === 0 ? (
                <p className="empty">Chưa có dữ liệu điểm để phân loại học lực.</p>
              ) : (
                <>
                  <div className="donut-wrap">
                    <div className="donut">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={view.split.filter((d) => d.value > 0)} dataKey="value" innerRadius="58%" outerRadius="100%" paddingAngle={2} stroke="none">
                            {view.split.filter((d) => d.value > 0).map((d) => <Cell key={d.key} fill={d.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="donut-center"><strong>{view.graded.length}</strong><small>có điểm</small></div>
                    </div>
                    <ul className="legend-grid">
                      {view.split.map((d) => (
                        <li key={d.key}><span className="lg-label"><i style={{ background: d.color }} />{d.label}</span><strong>{pct(d.value, view.graded.length)}%</strong></li>
                      ))}
                    </ul>
                  </div>
                  <h4 className="sub">Học sinh xuất sắc</h4>
                  <ul className="people">
                    {view.top.map((x) => {
                      const lv = levelOf(x.officialAverage);
                      return (
                        <li key={x.studentId} className="person">
                          <Avatar name={x.fullName} color={lv.color} />
                          <span className="person-text"><strong>{x.fullName}</strong><small style={{ color: lv.color }}>{lv.label}</small></span>
                          <span className="pill" style={{ background: `${lv.color}1f`, color: lv.color }}>{fmt(x.officialAverage)} điểm</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            <section className="card dash-card">
              <div className="card-head"><h3>Tổng kết điểm</h3><Link to={`${base}/report`}>Xem chi tiết ›</Link></div>
              {s.average == null ? (
                <p className="empty">Chưa có bài kiểm tra nào được nộp.</p>
              ) : (
                <>
                  <div className="gauge-wrap">
                    <div className="gauge">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ v: s.average }, { v: Math.max(0, 10 - s.average) }]} dataKey="v" startAngle={180} endAngle={0} innerRadius="68%" outerRadius="100%" cy="100%" stroke="none">
                            <Cell fill={levelOf(s.average).color} />
                            <Cell fill="#e8edf3" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="gauge-center"><span className="grade">{fmt(s.average)}<small>/10</small></span></div>
                    </div>
                    <div className="trophy-card">
                      <div><strong>{levelOf(s.average).label}</strong><small>Điểm trung bình lớp</small></div>
                      <svg viewBox="0 0 24 24">{I.trophy}</svg>
                    </div>
                  </div>
                  <div className="level-row">
                    {view.split.map((d) => (
                      <div key={d.key}>
                        <strong style={{ color: d.color }}>{d.label}</strong>
                        <small>{d.value} học sinh · {pct(d.value, view.graded.length)}%</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </div>

          {/* ===== HÀNG DƯỚI ===== */}
          <section className="card dash-card">
            <div className="card-head"><h3>Chủ đề học sinh làm sai nhiều</h3></div>
            {report.weakTopics.length === 0 ? (
              <p className="empty">Chưa có chủ đề nào dưới 60% đúng (cần ít nhất 3 lượt trả lời mỗi chủ đề).</p>
            ) : (
              <ul className="topic-bars">
                {report.weakTopics.slice(0, 6).map((t) => (
                  <li key={t.topic}>
                    <span className="t-name">{t.topic}</span>
                    <div className="bar low"><span style={{ width: `${Math.round(t.accuracy * 100)}%` }} /></div>
                    <strong>{Math.round(t.accuracy * 100)}%</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card dash-card">
            <div className="card-head"><h3>Việc cần xử lý</h3></div>
            <Link className="todo" to={`${base}/reports`}>
              <span>Báo cáo câu trả lời sai chưa xử lý</span>
              <span className={report.qa.openReports ? 'badge' : 'tag'}>{report.qa.openReports}</span>
            </Link>
            <div className="todo plain">
              <span>Câu hỏi bị từ chối (tài liệu chưa có)</span>
              <span className="tag">{report.qa.refused}/{report.qa.total}</span>
            </div>
            {report.qa.recentRefusedQuestions.slice(0, 3).map((q, i) => <p key={i} className="refused-q">“{q.question}”</p>)}
          </section>
        </div>
      )}

      {hasClass && (
        <section className="teacher-next">
          <div className="teacher-next-head">
            <div>
              <span className="form-kicker">GỢI Ý TIẾP THEO</span>
              <h3>Biến lớp học thành một lộ trình rõ ràng</h3>
              <p>Hoàn thiện từng bước nhỏ để học sinh có nội dung, bài luyện tập và phản hồi hữu ích.</p>
            </div>
            <span className="teacher-next-mark">✦</span>
          </div>
          <div className="teacher-next-list">
            <Link to={`${base}/documents`} className="teacher-next-item">
              <span className="next-number">01</span>
              <span><strong>Đưa tài liệu đầu tiên lên lớp</strong><small>AI sẽ dùng nội dung này làm nền cho hỏi đáp.</small></span>
              <span className="next-arrow">→</span>
            </Link>
            <Link to={`${base}/quizzes`} className="teacher-next-item">
              <span className="next-number">02</span>
              <span><strong>Tạo một bài kiểm tra ngắn</strong><small>Đo mức độ nắm bài và phát hiện lỗ hổng sớm.</small></span>
              <span className="next-arrow">→</span>
            </Link>
            <Link to={`${base}/reports`} className="teacher-next-item">
              <span className="next-number">03</span>
              <span><strong>Xem phản hồi cần xử lý</strong><small>Ưu tiên những câu hỏi học sinh chưa tìm được câu trả lời.</small></span>
              <span className="next-arrow">→</span>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}