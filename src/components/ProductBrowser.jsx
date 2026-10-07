import { Link } from 'react-router-dom';
import { getSubcategoryLabel } from '../data/catalog';
import { useEffect, useMemo, useState } from 'react';
import { availableColors, availableSizes, formatPrice, priceBounds, storefrontOrder } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import FilterPanel from './FilterPanel';
import ProductCard from './ProductCard';
import { Close, Search, Sliders } from './Icons';

const SORTS = [
  { value: 'featured', key: 'sortFeatured' },
  { value: 'price-asc', key: 'sortPriceAsc' },
  { value: 'price-desc', key: 'sortPriceDesc' },
  { value: 'rating', key: 'sortRating' },
  { value: 'new', key: 'sortNew' },
];

const emptyFilters = (max) => ({ maxPrice: max, colors: [], sizes: [], categories: [], onSale: false, isNew: false });

const STORAGE_PREFIX = 'pb:';
function saveSession(key, sort, filters) {
  try { sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({ sort, filters })); } catch {}
}
function loadSession(key) {
  try { const raw = sessionStorage.getItem(STORAGE_PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

/**
 * Fit a restored filter set to the pool it is being applied to.
 *
 * The first render of a route happens before the catalogue has arrived, so the
 * price ceiling is seeded from an empty pool — zero — and then saved. Restoring
 * that put the toolbar into "1 filter active · up to 0 IQD" on a page showing
 * every product. A ceiling that is missing, zero, or above the pool's real
 * maximum simply means "no price filter".
 */
function reconcileFilters(saved, max) {
  const base = { ...emptyFilters(max), ...(saved || {}) };
  const ceiling = Number(base.maxPrice);
  base.maxPrice = Number.isFinite(ceiling) && ceiling > 0 ? Math.min(ceiling, max) : max;
  return base;
}

/**
 * Toolbar + filter panel + product grid over a given `pool` of products.
 * Shared by the subcategory listing and the gender-wide "all products" page,
 * so filtering, sorting and the empty state behave identically everywhere.
 *
 * `resetKey` changes whenever the caller swaps the pool (a new route) — that
 * re-seeds the price ceiling and clears any active filters.
 */
export default function ProductBrowser({ pool, resetKey }) {
  const { t, tf, lang } = usePrefs();
  const bounds = useMemo(() => priceBounds(pool), [pool]);
  const colors = useMemo(() => availableColors(pool), [pool]);
  const categories = useMemo(() => [...new Map(pool.filter((p) => p.sub).map((p) => {
    const key = `${p.gender}/${p.category}/${p.sub}`;
    const category = getSubcategoryLabel(p.gender, p.category, p.sub);
    return [key, { key, name: category.title, nameEn: category.latin }];
  })).values()], [pool]);
  const sizes = useMemo(() => availableSizes(pool), [pool]);

  const [sort, setSort] = useState(() => {
    const saved = loadSession(resetKey);
    return saved?.sort || 'featured';
  });
  const [panelOpen, setPanelOpen] = useState(false);
  const [filters, setFilters] = useState(() => reconcileFilters(loadSession(resetKey)?.filters, bounds.max));
  const [visibleLimit, setVisibleLimit] = useState(24);

  useEffect(() => {
    const saved = loadSession(resetKey);
    setFilters(reconcileFilters(saved?.filters, bounds.max));
    setSort(saved?.sort || 'featured');
    setVisibleLimit(24);
  }, [bounds.max, resetKey]);

  useEffect(() => {
    // Nothing is remembered from a pool that has not loaded yet, or the empty
    // pool's zero price ceiling is what comes back on the next visit.
    if (!bounds.max) return;
    saveSession(resetKey, sort, filters);
  }, [resetKey, sort, filters, bounds.max]);

  useEffect(() => {
    setVisibleLimit(24);
  }, [filters, sort]);

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
      if (filters.maxPrice && bounds.max && filters.maxPrice < bounds.max && p.price > filters.maxPrice) return false;
      if (filters.categories.length && !filters.categories.includes(`${p.gender}/${p.category}/${p.sub}`)) return false;
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
        // The shop's own order, shared with the dashboard so the position the
        // admin sees is the position the customer sees.
        return sorted.sort(storefrontOrder);
    }
  }, [pool, filters, sort]);

  const visibleProducts = useMemo(() => {
    return products.slice(0, visibleLimit);
  }, [products, visibleLimit]);

  const activeCount =
    (filters.maxPrice < bounds.max ? 1 : 0) +
    filters.categories.length +
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
              {t('filter')}
              {activeCount > 0 && <span className="chip__badge">{activeCount}</span>}
            </button>

            <select
              className="select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label={t('sortBy')}
            >
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t('sortBy')}: {t(o.key)}
                </option>
              ))}
            </select>
          </div>

          <span className="toolbar__count">
            <b>{products.length}</b> {t('products')}
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
                {t('upTo')} {formatPrice(filters.maxPrice, lang)} <Close />
              </button>
            )}
            {filters.categories.map((key) => <button type="button" className="pill" key={key}
              onClick={() => setFilters((f) => ({ ...f, categories: f.categories.filter((c) => c !== key) }))}>
              {tf(categories.find((c) => c.key === key), 'name') || key} <Close />
            </button>)}
            {filters.colors.map((name) => (
              <button
                key={name}
                type="button"
                className="pill"
                onClick={() => setFilters((f) => ({ ...f, colors: f.colors.filter((x) => x !== name) }))}
              >
                {tf(colors.find((c) => c.name === name), 'name') || name} <Close />
              </button>
            ))}
            {filters.sizes.map((sz) => (
              <button
                key={sz}
                type="button"
                className="pill"
                onClick={() => setFilters((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== sz) }))}
              >
                {t('sizeLabel')} {sz} <Close />
              </button>
            ))}
            {filters.onSale && (
              <button type="button" className="pill" onClick={() => setFilters((f) => ({ ...f, onSale: false }))}>
                {t('onSale')} <Close />
              </button>
            )}
            {filters.isNew && (
              <button type="button" className="pill" onClick={() => setFilters((f) => ({ ...f, isNew: false }))}>
                {t('isNew')} <Close />
              </button>
            )}
            <button type="button" className="pill pill--clear" onClick={reset}>
              {t('clearAll')}
            </button>
          </div>
        )}

        {products.length === 0 ? (
          <div className="empty">
            <span className="empty__icon">
              <Search />
            </span>
            {/* A section with nothing in it is not a search that found nothing.
                Telling a shopper to widen their filters when they set none
                sends them to a button that cannot change anything. */}
            {pool.length === 0 ? (
              <>
                <h2 className="empty__title">{t('sectionEmpty')}</h2>
                <p className="empty__text">{t('sectionEmptySub')}</p>
                <Link to="/" className="btn btn--burgundy btn--sm">{t('browseStore')}</Link>
              </>
            ) : (
              <>
                <h2 className="empty__title">{t('noResults')}</h2>
                <p className="empty__text">{t('noResultsSub')}</p>
                <button type="button" className="btn btn--burgundy btn--sm" onClick={reset}>
                  {t('clearFilters')}
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="product-grid" style={{ paddingBottom: '2rem' }}>
              {visibleProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>

            {products.length > visibleLimit && (
              <div style={{ textAlign: 'center', paddingBottom: 'clamp(4rem, 8vw, 7rem)' }}>
                <button
                  type="button"
                  className="btn btn--burgundy btn--outline"
                  onClick={() => setVisibleLimit((prev) => prev + 24)}
                  style={{ minWidth: 200 }}
                >
                  {lang === 'en' ? `Show More (${products.length - visibleLimit} remaining)` : `عرض المزيد (متبقي ${products.length - visibleLimit})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        bounds={bounds}
        categories={categories}
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
