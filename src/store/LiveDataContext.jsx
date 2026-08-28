import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeProduct, setLiveProducts } from '../data/products';
import { updateCatalogStore } from '../data/catalog';
import { preTranslateProducts } from '../utils/translator';

const LiveDataContext = createContext(null);

/**
 * Bridges the Realtime Database into the storefront.
 *
 * - Subscribes to `/products`; when the DB has records they replace the seed
 *   catalogue (via the live `PRODUCTS` binding) and `version` bumps so every
 *   listing recomputes. An empty/errored DB leaves the bundled seed in place.
 * - Subscribes to `/settings` for the live logo URL and any global promo.
 * - Subscribes to `/catalog` for real-time category and subcategory updates.
 */
export function LiveDataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let unsubP = () => {};
    let unsubS = () => {};
    let unsubC = () => {};
    let alive = true;

    // Firebase (app + realtime database) loads AFTER first paint as its own
    // chunk, so the storefront's initial download stays lean. Until it arrives
    // the bundled seed catalogue is shown.
    import('../data/remote')
      .then(({ listenProducts, listenSettings, listenCatalog }) => {
        if (!alive) return;
        unsubP = listenProducts((records) => {
          const norm = records.map(normalizeProduct).filter(Boolean);
          setLiveProducts(norm);
          preTranslateProducts(norm);
          setVersion((v) => v + 1);
        });
        unsubS = listenSettings((s) => setSettings(s || {}));
        if (typeof listenCatalog === 'function') {
          unsubC = listenCatalog((tree) => {
            if (tree) {
              updateCatalogStore(tree);
              setVersion((v) => v + 1);
            }
          });
        }
      })
      .catch(() => {
        /* Firebase unreachable — keep the bundled seed catalogue. */
      });
    return () => {
      alive = false;
      unsubP();
      unsubS();
      unsubC();
    };
  }, []);

  const value = useMemo(
    () => ({ version, settings, logoUrl: settings.logoUrl || null }),
    [version, settings]
  );

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useLiveData() {
  return useContext(LiveDataContext) || { version: 0, settings: {}, logoUrl: null };
}
