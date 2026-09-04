import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice, getProduct } from '../data/products';
import { GOVERNORATES, deliveryFee, getDeliveryFees, isValidIraqiPhone } from '../data/iraq';
import { saveOrder } from '../data/remote';
import { useLiveData } from '../store/LiveDataContext';
import Breadcrumbs from '../components/Breadcrumbs';
import TurnstileWidget from '../components/TurnstileWidget';
import { Bag, Card, Truck } from '../components/Icons';

const EMPTY = { name: '', phone: '', governorate: '', city: '', address: '', notes: '' };

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useStore();
  const { t, tf, lang } = usePrefs();
  const { settings } = useLiveData();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [payment, setPayment] = useState('cod'); // 'cod' | 'card'
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [turnstileReset, setTurnstileReset] = useState(0);

  const fees = useMemo(
    () => ({ ...getDeliveryFees(), ...(settings?.deliveryFees || {}) }),
    [settings?.deliveryFees]
  );
  const fee = useMemo(() => deliveryFee(form.governorate, fees), [form.governorate, fees]);
  const total = subtotal + (form.governorate ? fee : 0);

  const set = (key) => (e) => {
    const val = e.target.value;
    setSubmitError('');
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((prev) => {
      if (!prev || !prev[key]) return prev;
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const sizeText = (line) => {
    const i = line.product.sizes?.indexOf(line.size);
    return lang === 'en' && i >= 0 ? line.product.sizesEn[i] : line.size;
  };
  const colorText = (line) => {
    const cObj = line.product.colors?.find((c) => c.name === line.color);
    return tf(cObj, 'name') || line.color;
  };

  if (cart.length === 0) {
    return (
      <>
        <Breadcrumbs items={[{ label: t('checkoutTitle') }]} />
        <section className="shell section">
          <div className="empty">
            <span className="empty__icon">
              <Bag />
            </span>
            <h1 className="empty__title">{t('cartEmpty')}</h1>
            <p className="empty__text">{t('cartEmptyCheckout')}</p>
            <Link to="/" className="btn btn--burgundy btn--sm">
              {t('browseStore')}
            </Link>
          </div>
        </section>
      </>
    );
  }

  const validate = () => {
    const next = {};
    if (!form.name || form.name.trim().length < 2) next.name = t('errName');
    if (!isValidIraqiPhone(form.phone)) next.phone = t('errPhone');
    if (!form.governorate) next.governorate = t('errGov');
    if (!form.city || form.city.trim().length < 2) next.city = t('errCity');
    if (!form.address || form.address.trim().length < 5) next.address = t('errAddress');
    return next;
  };

  const submit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting) return;

    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      const first = document.querySelector(`[data-field="${Object.keys(next)[0]}"]`);
      first?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    try {
      // 1. Cross-verify cart prices and stock quantities against live catalog
      for (const line of cart) {
        const live = getProduct(line.product.id) || line.product;
        const currentStock = live && live.stockQuantity !== undefined ? Number(live.stockQuantity) : 15;

        if (currentStock <= 0) {
          setSubmitError(lang === 'en' ? `Sorry, product "${line.product.nameEn || line.product.name}" is out of stock.` : `عذراً، المنتج «${line.product.name}» نفد من المخزون حالياً.`);
          setSubmitting(false);
          return;
        }

        if (line.qty > currentStock) {
          setSubmitError(lang === 'en' ? `Sorry, only ${currentStock} piece(s) are available for "${line.product.nameEn || line.product.name}". Please reduce the quantity.` : `عذراً، الكمية المتوفرة للمنتج «${line.product.name}» هي ${currentStock} قطع فقط. يرجى تعديل الكمية في السلة.`);
          setSubmitting(false);
          return;
        }
      }

      let verifiedSubtotal = 0;
      const verifiedCart = cart.map((line) => {
        const live = getProduct(line.product.id);
        const unitPrice = (live && typeof live.price === 'number') ? live.price : (Number(line.product.price) || 0);
        const currentStock = (live && live.stockQuantity !== undefined) ? Number(live.stockQuantity) : (line.product.stockQuantity !== undefined ? Number(line.product.stockQuantity) : 15);
        const qty = Math.max(1, Math.min(currentStock, Number(line.qty) || 1));
        verifiedSubtotal += unitPrice * qty;
        return {
          ...line,
          qty,
          product: {
            ...line.product,
            price: unitPrice,
            stockQuantity: currentStock,
          },
        };
      });

      const verifiedFee = deliveryFee(form.governorate, fees);
      const verifiedTotal = verifiedSubtotal + (form.governorate ? verifiedFee : 0);

      const orderData = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        governorate: form.governorate,
        city: form.city.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        cart: verifiedCart,
        subtotal: verifiedSubtotal,
        fee: verifiedFee,
        total: verifiedTotal,
        itemCount: verifiedCart.reduce((n, l) => n + l.qty, 0),
        payment, // 'cod' | 'card'
        paymentLabel: payment === 'card' ? 'الدفع عن طريق الماستر الرافدين' : 'الدفع عند الاستلام',
        turnstileToken,
      };

      // The server recalculates every price and reserves inventory atomically.
      const savedOrder = await saveOrder(orderData);

      // Clear only after the server confirms durable persistence.
      clearCart();
      setSubmitting(false);
      navigate('/order-confirmed', { state: savedOrder, replace: true });
    } catch (err) {
      console.error('Order checkout submission error:', err);
      setSubmitting(false);
      setTurnstileReset((value) => value + 1);
      setSubmitError(err?.message || (lang === 'en' ? 'The order was not saved. Your cart is intact; please try again.' : 'لم يتم حفظ الطلب، وسلتك ما زالت محفوظة. يرجى المحاولة مجددًا.'));
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: t('checkoutTitle') }]} />

      <header className="shell page-head">
        <h1 className="page-head__title">{t('checkoutTitle')}</h1>
        <p className="page-head__sub">يرجى إدخال معلومات التوصيل وسيصل طلبك مباشرة إلى إدارة المتجر لتجهيزه والشحن.</p>
      </header>

      <div className="shell checkout">
        {/* ---- Address form ---- */}
        <form className="checkout__form" onSubmit={submit} noValidate>
          <section className="form-card">
            <h2 className="form-card__title">{t('deliveryInfo')}</h2>

            <div className="field">
              <label htmlFor="ck-name">{t('fullName')}</label>
              <input
                id="ck-name"
                data-field="name"
                type="text"
                value={form.name}
                onChange={set('name')}
                maxLength={80}
                placeholder={t('fullNamePh')}
                autoComplete="name"
                aria-invalid={!!errors.name}
                className={errors.name ? 'is-invalid' : ''}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </div>

            <div className="field">
              <label htmlFor="ck-phone">{t('phone')}</label>
              <input
                id="ck-phone"
                data-field="phone"
                type="tel"
                inputMode="numeric"
                value={form.phone}
                onChange={set('phone')}
                maxLength={18}
                placeholder="07XXXXXXXXX / +964..."
                autoComplete="tel"
                dir="ltr"
                style={{ textAlign: lang === 'en' ? 'left' : 'right' }}
                aria-invalid={!!errors.phone}
                className={errors.phone ? 'is-invalid' : ''}
              />
              {errors.phone && <span className="field__error">{errors.phone}</span>}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="ck-gov">{t('governorate')}</label>
                <select
                  id="ck-gov"
                  data-field="governorate"
                  className={`select select--block ${errors.governorate ? 'is-invalid' : ''}`}
                  value={form.governorate}
                  onChange={set('governorate')}
                  aria-invalid={!!errors.governorate}
                >
                  <option value="" disabled>
                    {t('pickGovernorate')}
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {errors.governorate && <span className="field__error">{errors.governorate}</span>}
              </div>

              <div className="field">
                <label htmlFor="ck-city">{t('cityArea')}</label>
                <input
                  id="ck-city"
                  data-field="city"
                  type="text"
                  value={form.city}
                  onChange={set('city')}
                  maxLength={80}
                  placeholder={t('cityPh')}
                  aria-invalid={!!errors.city}
                  className={errors.city ? 'is-invalid' : ''}
                />
                {errors.city && <span className="field__error">{errors.city}</span>}
              </div>
            </div>

            <div className="field">
              <label htmlFor="ck-address">{t('address')}</label>
              <textarea
                id="ck-address"
                data-field="address"
                rows={3}
                value={form.address}
                onChange={set('address')}
                maxLength={240}
                placeholder={t('addressPh')}
                aria-invalid={!!errors.address}
                className={errors.address ? 'is-invalid' : ''}
              />
              {errors.address && <span className="field__error">{errors.address}</span>}
            </div>

            <div className="field">
              <label htmlFor="ck-notes">{t('notes')}</label>
              <textarea
                id="ck-notes"
                rows={2}
                value={form.notes}
                onChange={set('notes')}
                maxLength={500}
                placeholder={t('notesPh')}
              />
            </div>
          </section>

          <section className="form-card">
            <h2 className="form-card__title">{t('paymentMethod')}</h2>
            <div className="pay-methods">
              <button
                type="button"
                className={`pay-method ${payment === 'cod' ? 'is-active' : ''}`}
                onClick={() => setPayment('cod')}
                aria-pressed={payment === 'cod'}
              >
                <span className="pay-method__radio" aria-hidden />
                <Truck />
                <span className="pay-method__text">
                  <strong>{t('cod')}</strong>
                  <span>{t('codSub')}</span>
                </span>
              </button>

              <button
                type="button"
                className={`pay-method ${payment === 'card' ? 'is-active' : ''}`}
                onClick={() => setPayment('card')}
                aria-pressed={payment === 'card'}
              >
                <span className="pay-method__radio" aria-hidden />
                <Card />
                <span className="pay-method__text">
                  <strong>{t('payCard')}</strong>
                  <span>{t('payCardSub')}</span>
                </span>
                <span className="pay-method__brand">
                  <span className="pay-method__mc" aria-hidden>
                    <i /><i />
                  </span>
                </span>
              </button>
            </div>

            {payment === 'card' && <p className="pay-note">{t('payCardNote')}</p>}

            <TurnstileWidget
              onToken={setTurnstileToken}
              resetKey={turnstileReset}
              lang={lang}
            />

            {submitError && <div className="checkout-error" role="alert" aria-live="assertive">{submitError}</div>}

            {/* Submit Button directly after payment selection */}
            <div style={{ marginTop: '1.25rem' }}>
              <button
                type="submit"
                className="btn btn--burgundy btn--block btn--lg"
                disabled={submitting || (!import.meta.env.DEV && !turnstileToken)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  padding: '1.1rem 1.5rem',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  borderRadius: 'var(--radius)',
                  boxShadow: '0 4px 14px rgba(107, 15, 26, 0.25)',
                }}
              >
                {submitting ? (
                  lang === 'en' ? 'Processing order…' : 'جارٍ إتمام الطلب…'
                ) : (
                  <>
                    <Bag />
                    {lang === 'en' ? 'Complete Order' : 'إتمام الطلب'} — {formatPrice(total, lang)}
                  </>
                )}
              </button>
            </div>
          </section>
        </form>

        {/* ---- Order summary ---- */}
        <aside className="checkout__summary">
          <div className="summary-card">
            <h2 className="form-card__title">{t('orderSummary')}</h2>

            <div className="summary-lines">
              {cart.map((line) => (
                <div className="summary-line" key={line.key}>
                  <span className="summary-line__img">
                    <img src={(line.product.images && line.product.images[0]) || line.product.thumbs?.[0] || line.product.image} alt="" loading="lazy" />
                    <span className="summary-line__qty">{line.qty}</span>
                  </span>
                  <span className="summary-line__body">
                    <span className="summary-line__name">{tf(line.product, 'name')}</span>
                    <span className="cart-line__meta">
                      {colorText(line)} · {t('sizeLabel')} {sizeText(line)}
                    </span>
                  </span>
                  <span className="summary-line__price">
                    {formatPrice(line.product.price * line.qty, lang)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-row">
                <span>{t('subtotal')}</span>
                <span>{formatPrice(subtotal, lang)}</span>
              </div>
              <div className="total-row">
                <span>{t('deliveryFee')}</span>
                <span>
                  {form.governorate
                    ? fee === 0
                      ? '🎁 مجاني'
                      : formatPrice(fee, lang)
                    : t('feeByGov')}
                </span>
              </div>
              <div className="total-row total-row--grand">
                <span>{t('total')}</span>
                <span>{formatPrice(total, lang)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--burgundy btn--block"
              onClick={submit}
              disabled={submitting || (!import.meta.env.DEV && !turnstileToken)}
            >
              {submitting ? (
                lang === 'en' ? 'Processing order…' : 'جارٍ إتمام الطلب…'
              ) : (
                <>
                  <Bag />
                  {lang === 'en' ? 'Complete Order' : 'إتمام الطلب'} — {formatPrice(total, lang)}
                </>
              )}
            </button>

            <Link to="/" className="link-underline" style={{ alignSelf: 'center' }}>
              {t('continueShopping')}
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
