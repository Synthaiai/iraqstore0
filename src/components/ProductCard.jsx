import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice } from '../data/products';
import Img from './Img';
import QuickAdd from './QuickAdd';
import { Bag, Heart } from './Icons';
import Stars from './Stars';
import { CARD_SIZES } from '../data/assetLoader';

const BADGE_KEY = { new: 'badgeNew', sale: 'badgeSale', best: 'badgeBest' };

export default function ProductCard({ product, index = 0 }) {
  const { addToCart, openCart, isFavorite, toggleFavorite } = useStore();
  const { t, tf, lang } = usePrefs();
  // The second photo is a hover flourish — never spend a request on it until
  // the pointer actually arrives. On a weak connection this halves the grid.
  const [wantAlt, setWantAlt] = useState(false);
  const [picking, setPicking] = useState(false);
  const fav = isFavorite(product.id);

  const stock = product.stockQuantity !== undefined ? Number(product.stockQuantity) : 15;
  const isOutOfStock = stock <= 0;
  const isLowStock = stock > 0 && stock <= 3;

  // A choice of size or colour → open the quick picker so the order carries the
  // customer's selection. A truly single-variant item adds straight away.
  const onAdd = () => {
    if (isOutOfStock) return;
    const sizes = product.sizes || [];
    const colors = product.colors || [];
    const needsChoice = sizes.length > 1 || colors.length > 1;
    if (needsChoice) {
      setPicking(true);
    } else {
      addToCart(product, { size: sizes[0], color: colors[0]?.name, silent: true });
      openCart();
    }
  };
  const name = tf(product, 'name');
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;
  const pct = lang === 'en' ? '%' : '٪';

  return (
    <article
      className={`pcard ${isOutOfStock ? 'pcard--out' : ''}`}
      /* Staggered entrance, capped so a long grid never feels slow */
      style={{ '--i': Math.min(index % 24, 5) }}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setWantAlt(true); }}
      onFocusCapture={() => setWantAlt(true)}
    >
      <div className="pcard__media">
        <Link to={`/product/${product.id}`} aria-label={name}>
          <Img
            className="pcard__img"
            src={(product.images && product.images[0]) || product.image || '/logo.jpg'}
            srcSet={product.imageSet}
            sizes={CARD_SIZES}
            alt={name}
            eager={index < 2}
          />
          {wantAlt && (
            <Img
              className="pcard__img pcard__img--alt"
              src={(product.images && (product.images[1] || product.images[0])) || product.imageAlt || product.image || '/logo.jpg'}
              srcSet={product.imageAltSet}
              sizes={CARD_SIZES}
              alt=""
              aria-hidden
            />
          )}
        </Link>

        <div className="pcard__badges">
          {isOutOfStock && (
            <span className="badge badge--stock-out">
              {lang === 'en' ? 'Sold Out' : 'نفد'}
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="badge badge--stock-low">
              {lang === 'en' ? `Only ${stock} left` : `تبقى ${stock} فقط`}
            </span>
          )}
          {product.badge && !isOutOfStock && <span className={`badge badge--${product.badge}`}>{t(BADGE_KEY[product.badge])}</span>}
          {discount > 0 && !isOutOfStock && (
            <span className="badge badge--sale">
              −{discount}
              {pct}
            </span>
          )}
        </div>

        <button
          type="button"
          className={`pcard__fav ${fav ? 'is-on' : ''}`}
          onClick={() => toggleFavorite(product)}
          aria-pressed={fav}
          aria-label={fav ? t('removeFromFav') : t('addToFav')}
        >
          <Heart filled={fav} />
        </button>

        <button
          type="button"
          className={`pcard__add ${isOutOfStock ? 'pcard__add--disabled' : ''}`}
          onClick={onAdd}
          disabled={isOutOfStock}
          aria-label={`${t('addToCart')} — ${name}`}
        >
          {isOutOfStock ? (
            <span>{lang === 'en' ? 'Sold Out' : 'نفد من المخزون'}</span>
          ) : (
            <>
              <Bag />
              {t('addToCart')}
            </>
          )}
        </button>
      </div>

      <div className="pcard__body">
        <div className="pcard__brandline">
          <Stars rating={product.rating} reviews={product.reviews} />
        </div>

        <h3 className="pcard__name">
          <Link to={`/product/${product.id}`}>{name}</Link>
        </h3>

        <p className="pcard__desc">{tf(product, 'blurb')}</p>

        <div className="pcard__foot">
          <span className="price">{formatPrice(product.price, lang)}</span>
          {product.oldPrice && <span className="price price--old">{formatPrice(product.oldPrice, lang)}</span>}
          <span className="swatches" style={{ marginInlineStart: 'auto' }}>
            {(product.colors || []).slice(0, 4).map((c) => (
              <span key={c.name} className="swatch" style={{ background: c.hex }} title={tf(c, 'name')} />
            ))}
          </span>
        </div>
      </div>

      {picking && <QuickAdd product={product} onClose={() => setPicking(false)} />}
    </article>
  );
}
