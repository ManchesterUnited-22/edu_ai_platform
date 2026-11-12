import { useEffect, useRef, useState } from 'react';
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
  const wrapRef = useRef(null);

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

  const fullscreen = () => wrapRef.current?.requestFullscreen?.();

  if (error) return <p className="error">{error}</p>;
  if (!url && !html) return <p>Đang mở tài liệu...</p>;

  const isImage = doc.mimeType.startsWith('image/');
  return (
    <div className="doc-wrap" ref={wrapRef}>
      <div className="doc-bar">
        <button className="btn btn-light" onClick={fullscreen}>Toàn màn hình</button>
        {url && <a href={url} download={doc.fileName}>Tải file về máy</a>}
        <small>Nhấn Esc để thoát toàn màn hình</small>
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