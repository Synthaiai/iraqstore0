

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

export const STORAGE_KEY_DELIVERY_FEES = 'iraqstore_delivery_fees_v1';

export const DEFAULT_DELIVERY_FEES = GOVERNORATES.reduce((acc, gov) => {
  acc[gov] = gov === 'بغداد' ? 3000 : 5000;
  return acc;
}, {});

/** Get live delivery fees for all governorates */
export function getDeliveryFees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELIVERY_FEES);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DELIVERY_FEES, ...parsed };
    }
  } catch (e) {
    /* fallback to default */
  }
  return { ...DEFAULT_DELIVERY_FEES };
}

/** Save custom delivery fees set by Admin (localStorage only — Firebase sync done by caller) */
export function setDeliveryFees(feesMap) {
  try {
    localStorage.setItem(STORAGE_KEY_DELIVERY_FEES, JSON.stringify(feesMap));
  } catch (e) {}
  return feesMap;
}

/** Get delivery fee for a specific governorate */
export function deliveryFee(governorate, customFeesMap) {
  if (!governorate) return 5000;
  const fees = customFeesMap || getDeliveryFees();
  if (fees[governorate] !== undefined) {
    return Number(fees[governorate]);
  }
  return governorate === 'بغداد' ? 3000 : 5000;
}

/**
 * Iraqi mobile numbers: supports 07xxxxxxxxx, +9647xxxxxxxxx, 009647xxxxxxxxx, 7xxxxxxxxx,
 * and converts Arabic-Indic numerals automatically.
 */
export function isValidIraqiPhone(raw) {
  if (!raw) return false;
  let s = String(raw).trim();
  // Normalize Arabic-Indic digits to Latin
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  arabicDigits.forEach((d, i) => {
    s = s.replaceAll(d, String(i));
  });
  // Strip non-digits
  let digits = s.replace(/\D/g, '');
  // Normalize +964 or 00964 prefixes
  if (digits.startsWith('964')) {
    digits = '0' + digits.slice(3);
  }
  if (!digits.startsWith('0') && digits.startsWith('7') && digits.length === 10) {
    digits = '0' + digits;
  }
  return /^07\d{9}$/.test(digits);
}
