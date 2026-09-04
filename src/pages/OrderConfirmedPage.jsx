import { useState, useCallback, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { Check, Truck, Whatsapp } from '../components/Icons';
import { STORE_CONTACT, openWhatsAppInvoice } from '../data/contact';

import { generateInvoiceImage } from '../utils/invoice';
import { img } from '../data/images';

/* ─── Download Icon SVG ─── */
function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const { t, lang } = usePrefs();
  const [saving, setSaving] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    if (!state?.orderNo) return;
    let active = true;
    let url;
    generateInvoiceImage(state).then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      setInvoiceUrl(url);
      setInvoiceFile(new File([blob], `invoice_${state.orderNo}.png`, { type: 'image/png' }));
    }).catch(() => active && setInvoiceError('تعذر تجهيز الصورة. أعد فتح الصفحة وحاول مجدداً.'));
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [state]);


  const resendWhatsApp = () => {
    openWhatsAppInvoice(state);
  };

  const handleSaveInvoice = useCallback(async () => {
    if (!invoiceFile) return;
    setSaving(true);
    setInvoiceError('');
    try {
      if (navigator.canShare?.({ files: [invoiceFile] })) {
        await navigator.share({ files: [invoiceFile], title: `فاتورة ${state.orderNo}` });
      } else {
        const link = document.createElement('a');
        link.href = invoiceUrl;
        link.download = invoiceFile.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      if (err.name !== 'AbortError') setInvoiceError('تعذرت المشاركة. افتح الصورة أدناه واحفظها بالضغط المطوّل.');
    } finally { setSaving(false); }
  }, [invoiceFile, invoiceUrl, state]);

  if (!state?.orderNo) return <Navigate to="/" replace />;

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
                    src={img(line.product?.images?.[0] || line.product?.image || line.image)}
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

      {invoiceError && <p role="alert">{invoiceError}</p>}
      {invoiceUrl && <details className="confirm__card">
        <summary>عرض صورة الفاتورة وحفظها</summary>
        <p>على الآيفون: اضغط زر المشاركة ثم «حفظ الصورة»، أو اضغط مطولاً على الصورة أدناه.</p>
        <a href={invoiceUrl} target="_blank" rel="noreferrer">فتح صورة الفاتورة</a>
        <img src={invoiceUrl} alt="فاتورة الطلب كاملة" style={{ width: '100%', height: 'auto', marginTop: 12 }} />
      </details>}
      <p className="confirm__note">تم تسجيل طلبك. يُرجى الاحتفاظ بالفاتورة لضمان متابعة الطلب، ويمكنك إرسالها إلى واتساب المتجر لتسهيل التأكيد.</p>
      <div className="confirm__note">
        <Truck />
        <span>{state.payment === 'card' ? 'سيتم التواصل معك هاتفياً لتأكيد شحن طلبك.' : 'الدفع عند الاستلام. سيتم التواصل معك هاتفياً لتأكيد موعد التوصيل.'}</span>
      </div>

      <div className="confirm__actions" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        {/* ── Save Invoice as Image ── */}
        <button
          type="button"
          className="btn btn--burgundy"
          onClick={handleSaveInvoice}
          disabled={saving || !invoiceFile}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '360px', justifyContent: 'center' }}
        >
          <DownloadIcon />
          {saving ? 'جارٍ حفظ الفاتورة...' : 'حفظ أو مشاركة الفاتورة 🧾'}
        </button>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={resendWhatsApp}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '360px', justifyContent: 'center' }}
        >
          <Whatsapp />
          إرسال نسخة عبر الواتساب (اختياري) 📱
        </button>

        <Link to="/" className="btn btn--ghost" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          العودة لتصفح المتجر 🛍️
        </Link>
      </div>
    </section>
  );
}
