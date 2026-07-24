import { Star } from './Icons';

/** Rounds to the nearest half-star visually, but always prints the exact number. */
export default function Stars({ rating, reviews, showCount = true }) {
  const rounded = Math.round(rating);

  return (
    <span className="stars" aria-label={`التقييم ${rating} من ٥`}>
      <span className="stars__row">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= rounded} className={n <= rounded ? 'stars__on' : 'stars__off'} />
        ))}
      </span>
      <span className="stars__num">
        {rating.toFixed(1)}
        {showCount && reviews != null ? ` (${reviews})` : ''}
      </span>
    </span>
  );
}
