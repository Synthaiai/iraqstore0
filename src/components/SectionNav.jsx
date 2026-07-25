import { Link, useLocation, useParams } from 'react-router-dom';
import { CATEGORIES, GENDERS, getSubcategories } from '../data/catalog';

/**
 * Always-on browse bar for the section pages.
 *
 * Without it, reaching a product list takes four clicks (home → gender →
 * category → subcategory). With it, every gender, category and subcategory is
 * one click away from wherever you already are.
 */
export default function SectionNav(props) {
  // Routes that carry the section in the URL get it from params; the product
  // page has only an id, so it passes the product's own section in explicitly.
  const params = useParams();
  const gender = props.gender ?? params.gender ?? 'men';
  const category = props.category ?? params.category;
  const sub = props.sub ?? params.sub;

  const categories = CATEGORIES[gender] || [];
  const subs = category ? getSubcategories(gender, category) : [];

  // "كل المنتجات" is active only on the gender-wide all page (/g/:gender/all).
  const { pathname } = useLocation();
  const onAll = pathname === `/g/${gender}/all`;

  return (
    <nav className="secnav" aria-label="تصفّح الأقسام">
      <div className="shell secnav__inner">
        <div className="secnav__row secnav__row--gender">
          {GENDERS.map((g) => (
            <Link
              key={g.slug}
              to={`/g/${g.slug}`}
              className={`secnav__gender ${g.slug === gender ? 'is-active' : ''}`}
            >
              {g.title}
            </Link>
          ))}
        </div>

        <div className="secnav__row" role="list">
          <Link
            to={`/g/${gender}/all`}
            className={`secnav__link ${onAll ? 'is-active' : ''}`}
            role="listitem"
          >
            كل المنتجات
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/g/${gender}/${c.slug}/all`}
              className={`secnav__link ${c.slug === category ? 'is-active' : ''}`}
              role="listitem"
            >
              {c.title}
            </Link>
          ))}
        </div>

        {subs.length > 0 && (
          <div className="secnav__row secnav__row--subs" role="list">
            {subs.map((s) => (
              <Link
                key={s.slug}
                to={`/g/${gender}/${category}/${s.slug}`}
                className={`chip ${s.slug === sub ? 'is-active' : ''}`}
                role="listitem"
              >
                {s.title}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
