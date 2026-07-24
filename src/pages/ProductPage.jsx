import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { getCategory, getGender, getSubcategory } from '../data/catalog';
import { BADGE_LABELS, formatPrice, getProduct, relatedProducts } from '../data/products';
import { useStore } from '../store/StoreContext';
import Breadcrumbs from '../components/Breadcrumbs';
import Img from '../components/Img';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import SectionNav from '../components/SectionNav';
import Stars from '../components/Stars';
import { Bag, Heart, Minus, Plus } from '../components/Icons';

export default function ProductPage() {
  const { id } = useParams();
  const product = getProduct(id);

  const { addToCart, openCart, toast, isFavorite, toggleFavorite } = useStore();
  const [frame, setFrame] = useState(0);
  const [size, setSize] = useState(null);
  const [color, setColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);

  // A one-size item ("مقاس واحد") has nothing to choose, so pre-select it.
  // Everything else forces a deliberate size pick before adding to the cart.
  const singleSize = product?.sizes.length === 1;

  // Reset every selection when navigating between products.
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

  const handleAdd = () => {
    if (!size) {
      setSizeError(true);
      toast('اختر المقاس أولًا');
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
          { label: g.title, to: `/g/${product.gender}` },
          { label: c.title, to: `/g/${product.gender}/${product.category}` },
          { label: s?.title ?? c.title, to: `/g/${product.gender}/${product.category}/${product.sub}` },
          { label: product.name },
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
                alt={product.name}
                eager
              />
            </div>
            <div className="pdp__thumbs">
              {product.thumbs.map((t, i) => (
                <button
                  key={t}
                  type="button"
                  className={`pdp__thumb ${i === frame ? 'is-active' : ''}`}
                  onClick={() => setFrame(i)}
                  aria-label={`عرض الصورة ${i + 1}`}
                  aria-pressed={i === frame}
                >
                  <img src={t} alt="" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          </div>

          {/* ---------- Info ---------- */}
          <div className="pdp__info">
            <div>
              {product.badge && (
                <span className={`badge badge--${product.badge}`} style={{ marginBottom: '0.75rem' }}>
                  {BADGE_LABELS[product.badge]}
                </span>
              )}
              <h1 className="pdp__title">{product.name}</h1>
              <div style={{ marginTop: '0.6rem' }}>
                <Stars rating={product.rating} reviews={product.reviews} />
              </div>
            </div>

            <p className="pdp__desc">{product.blurb}</p>

            <div className="pdp__priceline">
              <span className="price price--lg">{formatPrice(product.price)}</span>
              {product.oldPrice && (
                <>
                  <span className="price price--old">{formatPrice(product.oldPrice)}</span>
                  <span className="badge badge--sale">وفّر {discount}٪</span>
                </>
              )}
            </div>

            <div className="pdp__divider" />

            {/* Colour */}
            <div className="opt-group">
              <div className="opt-group__label">
                <span>اللون</span>
                <span className="opt-group__hint">{color}</span>
              </div>
              <div className="opt-row">
                {product.colors.map((cl) => (
                  <button
                    key={cl.name}
                    type="button"
                    className={`opt opt-color ${cl.name === color ? 'is-active' : ''}`}
                    style={{ background: cl.hex }}
                    onClick={() => setColor(cl.name)}
                    aria-label={cl.name}
                    aria-pressed={cl.name === color}
                    title={cl.name}
                  />
                ))}
              </div>
            </div>

            {/* Size */}
            {!singleSize && (
              <div className="opt-group" id="pdp-sizes">
                <div className="opt-group__label">
                  <span>
                    المقاس
                    {sizeError && <span className="opt-group__req"> — الرجاء اختيار المقاس</span>}
                  </span>
                  <span className="opt-group__hint">دليل المقاسات</span>
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
                <span>الكمية</span>
              </div>
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="تقليل">
                  <Minus />
                </button>
                <span className="qty__val">{qty}</span>
                <button type="button" onClick={() => setQty((q) => Math.min(99, q + 1))} aria-label="زيادة">
                  <Plus />
                </button>
              </div>
            </div>

            <div className="pdp__actions">
              <button type="button" className="btn btn--burgundy" onClick={handleAdd}>
                <Bag />
                إضافة إلى السلة — {formatPrice(product.price * qty)}
              </button>
              <button
                type="button"
                className={`fav-btn-lg ${fav ? 'is-on' : ''}`}
                onClick={() => toggleFavorite(product)}
                aria-pressed={fav}
                aria-label={fav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
              >
                <Heart filled={fav} />
              </button>
            </div>

            <div className="pdp__divider" />

            <dl className="specs">
              <div className="spec">
                <dt>الخامة</dt>
                <dd>{product.material}</dd>
              </div>
              <div className="spec">
                <dt>الألوان المتاحة</dt>
                <dd>{product.colors.map((cl) => cl.name).join(' · ')}</dd>
              </div>
              <div className="spec">
                <dt>القسم</dt>
                <dd>
                  {g.title} · {c.title}
                </dd>
              </div>
              <div className="spec">
                <dt>رمز المنتج</dt>
                <dd style={{ fontFamily: 'var(--font-latin)', letterSpacing: '0.08em' }}>
                  {product.id.toUpperCase()}
                </dd>
              </div>
              <div className="spec">
                <dt>المقاسات المتاحة</dt>
                <dd>{product.sizes.join(' · ')}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section shell" style={{ borderTop: '1px solid var(--line)' }}>
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">You may also like</span>
              <h2 className="section-head__title">قطع تكمّل الإطلالة</h2>
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
