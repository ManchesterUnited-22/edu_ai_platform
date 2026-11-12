import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';

// tone: 'blue' | 'sage' | 'ochre'
export default function Tile({ to, title, icon, tone = 'blue', children }) {
  return (
    <Link to={to} className="tile">
      <span className={`icon-badge ${tone}`}><Icon name={icon} /></span>
      <span className="tile-text">
        <strong>{title}</strong>
        <span>{children}</span>
      </span>
    </Link>
  );
}

export function TileGroup({ title, children }) {
  return (
    <section className="tile-group">
      <h3>{title}</h3>
      <div className="tiles">{children}</div>
    </section>
  );
}