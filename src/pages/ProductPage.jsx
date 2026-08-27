import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategory } from '../data/catalog';
import { formatPrice, getProduct, relatedProducts } from '../data/products';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { useLiveData } from '../store/LiveDataContext';
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
  useLiveData(); // re-render when the live catalogue changes
  const product = getProduct(id);

  const { addToCart, openCart, toast, isFavorite, toggleFavorite } = useStore();
  const { t, tf, lang } = usePrefs();
  const [frame, setFrame] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [zoom, setZoom] = useState(false);

  // Escape closes the zoom lightbox.
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e) => e.key === 'Escape' && setZoom(false);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom]);

  useEffect(() => {
    setFrame(0);
    setQty(1);
    setSize(product && (product.sizes?.length ?? 0) === 1 ? product.sizes[0] : null);
    setColor(product?.colors?.[0]?.name ?? null);
    setSizeError(false);
  }, [product]);

  if (!product) return <Navigate to="/" replace />;

  // Defensive: a malformed / partially-saved product must never crash the page.
  const colors = Array.isArray(product.colors) ? product.colors : [];
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const sizesEn = Array.isArray(product.sizesEn) ? product.sizesEn : sizes;
  const rawImgs = (Array.isArray(product.images) && product.images.length)
    ? product.images
    : (Array.isArray(product.gallery) && product.gallery.length)
      ? product.gallery
      : (Array.isArray(product.large) && product.large.length)
        ? product.large
        : [product.image].filter(Boolean);
  const large = rawImgs.length ? rawImgs : ['/logo.png'];
  const largeSet = Array.isArray(product.largeSet) ? product.largeSet : [];
  const thumbs = (Array.isArray(product.thumbs) && product.thumbs.length === large.length) ? product.thumbs : large;

  const g = getGender(product.gender);
  const c = getCategory(product.gender, product.category);
  const s = getSubcategory(product.gender, product.category, product.sub);
  const fav = isFavorite(product.id);
  const related = relatedProducts(product, 4);
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
  const pct = lang === 'en' ? '%' : '٪';
  const name = tf(product, 'name');
  const colorObj = colors.find((cl) => cl.name === color);
  const singleSize = sizes.length <= 1;
  const localSize = (sz) => {
    const i = sizes.indexOf(sz);
    return lang === 'en' && i >= 0 ? sizesEn[i] : sz;
  };

  const stock = product.stockQuantity !== undefined ? Number(product.stockQuantity) : 15;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 3;

  const handleAdd = () => {
    if (isOutOfStock) {
      toast(lang === 'en' ? 'Sorry, this product is out of stock.' : 'عذراً، هذا المنتج نفد من المخزون حالياً ❌');
      return;
    }
    if (!size) {
      setSizeError(true);
      toast(t('pickSizeFirst'));
      document.getElementById('pdp-sizes')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const added = addToCart(product, { size, color, qty, silent: true });
    if (added !== false) {
      openCart();
    }
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
            <button
              type="button"
              className="pdp__main"
              onClick={() => setZoom(true)}
              aria-label={lang === 'en' ? 'Zoom image' : 'تكبير الصورة'}
            >
              <Img
                key={frame}
                src={large[frame]}
                srcSet={largeSet[frame]}
                sizes="(max-width: 900px) 92vw, 48vw"
                alt={name}
                eager
              />
              <span className="pdp__zoom-hint" aria-hidden>⤢</span>
            </button>
            <div className="pdp__thumbs">
              {thumbs.map((thumb, i) => (
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
              <h1 className="pdp__title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>{name}</span>
                {sizes.length === 1 && (
                  <span
                    className="badge badge--stock-ok"
                    style={{
                      fontSize: '0.85rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      background: 'var(--paper-tint, #f0f0f4)',
                      border: '1px solid var(--line-strong, #d0d0d8)',
                      color: 'var(--burgundy-700, #6b0f1a)',
                      fontWeight: '700',
                      letterSpacing: '0.02em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    📏 {lang === 'en' ? `Size: ${localSize(sizes[0])}` : `القياس: ${localSize(sizes[0])}`}
                  </span>
                )}
              </h1>
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
            {colors.length > 0 && (
              <div className="opt-group">
                <div className="opt-group__label">
                  <span>{t('color')}</span>
                  <span className="opt-group__hint">{tf(colorObj, 'name')}</span>
                </div>
                <div className="opt-row">
                  {colors.map((cl) => (
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
            )}

            {/* Size (always visible so customer can see and interact with available size) */}
            <div className="opt-group" id="pdp-sizes">
              <div className="opt-group__label">
                <span>
                  {t('size')}
                  {sizeError && <span className="opt-group__req"> — {t('pleasePickSize')}</span>}
                </span>
                {sizes.length === 1 ? (
                  <span className="opt-group__hint" style={{ color: 'var(--burgundy-700, #6b0f1a)', fontWeight: '700' }}>
                    {lang === 'en' ? 'Single Size Available' : 'القياس المتوفر فقط'}
                  </span>
                ) : (
                  <span className="opt-group__hint">{t('sizeGuide')}</span>
                )}
              </div>
              <div className={`opt-row ${sizeError ? 'opt-row--error' : ''}`}>
                {(sizes.length > 0 ? sizes : ['مقاس واحد']).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    className={`opt ${(size === sz || (sizes.length === 1 && (!size || size === sz))) ? 'is-active' : ''}`}
                    onClick={() => pickSize(sz)}
                    aria-pressed={size === sz || (sizes.length === 1 && (!size || size === sz))}
                  >
                    {localSize(sz)}
                  </button>
                ))}
              </div>
            </div>

            {/* Stock status indicator */}
            <div className="pdp-stock-banner">
              {isOutOfStock ? (
                <div className="pdp-stock-pill pdp-stock-pill--out">
                  <span>🔴</span>
                  <strong>{lang === 'en' ? 'Out of Stock' : 'نفد من المخزون'}</strong>
                  <span className="pdp-stock-hint">{lang === 'en' ? 'Currently unavailable' : 'غير متوفر حالياً'}</span>
                </div>
              ) : isLowStock ? (
                <div className="pdp-stock-pill pdp-stock-pill--low">
                  <span>⚠️</span>
                  <strong>{lang === 'en' ? `Only ${stock} left in stock!` : `متبقي ${stock} قطع فقط في المخزن!`}</strong>
                  <span className="pdp-stock-hint">{lang === 'en' ? 'Order soon' : 'سارع بالطلب'}</span>
                </div>
              ) : (
                <div className="pdp-stock-pill pdp-stock-pill--ok">
                  <span>🟢</span>
                  <strong>{lang === 'en' ? `In Stock (${stock} available)` : `متوفر في المخزن (${stock} قطعة)`}</strong>
                </div>
              )}
            </div>

            {/* Quantity + actions */}
            {!isOutOfStock && (
              <div className="opt-group">
                <div className="opt-group__label">
                  <span>{t('quantity')}</span>
                  {stock < 99 && (
                    <span className="opt-group__hint">
                      {lang === 'en' ? `Max ${stock}` : `الحد الأقصى ${stock}`}
                    </span>
                  )}
                </div>
                <div className="qty">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label={t('decrease')}
                    disabled={qty <= 1}
                  >
                    <Minus />
                  </button>
                  <span className="qty__val">{qty}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (qty >= stock) {
                        toast(lang === 'en' ? `Maximum available is ${stock}` : `الحد الأقصى المتوفر هو ${stock} فقط`);
                        return;
                      }
                      setQty((q) => Math.min(stock, q + 1));
                    }}
                    aria-label={t('increase')}
                    disabled={qty >= stock}
                  >
                    <Plus />
                  </button>
                </div>
              </div>
            )}

            <div className="pdp__actions">
              <button
                type="button"
                className={`btn ${isOutOfStock ? 'btn--disabled' : 'btn--burgundy'}`}
                onClick={handleAdd}
                disabled={isOutOfStock}
              >
                <Bag />
                {isOutOfStock
                  ? (lang === 'en' ? 'Out of Stock ❌' : 'نفد من المخزون ❌')
                  : `${t('addToCart')} — ${formatPrice(product.price * qty, lang)}`}
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
              {product.material && (
                <div className="spec">
                  <dt>{t('material')}</dt>
                  <dd>{tf(product, 'material')}</dd>
                </div>
              )}
              {product.heelType && (
                <div className="spec">
                  <dt>نوع الكعب / النعل</dt>
                  <dd>{product.heelType}</dd>
                </div>
              )}
              {product.soleMaterial && (
                <div className="spec">
                  <dt>خامة النعل</dt>
                  <dd>{product.soleMaterial}</dd>
                </div>
              )}
              {product.fitType && (
                <div className="spec">
                  <dt>نوع القَصّة</dt>
                  <dd>{product.fitType}</dd>
                </div>
              )}
              {product.clothingStyle && (
                <div className="spec">
                  <dt>النمط والتصميم</dt>
                  <dd>{product.clothingStyle}</dd>
                </div>
              )}
              {product.perfumeVolume && (
                <div className="spec">
                  <dt>الحجم / السعة</dt>
                  <dd>{product.perfumeVolume}</dd>
                </div>
              )}
              {product.perfumeConcentration && (
                <div className="spec">
                  <dt>درجة التركيز</dt>
                  <dd>{product.perfumeConcentration}</dd>
                </div>
              )}
              {product.perfumeNotes && (
                <div className="spec">
                  <dt>النوتات العطرية</dt>
                  <dd>{product.perfumeNotes}</dd>
                </div>
              )}
              {product.bagClosure && (
                <div className="spec">
                  <dt>نوع الإغلاق</dt>
                  <dd>{product.bagClosure}</dd>
                </div>
              )}
              {product.bagDimensions && (
                <div className="spec">
                  <dt>الأبعاد والمقاس</dt>
                  <dd>{product.bagDimensions}</dd>
                </div>
              )}
              {product.watchMovement && (
                <div className="spec">
                  <dt>نوع الماكينة</dt>
                  <dd>{product.watchMovement}</dd>
                </div>
              )}
              {product.watchWaterResistance && (
                <div className="spec">
                  <dt>مقاومة الماء</dt>
                  <dd>{product.watchWaterResistance}</dd>
                </div>
              )}
              {(product.customSpecs || []).map((cs, idx) => cs.key && cs.value && (
                <div className="spec" key={idx}>
                  <dt>{cs.key}</dt>
                  <dd>{cs.value}</dd>
                </div>
              ))}
              <div className="spec">
                <dt>{t('availableColors')}</dt>
                <dd>{colors.map((cl) => tf(cl, 'name')).join(' · ')}</dd>
              </div>
              <div className="spec">
                <dt>{t('section')}</dt>
                <dd>
                  {lang === 'en' ? g?.latin : g?.title} · {lang === 'en' ? c?.latin : c?.title}
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
                <dd>{(lang === 'en' ? sizesEn : sizes).join(' · ')}</dd>
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

      {/* ---------- Zoom lightbox ---------- */}
      {zoom && (
        <div className="lightbox" onClick={() => setZoom(false)} role="dialog" aria-modal="true">
          <button type="button" className="lightbox__close" onClick={() => setZoom(false)} aria-label={t('close')}>
            ✕
          </button>
          <img
            className="lightbox__img"
            src={large[frame]}
            alt={name}
            onClick={(e) => e.stopPropagation()}
          />
          {large.length > 1 && (
            <div className="lightbox__thumbs" onClick={(e) => e.stopPropagation()}>
              {large.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  className={`lightbox__thumb ${i === frame ? 'is-active' : ''}`}
                  onClick={() => setFrame(i)}
                  aria-label={`${i + 1}`}
                >
                  <img src={thumbs[i] || u} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
