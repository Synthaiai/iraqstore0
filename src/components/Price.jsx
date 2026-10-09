import { formatPrice } from '../data/products';
import { formatDollars } from '../data/currency';

/**
 * A product's price, in the currency it was priced in.
 *
 * The shop buys in dollars and sells in dinars, and which one a product is
 * quoted in is a real difference the customer should see: a dollar-priced item
 * moves with the rate and a dinar-priced one does not. So a product priced in
 * dollars leads with dollars, and a product priced in dinars is untouched.
 *
 * The dinar figure is always shown alongside, because that is the amount the
 * customer is actually charged — the cart, the delivery fee and the receipt
 * are all in dinars. Leading with a dollar price the shopper cannot pay in
 * would be worse than not showing it at all.
 */
export default function Price({ product, lang = 'ar', size = '' }) {
  const pegged = Number(product?.priceUsd) > 0;
  const cls = `price ${size === 'lg' ? 'price--lg' : ''}`.trim();

  if (!pegged) {
    return (
      <>
        <span className={cls}>{formatPrice(product.price, lang)}</span>
        {product.oldPrice ? (
          <span className="price price--old">{formatPrice(product.oldPrice, lang)}</span>
        ) : null}
      </>
    );
  }

  return (
    <>
      <span className={`${cls} price--usd`} dir="ltr">{formatDollars(product.priceUsd)}</span>
      {product.oldPriceUsd ? (
        <span className="price price--old" dir="ltr">{formatDollars(product.oldPriceUsd)}</span>
      ) : null}
      <span className="price__in-dinars">{formatPrice(product.price, lang)}</span>
    </>
  );
}

/**
 * The line that explains a dollar price: the rate it was converted at.
 *
 * Shown once, under the price on a product page, rather than on every card —
 * a grid of twenty products does not need the same sentence twenty times.
 */
export function PriceRateNote({ product, rate, lang = 'ar' }) {
  if (!(Number(product?.priceUsd) > 0)) return null;
  const formatted = Number(rate).toLocaleString('en-US');
  return (
    <p className="price__rate-note">
      {lang === 'en'
        ? `Priced in US dollars. Charged in dinars at ${formatted} IQD per dollar.`
        : `السعر بالدولار الأمريكي، ويُحتسب بالدينار على سعر صرف ${formatted} د.ع للدولار.`}
    </p>
  );
}
