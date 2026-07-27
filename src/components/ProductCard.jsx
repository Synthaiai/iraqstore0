import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice } from '../data/products';
import Img from './Img';
import { Bag, Heart } from './Icons';
import Stars from './Stars';

const CARD_SIZES = '(max-width: 380px) 92vw, (max-width: 760px) 46vw, (max-width: 1100px) 30vw, 22vw';
const BADGE_KEY = { new: 'badgeNew', sale: 'badgeSale', best: 'badgeBest' };

export default function ProductCard({ product, index = 0 }) {
  const { addToCart, isFavorite, toggleFavorite } = useStore();
  const { t, tf, lang } = usePrefs();
  // The second photo is a hover flourish — never spend a request on it until
  // the pointer actually arrives. On a weak connection this halves the grid.
  const [wantAlt, setWantAlt] = useState(false);
  const fav = isFavorite(product.id);
  const name = tf(product, 'name');
  const discount = product.oldPrice
    ? Math.round((1 - product.price / product.oldPrice) * 100)
    : 0;
  const pct = lang === 'en' ? '%' : '٪';

  return (
    <article
      className="pcard"
      /* Staggered entrance, capped so a long grid never feels slow */
      style={{ '--i': Math.min(index, 11) }}
      onPointerEnter={() => setWantAlt(true)}
      onFocusCapture={() => setWantAlt(true)}
    >
      <div className="pcard__media">
        <Link to={`/product/${product.id}`} aria-label={name}>
          <Img
            className="pcard__img"
            src={product.image}
            srcSet={product.imageSet}
            sizes={CARD_SIZES}
            alt={name}
            eager={index < 2}
          />
          {wantAlt && (
            <Img
              className="pcard__img pcard__img--alt"
              src={product.imageAlt}
              srcSet={product.imageAltSet}
              sizes={CARD_SIZES}
              alt=""
              aria-hidden
            />
          )}
        </Link>

        <div className="pcard__badges">
          {product.badge && <span className={`badge badge--${product.badge}`}>{t(BADGE_KEY[product.badge])}</span>}
          {discount > 0 && (
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
          className="pcard__add"
          onClick={() => addToCart(product)}
          aria-label={`${t('addToCart')} — ${name}`}
        >
          <Bag />
          {t('addToCart')}
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
            {product.colors.slice(0, 4).map((c) => (
              <span key={c.name} className="swatch" style={{ background: c.hex }} title={tf(c, 'name')} />
            ))}
          </span>
        </div>
      </div>
    </article>
  );
}
