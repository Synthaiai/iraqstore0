/**
 * Centralized Store Contact Information
 */
export const STORE_CONTACT = {
  phone: '07866700010',
  whatsappNumber: '9647866700010',
  whatsappUrl: 'https://wa.me/9647866700010',
  instagram: 'https://instagram.com/iraqistore.iq',
  instagramHandle: '@iraqistore.iq',
  facebook: 'https://facebook.com/menstoreiq',
  facebookHandle: 'menstoreiq',
};

/**
 * Generate formatted WhatsApp order invoice text
 */
export function buildWhatsAppInvoiceText({ name, phone, governorate, city, address, notes, cart, subtotal, fee, total, orderNo }) {
  let text = `🛍️ *طلب جديد من الموقع - العراق ستور*\n`;
  if (orderNo) text += `📋 *رقم الطلب:* #${orderNo}\n`;
  text += `----------------------------------\n`;
  text += `👤 *معلومات الزبون:*\n`;
  text += `• *الاسم:* ${name}\n`;
  text += `• *الهاتف:* ${phone}\n`;
  text += `• *المحافظة:* ${governorate}\n`;
  text += `• *المدينة/المنطقة:* ${city}\n`;
  text += `• *العنوان التفصيلي:* ${address}\n`;
  if (notes) text += `• *ملاحظات:* ${notes}\n`;

  text += `\n📦 *تفاصيل المنتجات:*\n`;
  cart.forEach((line, index) => {
    const lineTotal = line.product.price * line.qty;
    text += `${index + 1}. *${line.product.name}*\n`;
    text += `   - القياس: ${line.size} | اللون: ${line.color}\n`;
    text += `   - الكمية: ${line.qty} × ${line.product.price.toLocaleString('ar-IQ')} د.ع = *${lineTotal.toLocaleString('ar-IQ')} د.ع*\n`;
  });

  text += `----------------------------------\n`;
  text += `💵 *الحساب الكلي:*\n`;
  text += `• مجموع المنتجات: ${subtotal.toLocaleString('ar-IQ')} د.ع\n`;
  text += `• أجور التوصيل: ${fee ? `${fee.toLocaleString('ar-IQ')} د.ع` : 'حسب المحافظة'}\n`;
  text += `• *المجموع النهائي:* *${total.toLocaleString('ar-IQ')} د.ع*\n`;
  text += `----------------------------------\n`;
  text += `شكرًا لتسوقكم من العراق ستور! ❤️`;

  return text;
}

export function openWhatsAppInvoice(orderData) {
  const message = buildWhatsAppInvoiceText(orderData);
  const encoded = encodeURIComponent(message);
  const waUrl = `https://wa.me/${STORE_CONTACT.whatsappNumber}?text=${encoded}`;
  window.open(waUrl, '_blank');
}
