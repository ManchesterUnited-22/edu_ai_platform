import { useEffect, useState } from 'react';
import {
  listSecurityEvents,
  listTeacherAiReviews,
  listTeacherApprovals,
  listTeacherVerifications,
  openTeacherVerificationDocument,
  reviewTeacher,
  reviewTeacherVerification,
  runTeacherAiReview,
} from '../../api/admin.js';
import Loading from '../../components/common/Loading.jsx';

const eventLabels = {
  failed_teacher_login: 'Đăng nhập sai vào tài khoản giáo viên',
  teacher_role_misuse: 'Tài khoản đã xác định cố dùng chức năng giáo viên',
  pending_teacher_access: 'Giáo viên chưa được duyệt cố đăng nhập',
  teacher_ai_review: 'Phân tích hồ sơ giáo viên',
};

export default function AdminDashboard() {
  const [approvals, setApprovals] = useState(null);
  const [events, setEvents] = useState([]);
  const [aiReviews, setAiReviews] = useState([]);
  const [verificationQueue, setVerificationQueue] = useState([]);
  const [error, setError] = useState('');

  const load = () => Promise.all([listTeacherApprovals(), listSecurityEvents(), listTeacherAiReviews(), listTeacherVerifications()])
    .then(([nextApprovals, nextEvents, nextAiReviews, nextQueue]) => {
      setApprovals(nextApprovals);
      setEvents(nextEvents);
      setAiReviews(nextAiReviews);
      setVerificationQueue(nextQueue);
    })
    .catch((e) => setError(e.response?.data?.error?.message ?? 'Không tải được dữ liệu admin'));

  useEffect(() => { load(); }, []);

  const act = async (id, action) => {
    try {
      await reviewTeacher(id, action);
      await load();
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Không thể cập nhật yêu cầu');
    }
  };

  const runAiReview = async (id) => {
    try {
      await runTeacherAiReview(id);
      await load();
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Không thể phân tích hồ sơ bằng AI');
    }
  };

  const actVerification = async (id, action) => {
    try {
      await reviewTeacherVerification(id, action);
      await load();
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Không thể cập nhật hồ sơ xác minh');
    }
  };

  const openDocument = async (verificationId, documentId) => {
    try {
      const url = await openTeacherVerificationDocument(verificationId, documentId);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      setError(e.response?.data?.error?.message ?? 'Không thể mở giấy tờ xác minh');
    }
  };

  if (error) return <p className="error">{error}</p>;
  if (!approvals) return <Loading text="Đang tải khu vực quản trị..." />;

  return (
    <div className="admin-page">
      <div className="dash-head">
        <div><span className="form-kicker">KHU VỰC QUẢN TRỊ</span><h2>Duyệt tài khoản giáo viên</h2><p className="dash-muted">Admin quyết định cuối cùng. AI chỉ đưa ra gợi ý rủi ro để tham khảo.</p></div>
      </div>
      <section className="card admin-notice"><strong>Nguyên tắc cảnh báo</strong><span>Đăng nhập sai chỉ hiển thị IP, thiết bị và thời gian. Tên/email chỉ hiện khi hệ thống xác định được tài khoản đã đăng nhập.</span></section>
      <section className="card">
        <div className="card-head"><h3>Hồ sơ chờ duyệt ({approvals.length})</h3></div>
        {approvals.length === 0 ? <p className="empty">Chưa có hồ sơ giáo viên nào đang chờ duyệt.</p> : (
          <div className="admin-approval-list">
            {approvals.map(({ user, aiRiskSuggestion }) => (
              <article className="admin-approval" key={user.id}>
                <div><strong>{user.fullName}</strong><small>{user.email} · {user.teacherType ?? 'chưa phân loại'} · {user.verificationLevel ?? 'basic'} · đăng ký {new Date(user.createdAt).toLocaleDateString('vi-VN')}</small></div>
                <span className={`admin-risk ${aiRiskSuggestion.score >= 60 ? 'high' : ''}`}>Bảo mật: {aiRiskSuggestion.label} ({aiRiskSuggestion.score}/100)</span>
                <div className="row"><button className="btn" onClick={() => act(user.id, 'approve')}>Duyệt</button><button className="btn btn-light" onClick={() => act(user.id, 'reject')}>Từ chối</button></div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <div className="card-head"><h3>Hồ sơ giấy tờ cần xử lý ({verificationQueue.length})</h3></div>
        {verificationQueue.length === 0 ? <p className="empty">Chưa có hồ sơ giấy tờ cần Admin xem xét.</p> : (
          <div className="admin-approval-list">
            {verificationQueue.map((item) => (
              <article className="admin-approval" key={item.id}>
                <div>
                  <strong>{item.user.fullName}</strong>
                  <small>{item.user.email} · {item.track} · {item.documents.length} giấy tờ · MFA {item.user.mfaEnabled ? 'đã bật' : 'chưa bật'}</small>
                  <small>{Array.isArray(item.aiReasons) ? item.aiReasons.join(' ') : 'Chưa có nhận xét AI'}</small>
                  <small>{item.documents.map((document) => <button className="btn btn-light" type="button" key={document.id} onClick={() => openDocument(item.id, document.id)}>{document.kind}: {document.fileName}</button>)}</small>
                </div>
                <span className={`admin-risk ${item.aiLabel === 'high' ? 'high' : ''}`}>
                  {item.aiSource === 'gemini' ? 'Gemini' : 'Luật dự phòng'}: {item.aiLabel ?? 'chưa có'} ({item.aiScore ?? 0}/100)
                </span>
                <div className="row">
                  <button className="btn" onClick={() => actVerification(item.id, 'approve')}>Duyệt Verified</button>
                  <button className="btn btn-light" onClick={() => actVerification(item.id, 'needs_more_information')}>Yêu cầu bổ sung</button>
                  <button className="btn btn-light" onClick={() => actVerification(item.id, 'reject')}>Từ chối</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="card">
        <div className="card-head"><h3>Phân loại hồ sơ bằng AI ({aiReviews.length})</h3></div>
        <p className="dash-muted">AI chỉ đề xuất, không tự động cấp quyền hoặc từ chối giáo viên.</p>
        <div className="admin-approval-list">
          {aiReviews.map(({ user, review }) => {
            const metadata = review?.metadata ?? {};
            return (
              <article className="admin-approval" key={user.id}>
                <div>
                  <strong>{user.fullName}</strong>
                  <small>{user.email} · {user.teacherType ?? 'chưa phân loại'} · hiện tại: {user.verificationLevel ?? 'basic'}</small>
                </div>
                {review ? (
                  <span className={`admin-risk ${review.riskScore >= 60 ? 'high' : ''}`}>
                    {metadata.source === 'gemini' ? 'Gemini' : 'Luật dự phòng'}: đề xuất {metadata.recommendedLevel ?? 'basic'} ({review.riskScore}/100)
                  </span>
                ) : <span className="tag">Chưa phân tích</span>}
                <button className="btn btn-light" onClick={() => runAiReview(user.id)}>Phân tích lại</button>
              </article>
            );
          })}
        </div>
      </section>
      <section className="card">
        <div className="card-head"><h3>Sự kiện bảo mật gần đây</h3></div>
        <div className="admin-events">
          {events.length === 0 ? <p className="empty">Chưa có sự kiện đáng chú ý.</p> : events.map((event) => (
            <div className="admin-event" key={event.id}>
              <span className="admin-event-dot" />
              <div><strong>{eventLabels[event.type] ?? event.type}</strong><small>{event.targetUser ? `${event.targetUser.fullName} · ${event.targetUser.email}` : event.actorUser ? `${event.actorUser.fullName} · ${event.actorUser.email}` : `IP ${event.ipAddress ?? 'không xác định'}`} · {new Date(event.createdAt).toLocaleString('vi-VN')}</small></div>
              <span className="tag">Rủi ro {event.riskScore}/100</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
