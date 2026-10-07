import { useState, useEffect } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { Check, Truck } from '../components/Icons';

import { blobToDataUrl, blobToObjectUrl, generateInvoiceImage } from '../utils/invoice';
import { img } from '../data/images';

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const { t, lang } = usePrefs();
  const [saving, setSaving] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [invoicePreviewUrl, setInvoicePreviewUrl] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceError, setInvoiceError] = useState('');

  useEffect(() => {
    if (!state?.orderNo) return;
    let active = true;
    let objectUrl = '';
    setSaving(true);
    generateInvoiceImage(state).then(async (blob) => {
      objectUrl = blobToObjectUrl(blob);
      const previewUrl = await blobToDataUrl(blob);
      return { objectUrl, previewUrl };
    }).then(({ objectUrl: readyUrl, previewUrl }) => {
      if (!active) return;
      const filename = `invoice_${state.orderNo}.png`;
      setInvoiceUrl(readyUrl);
      setInvoicePreviewUrl(previewUrl);
      setInvoiceName(filename);
    }).catch(() => active && setInvoiceError('تعذر تجهيز الصورة. أعد فتح الصفحة وحاول مجدداً.'))
      .finally(() => active && setSaving(false));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [state]);


  if (!state?.orderNo) return <Navigate to="/" replace />;

  return (
    <section className="shell section confirm">
      <div className="confirm__badge">
        <Check />
      </div>

      <h1 className="confirm__title">{t('orderReceived')}</h1>
      <p className="confirm__lead">
        {t('thanks')} <b>{state.name}</b>. {t('confirmLead')}
      </p>

      <div className="confirm__card">
        <div className="confirm__row">
          <span>{t('confirmOrderNo')}</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
            #{state.orderNo}
          </strong>
        </div>
        <div className="confirm__row">
          <span>{t('confirmCustomer')}</span>
          <strong>{state.name}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('confirmPhone')}</span>
          <strong dir="ltr">{state.phone}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('confirmPlace')}</span>
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
              {t('confirmItems')} ({state.cart.length}):
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
          <span>{t('confirmSubtotal')}</span>
          <strong>{formatPrice(state.subtotal, lang)}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('confirmDelivery')}</span>
          <strong>{formatPrice(state.fee, lang)}</strong>
        </div>
        <div className="confirm__row confirm__row--total">
          <span>{t('confirmTotal')}</span>
          <strong>{formatPrice(state.total, lang)}</strong>
        </div>
      </div>

      {invoiceError && <p role="alert">{invoiceError}</p>}
      {invoiceUrl && <details className="confirm__card confirm__invoice-card">
        <summary>{t('confirmInvoiceToggle')}</summary>
        <p>
          <span className="confirm__important-note">{t('confirmInvoiceNote')}</span>: {t('confirmInvoiceIphone')}
        </p>
        <div className="confirm__invoice-links">
          <a href={invoiceUrl || invoicePreviewUrl} download={invoiceName || `invoice_${state.orderNo}.png`}>{t('confirmInvoiceDownload')}</a>
        </div>
        <img src={invoicePreviewUrl || invoiceUrl} alt={t('confirmInvoiceAlt')} style={{ width: '100%', height: 'auto', marginTop: 12 }} />
      </details>}
      <p className="confirm__note">{t('confirmKeepInvoice')}</p>
      <div className="confirm__note">
        <Truck />
        <span>{state.payment === 'card' ? 'سيتم التواصل معك هاتفياً لتأكيد شحن طلبك.' : 'الدفع عند الاستلام. سيتم التواصل معك هاتفياً لتأكيد موعد التوصيل.'}</span>
      </div>

      <div className="confirm__actions" style={{ flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <Link to="/" className="btn btn--ghost" style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          {t('confirmKeepShopping')} 🛍️
        </Link>
      </div>
    </section>
  );
}
