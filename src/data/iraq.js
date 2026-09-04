

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
    const fee = Number(fees[governorate]);
    if (Number.isInteger(fee) && fee >= 0 && fee <= 100000) return fee;
  }
  return governorate === 'بغداد' ? 3000 : 5000;
}

/**
 * Iraqi mobile validation and Arabic digit normalization.
 * Automatically normalizes Arabic-Indic digits (٠١٢٣...) and removes spaces/dashes.
 */
export function normalizeIraqiPhone(raw) {
  const normalized = String(raw || '').trim()
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  if (!/^[+\d\s()-]+$/.test(normalized)) return null;
  const digits = normalized.replace(/\D/g, '');
  if (/^07\d{9}$/.test(digits)) return `964${digits.slice(1)}`;
  if (/^7\d{9}$/.test(digits)) return `964${digits}`;
  if (/^009647\d{9}$/.test(digits)) return digits.slice(2);
  if (/^9647\d{9}$/.test(digits)) return digits;
  return null;
}

export function isValidIraqiPhone(raw) { return Boolean(normalizeIraqiPhone(raw)); }
