import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategories } from '../data/catalog';
import { countProducts } from '../data/products';
import Breadcrumbs from '../components/Breadcrumbs';
import Reveal from '../components/Reveal';
import SectionNav from '../components/SectionNav';
import Tile from '../components/Tile';

export default function CategoryPage() {
  const { gender, category } = useParams();
  const g = getGender(gender);
  const c = getCategory(gender, category);

  if (!g || !c) return <Navigate to="/" replace />;

  const subs = getSubcategories(gender, category);
  // Four tiles fit a 4-column row; five or more read better as a 3-column grid.
  const gridClass = subs.length === 4 ? 'tile-grid--4' : 'tile-grid--3';

  return (
    <>
      <SectionNav />

      <Breadcrumbs
        items={[
          { label: g.title, to: `/g/${gender}` },
          { label: c.title },
        ]}
      />

      <header className="shell page-head">
        <span className="eyebrow">
          {g.latin} · {c.latin}
        </span>
        <h1 className="page-head__title">{c.title}</h1>
        <p className="page-head__sub">{c.blurb}</p>
      </header>

      <section className="shell" style={{ paddingBottom: 'clamp(3rem, 6vw, 5rem)' }}>
        <div className={`tile-grid ${gridClass}`}>
          {subs.map((s, i) => (
            <Reveal key={s.slug} delay={i * 90}>
              <Tile
                to={`/g/${gender}/${category}/${s.slug}`}
                title={s.title}
                latin={s.latin}
                meta={`${countProducts(gender, category, s.slug)} قطعة`}
                cover={s.cover}
                feature={s.feature}
              />
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
