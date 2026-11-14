import { useEffect, useState } from 'react';
import {
  createTeacherVerification,
  getTeacherVerification,
  submitTeacherVerification,
  uploadTeacherVerificationDocument,
} from '../../api/auth.js';
import { errorMessage } from '../../api/client.js';
import Loading from '../../components/common/Loading.jsx';

const tracks = [
  ['active_teacher', 'Giáo viên đang giảng dạy'],
  ['retired_teacher', 'Giáo viên đã nghỉ hưu'],
  ['teaching_student', 'Sinh viên Sư phạm năm 3–4'],
  ['new_graduate', 'Sinh viên mới tốt nghiệp'],
  ['language_teacher', 'Giáo viên/gia sư ngoại ngữ'],
];

const documentKinds = [
  ['identity', 'CCCD hoặc hộ chiếu'],
  ['teaching_credential', 'Bằng/chứng chỉ chuyên môn'],
  ['employment_proof', 'Thẻ giáo viên/hợp đồng/xác nhận đơn vị'],
  ['transcript', 'Bảng điểm hoặc giấy xác nhận sinh viên'],
  ['language_certificate', 'Chứng chỉ ngoại ngữ'],
  ['other', 'Giấy tờ bổ sung'],
];

const statusLabels = {
  draft: 'Bản nháp',
  processing: 'AI đang phân tích',
  admin_review: 'Đang chờ Admin xem xét',
  needs_more_information: 'Cần bổ sung thông tin',
  approved: 'Đã xác minh',
  rejected: 'Không được chấp nhận',
};

export default function TeacherVerificationPage() {
  const [verification, setVerification] = useState(null);
  const [track, setTrack] = useState('active_teacher');
  const [kind, setKind] = useState('identity');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = () => getTeacherVerification().then((data) => {
    setVerification(data);
    if (data) setTrack(data.track);
  }).catch((err) => setError(errorMessage(err)));

  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setVerification(await createTeacherVerification(track));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!file || !verification) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await uploadTeacherVerificationDocument(verification.id, kind, file);
      setFile(null);
      setMessage('Đã tải giấy tờ lên hồ sơ.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      setVerification(await submitTeacherVerification(verification.id));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!verification && !error) {
    return <Loading text="Đang tải hồ sơ xác minh..." />;
  }

  return (
    <div className="page-stack">
      <div className="dash-head">
        <div>
          <span className="form-kicker">XÁC MINH GIÁO VIÊN</span>
          <h2>Hoàn thiện hồ sơ chuyên môn</h2>
          <p className="dash-muted">AI sẽ đọc và đối chiếu giấy tờ; Admin quyết định cuối cùng với hồ sơ cần xem xét.</p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      {!verification ? (
        <section className="card">
          <h3>Chọn nhóm hồ sơ</h3>
          <label className="field">
            Nhóm giáo viên
            <select value={track} onChange={(event) => setTrack(event.target.value)}>
              {tracks.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <button className="btn" onClick={create} disabled={busy}>Tạo hồ sơ xác minh</button>
        </section>
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <h3>Trạng thái: {statusLabels[verification.status] ?? verification.status}</h3>
              {verification.aiScore !== null && <span className="tag">Điểm AI {verification.aiScore}/100 · {verification.aiSource === 'gemini' ? 'Gemini' : 'Luật dự phòng'}</span>}
            </div>
            {Array.isArray(verification.aiReasons) && verification.aiReasons.length > 0 && (
              <ul>{verification.aiReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            )}
          </section>
          {['draft', 'needs_more_information'].includes(verification.status) && (
            <section className="card">
              <h3>Tải giấy tờ</h3>
              <form className="form-grid" onSubmit={upload}>
                <label className="field">
                  Loại giấy tờ
                  <select value={kind} onChange={(event) => setKind(event.target.value)}>
                    {documentKinds.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </label>
                <label className="field">
                  File PDF, DOCX, PNG hoặc JPG
                  <input type="file" accept=".pdf,.docx,.png,.jpg,.jpeg" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required />
                </label>
                <button className="btn" disabled={busy || !file}>Tải lên</button>
              </form>
              <ul className="verification-documents">
                {verification.documents.map((document) => <li key={document.id}>{document.kind} · {document.fileName}</li>)}
              </ul>
              <button className="btn login-submit" onClick={submit} disabled={busy || verification.documents.length < 2}>
                Gửi AI phân tích hồ sơ
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
