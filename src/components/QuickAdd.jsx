import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice } from '../data/products';
import { Bag, Close } from './Icons';

/**
 * Quick size/colour picker shown when a customer taps "add to cart" on a product
 * card without opening the product page. Guarantees every cart line — and so the
 * WhatsApp invoice — carries a real chosen size and colour.
 */
export default function QuickAdd({ product, onClose }) {
  const { addToCart, openCart } = useStore();
  const { t, tf, lang } = usePrefs();
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const sizesEn = Array.isArray(product.sizesEn) ? product.sizesEn : sizes;
  const [size, setSize] = useState(sizes.length === 1 ? sizes[0] : null);
  const [color, setColor] = useState(colors[0]?.name ?? null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const stock = product.stockQuantity !== undefined ? Number(product.stockQuantity) : 15;
  const isOutOfStock = stock <= 0;

  const localSize = (sz) => {
    const i = sizes.indexOf(sz);
    return lang === 'en' && i >= 0 ? sizesEn[i] : sz;
  };

  const confirm = () => {
    if (isOutOfStock) return;
    if (!size) {
      setErr(true);
      return;
    }
    const added = addToCart(product, { size, color, silent: true });
    if (added !== false) {
      onClose();
      openCart();
    }
  };

  return createPortal(
    <div className="qa" onClick={onClose} role="dialog" aria-modal="true">
      <div className="qa__sheet" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="qa__close" onClick={onClose} aria-label={t('close')}>
          <Close />
        </button>

        <div className="qa__head">
          <img className="qa__img" src={(product.images && product.images[0]) || product.thumbs?.[0] || product.image} alt="" />
          <div>
            <h3 className="qa__name">{tf(product, 'name')}</h3>
            <span className="qa__price">{formatPrice(product.price, lang)}</span>
            {isOutOfStock ? (
              <span className="badge badge--stock-out" style={{ display: 'inline-block', marginTop: '0.3rem' }}>
                {lang === 'en' ? 'Out of Stock' : 'نفد من المخزون'}
              </span>
            ) : stock <= 3 ? (
              <small style={{ color: 'var(--a-warn, #f59e0b)', display: 'block', marginTop: '0.2rem' }}>
                ⚠️ {lang === 'en' ? `Only ${stock} left` : `متبقي ${stock} فقط`}
              </small>
            ) : null}
          </div>
        </div>

        {/* Colour */}
        {colors.length > 0 && (
          <div className="qa__group">
            <div className="qa__label">
              <span>{t('color')}</span>
              <span className="qa__hint">{tf(colors.find((c) => c.name === color), 'name')}</span>
            </div>
            <div className="qa__row">
              {colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  className={`opt opt-color ${c.name === color ? 'is-active' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => setColor(c.name)}
                  aria-label={tf(c, 'name')}
                  aria-pressed={c.name === color}
                  title={tf(c, 'name')}
                />
              ))}
            </div>
          </div>
        )}

        {/* Size */}
        <div className="qa__group">
          <div className="qa__label">
            <span>
              {t('size')}
              {err && <span className="qa__req"> — {t('pleasePickSize')}</span>}
            </span>
          </div>
          <div className={`qa__row ${err ? 'opt-row--error' : ''}`}>
            {sizes.map((sz) => (
              <button
                key={sz}
                type="button"
                className={`opt ${sz === size ? 'is-active' : ''}`}
                onClick={() => {
                  setSize(sz);
                  setErr(false);
                }}
                aria-pressed={sz === size}
              >
                {localSize(sz)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`btn ${isOutOfStock ? 'btn--disabled' : 'btn--burgundy'} btn--block`}
          onClick={confirm}
          disabled={isOutOfStock}
        >
          <Bag />
          {isOutOfStock
            ? (lang === 'en' ? 'Out of Stock ❌' : 'نفد من المخزون ❌')
            : `${t('addToCart')} — ${formatPrice(product.price, lang)}`}
        </button>
      </div>
    </div>,
    document.body
  );
}
