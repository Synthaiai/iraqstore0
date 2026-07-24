import { createPortal } from 'react-dom';
import { formatPrice } from '../data/products';
import { Close } from './Icons';

/**
 * Filter controls for the listing page.
 *
 * Renders inline on desktop and as a bottom sheet on phones — same markup,
 * so filter state never has to be duplicated across two components.
 */
export default function FilterPanel({
  open,
  onClose,
  bounds,
  colors,
  sizes,
  value,
  onChange,
  onReset,
  resultCount,
  activeCount,
}) {
  const set = (patch) => onChange({ ...value, ...patch });

  const toggle = (key, item) => {
    const list = value[key];
    set({ [key]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item] });
  };

  // Portalled to <body>: an overlay must escape whatever stacking or containing
  // block the page it was declared in happens to create.
  return createPortal(
    <>
      <div className={`sheet-overlay ${open ? 'is-open' : ''}`} onClick={onClose} aria-hidden />

      <aside className={`filters ${open ? 'is-open' : ''}`} aria-label="تصفية المنتجات">
        <header className="filters__head">
          <h2 className="filters__title">تصفية</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق التصفية">
            <Close />
          </button>
        </header>

        <div className="filters__body">
          {/* ---- Price ---- */}
          <section className="filter-group">
            <h3 className="filter-group__title">السعر</h3>
            <div className="range">
              <input
                type="range"
                min={bounds.min}
                max={bounds.max}
                step={5000}
                value={value.maxPrice}
                onChange={(e) => set({ maxPrice: Number(e.target.value) })}
                aria-label="أعلى سعر"
              />
              <div className="range__labels">
                <span>{formatPrice(bounds.min)}</span>
                <span className="range__current">حتى {formatPrice(value.maxPrice)}</span>
              </div>
            </div>
          </section>

          {/* ---- Colour ---- */}
          {colors.length > 1 && (
            <section className="filter-group">
              <h3 className="filter-group__title">اللون</h3>
              <div className="filter-colors">
                {colors.map((c) => {
                  const on = value.colors.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      className={`filter-color ${on ? 'is-active' : ''}`}
                      onClick={() => toggle('colors', c.name)}
                      aria-pressed={on}
                      title={c.name}
                    >
                      <span className="filter-color__dot" style={{ background: c.hex }} />
                      <span className="filter-color__name">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---- Size ---- */}
          {sizes.length > 1 && (
            <section className="filter-group">
              <h3 className="filter-group__title">المقاس</h3>
              <div className="opt-row">
                {sizes.map((s) => {
                  const on = value.sizes.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      className={`opt ${on ? 'is-active' : ''}`}
                      onClick={() => toggle('sizes', s)}
                      aria-pressed={on}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ---- Offers ---- */}
          <section className="filter-group">
            <h3 className="filter-group__title">العروض</h3>
            <label className="check">
              <input
                type="checkbox"
                checked={value.onSale}
                onChange={(e) => set({ onSale: e.target.checked })}
              />
              <span className="check__box" aria-hidden />
              <span>المخفّضة فقط</span>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={value.isNew}
                onChange={(e) => set({ isNew: e.target.checked })}
              />
              <span className="check__box" aria-hidden />
              <span>الجديد فقط</span>
            </label>
          </section>
        </div>

        <footer className="filters__foot">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onReset} disabled={!activeCount}>
            مسح ({activeCount})
          </button>
          <button type="button" className="btn btn--burgundy btn--sm" onClick={onClose}>
            عرض {resultCount} منتج
          </button>
        </footer>
      </aside>
    </>,
    document.body
  );
}
