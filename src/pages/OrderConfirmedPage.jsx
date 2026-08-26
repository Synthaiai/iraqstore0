import { Link, Navigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { Check, Truck, Whatsapp } from '../components/Icons';
import { STORE_CONTACT, openWhatsAppInvoice } from '../data/contact';

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const { t, lang } = usePrefs();

  if (!state?.orderNo) return <Navigate to="/" replace />;

  const resendWhatsApp = () => {
    openWhatsAppInvoice(state);
  };

  return (
    <section className="shell section confirm">
      <div className="confirm__badge">
        <Check />
      </div>

      <h1 className="confirm__title">{t('orderReceived')}</h1>
      <p className="confirm__lead">
        {t('thanks')} <b>{state.name}</b>. تم استلام طلبك وتسجيله بنجاح في نظام المتجر، وسيتم التواصل معك هاتفياً لتأكيد الطلب والشحن.
      </p>

      <div className="confirm__card">
        <div className="confirm__row">
          <span>رقم الطلب</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
            #{state.orderNo}
          </strong>
        </div>
        <div className="confirm__row">
          <span>اسم الزبون</span>
          <strong>{state.name}</strong>
        </div>
        <div className="confirm__row">
          <span>رقم الهاتف</span>
          <strong dir="ltr">{state.phone}</strong>
        </div>
        <div className="confirm__row">
          <span>المحافظة والمدينة</span>
          <strong>{state.governorate} — {state.city}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('paymentLabel')}</span>
          <strong>{state.paymentLabel || (state.payment === 'card' ? 'الدفع عن طريق الماستر الرافدين' : t('cod'))}</strong>
        </div>

        {/* Ordered items breakdown */}
        {state.cart && state.cart.length > 0 && (
          <div style={{ marginBlock: '0.75rem', borderTop: '1px dashed var(--line)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--mute)', marginBottom: '0.5rem' }}>
              المنتجات المطلوبة ({state.cart.length}):
            </div>
            {state.cart.map((line, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', padding: '0.35rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <img
                    src={(line.product?.images && line.product.images[0]) || line.product?.image || line.image || '/logo.png'}
                    alt=""
                    style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9rem', display: 'block' }}>{line.product?.name || line.name}</strong>
                    <small style={{ color: 'var(--dim)', fontSize: '0.8rem' }}>
                      {line.color} · {t('sizeLabel')} {line.size} × {line.qty}
                    </small>
                  </div>
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                  {formatPrice((line.product?.price || line.price || 0) * line.qty, lang)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="confirm__row" style={{ borderTop: '1px solid var(--line)', paddingTop: '0.6rem' }}>
          <span>مجموع المنتجات</span>
          <strong>{formatPrice(state.subtotal, lang)}</strong>
        </div>
        <div className="confirm__row">
          <span>أجور التوصيل</span>
          <strong>{formatPrice(state.fee, lang)}</strong>
        </div>
        <div className="confirm__row confirm__row--total">
          <span>المبلغ الإجمالي</span>
          <strong>{formatPrice(state.total, lang)}</strong>
        </div>
      </div>

      <div className="confirm__note">
        <Truck />
        <span>{state.payment === 'card' ? 'سيتم التواصل معك هاتفياً لتأكيد شحن طلبك.' : 'الدفع عند الاستلام. سيتم التواصل معك هاتفياً لتأكيد موعد التوصيل.'}</span>
      </div>

      <div className="confirm__actions" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button
          type="button"
          className="btn btn--burgundy"
          onClick={resendWhatsApp}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '360px', justifyContent: 'center' }}
        >
          <Whatsapp />
          إرسال نسخة الفاتورة عبر الواتساب (اختياري) 📱
        </button>

        <Link to="/" className="btn btn--ghost" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          العودة لتصفح المتجر 🛍️
        </Link>
      </div>
    </section>
  );
}
