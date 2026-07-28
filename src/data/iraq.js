

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
 * Iraqi mobile numbers: 11 digits starting 07 (e.g. 0770/0771/0780/0790…).
 */
export function isValidIraqiPhone(raw) {
  const digits = String(raw).replace(/[\s-]/g, '');
  return /^07\d{9}$/.test(digits);
}
