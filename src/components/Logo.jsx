import { Link } from 'react-router-dom';
import { usePrefs } from '../store/PrefsContext';
import { useLiveData } from '../store/LiveDataContext';

/**
 * Brand lockup: the logo artwork as a circular coin, plus the store name.
 * Uses the admin-uploaded logo when one exists, else the bundled /logo.jpg.
 */
export default function Logo({ to = '/', compact = false }) {
  const { t } = usePrefs();
  const { logoUrl } = useLiveData();
  return (
    <Link to={to} className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="IRAQI STORE">
      <span className="logo__badge">
        <img
          src={logoUrl || '/logo.jpg'}
          alt="IRAQI STORE"
          width={compact ? 36 : 46}
          height={compact ? 36 : 46}
          decoding="async"
        />
      </span>
      <span className="logo__text">
        <span className="logo__latin">IRAQI STORE</span>
        <span className="logo__ar">{t('brandSub')}</span>
      </span>
    </Link>
  );
}
