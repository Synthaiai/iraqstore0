import { parseSmartPrice } from '../utils/smartPrice';

/**
 * Entering prices in dollars.
 *
 * Wholesale here is quoted in dollars and the shop sells in dinars, so the
 * shopkeeper was converting every price by hand before typing it. The form can
 * take either, but only one number is ever stored: the dinar price. Everything
 * downstream — the storefront, the order totals, the receipts — stays in
 * dinars and does not need to know a dollar was involved.
 *
 * Conversion happens once, when the product is saved. A product priced at $85
 * keeps the dinars it was worth that day until somebody edits it, which is how
 * a shop actually works — the shelf price does not move because the market did.
 */

export const CURRENCIES = {
  IQD: { code: 'IQD', label: 'دينار عراقي', symbol: 'د.ع' },
  USD: { code: 'USD', label: 'دولار', symbol: '$' },
};

/**
 * Dinars per dollar when the shop has not set a rate.
 *
 * Deliberately a round, recognisable number rather than a precise one: it is a
 * starting point the shopkeeper is expected to replace with the rate they
 * actually buy at, not a market feed.
 */
export const DEFAULT_USD_RATE = 1320;

export function usdRate(settings) {
  const rate = Number(settings?.usdRate);
  return Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_USD_RATE;
}

/**
 * Read a typed price as dinars.
 *
 * In dinars the shorthand applies — "19" means 19,000, because nobody sells
 * anything for nineteen dinars. In dollars it must not: "85" is eighty-five
 * dollars, and expanding it to 85,000 would price the product at sixty
 * thousand dollars.
 */
export function toDinars(entered, currency, rate) {
  if (currency === 'USD') {
    const dollars = Number(String(entered ?? '').trim().replace(/[^\d.]/g, ''));
    if (!Number.isFinite(dollars) || dollars <= 0) return 0;
    return Math.round(dollars * usdRate({ usdRate: rate }));
  }
  return parseSmartPrice(entered);
}

/** The dollar figure a stored dinar price corresponds to, for display. */
export function toDollars(dinars, rate) {
  const value = Number(dinars);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round((value / usdRate({ usdRate: rate })) * 100) / 100;
}

export function formatDollars(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
