import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { getProduct } from '../data/products';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard from '../components/ProductCard';
import { Heart } from '../components/Icons';

export default function FavoritesPage() {
  const { favorites } = useStore();
  const items = favorites.map(getProduct).filter(Boolean);

  return (
    <>
      <Breadcrumbs items={[{ label: 'المفضلة' }]} />

      <header className="shell page-head">
        <span className="eyebrow">Wishlist</span>
        <h1 className="page-head__title">المفضلة</h1>
        <p className="page-head__sub">
          {items.length > 0
            ? `${items.length} قطعة محفوظة. تبقى هنا حتى بعد إغلاق المتصفح.`
            : 'احفظ ما يعجبك هنا وقرّر لاحقًا على مهلك.'}
        </p>
      </header>

      <section className="shell" style={{ paddingBottom: 'clamp(4rem, 8vw, 7rem)' }}>
        {items.length === 0 ? (
          <div className="empty">
            <span className="empty__icon">
              <Heart />
            </span>
            <h2 className="empty__title">لا توجد قطع محفوظة</h2>
            <p className="empty__text">
              اضغط على أيقونة القلب في أي بطاقة منتج لحفظها هنا والعودة إليها لاحقًا.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link to="/g/men" className="btn btn--burgundy btn--sm">
                تسوّق رجالي
              </Link>
              <Link to="/g/women" className="btn btn--ghost btn--sm">
                تسوّق نسائي
              </Link>
            </div>
          </div>
        ) : (
          <div className="product-grid">
            {items.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
