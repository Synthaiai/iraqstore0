import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategories } from '../data/catalog';
import { countProducts, queryProducts } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { useLiveData } from '../store/LiveDataContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SectionNav from '../components/SectionNav';
import Tile from '../components/Tile';

export default function CategoryPage() {
  const { gender, category } = useParams();
  const { t, tf, lang } = usePrefs();
  useLiveData();
  const g = getGender(gender);
  const c = getCategory(gender, category);

  if (!g || !c) return <Navigate to="/" replace />;

  const gName = lang === 'en' ? g.latin : g.title;
  const cName = lang === 'en' ? c.latin : c.title;
  const subs = getSubcategories(gender, category) || [];
  const products = queryProducts({ gender, category });
  // Four tiles fit a 4-column row; five or more read better as a 3-column grid.
  const gridClass = subs.length === 4 ? 'tile-grid--4' : 'tile-grid--3';

  return (
    <>
      <SectionNav />

      <Breadcrumbs
        items={[
          { label: gName, to: `/g/${gender}` },
          { label: cName },
        ]}
      />

      <header className="shell page-head">
        <span className="eyebrow">
          {g.latin} · {c.latin}
        </span>
        <h1 className="page-head__title">{cName}</h1>
        <p className="page-head__sub">{tf(c, 'blurb')}</p>
      </header>

      <section className="shell" style={{ paddingBottom: 'clamp(2rem, 4vw, 3.5rem)' }}>
        <div className={`tile-grid ${gridClass}`}>
          {subs.map((s, i) => (
            <Reveal key={s.slug} delay={i * 90}>
              <Tile
                to={`/g/${gender}/${category}/${s.slug}`}
                title={lang === 'en' ? s.latin : s.title}
                latin={lang === 'en' ? undefined : s.latin}
                meta={`${countProducts(gender, category, s.slug)} ${t('piece')}`}
                cover={s.cover}
                feature={s.feature}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {products.length > 0 && (
        <section className="section shell" style={{ paddingTop: 0 }}>
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">{c.latin}</span>
              <h2 className="section-head__title">
                {t('allProducts')} — {cName}
              </h2>
              <p className="section-head__sub">{products.length} {t('product')}</p>
            </div>
          </Reveal>

          <div className="product-grid">
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
