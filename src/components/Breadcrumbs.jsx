import { Link } from 'react-router-dom';

/** items: [{ label, to? }] — the last entry renders as the current page. */
export default function Breadcrumbs({ items }) {
  return (
    <nav className="shell crumbs" aria-label="مسار التنقل">
      <Link to="/">الرئيسية</Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} style={{ display: 'contents' }}>
          <span className="crumbs__sep" aria-hidden>
            ❮
          </span>
          {item.to && i < items.length - 1 ? (
            <Link to={item.to}>{item.label}</Link>
          ) : (
            <span className="crumbs__current" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
