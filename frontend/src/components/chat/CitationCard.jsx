import formatMath from '../../utils/formatMath.js';

export default function CitationCard({ citation }) {
  return (
    <blockquote>
      <small>
        [{citation.index}] {citation.fileName}
        {citation.pageNumber ? ` · trang ${citation.pageNumber}` : ''}
      </small>
      <p>{formatMath(citation.excerpt)}</p>
    </blockquote>
  );
}