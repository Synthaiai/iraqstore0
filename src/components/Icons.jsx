/* Single-stroke icon set — 24px grid, 1.5 stroke, matches the type weight. */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const Bag = (p) => (
  <svg {...base} {...p}>
    <path d="M6 8h12l-1 12H7L6 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const Heart = ({ filled, ...p }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'} {...p}>
    <path d="M12 20s-7-4.4-7-9.3A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />
  </svg>
);

export const Search = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const Close = (p) => (
  <svg {...base} {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const Sliders = (p) => (
  <svg {...base} {...p}>
    <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
    <circle cx="16" cy="8" r="2.2" />
    <circle cx="10" cy="16" r="2.2" />
  </svg>
);

export const Menu = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const ChevronLeft = (p) => (
  <svg {...base} {...p}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);

export const Plus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = (p) => (
  <svg {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const Star = ({ filled, ...p }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" aria-hidden {...p}>
    <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" />
  </svg>
);

export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const Truck = (p) => (
  <svg {...base} {...p}>
    <path d="M2 7h11v10H2z" />
    <path d="M13 10h4l4 3.5V17h-8" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);

export const Instagram = (p) => (
  <svg {...base} {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.4" />
    <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const Facebook = (p) => (
  <svg {...base} {...p}>
    <path d="M14.5 8.5H16V5.8h-2.2c-2 0-3.3 1.3-3.3 3.4v1.5H8.5V13h2v6h2.7v-6h2.1l.4-2.3h-2.5V9.5c0-.7.3-1 1.3-1Z" />
  </svg>
);

export const Whatsapp = (p) => (
  <svg {...base} {...p}>
    <path d="M4 20l1.3-4A7.5 7.5 0 1 1 8 18.7L4 20Z" />
    <path d="M9.2 9.4c-.2 1 .4 2.2 1.3 3.1.9.9 2.1 1.5 3.1 1.3l.9-1 1.6.9-.3 1.1c-1.7.7-4-.4-5.6-2s-2.7-3.9-2-5.6l1.1-.3.9 1.6-1 .9Z" />
  </svg>
);
