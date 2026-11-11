import Tile, { TileGroup } from '../../components/common/Tile.jsx';
import { useAuthStore } from '../../store/authStore.js';

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      <section className="hero">
        <h2>Chào {user.fullName} <span className="wave">👋</span></h2>
        <p>Quản lý lớp học, tài liệu và bài kiểm tra của bạn ở một nơi, có AI hỗ trợ soạn đề.</p>
      </section>

      <TileGroup title="Giảng dạy">
        <Tile to="/teacher/classes" icon="🏫" color="violet" title="Lớp học">
          Thêm học sinh, đăng tài liệu, sinh câu hỏi, ra bài kiểm tra, xem báo cáo
        </Tile>
        <Tile to="/teacher/topics" icon="🕸️" color="pink" title="Chủ đề và thứ tự ôn">
          Sắp xếp chủ đề nào cần học trước chủ đề nào
        </Tile>
      </TileGroup>
    </>
  );
}