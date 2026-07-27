import { Link } from 'react-router-dom';
import { usePrefs } from '../store/PrefsContext';

/** items: [{ label, to? }] — the last entry renders as the current page. */
export default function Breadcrumbs({ items }) {
  const { t, isRTL } = usePrefs();
  return (
    <nav className="shell crumbs" aria-label={t('home')}>
      <Link to="/">{t('home')}</Link>
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} style={{ display: 'contents' }}>
          <span className="crumbs__sep" aria-hidden>
            {isRTL ? '❮' : '❯'}
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
