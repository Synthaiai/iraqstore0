import { useId } from 'react';

/**
 * The real marks of WhatsApp, Instagram and Facebook.
 *
 * The outline icons that used to sit here were drawn in the store's own line
 * style, which read as three anonymous grey shapes: nobody scanning a header
 * stops to work out which outline is which. A customer recognises these three
 * by colour long before shape — green, the gradient, the blue — so each is
 * drawn as the company actually draws it, disc and all, rather than as a
 * monochrome glyph tinted by whatever text colour it inherits.
 *
 * That is also why they are kept apart from Icons.jsx. Everything there is a
 * single `currentColor` stroke that bends to the theme; these must not bend to
 * anything, in light mode or dark, or they stop being the logos.
 */

const box = { viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true, focusable: 'false' };

export function WhatsappMark(props) {
  return (
    <svg {...box} {...props}>
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <g transform="translate(4.6 4.6) scale(.6167)" fill="#fff">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
      </g>
    </svg>
  );
}

export function InstagramMark(props) {
  // Two gradients stacked, the way Instagram's own mark is built: a warm
  // bottom-left burst over a cool top-left sweep. The ids must be unique or a
  // second copy on the page silently borrows the first one's paint.
  const id = useId();
  const warm = `ig-warm-${id}`;
  const cool = `ig-cool-${id}`;
  return (
    <svg {...box} {...props}>
      <defs>
        <radialGradient id={warm} cx=".3" cy="1.07" r="1.25">
          <stop offset=".1" stopColor="#FFDD55" />
          <stop offset=".5" stopColor="#FF543E" />
          <stop offset="1" stopColor="#C837AB" />
        </radialGradient>
        <radialGradient id={cool} cx=".11" cy="-.05" r=".85">
          <stop offset=".13" stopColor="#3771C8" />
          <stop offset="1" stopColor="#6600FF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6.4" fill={`url(#${warm})`} />
      <rect width="24" height="24" rx="6.4" fill={`url(#${cool})`} />
      <g fill="none" stroke="#fff" strokeWidth="1.75">
        <rect x="5.15" y="5.15" width="13.7" height="13.7" rx="4.3" />
        <circle cx="12" cy="12" r="3.35" />
      </g>
      <circle cx="16.75" cy="7.35" r="1.1" fill="#fff" />
    </svg>
  );
}

export function FacebookMark(props) {
  return (
    <svg {...box} {...props}>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        fill="#fff"
        d="M16.67 15.47 17.2 12h-3.33V9.75c0-.95.47-1.88 1.96-1.88h1.51V4.92s-1.37-.23-2.68-.23c-2.74 0-4.52 1.66-4.52 4.65V12H7.08v3.47h3.06V24h3.73v-8.53h2.8Z"
      />
    </svg>
  );
}
