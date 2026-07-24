import { Link } from 'react-router-dom';
import { Search } from '../components/Icons';

export default function NotFound() {
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
          هذه الصفحة غير موجودة
        </h1>
        <p className="empty__text">ربما تغيّر الرابط أو حُذف القسم. لنعُد إلى نقطة البداية.</p>
        <Link to="/" className="btn btn--burgundy btn--sm" style={{ marginTop: '0.5rem' }}>
          العودة إلى الرئيسية
        </Link>
      </div>
    </section>
  );
}
