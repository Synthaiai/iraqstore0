import { useMemo } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getGender } from '../data/catalog';
import { queryProducts } from '../data/products';
import Breadcrumbs from '../components/Breadcrumbs';
import ProductBrowser from '../components/ProductBrowser';
import SectionNav from '../components/SectionNav';

/** Every product for a gender, across all categories — the "كل المنتجات" entry. */
export default function AllProductsPage() {
  const { gender } = useParams();
  const g = getGender(gender);

  const pool = useMemo(() => queryProducts({ gender }), [gender]);

  if (!g) return <Navigate to="/" replace />;

  return (
    <>
      <SectionNav />

      <Breadcrumbs
        items={[
          { label: g.title, to: `/g/${gender}` },
          { label: 'كل المنتجات' },
        ]}
      />

      <header className="shell page-head">
        <h1 className="page-head__title">كل المنتجات {g.title === 'رجالي' ? 'الرجالية' : 'النسائية'}</h1>
        <p className="page-head__sub">تصفّح كل ما لدينا في قسم {g.title} — أحذية وملابس وإكسسوارات في مكان واحد.</p>
      </header>

      <ProductBrowser pool={pool} resetKey={`all/${gender}`} />
    </>
  );
}
