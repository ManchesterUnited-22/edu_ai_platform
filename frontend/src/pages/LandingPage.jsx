import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon.jsx';
import { useAuthStore } from '../store/authStore.js';
import { homeFor } from './auth/LoginPage.jsx';

const FEATURES = [
  ['chat', 'Hỏi đáp có trích dẫn', 'Trả lời từ chính tài liệu của lớp, kèm nguồn. Không có trong tài liệu thì nói thẳng là chưa có.'],
  ['steps', 'Gia sư từng bước', 'Gợi ý từng bước để em tự tìm ra đáp án, thay vì đưa luôn lời giải.'],
  ['pencil', 'Soạn bài bằng AI', 'Tạo dàn ý, bài giảng và câu hỏi từ tài liệu. Giáo viên duyệt rồi mới xuất bản.'],
  ['clipboard', 'Kiểm tra và luyện tập', 'Bài kiểm tra chính thức chấm tự động, cùng luyện tập mỗi ngày theo chủ đề.'],
  ['chart', 'Báo cáo học lực', 'Điểm trung bình, phân loại học lực và các chủ đề học sinh hay làm sai.'],
  ['bell', 'Cảnh báo phụ huynh', 'Phụ huynh liên kết bằng mã do con cung cấp và nhận cảnh báo sớm.'],
];

const ROLES = [
  { key: 'student', icon: 'book', tone: 'blue', title: 'Học sinh', desc: 'Hỏi đáp theo tài liệu của lớp, luyện tập, làm bài và xem tiến độ.' },
  { key: 'parent', icon: 'users', tone: 'sage', title: 'Phụ huynh', desc: 'Nhập mã do con cung cấp để theo dõi kết quả và nhận cảnh báo.' },
  { key: 'teacher', icon: 'class', tone: 'ochre', title: 'Giáo viên', desc: 'Đăng tài liệu, sinh câu hỏi bằng AI, ra bài kiểm tra và xem báo cáo lớp.' },
];

const STEPS = [
  ['Giáo viên tải tài liệu', 'Tài liệu được xử lý, chia nhỏ và chờ giáo viên duyệt trước khi xuất bản.'],
  ['Học sinh học cùng AI', 'Hỏi đáp, luyện tập và làm bài kiểm tra dựa trên đúng tài liệu của lớp.'],
  ['Cả nhà cùng theo dõi', 'Giáo viên thấy chủ đề yếu, phụ huynh thấy tiến độ và cảnh báo của con.'],
];

const Brand = () => (
  <Link to="/" className="brand">
    <span className="brand-mark">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z M9 9h6" /></svg>
    </span>
    <span className="brand-name">Học tập AI</span>
  </Link>
);

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const home = user ? homeFor(user.role) : null;

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Brand />
          <nav className="lp-links" aria-label="Điều hướng trang chủ">
            <a href="#features">Tính năng</a>
            <a href="#roles">Dành cho ai</a>
            <a href="#how">Cách hoạt động</a>
          </nav>
          <div className="lp-cta">
            {home ? (
              <Link className="btn" to={home}>Vào trang của tôi</Link>
            ) : (
              <>
                <Link className="btn btn-light" to="/login">Đăng nhập</Link>
                <Link className="btn" to="/register">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-in">
          <div>
            <span className="lp-kicker">NỀN TẢNG HỌC TẬP ỨNG DỤNG AI</span>
            <h1>Học từ chính <em>tài liệu của lớp</em> mình</h1>
            <p className="lp-lead">
              Mỗi câu trả lời đều có nguồn trích dẫn. Giáo viên soạn bài nhanh hơn, học sinh hiểu bài sâu hơn,
              phụ huynh yên tâm theo dõi tiến độ của con.
            </p>
            <div className="lp-actions">
              {home ? (
                <Link className="btn" to={home}>Vào trang của tôi</Link>
              ) : (
                <>
                  <Link className="btn" to="/register">Tạo tài khoản</Link>
                  <Link className="btn btn-light" to="/login">Tôi đã có tài khoản</Link>
                </>
              )}
            </div>
            <p className="lp-note">Dành cho học sinh, phụ huynh và giáo viên.</p>
          </div>

          <div className="lp-mock" aria-hidden="true">
            <span className="lp-mock-tag">Minh họa</span>
            <div className="lp-bubble q">Định luật Newton thứ hai nói gì?</div>
            <div className="lp-bubble a">
              Gia tốc của vật tỉ lệ thuận với lực tác dụng và tỉ lệ nghịch với khối lượng của vật.
              <span className="lp-cite"><Icon name="book" /> Bài 9, trang 3</span>
            </div>
            <div className="lp-bubble q">Cho mình ví dụ về lực ma sát nghỉ?</div>
            <div className="lp-bubble a refuse">Phần này chưa có trong tài liệu của lớp, bạn hỏi thêm giáo viên nhé.</div>
          </div>
        </div>
      </section>

      <section className="lp-sec" id="features">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">TÍNH NĂNG</span>
            <h2>Mọi thứ cho một lớp học thông minh</h2>
            <p>Từ soạn bài đến theo dõi tiến độ, tất cả dựa trên tài liệu thật của lớp.</p>
          </div>
          <div className="lp-grid">
            {FEATURES.map(([icon, title, desc]) => (
              <article key={title} className="lp-feature">
                <span className="icon-badge blue"><Icon name={icon} /></span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec lp-sec-tint" id="roles">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">DÀNH CHO AI</span>
            <h2>Ba vai trò, một nền tảng</h2>
            <p>Chọn vai trò của bạn để bắt đầu.</p>
          </div>
          <div className="lp-roles">
            {ROLES.map((r) => (
              <Link key={r.key} to={user ? home : `/register/${r.key}`} className="rg-role">
                <span className={`icon-badge ${r.tone}`}><Icon name={r.icon} /></span>
                <strong>{r.title}</strong>
                <p>{r.desc}</p>
                <span className="rg-role-go">{user ? 'Vào trang của tôi' : `Đăng ký ${r.title.toLowerCase()}`} <Icon name="arrow" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="how">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">CÁCH HOẠT ĐỘNG</span>
            <h2>Ba bước đơn giản</h2>
          </div>
          <ol className="lp-steps">
            {STEPS.map(([title, desc], i) => (
              <li key={title}>
                <b>{i + 1}</b>
                <h3>{title}</h3>
                <p>{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {!user && (
        <section className="lp-wrap">
          <div className="lp-band">
            <div>
              <h2>Sẵn sàng bắt đầu?</h2>
              <p>Tạo tài khoản chỉ mất một phút.</p>
            </div>
            <div className="lp-actions">
              <Link className="btn lp-band-btn" to="/register">Đăng ký ngay</Link>
              <Link className="btn lp-band-ghost" to="/login">Đăng nhập</Link>
            </div>
          </div>
        </section>
      )}

      <footer className="lp-foot">
        <div className="lp-wrap">
          <Brand />
          <small>Nền tảng hỗ trợ học tập ứng dụng AI · Đồ án cơ sở 4</small>
        </div>
      </footer>
    </div>
  );
}