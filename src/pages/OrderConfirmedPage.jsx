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
        <div className="confirm__row">
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
        <span>{state.payment === 'card' ? 'سيتم التواصل معك لإتمام دفع الماستر كارد والشحن.' : 'الدفع عند الاستلام. سيتم التواصل معك هاتفياً لتأكيد موعد التوصيل.'}</span>
      </div>

      <div className="confirm__actions" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <a
          href={`https://wa.me/${STORE_CONTACT.whatsappNumber}?text=${encodeURIComponent(`مرحباً، لدي استفسار بخصوص طلبي رقم #${state.orderNo}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--burgundy"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Whatsapp />
          مراسلة خدمة العملاء عبر الواتساب للاستفسار 💬
        </a>

        <Link to="/" className="btn btn--ghost">
          العودة لتصفح المتجر 🛍️
        </Link>
      </div>
    </section>
  );
}
