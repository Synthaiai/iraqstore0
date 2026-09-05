import { useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { useLiveData } from '../store/LiveDataContext';

export default function StoreLoadingScreen() {
  const { loaded, status } = useLiveData();
  const [assetsReady, setAssetsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const id = setTimeout(() => setTimedOut(true), 10000); return () => clearTimeout(id); }, []);
  useEffect(() => {
    if (!loaded) return;
    const urls = PRODUCTS.slice(0, 10).map((p) => p.images?.[0] || p.image).filter(Boolean);
    if (!urls.length) { setAssetsReady(true); return; }
    let done = 0;
    urls.forEach((url) => { const img = new Image(); const finish = () => { done += 1; if (done === urls.length) setAssetsReady(true); }; img.onload = finish; img.onerror = finish; img.src = url; });
  }, [loaded]);
  if (timedOut || status === 'offline' || (loaded && assetsReady)) return null;
  return <div className="store-loading" role="status" aria-live="polite"><div className="store-loading__card"><img className="store-loading__mark" src="/logo.jpg" alt="IRAQI STORE" width="72" height="72" /><div className="store-loading__spinner" aria-hidden="true" /><strong>جاري تحميل المتجر</strong><span>نجهّز المنتجات والصور لك...</span></div></div>;
}
