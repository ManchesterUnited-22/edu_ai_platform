import { Link } from 'react-router-dom';

// color: 'violet' | 'pink' | 'cyan' | 'orange' | 'green'
export default function Tile({ to, title, icon, color = 'violet', children }) {
  return (
    <Link to={to} className="tile">
      {icon && <span className={`tile-icon ${color}`} aria-hidden="true">{icon}</span>}
      <span className="tile-body">
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