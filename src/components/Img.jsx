import { useState } from 'react';

/**
 * Progressive image for slow connections.
 *
 * - Serves a `srcSet` so a phone downloads a phone-sized file, not a desktop one.
 * - Holds a shimmering placeholder until the bytes arrive, so layout never jumps
 *   and the page reads as "loading" rather than "broken" on a weak link.
 * - Falls back to a flat tint if the request fails outright.
 *
 * `className` lands on the wrapper, not the `<img>` — callers style the box
 * (size, position, hover transform) and the inner image just fills it.
 */
export default function Img({
  src,
  srcSet,
  sizes,
  alt = '',
  className = '',
  eager = false,
  ...rest
}) {
  const [state, setState] = useState('loading');

  return (
    <span
      className={`imgw ${className} ${state === 'loading' ? 'is-loading' : ''} ${
        state === 'error' ? 'is-error' : ''
      }`.trim()}
      {...rest}
    >
      <img
        src={src}
        srcSet={srcSet}
        sizes={sizes}
        alt={alt}
        className="imgw__img"
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        {...(eager ? { fetchpriority: 'high' } : {})}
        onLoad={() => setState('done')}
        onError={() => setState('error')}
      />
    </span>
  );
}
