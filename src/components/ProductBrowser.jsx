import { useEffect, useMemo, useState } from 'react';
import { availableColors, availableSizes, priceBounds } from '../data/products';
import FilterPanel from './FilterPanel';
import ProductCard from './ProductCard';
import { Close, Search, Sliders } from './Icons';

const SORTS = [
  { value: 'featured', label: 'المختارة' },
  { value: 'price-asc', label: 'السعر: من الأقل' },
  { value: 'price-desc', label: 'السعر: من الأعلى' },
  { value: 'rating', label: 'الأعلى تقييمًا' },
  { value: 'new', label: 'الأحدث' },
];

const BADGE_ORDER = { best: 0, new: 1, sale: 2 };

const emptyFilters = (max) => ({ maxPrice: max, colors: [], sizes: [], onSale: false, isNew: false });

/**
 * Toolbar + filter panel + product grid over a given `pool` of products.
 * Shared by the subcategory listing and the gender-wide "all products" page,
 * so filtering, sorting and the empty state behave identically everywhere.
 *
 * `resetKey` changes whenever the caller swaps the pool (a new route) — that
 * re-seeds the price ceiling and clears any active filters.
 */
export default function ProductBrowser({ pool, resetKey }) {
  const bounds = useMemo(() => priceBounds(pool), [pool]);
  const colors = useMemo(() => availableColors(pool), [pool]);
  const sizes = useMemo(() => availableSizes(pool), [pool]);

  const [sort, setSort] = useState('featured');
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState(() => emptyFilters(bounds.max));

  useEffect(() => {
    setFilters(emptyFilters(bounds.max));
    setSort('featured');
  }, [bounds.max, resetKey]);

  useEffect(() => {
    if (!panelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setPanelOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  const products = useMemo(() => {
    const list = pool.filter((p) => {
      if (p.price > filters.maxPrice) return false;
      if (filters.onSale && !p.oldPrice) return false;
      if (filters.isNew && p.badge !== 'new') return false;
      if (filters.colors.length && !p.colors.some((cl) => filters.colors.includes(cl.name))) return false;
      if (filters.sizes.length && !p.sizes.some((sz) => filters.sizes.includes(sz))) return false;
      return true;
    });

    const sorted = [...list];
    switch (sort) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'new':
        return sorted.sort((a, b) => (b.badge === 'new') - (a.badge === 'new'));
      default:
        return sorted.sort(
          (a, b) => (BADGE_ORDER[a.badge] ?? 9) - (BADGE_ORDER[b.badge] ?? 9) || b.rating - a.rating
        );
    }
  }, [pool, filters, sort]);

  const activeCount =
    (filters.maxPrice < bounds.max ? 1 : 0) +
    filters.colors.length +
    filters.sizes.length +
    (filters.onSale ? 1 : 0) +
    (filters.isNew ? 1 : 0);

  const reset = () => setFilters(emptyFilters(bounds.max));

  return (
    <>
      <div className="shell">
        <div className="toolbar">
          <div className="toolbar__right">
            <button
              type="button"
              className={`chip chip--action ${activeCount ? 'is-active' : ''}`}
              onClick={() => setPanelOpen(true)}
            >
              <Sliders />
              تصفية
              {activeCount > 0 && <span className="chip__badge">{activeCount}</span>}
            </button>

            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="ترتيب حسب"
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  ترتيب: {o.label}
                </option>
              ))}
            </select>
          </div>

          <span className="toolbar__count">
            <b>{products.length}</b> منتج
          </span>
        </div>

        {/* Active filter pills — one click to undo any single choice. */}
        {activeCount > 0 && (
          <div className="active-filters">
            {filters.maxPrice < bounds.max && (
              <button
                type="button"
                className="pill"
                onClick={() => setFilters((f) => ({ ...f, maxPrice: bounds.max }))}
              >
                حتى {filters.maxPrice.toLocaleString('ar-IQ')} د.ع <Close />
              </button>
            )}
            {filters.colors.map((name) => (
              <button
                key={name}
                type="button"
                className="pill"
                onClick={() => setFilters((f) => ({ ...f, colors: f.colors.filter((x) => x !== name) }))}
              >
                {name} <Close />
              </button>
            ))}
            {filters.sizes.map((sz) => (
              <button
                key={sz}
                type="button"
                className="pill"
                onClick={() => setFilters((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== sz) }))}
              >
                مقاس {sz} <Close />
              </button>
            ))}
            {filters.onSale && (
              <button type="button" className="pill" onClick={() => setFilters((f) => ({ ...f, onSale: false }))}>
                مخفّضة <Close />
              </button>
            )}
            {filters.isNew && (
              <button type="button" className="pill" onClick={() => setFilters((f) => ({ ...f, isNew: false }))}>
                جديد <Close />
              </button>
            )}
            <button type="button" className="pill pill--clear" onClick={reset}>
              مسح الكل
            </button>
          </div>
        )}

        {products.length === 0 ? (
          <div className="empty">
            <span className="empty__icon">
              <Search />
            </span>
            <h2 className="empty__title">لا توجد نتائج</h2>
            <p className="empty__text">جرّب توسيع نطاق السعر أو إزالة بعض الفلاتر.</p>
            <button type="button" className="btn btn--burgundy btn--sm" onClick={reset}>
              مسح الفلاتر
            </button>
          </div>
        ) : (
          <div className="product-grid" style={{ paddingBottom: 'clamp(4rem, 8vw, 7rem)' }}>
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        )}
      </div>

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        bounds={bounds}
        colors={colors}
        sizes={sizes}
        value={filters}
        onChange={setFilters}
        onReset={reset}
        resultCount={products.length}
        activeCount={activeCount}
      />
    </>
  );
}
