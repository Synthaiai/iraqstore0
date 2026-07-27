import { Navigate, useParams } from 'react-router-dom';
import { CATEGORIES, getGender } from '../data/catalog';
import { countProducts, featuredProducts } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SectionNav from '../components/SectionNav';
import Tile from '../components/Tile';

export default function GenderPage() {
  const { gender } = useParams();
  const { t, tf, lang } = usePrefs();
  const g = getGender(gender);

  if (!g) return <Navigate to="/" replace />;

  const gName = lang === 'en' ? g.latin : g.title;
  const categories = CATEGORIES[gender];
  const picks = featuredProducts(20)
    .filter((p) => p.gender === gender)
    .slice(0, 4);

  return (
    <>
      <SectionNav />

      <Breadcrumbs items={[{ label: gName }]} />

      <header className="shell page-head">
        <span className="eyebrow">{g.latin}</span>
        <h1 className="page-head__title">{gName}</h1>
        <p className="page-head__sub">{tf(g, 'tagline')}</p>
      </header>

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {/* "كل المنتجات" leads as a wide banner, then the three categories. */}
        <Reveal style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
          <Tile
            to={`/g/${gender}/all`}
            className="tile--wide"
            title={gender === 'men' ? t('allProductsMen') : t('allProductsWomen')}
            latin="All Products"
            meta={`${countProducts(gender)} ${t('product')} — ${t('browseAll')}`}
            cover={g.cover}
            feature
          />
        </Reveal>

        <div className="tile-grid tile-grid--3">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 100}>
              <Tile
                to={`/g/${gender}/${c.slug}`}
                title={lang === 'en' ? c.latin : c.title}
                latin={lang === 'en' ? undefined : c.latin}
                meta={`${countProducts(gender, c.slug)} ${t('piece')} · ${tf(c, 'blurb')}`}
                cover={c.cover}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {picks.length > 0 && (
        <section className="section shell">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Top Rated</span>
              <h2 className="section-head__title">
                {t('topRatedIn')} {gName}
              </h2>
            </div>
          </Reveal>
          <div className="product-grid">
            {picks.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
