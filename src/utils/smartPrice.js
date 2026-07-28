/**
 * Smart Price Parser for Iraqi Dinar Pricing
 * Converts short numbers entered by admin (e.g. 19, 25, 19.5, 19k) into full thousand dinar amounts (19000, 25000, 19500).
 */
export function parseSmartPrice(val) {
  if (val === null || val === undefined || val === '') return 0;
  let str = String(val).trim().replace(/,/g, '').replace(/\s+/g, '');
  if (!str) return 0;

  if (/k$/i.test(str)) {
    const num = parseFloat(str.replace(/k$/i, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }
  if (/ألف$|الف$/i.test(str)) {
    const num = parseFloat(str.replace(/ألف$|الف$/i, ''));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }

  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return 0;

  // If typed number is under 1000, interpret as thousands (e.g., 19 -> 19000, 19.5 -> 19500)
  if (num < 1000) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

export function formatSmartPriceDisplay(val) {
  if (!val && val !== 0) return '';
  const parsed = parseSmartPrice(val);
  if (!parsed) return '';
  return `${new Intl.NumberFormat('ar-IQ').format(parsed)} د.ع`;
}
