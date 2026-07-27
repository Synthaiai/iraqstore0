import { Link } from 'react-router-dom';
import { usePrefs } from '../store/PrefsContext';
import { Search } from '../components/Icons';

export default function NotFound() {
  const { t } = usePrefs();
  return (
    <section className="shell section" style={{ minHeight: '58vh', display: 'grid', placeItems: 'center' }}>
      <div className="empty">
        <span className="empty__icon">
          <Search />
        </span>
        <span className="eyebrow" style={{ justifyContent: 'center' }}>
          Error 404
        </span>
        <h1 className="empty__title" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)' }}>
          {t('notFoundTitle')}
        </h1>
        <p className="empty__text">{t('notFoundSub')}</p>
        <Link to="/" className="btn btn--burgundy btn--sm" style={{ marginTop: '0.5rem' }}>
          {t('backHome')}
        </Link>
      </div>
    </section>
  );
}
