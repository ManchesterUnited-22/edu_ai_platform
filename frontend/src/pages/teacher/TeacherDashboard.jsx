import Tile, { TileGroup } from '../../components/common/Tile.jsx';
import { useAuthStore } from '../../store/authStore.js';

export default function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  return (
    <>
      <h2>Chào {user.fullName}</h2>
      <TileGroup title="Giảng dạy">
        <Tile to="/teacher/classes" icon="class" title="Lớp học">
          Thêm học sinh, đăng tài liệu, sinh câu hỏi, ra bài kiểm tra, xem báo cáo
        </Tile>
        <Tile to="/teacher/topics" icon="topics" tone="sage" title="Chủ đề và thứ tự ôn">
          Sắp xếp chủ đề nào cần học trước chủ đề nào
        </Tile>
      </TileGroup>
    </>
  );
}