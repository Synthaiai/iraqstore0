import { Link } from 'react-router-dom';
import { img, srcSet } from '../data/images';
import Img from './Img';
import { ChevronLeft } from './Icons';

const TILE_SIZES = '(max-width: 560px) 92vw, (max-width: 900px) 46vw, 31vw';

/** The category / subcategory card used across the browse pages. */
export default function Tile({ to, title, latin, meta, cover, feature = false }) {
  return (
    <Link to={to} className={`tile ${feature ? 'tile--feature' : ''}`}>
      <Img
        className="tile__img"
        src={img(cover, 480, 640)}
        srcSet={srcSet(cover, [320, 480, 640, 860], 4 / 3)}
        sizes={TILE_SIZES}
        alt=""
      />
      <span className="tile__scrim" />

      <span className="tile__arrow" aria-hidden>
        <ChevronLeft />
      </span>

      <span className="tile__body">
        {latin && <span className="portal__label">{latin}</span>}
        <span className="tile__title">{title}</span>
        {meta && <span className="tile__count">{meta}</span>}
      </span>
    </Link>
  );
}
