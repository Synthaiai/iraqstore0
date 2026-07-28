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
        {t('thanks')} <b>{state.name}</b>. تم تجهيز الفاتورة وإرسالها عبر الواتساب إلى الرقم ({STORE_CONTACT.phone}).
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
        <span>الدفع عند الاستلام. سيتم التواصل معك قريباً لتأكيد موعد التوصيل.</span>
      </div>

      <div className="confirm__actions" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button type="button" className="btn btn--burgundy" onClick={resendWhatsApp} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
          <Whatsapp />
          فتح الواتساب لإرسال الفاتورة مجدداً 📱
        </button>

        <Link to="/" className="btn btn--ghost">
          العودة للمتجر
        </Link>
      </div>
    </section>
  );
}
