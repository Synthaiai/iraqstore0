import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { normalizeProduct, setLiveProducts } from '../data/products';
import { updateCatalogStore } from '../data/catalog';
import { listenCatalog, listenProducts, listenSettings, subscribeConnectionStatus } from '../data/remote';

const LiveDataContext = createContext(null);

/**
 * Bridges the cached, server-validated catalogue into the storefront.
 *
 * The data adapter refreshes the public API on an interval, keeps a browser
 * cache for read-only fallback, and bumps `version` whenever a fresh bundle
 * arrives so every listing recomputes.
 */
export function LiveDataProvider({ children }) {
  const [status, setStatus] = useState('checking');
  const [loaded, setLoaded] = useState(false);
  const [version, setVersion] = useState(0);
  const [settings, setSettings] = useState({});

  useEffect(() => {
    const unsubStatus = subscribeConnectionStatus(setStatus);
    let unsubP = () => {};
    let unsubS = () => {};
    let unsubC = () => {};
    let alive = true;

    if (alive) {
      unsubP = listenProducts((records) => {
        const norm = records.map(normalizeProduct).filter(Boolean);
        setLiveProducts(norm);
        setLoaded(true);
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
      unsubStatus();
      unsubP();
      unsubS();
      unsubC();
    };
  }, []);

  const value = useMemo(
    () => ({ version, settings, status, loaded, logoUrl: settings.logoUrl || null }),
    [version, settings, status, loaded]
  );

  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useLiveData() {
  return useContext(LiveDataContext) || { version: 0, settings: {}, logoUrl: null };
}
