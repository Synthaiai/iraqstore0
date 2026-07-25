import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategory } from '../data/catalog';
import { queryProducts } from '../data/products';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductBrowser from '../components/ProductBrowser';
import SectionNav from '../components/SectionNav';

export default function ListingPage() {
  const { gender, category, sub } = useParams();
  const g = getGender(gender);
  const c = getCategory(gender, category);
  const s = getSubcategory(gender, category, sub);

  const pool = useMemo(() => queryProducts({ gender, category, sub }), [gender, category, sub]);

  if (!g || !c || !s) return <Navigate to="/" replace />;

  return (
    <>
      <SectionNav />

      <Breadcrumbs
        items={[
          { label: g.title, to: `/g/${gender}` },
          { label: c.title, to: `/g/${gender}/${category}` },
          { label: s.title },
        ]}
      />

      <header className="shell page-head">
        <h1 className="page-head__title">{s.title}</h1>
        <p className="page-head__sub">
          {s.slug === 'all' ? `كل ما لدينا في ${c.title} ${g.title}.` : c.blurb}
        </p>
      </header>

      <ProductBrowser pool={pool} resetKey={`${gender}/${category}/${sub}`} />
    </>
  );
}
