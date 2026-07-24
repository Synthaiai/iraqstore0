import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { formatPrice } from '../data/products';
import { GOVERNORATES, deliveryFee, isValidIraqiPhone } from '../data/iraq';
import Breadcrumbs from '../components/Breadcrumbs';
import { Bag, Check, Truck } from '../components/Icons';

const EMPTY = { name: '', phone: '', governorate: '', city: '', address: '', notes: '' };

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useStore();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Fee depends on the chosen governorate, so it stays out of the total until
  // one is picked — otherwise the total would include a charge shown as "TBD".
  const fee = useMemo(() => deliveryFee(form.governorate), [form.governorate]);
  const total = subtotal + (form.governorate ? fee : 0);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Empty cart — nothing to check out.
  if (cart.length === 0) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'إتمام الطلب' }]} />
        <section className="shell section">
          <div className="empty">
            <span className="empty__icon">
              <Bag />
            </span>
            <h1 className="empty__title">سلّتك فارغة</h1>
            <p className="empty__text">أضف بعض المنتجات قبل إتمام الطلب.</p>
            <Link to="/" className="btn btn--burgundy btn--sm">
              تصفّح المتجر
            </Link>
          </div>
        </section>
      </>
    );
  }

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 3) next.name = 'الاسم الكامل مطلوب';
    if (!isValidIraqiPhone(form.phone)) next.phone = 'رقم هاتف عراقي صحيح يبدأ بـ 07';
    if (!form.governorate) next.governorate = 'اختر المحافظة';
    if (form.city.trim().length < 2) next.city = 'المدينة أو المنطقة مطلوبة';
    if (form.address.trim().length < 5) next.address = 'أضف عنوانًا تفصيليًا';
    return next;
  };

  const submit = (e) => {
    e.preventDefault();
    const next = validate();
    if (Object.keys(next).length) {
      setErrors(next);
      // Focus the first field with an error so keyboard users land on it.
      const first = document.querySelector(`[data-field="${Object.keys(next)[0]}"]`);
      first?.focus();
      return;
    }

    setSubmitting(true);
    // No backend — simulate order placement, then hand off to the confirmation.
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
      <Breadcrumbs items={[{ label: 'إتمام الطلب' }]} />

      <header className="shell page-head">
        <h1 className="page-head__title">إتمام الطلب</h1>
        <p className="page-head__sub">الدفع عند الاستلام — تصلك الطلبية وتدفع نقدًا للمندوب.</p>
      </header>

      <div className="shell checkout">
        {/* ---- Address form ---- */}
        <form className="checkout__form" onSubmit={submit} noValidate>
          <section className="form-card">
            <h2 className="form-card__title">معلومات التوصيل</h2>

            <div className="field">
              <label htmlFor="ck-name">الاسم الكامل</label>
              <input
                id="ck-name"
                data-field="name"
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="مثال: أحمد علي"
                autoComplete="name"
                aria-invalid={!!errors.name}
                className={errors.name ? 'is-invalid' : ''}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </div>

            <div className="field">
              <label htmlFor="ck-phone">رقم الهاتف</label>
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
                style={{ textAlign: 'right' }}
                aria-invalid={!!errors.phone}
                className={errors.phone ? 'is-invalid' : ''}
              />
              {errors.phone && <span className="field__error">{errors.phone}</span>}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="ck-gov">المحافظة</label>
                <select
                  id="ck-gov"
                  data-field="governorate"
                  className={`select select--block ${errors.governorate ? 'is-invalid' : ''}`}
                  value={form.governorate}
                  onChange={set('governorate')}
                  aria-invalid={!!errors.governorate}
                >
                  <option value="" disabled>
                    اختر المحافظة
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
                <label htmlFor="ck-city">المدينة / المنطقة</label>
                <input
                  id="ck-city"
                  data-field="city"
                  type="text"
                  value={form.city}
                  onChange={set('city')}
                  placeholder="مثال: الكرادة"
                  aria-invalid={!!errors.city}
                  className={errors.city ? 'is-invalid' : ''}
                />
                {errors.city && <span className="field__error">{errors.city}</span>}
              </div>
            </div>

            <div className="field">
              <label htmlFor="ck-address">العنوان التفصيلي</label>
              <textarea
                id="ck-address"
                data-field="address"
                rows={3}
                value={form.address}
                onChange={set('address')}
                placeholder="أقرب نقطة دالة، اسم الشارع، رقم الدار…"
                aria-invalid={!!errors.address}
                className={errors.address ? 'is-invalid' : ''}
              />
              {errors.address && <span className="field__error">{errors.address}</span>}
            </div>

            <div className="field">
              <label htmlFor="ck-notes">ملاحظات (اختياري)</label>
              <textarea
                id="ck-notes"
                rows={2}
                value={form.notes}
                onChange={set('notes')}
                placeholder="أي تفاصيل تساعد المندوب على الوصول"
              />
            </div>
          </section>

          <section className="form-card">
            <h2 className="form-card__title">طريقة الدفع</h2>
            <div className="pay-method is-active">
              <span className="pay-method__radio" aria-hidden />
              <Truck />
              <span>
                <strong>الدفع عند الاستلام</strong>
                <span>ادفع نقدًا للمندوب عند وصول الطلب</span>
              </span>
            </div>
          </section>
        </form>

        {/* ---- Order summary ---- */}
        <aside className="checkout__summary">
          <div className="summary-card">
            <h2 className="form-card__title">ملخّص الطلب</h2>

            <div className="summary-lines">
              {cart.map((line) => (
                <div className="summary-line" key={line.key}>
                  <span className="summary-line__img">
                    <img src={line.product.thumbs[0]} alt="" loading="lazy" />
                    <span className="summary-line__qty">{line.qty}</span>
                  </span>
                  <span className="summary-line__body">
                    <span className="summary-line__name">{line.product.name}</span>
                    <span className="cart-line__meta">
                      {line.color} · مقاس {line.size}
                    </span>
                  </span>
                  <span className="summary-line__price">
                    {formatPrice(line.product.price * line.qty)}
                  </span>
                </div>
              ))}
            </div>

            <div className="summary-totals">
              <div className="total-row">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="total-row">
                <span>رسوم التوصيل</span>
                <span>{form.governorate ? formatPrice(fee) : 'تُحدَّد بالمحافظة'}</span>
              </div>
              <div className="total-row total-row--grand">
                <span>الإجمالي</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn--burgundy btn--block"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                'جارٍ تأكيد الطلب…'
              ) : (
                <>
                  <Check />
                  تأكيد الطلب — {formatPrice(total)}
                </>
              )}
            </button>

            <Link to="/" className="link-underline" style={{ alignSelf: 'center' }}>
              متابعة التسوّق
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
