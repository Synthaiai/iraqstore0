import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice } from '../data/products';
import { GOVERNORATES, deliveryFee, isValidIraqiPhone } from '../data/iraq';
import Breadcrumbs from '../components/Breadcrumbs';
import { Bag, Check, Truck } from '../components/Icons';

const EMPTY = { name: '', phone: '', governorate: '', city: '', address: '', notes: '' };

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useStore();
  const { t, tf, lang } = usePrefs();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fee = useMemo(() => deliveryFee(form.governorate), [form.governorate]);
  const total = subtotal + (form.governorate ? fee : 0);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const sizeText = (line) => {
    const i = line.product.sizes.indexOf(line.size);
    return lang === 'en' && i >= 0 ? line.product.sizesEn[i] : line.size;
  };
  const colorText = (line) => {
    const cObj = line.product.colors.find((c) => c.name === line.color);
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
    if (form.name.trim().length < 3) next.name = t('errName');
    if (!isValidIraqiPhone(form.phone)) next.phone = t('errPhone');
    if (!form.governorate) next.governorate = t('errGov');
    if (form.city.trim().length < 2) next.city = t('errCity');
    if (form.address.trim().length < 5) next.address = t('errAddress');
    return next;
  };

  const submit = (e) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      const first = document.querySelector(`[data-field="${Object.keys(next)[0]}"]`);
      first?.focus();
      return;
    }

    setSubmitting(true);
    const orderNo = `IQ${Date.now().toString().slice(-6)}`;
    const summary = {
      orderNo,
      total,
      fee,
      subtotal,
      itemCount: cart.reduce((n, l) => n + l.qty, 0),
      name: form.name.trim(),
      phone: form.phone.trim(),
      governorate: form.governorate,
    };
    setTimeout(() => {
      clearCart();
      navigate('/order-confirmed', { state: summary, replace: true });
    }, 650);
  };

  return (
    <>
      <Breadcrumbs items={[{ label: t('checkoutTitle') }]} />

      <header className="shell page-head">
        <h1 className="page-head__title">{t('checkoutTitle')}</h1>
        <p className="page-head__sub">{t('checkoutSub')}</p>
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
                placeholder="07XXXXXXXXX"
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
                placeholder={t('notesPh')}
              />
            </div>
          </section>

          <section className="form-card">
            <h2 className="form-card__title">{t('paymentMethod')}</h2>
            <div className="pay-method is-active">
              <span className="pay-method__radio" aria-hidden />
              <Truck />
              <span>
                <strong>{t('cod')}</strong>
                <span>{t('codSub')}</span>
              </span>
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
                    <img src={line.product.thumbs[0]} alt="" loading="lazy" />
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
                <span>{form.governorate ? formatPrice(fee, lang) : t('feeByGov')}</span>
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
              disabled={submitting}
            >
              {submitting ? (
                t('confirming')
              ) : (
                <>
                  <Check />
                  {t('confirmOrder')} — {formatPrice(total, lang)}
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
