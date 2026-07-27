import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getGender } from '../data/catalog';
import { queryProducts } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { useLiveData } from '../store/LiveDataContext';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductBrowser from '../components/ProductBrowser';
import SectionNav from '../components/SectionNav';

/** Every product for a gender, across all categories — the "كل المنتجات" entry. */
export default function AllProductsPage() {
  const { gender } = useParams();
  const { t, lang } = usePrefs();
  const { version } = useLiveData();
  const g = getGender(gender);

  const pool = useMemo(() => queryProducts({ gender }), [gender, version]);

  if (!g) return <Navigate to="/" replace />;

  const gName = lang === 'en' ? g.latin : g.title;

  return (
    <>
      <SectionNav />

      <Breadcrumbs
        items={[
          { label: gName, to: `/g/${gender}` },
          { label: t('allProducts') },
        ]}
      />

      <header className="shell page-head">
        <h1 className="page-head__title">
          {gender === 'men' ? t('allProductsMen') : t('allProductsWomen')}
        </h1>
        <p className="page-head__sub">{t('allProductsSub')}</p>
      </header>

      <ProductBrowser pool={pool} resetKey={`all/${gender}`} />
    </>
  );
}
