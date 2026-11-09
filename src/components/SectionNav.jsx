import { useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CATEGORIES, GENDERS, getSubcategories } from '../data/catalog';
import { usePrefs } from '../store/PrefsContext';

/**
 * Always-on browse bar for the section pages.
 *
 * Without it, reaching a product list takes four clicks (home → gender →
 * category → subcategory). With it, every gender, category and subcategory is
 * one click away from wherever you already are.
 */

/**
 * Slide a scrolling chip row so the active chip sits in the middle of it.
 *
 * The subcategory row is wider than a phone, and every pick reloads the page
 * with the row back at its start — so choosing a second subcategory meant
 * scrolling the whole row again by hand. Centring the chosen chip leaves its
 * neighbours showing on both sides, one tap away.
 *
 * Measured with rects and moved with a relative scrollBy, so it behaves the
 * same in Arabic (RTL) as in English.
 */
function useCenterActiveChip(deps) {
  const rowRef = useRef(null);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const active = row.querySelector('.is-active');
    if (!active) return;
    // Nothing to slide when the whole row already fits on screen.
    if (row.scrollWidth <= row.clientWidth + 1) return;

    const rowBox = row.getBoundingClientRect();
    const chipBox = active.getBoundingClientRect();
    const delta = (chipBox.left + chipBox.width / 2) - (rowBox.left + rowBox.width / 2);
    if (Math.abs(delta) < 2) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rowRef;
}
export default function SectionNav(props) {
  const { t, lang } = usePrefs();
  const name = (item) => (lang === 'en' ? item.latin : item.title);
  // Routes that carry the section in the URL get it from params; the product
  // page has only an id, so it passes the product's own section in explicitly.
  const params = useParams();
  const gender = props.gender ?? params.gender ?? 'men';
  const category = props.category ?? params.category;
  const sub = props.sub ?? params.sub;

  const categories = CATEGORIES[gender] || [];
  const subs = category ? getSubcategories(gender, category) : [];

  const catsRef = useCenterActiveChip([gender, category, categories.length]);
  const subsRef = useCenterActiveChip([gender, category, sub, subs.length]);

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
              {name(g)}
            </Link>
          ))}
        </div>

        <div className="secnav__row secnav__row--cats" role="list" ref={catsRef}>
          <Link
            to={`/g/${gender}/all`}
            className={`secnav__link ${onAll ? 'is-active' : ''}`}
            role="listitem"
          >
            {t('allProducts')}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/g/${gender}/${c.slug}/all`}
              className={`secnav__link ${c.slug === category ? 'is-active' : ''}`}
              role="listitem"
            >
              {name(c)}
            </Link>
          ))}
        </div>

        {subs.length > 0 && (
          <div className="secnav__row secnav__row--subs" role="list" ref={subsRef}>
            {subs.map((s) => (
              <Link
                key={s.slug}
                to={`/g/${gender}/${category}/${s.slug}`}
                className={`chip ${s.slug === sub ? 'is-active' : ''}`}
                role="listitem"
              >
                {name(s)}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
