import { useState } from 'react';
import { createLinkCode } from '../../api/parents.js';
import { errorMessage } from '../../api/client.js';
import Tile, { TileGroup } from '../../components/common/Tile.jsx';
import { useAuthStore } from '../../store/authStore.js';

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
    <div className="card">
      <h3>🔗 Liên kết với phụ huynh</h3>
      <p>Tạo mã rồi đưa cho phụ huynh nhập. Mã chỉ dùng được một lần và sẽ hết hạn.</p>
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

export default function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      <section className="hero">
        <h2>Chào {user.fullName} <span className="wave">👋</span></h2>
        <p>Hôm nay mình cùng học gì nào? Chọn một mục bên dưới để bắt đầu nhé.</p>
      </section>

      <TileGroup title="Học">
        <Tile to="/student/materials" icon="📚" color="violet" title="Tài liệu">Đọc nội dung giáo viên đã đăng</Tile>
        <Tile to="/student/ask" icon="💬" color="cyan" title="Hỏi đáp">Hỏi điều chưa hiểu, có trích nguồn từ tài liệu</Tile>
        <Tile to="/student/socratic" icon="🧠" color="pink" title="Giải bài từng bước">Gia sư gợi ý dần, em tự tìm ra đáp án</Tile>
      </TileGroup>

      <TileGroup title="Kiểm tra">
        <Tile to="/student/quizzes" icon="⏱️" color="orange" title="Bài kiểm tra">Làm bài có tính giờ do giáo viên giao</Tile>
        <Tile to="/student/practice" icon="🎯" color="green" title="Luyện tập">Tự tạo bài luyện tập, không tính điểm chính thức</Tile>
      </TileGroup>

      <TileGroup title="Theo dõi">
        <Tile to="/student/progress" icon="📈" color="violet" title="Tiến độ">Điểm số và chủ đề cần ôn</Tile>
        <Tile to="/student/review" icon="💡" color="orange" title="Gợi ý ôn tập">Nên ôn gì trước, đọc ở đâu</Tile>
      </TileGroup>

      <LinkCodeCard />
    </>
  );
}