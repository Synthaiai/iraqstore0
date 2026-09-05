import { Link } from 'react-router-dom';
import { usePrefs } from '../store/PrefsContext';

/**
 * Brand lockup: the logo artwork as a circular coin, plus the store name.
 * Keep the header mark circular even when an admin uploads a rectangular lockup.
 */
export default function Logo({ to = '/', compact = false }) {
  const { t } = usePrefs();
  return (
    <Link to={to} className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="IRAQI STORE">
      <span className="logo__badge">
        <img
          src="/brand-logo.jpg"
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
