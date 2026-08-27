import { useState, useCallback } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { Check, Truck, Whatsapp } from '../components/Icons';
import { STORE_CONTACT, openWhatsAppInvoice } from '../data/contact';

/* ─── Canvas Invoice Generator ─── */
function generateInvoiceImage(order, lang) {
  const W = 800, PAD = 40;
  const lineH = 32, smallH = 24;
  const cart = order.cart || [];

  // Pre-calculate height
  let h = 0;
  h += 80;                          // header (logo area + store name)
  h += 50;                          // invoice title
  h += 6 * lineH;                   // customer info rows
  h += 30;                          // separator + products header
  h += cart.length * (lineH + 12);  // product lines
  h += 30;                          // separator
  h += 3 * lineH;                   // totals
  h += 30;                          // separator
  h += 60;                          // footer
  h += 80;                          // padding top+bottom
  const H = Math.max(600, h);

  const cvs = document.createElement('canvas');
  cvs.width = W;
  cvs.height = H;
  const ctx = cvs.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  // Decorative top bar
  const grd = ctx.createLinearGradient(0, 0, W, 0);
  grd.addColorStop(0, '#6b0f1a');
  grd.addColorStop(1, '#a41e35');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, 6);

  let y = 30;

  // ─── Helper: right-aligned Arabic text ───
  const rtl = (text, x, yy, font, color) => {
    ctx.font = font;
    ctx.fillStyle = color || '#1a1a1a';
    ctx.textAlign = 'right';
    ctx.direction = 'rtl';
    ctx.fillText(text, x, yy);
  };
  const ltr = (text, x, yy, font, color) => {
    ctx.font = font;
    ctx.fillStyle = color || '#1a1a1a';
    ctx.textAlign = 'left';
    ctx.direction = 'ltr';
    ctx.fillText(text, x, yy);
  };
  const drawRow = (label, value, yy) => {
    rtl(label, W - PAD, yy, '600 15px Segoe UI, Tahoma, sans-serif', '#555');
    ltr(value, PAD, yy, '600 15px Segoe UI, Tahoma, sans-serif', '#1a1a1a');
  };
  const drawSep = (yy) => {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(PAD, yy);
    ctx.lineTo(W - PAD, yy);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // ─── Store name ───
  y += 10;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = 'bold 28px Segoe UI, Tahoma, sans-serif';
  ctx.fillStyle = '#6b0f1a';
  ctx.fillText('IRAQI STORE | عراقي ستور', W / 2, y + 28);
  y += 38;

  ctx.font = '13px Segoe UI, Tahoma, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('متجر الرجال الأول في العراق', W / 2, y + 14);
  y += 28;

  // ─── Invoice Title ───
  drawSep(y);
  y += 20;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = 'bold 22px Segoe UI, Tahoma, sans-serif';
  ctx.fillStyle = '#6b0f1a';
  ctx.fillText('🧾 فاتورة الطلب', W / 2, y + 22);
  y += 44;
  drawSep(y);
  y += 24;

  // ─── Customer Info ───
  const payText = order.paymentLabel || (order.payment === 'card' ? 'الدفع عن طريق الماستر الرافدين' : 'الدفع عند الاستلام');
  const rows = [
    ['رقم الطلب:', '#' + order.orderNo],
    ['اسم الزبون:', order.name],
    ['رقم الهاتف:', order.phone],
    ['المحافظة / المدينة:', `${order.governorate} — ${order.city}`],
    ['العنوان:', order.address],
    ['طريقة الدفع:', payText],
  ];
  rows.forEach(([label, value]) => {
    drawRow(label, value || '', y);
    y += lineH;
  });

  // ─── Products ───
  y += 4;
  drawSep(y);
  y += 20;
  rtl(`📦 المنتجات المطلوبة (${cart.length}):`, W - PAD, y, 'bold 16px Segoe UI, Tahoma, sans-serif', '#6b0f1a');
  y += 28;

  const fmtPrice = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString('ar-IQ') + ' د.ع';
  };

  cart.forEach((line, idx) => {
    const pName = line.product?.name || line.name || 'منتج';
    const pPrice = line.product?.price || line.price || 0;
    const lineTotal = pPrice * (line.qty || 1);

    rtl(`${idx + 1}. ${pName}`, W - PAD, y, '600 14px Segoe UI, Tahoma, sans-serif', '#333');
    ltr(fmtPrice(lineTotal), PAD, y, 'bold 14px Segoe UI, Tahoma, sans-serif', '#1a1a1a');
    y += smallH;

    const meta = `   ${line.color || ''} · القياس: ${line.size || ''} × ${line.qty || 1}`;
    rtl(meta, W - PAD, y, '13px Segoe UI, Tahoma, sans-serif', '#777');
    y += 20;
  });

  // ─── Totals ───
  y += 6;
  drawSep(y);
  y += 24;

  drawRow('مجموع المنتجات:', fmtPrice(order.subtotal));
  y += lineH;
  drawRow('أجور التوصيل:', order.fee ? fmtPrice(order.fee) : 'مجاني 🎁');
  y += lineH;

  // Grand total with highlight
  ctx.fillStyle = '#fdf2f4';
  ctx.fillRect(PAD - 8, y - 18, W - 2 * PAD + 16, 36);
  ctx.fillStyle = '#6b0f1a';
  rtl('المبلغ الإجمالي:', W - PAD, y, 'bold 17px Segoe UI, Tahoma, sans-serif', '#6b0f1a');
  ltr(fmtPrice(order.total), PAD, y, 'bold 17px Segoe UI, Tahoma, sans-serif', '#6b0f1a');
  y += lineH + 8;

  // ─── Footer ───
  drawSep(y);
  y += 20;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = '13px Segoe UI, Tahoma, sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText('شكراً لتسوقكم من عراقي ستور ❤️', W / 2, y + 10);
  y += 24;
  ctx.font = '12px Segoe UI, Tahoma, sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`📞 ${STORE_CONTACT.phone}  |  📷 ${STORE_CONTACT.instagramHandle}`, W / 2, y + 10);

  // Bottom bar
  ctx.fillStyle = grd;
  ctx.fillRect(0, H - 4, W, 4);

  return cvs;
}

function downloadInvoice(order, lang) {
  const canvas = generateInvoiceImage(order, lang);
  const link = document.createElement('a');
  link.download = `فاتورة_${order.orderNo}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

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

  if (!state?.orderNo) return <Navigate to="/" replace />;

  const resendWhatsApp = () => {
    openWhatsAppInvoice(state);
  };

  const handleSaveInvoice = useCallback(() => {
    setSaving(true);
    try {
      downloadInvoice(state, lang);
    } catch (err) {
      console.error('Invoice generation error:', err);
    }
    setTimeout(() => setSaving(false), 1200);
  }, [state, lang]);

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
        {/* ── Save Invoice as Image ── */}
        <button
          type="button"
          className="btn btn--burgundy"
          onClick={handleSaveInvoice}
          disabled={saving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '360px', justifyContent: 'center' }}
        >
          <DownloadIcon />
          {saving ? 'جارٍ حفظ الفاتورة...' : 'حفظ الفاتورة كصورة 🧾'}
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
