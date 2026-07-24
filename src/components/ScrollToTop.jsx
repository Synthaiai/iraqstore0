import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Every route change starts at the top — the browser would otherwise keep the old offset. */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // `instant` overrides the global `scroll-behavior: smooth`, which would
    // otherwise animate a full-page scroll on every navigation.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
