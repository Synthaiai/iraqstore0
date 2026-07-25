import { Navigate, useParams } from 'react-router-dom';
import { CATEGORIES, getGender } from '../data/catalog';
import { countProducts, featuredProducts } from '../data/products';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SectionNav from '../components/SectionNav';
import Tile from '../components/Tile';

export default function GenderPage() {
  const { gender } = useParams();
  const g = getGender(gender);

  if (!g) return <Navigate to="/" replace />;

  const categories = CATEGORIES[gender];
  const picks = featuredProducts(20)
    .filter((p) => p.gender === gender)
    .slice(0, 4);

  return (
    <>
      <SectionNav />

      <Breadcrumbs items={[{ label: g.title }]} />

      <header className="shell page-head">
        <span className="eyebrow">{g.latin}</span>
        <h1 className="page-head__title">{g.title}</h1>
        <p className="page-head__sub">{g.tagline}</p>
      </header>

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        {/* "كل المنتجات" leads as a wide banner, then the three categories. */}
        <Reveal style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}>
          <Tile
            to={`/g/${gender}/all`}
            className="tile--wide"
            title={`كل المنتجات ${g.title === 'رجالي' ? 'الرجالية' : 'النسائية'}`}
            latin="All Products"
            meta={`${countProducts(gender)} منتج — تصفّح كل الأقسام معًا`}
            cover={g.cover}
            feature
          />
        </Reveal>

        <div className="tile-grid tile-grid--3">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={i * 100}>
              <Tile
                to={`/g/${gender}/${c.slug}`}
                title={c.title}
                latin={c.latin}
                meta={`${countProducts(gender, c.slug)} قطعة · ${c.blurb}`}
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
              <h2 className="section-head__title">الأعلى تقييمًا في {g.title}</h2>
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
