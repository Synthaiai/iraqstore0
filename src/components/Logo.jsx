import { Link } from 'react-router-dom';

/**
 * The IRAQI STORE badge — concentric rings, arc-set wordmark, SI monogram.
 * Drawn as inline SVG so it stays crisp at any size, recolours via `currentColor`
 * on the rings, and costs zero network requests on a slow connection.
 */
export function LogoMark({ size = 44, className = '' }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`logomark ${className}`.trim()}
      role="img"
      aria-label="IRAQI STORE"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="94" fill="none" stroke="currentColor" strokeWidth="6" />
      {/* Inner ring. Kept well clear of the outer one so the wordmark has a
          wide channel to sit in without colliding with either stroke. */}
      <circle cx="100" cy="100" r="56" fill="none" stroke="currentColor" strokeWidth="4" />

      {/* Side ticks, centred in that channel */}
      <rect x="14" y="97.5" width="18" height="5" rx="1" fill="currentColor" />
      <rect x="168" y="97.5" width="18" height="5" rx="1" fill="currentColor" />

      {/* Arc guides for the wordmark. The bottom arc is drawn counter-clockwise
          (sweep 0) so "STORE" reads upright instead of upside down. */}
      <defs>
        <path id="logo-arc-top" d="M 26,100 a 74,74 0 0 1 148,0" fill="none" />
        <path id="logo-arc-bottom" d="M 28,100 a 72,72 0 0 0 144,0" fill="none" />
      </defs>

      <text
        fill="currentColor"
        fontSize="21"
        fontWeight="700"
        letterSpacing="7"
        fontFamily="'IBM Plex Sans Arabic', system-ui, sans-serif"
      >
        <textPath href="#logo-arc-top" startOffset="50%" textAnchor="middle">
          IRAQI
        </textPath>
      </text>

      <text
        fill="currentColor"
        fontSize="19"
        fontWeight="700"
        letterSpacing="6"
        dy="16"
        fontFamily="'IBM Plex Sans Arabic', system-ui, sans-serif"
      >
        <textPath href="#logo-arc-bottom" startOffset="50%" textAnchor="middle">
          STORE
        </textPath>
      </text>

      {/* "Si" monogram. The i sits beside the S rather than through it — an
          overlapping bar reads as a dollar sign at header size. */}
      <text
        x="86"
        y="126"
        fill="currentColor"
        fontSize="76"
        fontWeight="700"
        textAnchor="middle"
        fontFamily="'IBM Plex Sans Arabic', system-ui, sans-serif"
      >
        S
      </text>
      <circle cx="121" cy="70" r="6.5" fill="currentColor" />
      <rect x="117.5" y="83" width="7" height="43" fill="currentColor" />
      <rect x="110" y="83" width="22" height="6" rx="1" fill="currentColor" />
      <rect x="110" y="120" width="22" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function Logo({ to = '/', compact = false }) {
  return (
    <Link to={to} className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="IRAQI STORE — الصفحة الرئيسية">
      <span className="logo__badge">
        <LogoMark size={compact ? 36 : 46} />
      </span>
      <span className="logo__text">
        <span className="logo__latin">IRAQI STORE</span>
        <span className="logo__ar">عراقي ستور</span>
      </span>
    </Link>
  );
}
