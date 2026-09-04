import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeProduct, setLiveProducts } from '../data/products';
import { updateCatalogStore } from '../data/catalog';
import { preTranslateProducts } from '../utils/translator';
import { listenCatalog, listenProducts, listenSettings } from '../data/remote';

const LiveDataContext = createContext(null);

/**
 * Bridges the cached, server-validated catalogue into the storefront.
 *
 * The data adapter refreshes the public API on an interval, keeps a browser
 * cache for read-only fallback, and bumps `version` whenever a fresh bundle
 * arrives so every listing recomputes.
 */
export function LiveDataProvider({ children }) {
  const [version, setVersion] = useState(0);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    let unsubP = () => {};
    let unsubS = () => {};
    let unsubC = () => {};
    let alive = true;

    if (alive) {
      unsubP = listenProducts((records) => {
        const norm = records.map(normalizeProduct).filter(Boolean);
        setLiveProducts(norm);
        preTranslateProducts(norm);
        setVersion((v) => v + 1);
      });
      unsubS = listenSettings((s) => setSettings(s || {}));
      unsubC = listenCatalog((tree) => {
        if (tree) {
          updateCatalogStore(tree);
          setVersion((v) => v + 1);
        }
      });
    }
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
