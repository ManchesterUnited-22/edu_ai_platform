import { useEffect, useState } from 'react';
import { fetchDocumentFile } from '../../api/documents.js';
import formatMath from '../../utils/formatMath.js';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Lỗi từ server khi tải blob nằm trong Blob, cần đọc ra chữ
async function readError(error) {
  try {
    const data = error.response?.data;
    if (data instanceof Blob) return JSON.parse(await data.text()).error?.message;
  } catch {
    /* bỏ qua */
  }
  return error.response?.data?.error?.message ?? 'Không mở được tài liệu';
}

export default function DocumentViewer({ doc }) {
  const [url, setUrl] = useState(null);
  const [html, setHtml] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;
    setUrl(null);
    setHtml(null);
    setError('');

    fetchDocumentFile(doc.id)
      .then(async (blob) => {
        if (cancelled) return;
        if (doc.mimeType === DOCX) {
          setHtml(formatMath(await blob.text()));
        } else {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(async (err) => !cancelled && setError(await readError(err)));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [doc.id, doc.mimeType]);

  if (error) return <p className="error">{error}</p>;
  if (!url && !html) return <p>Đang mở tài liệu...</p>;

  const isImage = doc.mimeType.startsWith('image/');
  return (
    <div className="doc-wrap">
      <div className="doc-bar">
        <small>Đang xem trong khu vực tài liệu của lớp</small>
        {url && <a className="doc-download" href={url} download={doc.fileName}>Tải file về máy</a>}
      </div>
      {isImage && <img className="doc-image" src={url} alt={doc.fileName} />}
      {doc.mimeType === DOCX && (
        <iframe className="doc-frame" srcDoc={html} sandbox="" title={doc.fileName} />
      )}
      {!isImage && doc.mimeType !== DOCX && (
        <iframe className="doc-frame" src={url} title={doc.fileName} />
      )}
    </div>
  );
}