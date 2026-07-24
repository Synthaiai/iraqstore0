import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { formatPrice } from '../data/products';
import { Bag, Close, Minus, Plus } from './Icons';

export default function CartDrawer() {
  const { cart, cartOpen, closeCart, setQty, removeLine, total } = useStore();
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
        aria-label="سلة التسوّق"
        aria-hidden={!cartOpen}
      >
        <header className="drawer__head">
          <h2 className="drawer__title">السلة</h2>
          <button type="button" className="icon-btn" onClick={closeCart} aria-label="إغلاق السلة">
            <Close />
          </button>
        </header>

        <div className="drawer__body">
          {cart.length === 0 ? (
            <div className="empty">
              <span className="empty__icon">
                <Bag />
              </span>
              <h3 className="empty__title">سلّتك فارغة</h3>
              <p className="empty__text">ابدأ من الأقسام واختر ما يناسب أسلوبك.</p>
              <Link to="/" className="btn btn--burgundy btn--sm" onClick={closeCart}>
                تصفّح المتجر
              </Link>
            </div>
          ) : (
            <>
              {cart.map((line) => (
                <div className="cart-line" key={line.key}>
                  <Link to={`/product/${line.product.id}`} className="cart-line__img" onClick={closeCart}>
                    <img src={line.product.thumbs[0]} alt={line.product.name} loading="lazy" />
                  </Link>

                  <div className="cart-line__body">
                    <Link
                      to={`/product/${line.product.id}`}
                      className="cart-line__name"
                      onClick={closeCart}
                    >
                      {line.product.name}
                    </Link>
                    <span className="cart-line__meta">
                      {line.color} · مقاس {line.size}
                    </span>
                    <span className="price" style={{ fontSize: '0.95rem' }}>
                      {formatPrice(line.product.price * line.qty)}
                    </span>

                    <div className="cart-line__foot">
                      <div className="qty qty--sm">
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty - 1)}
                          aria-label="تقليل الكمية"
                        >
                          <Minus />
                        </button>
                        <span className="qty__val">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => setQty(line.key, line.qty + 1)}
                          aria-label="زيادة الكمية"
                        >
                          <Plus />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-line__remove"
                        onClick={() => removeLine(line.key)}
                      >
                        إزالة
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {cart.length > 0 && (
          <footer className="drawer__foot">
            <div className="total-row total-row--grand">
              <span>الإجمالي</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button type="button" className="btn btn--burgundy btn--block" onClick={goToCheckout}>
              إتمام الشراء
            </button>
            <button type="button" className="link-underline" style={{ alignSelf: 'center' }} onClick={closeCart}>
              متابعة التسوّق
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
