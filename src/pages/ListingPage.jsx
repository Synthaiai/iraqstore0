import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategory } from '../data/catalog';
import { queryProducts } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductBrowser from '../components/ProductBrowser';
import SectionNav from '../components/SectionNav';

export default function ListingPage() {
  const { gender, category, sub } = useParams();
  const { t, tf, lang } = usePrefs();
  const g = getGender(gender);
  const c = getCategory(gender, category);
  const s = getSubcategory(gender, category, sub);

  const pool = useMemo(() => queryProducts({ gender, category, sub }), [gender, category, sub]);

  if (!g || !c || !s) return <Navigate to="/" replace />;

  const gName = lang === 'en' ? g.latin : g.title;
  const cName = lang === 'en' ? c.latin : c.title;
  const sName = lang === 'en' ? s.latin : s.title;

  return (
    <>
      <SectionNav />

      <Breadcrumbs
        items={[
          { label: gName, to: `/g/${gender}` },
          { label: cName, to: `/g/${gender}/${category}` },
          { label: sName },
        ]}
      />

      <header className="shell page-head">
        <h1 className="page-head__title">{sName}</h1>
        <p className="page-head__sub">
          {s.slug === 'all' ? `${t('allOf')} ${cName} ${gName}.` : tf(c, 'blurb')}
        </p>
      </header>

      <ProductBrowser pool={pool} resetKey={`${gender}/${category}/${sub}`} />
    </>
  );
}
