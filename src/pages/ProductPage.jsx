import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategory } from '../data/catalog';
import { formatPrice, getProduct, relatedProducts } from '../data/products';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import Breadcrumbs from '../components/Breadcrumbs';
import Img from '../components/Img';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SectionNav from '../components/SectionNav';
import Stars from '../components/Stars';
import { Bag, Heart, Minus, Plus } from '../components/Icons';

const BADGE_KEY = { new: 'badgeNew', sale: 'badgeSale', best: 'badgeBest' };

export default function ProductPage() {
  const { id } = useParams();
  const product = getProduct(id);

  const { addToCart, openCart, toast, isFavorite, toggleFavorite } = useStore();
  const { t, tf, lang } = usePrefs();
  const [frame, setFrame] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  const singleSize = product?.sizes.length === 1;

  useEffect(() => {
    setFrame(0);
    setQty(1);
    setSize(product && product.sizes.length === 1 ? product.sizes[0] : null);
    setColor(product?.colors[0]?.name ?? null);
    setSizeError(false);
  }, [product]);

  if (!product) return <Navigate to="/" replace />;

  const g = getGender(product.gender);
  const c = getCategory(product.gender, product.category);
  const s = getSubcategory(product.gender, product.category, product.sub);
  const fav = isFavorite(product.id);
  const related = relatedProducts(product, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const pct = lang === 'en' ? '%' : '٪';
  const name = tf(product, 'name');
  const colorObj = product.colors.find((cl) => cl.name === color);
  const localSize = (sz) => {
    const i = product.sizes.indexOf(sz);
    return lang === 'en' && i >= 0 ? product.sizesEn[i] : sz;
  };

  const handleAdd = () => {
    if (!size) {
      setSizeError(true);
      toast(t('pickSizeFirst'));
      document.getElementById('pdp-sizes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    addToCart(product, { size, color, qty, silent: true });
    openCart();
  };

  const pickSize = (sz) => {
    setSize(sz);
    setSizeError(false);
  };

  return (
    <>
      <SectionNav gender={product.gender} category={product.category} sub={product.sub} />

      <Breadcrumbs
        items={[
          { label: lang === 'en' ? g.latin : g.title, to: `/g/${product.gender}` },
          { label: lang === 'en' ? c.latin : c.title, to: `/g/${product.gender}/${product.category}` },
          {
            label: lang === 'en' ? s?.latin ?? c.latin : s?.title ?? c.title,
            to: `/g/${product.gender}/${product.category}/${product.sub}`,
          },
          { label: name },
        ]}
      />

      <section className="shell" style={{ paddingBlock: 'clamp(1.5rem, 3vw, 2.5rem) clamp(3rem, 6vw, 5rem)' }}>
        <div className="pdp">
          {/* ---------- Gallery ---------- */}
          <div className="pdp__gallery">
            <div className="pdp__main">
              <Img
                key={frame}
                src={product.large[frame]}
                srcSet={product.largeSet[frame]}
                sizes="(max-width: 900px) 92vw, 48vw"
                alt={name}
                eager
              />
            </div>
            <div className="pdp__thumbs">
              {product.thumbs.map((thumb, i) => (
                <button
                  key={thumb}
                  type="button"
                  className={`pdp__thumb ${i === frame ? 'is-active' : ''}`}
                  onClick={() => setFrame(i)}
                  aria-label={`${i + 1}`}
                  aria-pressed={i === frame}
                >
                  <img src={thumb} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>

          {/* ---------- Info ---------- */}
          <div className="pdp__info">
            <div>
              {product.badge && (
                <span className={`badge badge--${product.badge}`} style={{ marginBottom: '0.75rem' }}>
                  {t(BADGE_KEY[product.badge])}
                </span>
              )}
              <h1 className="pdp__title">{name}</h1>
              <div style={{ marginTop: '0.6rem' }}>
                <Stars rating={product.rating} reviews={product.reviews} />
              </div>
            </div>

            <p className="pdp__desc">{tf(product, 'blurb')}</p>

            <div className="pdp__priceline">
              <span className="price price--lg">{formatPrice(product.price, lang)}</span>
              {product.oldPrice && (
                <>
                  <span className="price price--old">{formatPrice(product.oldPrice, lang)}</span>
                  <span className="badge badge--sale">
                    {t('save')} {discount}
                    {pct}
                  </span>
                </>
              )}
            </div>

            <div className="pdp__divider" />

            {/* Colour */}
            <div className="opt-group">
              <div className="opt-group__label">
                <span>{t('color')}</span>
                <span className="opt-group__hint">{tf(colorObj, 'name')}</span>
              </div>
              <div className="opt-row">
                {product.colors.map((cl) => (
                  <button
                    key={cl.name}
                    type="button"
                    className={`opt opt-color ${cl.name === color ? 'is-active' : ''}`}
                    style={{ background: cl.hex }}
                    onClick={() => setColor(cl.name)}
                    aria-label={tf(cl, 'name')}
                    aria-pressed={cl.name === color}
                    title={tf(cl, 'name')}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            {!singleSize && (
              <div className="opt-group" id="pdp-sizes">
                <div className="opt-group__label">
                  <span>
                    {t('size')}
                    {sizeError && <span className="opt-group__req"> — {t('pleasePickSize')}</span>}
                  </span>
                  <span className="opt-group__hint">{t('sizeGuide')}</span>
                </div>
                <div className={`opt-row ${sizeError ? 'opt-row--error' : ''}`}>
                  {product.sizes.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      className={`opt ${sz === size ? 'is-active' : ''}`}
                      onClick={() => pickSize(sz)}
                      aria-pressed={sz === size}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + actions */}
            <div className="opt-group">
              <div className="opt-group__label">
                <span>{t('quantity')}</span>
              </div>
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t('decrease')}>
                  <Minus />
                </button>
                <span className="qty__val">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label={t('increase')}>
                  <Plus />
                </button>
              </div>
            </div>

            <div className="pdp__actions">
              <button type="button" className="btn btn--burgundy" onClick={handleAdd}>
                <Bag />
                {t('addToCart')} — {formatPrice(product.price * qty, lang)}
              </button>
              <button
                type="button"
                className={`fav-btn-lg ${fav ? 'is-on' : ''}`}
                onClick={() => toggleFavorite(product)}
                aria-pressed={fav}
                aria-label={fav ? t('removeFromFav') : t('addToFav')}
              >
                <Heart filled={fav} />
              </button>
            </div>

            <div className="pdp__divider" />

            <dl className="specs">
              <div className="spec">
                <dt>{t('material')}</dt>
                <dd>{tf(product, 'material')}</dd>
              </div>
              <div className="spec">
                <dt>{t('availableColors')}</dt>
                <dd>{product.colors.map((cl) => tf(cl, 'name')).join(' · ')}</dd>
              </div>
              <div className="spec">
                <dt>{t('section')}</dt>
                <dd>
                  {lang === 'en' ? g.latin : g.title} · {lang === 'en' ? c.latin : c.title}
                </dd>
              </div>
              <div className="spec">
                <dt>{t('sku')}</dt>
                <dd style={{ fontFamily: 'var(--font-latin)', letterSpacing: '0.08em' }}>
                  {product.id.toUpperCase()}
                </dd>
              </div>
              <div className="spec">
                <dt>{t('availableSizes')}</dt>
                <dd>{(lang === 'en' ? product.sizesEn : product.sizes).join(' · ')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section shell" style={{ borderTop: '1px solid var(--line)' }}>
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">{t('youMayLike')}</span>
              <h2 className="section-head__title">{t('completeLook')}</h2>
            </div>
          </Reveal>
          <div className="product-grid">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
