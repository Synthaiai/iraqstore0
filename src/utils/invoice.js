import { img } from '../data/images';
import { STORE_CONTACT } from '../data/contact';

function loadImage(source) {
  return new Promise((resolve) => {
    const picture = new Image();
    const timer = setTimeout(() => resolve(null), 8000);
    picture.crossOrigin = 'anonymous';
    picture.onload = () => { clearTimeout(timer); resolve(picture); };
    picture.onerror = () => { clearTimeout(timer); resolve(null); };
    picture.src = img(source);
  });
}

// One product photograph per ordered variant, with the exact recorded options.
export async function generateInvoiceImage(order) {
  const lines = order.cart || [];
  const pictures = await Promise.all(lines.map((line) => loadImage(line.product?.images?.[0] || line.product?.image || line.image)));
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  const ctx = canvas.getContext('2d');
  const font = 'Segoe UI, Tahoma, sans-serif';
  const wrap = (value, width, size = 21) => {
    ctx.font = `${size}px ${font}`;
    const rows = [];
    let row = '';
    for (const word of String(value || '—').split(/\s+/)) {
      const candidate = row ? `${row} ${word}` : word;
      if (ctx.measureText(candidate).width > width && row) { rows.push(row); row = word; }
      else row = candidate;
    }
    rows.push(row);
    return rows;
  };
  const customer = [
    ['اسم الزبون', order.name], ['الهاتف', order.phone],
    ['المحافظة / المدينة', `${order.governorate} — ${order.city}`],
    ['العنوان', order.address], ['طريقة الدفع', order.paymentLabel || 'الدفع عند الاستلام'],
    ...(order.notes ? [['ملاحظات', order.notes]] : []),
  ].map(([label, value]) => [label, wrap(value, 565)]);
  const products = lines.map((line) => ({ line, rows: wrap(line.product?.name || line.name, 550) }));
  canvas.height = 500 + customer.reduce((n, [, rows]) => n + rows.length * 29 + 14, 0)
    + products.reduce((n, p) => n + Math.max(150, p.rows.length * 30 + 95), 0);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const text = (value, x, y, size = 21, color = '#252525') => {
    ctx.font = `${size}px ${font}`; ctx.fillStyle = color; ctx.direction = 'rtl'; ctx.textAlign = 'right';
    ctx.fillText(String(value), x, y, 800);
  };
  const separator = (y) => { ctx.fillStyle = '#eadcdf'; ctx.fillRect(40, y, 820, 2); };
  const money = (n) => `${Number(n || 0).toLocaleString('ar-IQ')} د.ع`;
  ctx.fillStyle = '#6b0f1a'; ctx.fillRect(0, 0, 900, 10);
  text('IRAQI STORE | عراقي ستور', 850, 65, 32, '#6b0f1a');
  text(`فاتورة الطلب #${order.orderNo}`, 850, 112, 25);
  separator(135);
  let y = 175;
  for (const [label, rows] of customer) {
    text(`${label}:`, 850, y, 21, '#777');
    for (const row of rows) { text(row, 610, y); y += 29; }
    y += 14;
  }
  separator(y); y += 40;
  text('المنتجات المطلوبة', 850, y, 25, '#6b0f1a'); y += 35;
  products.forEach(({ line, rows }, i) => {
    const photo = pictures[i];
    if (photo) {
      const scale = Math.min(120 / photo.width, 120 / photo.height);
      ctx.drawImage(photo, 720 + (120 - photo.width * scale) / 2, y, photo.width * scale, photo.height * scale);
    } else {
      ctx.fillStyle = '#f5f0f1'; ctx.fillRect(720, y, 120, 120);
      text('الصورة غير متاحة', 835, y + 65, 15, '#777');
    }
    let rowY = y + 24;
    rows.forEach((row) => { text(row, 690, rowY); rowY += 30; });
    text(`اللون: ${line.color || '—'}   •   القياس: ${line.size || '—'}`, 690, rowY, 20); rowY += 30;
    text(`الكمية: ${line.qty}   •   السعر: ${money((line.product?.price ?? line.price) * line.qty)}`, 690, rowY, 20);
    y += Math.max(150, rows.length * 30 + 95);
  });
  separator(y); y += 40;
  text(`مجموع المنتجات: ${money(order.subtotal)}`, 850, y); y += 36;
  text(`أجور التوصيل: ${money(order.fee)}`, 850, y); y += 42;
  text(`المبلغ الإجمالي: ${money(order.total)}`, 850, y, 28, '#6b0f1a'); y += 45;
  text('تم تسجيل طلبك. احتفظ بالفاتورة لمتابعة الطلب وتأكيده مع المتجر.', 850, y, 20); y += 32;
  text(`واتساب المتجر: ${STORE_CONTACT.phone}`, 850, y, 20);
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('INVOICE_FAILED')), 'image/png'));
}
