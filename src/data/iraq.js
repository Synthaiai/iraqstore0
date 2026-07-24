/** The eighteen Iraqi governorates, for the checkout address form. */
export const GOVERNORATES = [
  'بغداد',
  'البصرة',
  'نينوى',
  'أربيل',
  'النجف',
  'كربلاء',
  'كركوك',
  'الأنبار',
  'ذي قار',
  'بابل',
  'ديالى',
  'واسط',
  'صلاح الدين',
  'المثنى',
  'القادسية',
  'ميسان',
  'دهوك',
  'السليمانية',
];

/** Flat delivery fee in IQD. Baghdad is cheaper to reach than the provinces. */
export function deliveryFee(governorate) {
  if (!governorate) return 5000;
  return governorate === 'بغداد' ? 3000 : 5000;
}

/**
 * Iraqi mobile numbers: 11 digits starting 07 (e.g. 0770/0771/0780/0790…).
 * Accepts spaces and dashes, then validates the stripped form.
 */
export function isValidIraqiPhone(raw) {
  const digits = String(raw).replace(/[\s-]/g, '');
  return /^07\d{9}$/.test(digits);
}
