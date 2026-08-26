import { Star } from './Icons';

/** Rounds to the nearest half-star visually, but always prints the exact number safely. */
export default function Stars({ rating, reviews, showCount = true }) {
  const numRating = typeof rating === 'number' && !isNaN(rating)
    ? Math.max(0, Math.min(5, rating))
    : (typeof rating === 'string' && !isNaN(parseFloat(rating)))
      ? Math.max(0, Math.min(5, parseFloat(rating)))
      : 5.0;
  const rounded = Math.round(numRating);

  return (
    <span className="stars" aria-label={`التقييم ${numRating.toFixed(1)} من ٥`}>
      <span className="stars__row">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star key={n} filled={n <= rounded} className={n <= rounded ? 'stars__on' : 'stars__off'} />
        ))}
      </span>
      <span className="stars__num">
        {numRating.toFixed(1)}
        {showCount && reviews != null && !isNaN(reviews) ? ` (${reviews})` : ''}
      </span>
    </span>
  );
}
