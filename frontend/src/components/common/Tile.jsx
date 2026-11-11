import { Link } from 'react-router-dom';

export default function Tile({ to, title, children }) {
  return (
    <Link to={to} className="tile">
      <strong>{title}</strong>
      <span>{children}</span>
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