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

  const localSize = (sz) => {
    const i = sizes.indexOf(sz);
    return lang === 'en' && i >= 0 ? sizesEn[i] : sz;
  };

  const confirm = () => {
    if (!size) {
      setErr(true);
      return;
    }
    addToCart(product, { size, color, silent: true });
    onClose();
    openCart();
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

        <button type="button" className="btn btn--burgundy btn--block" onClick={confirm}>
          <Bag />
          {t('addToCart')} — {formatPrice(product.price, lang)}
        </button>
      </div>
    </div>,
    document.body
  );
}
