import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice } from '../data/products';
import { Bag, Close, Minus, Plus } from './Icons';

export default function CartDrawer() {
  const { cart, cartOpen, closeCart, setQty, removeLine, total } = useStore();
  const { t, tf, lang } = usePrefs();
  const navigate = useNavigate();

  const goToCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  // Lock the page behind the drawer and let Escape close it.
  useEffect(() => {
    if (!cartOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [cartOpen, closeCart]);

  return (
    <>
      <div
        className={`overlay ${cartOpen ? 'is-open' : ''}`}
        onClick={closeCart}
        aria-hidden
      />

      <aside
        className={`drawer ${cartOpen ? 'is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('cart')}
        aria-hidden={!cartOpen}
      >
        <header className="drawer__head">
          <h2 className="drawer__title">{t('cart')}</h2>
          <button type="button" className="icon-btn" onClick={closeCart} aria-label={t('close')}>
            <Close />
          </button>
        </header>

        <div className="drawer__body">
          {cart.length === 0 ? (
            <div className="empty">
              <span className="empty__icon">
                <Bag />
              </span>
              <h3 className="empty__title">{t('cartEmpty')}</h3>
              <p className="empty__text">{t('cartEmptySub')}</p>
              <Link to="/" className="btn btn--burgundy btn--sm" onClick={closeCart}>
                {t('browseStore')}
              </Link>
            </div>
          ) : (
            <>
              {cart.map((line) => {
                const cObj = (line.product.colors || []).find((c) => c.name === line.color);
                const si = (line.product.sizes || []).indexOf(line.size);
                const sizeText = lang === 'en' && si >= 0 ? (line.product.sizesEn || [])[si] : line.size;
                return (
                  <div className="cart-line" key={line.key}>
                    <Link to={`/product/${line.product.id}`} className="cart-line__img" onClick={closeCart}>
                      <img src={(line.product.thumbs && line.product.thumbs[0]) || line.product.image} alt={tf(line.product, 'name')} loading="lazy" />
                    </Link>

                    <div className="cart-line__body">
                      <Link
                        to={`/product/${line.product.id}`}
                        className="cart-line__name"
                        onClick={closeCart}
                      >
                        {tf(line.product, 'name')}
                      </Link>
                      <span className="cart-line__meta">
                        {tf(cObj, 'name') || line.color} · {t('sizeLabel')} {sizeText}
                      </span>
                      <span className="price" style={{ fontSize: '0.95rem' }}>
                        {formatPrice(line.product.price * line.qty, lang)}
                      </span>

                      <div className="cart-line__foot">
                        <div className="qty qty--sm">
                          <button
                            type="button"
                            onClick={() => setQty(line.key, line.qty - 1)}
                            aria-label={t('decrease')}
                          >
                            <Minus />
                          </button>
                          <span className="qty__val">{line.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(line.key, line.qty + 1)}
                            aria-label={t('increase')}
                          >
                            <Plus />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="cart-line__remove"
                          onClick={() => removeLine(line.key)}
                        >
                          {t('remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="drawer__foot">
            <div className="total-row total-row--grand">
              <span>{t('total')}</span>
              <span>{formatPrice(total, lang)}</span>
            </div>
            <button type="button" className="btn btn--burgundy btn--block" onClick={goToCheckout}>
              {t('checkout')}
            </button>
            <button type="button" className="link-underline" style={{ alignSelf: 'center' }} onClick={closeCart}>
              {t('continueShopping')}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
