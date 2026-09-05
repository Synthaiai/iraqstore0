import { useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { useLiveData } from '../store/LiveDataContext';

export default function StoreLoadingScreen() {
  const { loaded } = useLiveData();
  const [warmCache, setWarmCache] = useState(() => {
    try { return window.localStorage.getItem('iraqstore-assets-ready') === '1'; } catch { return false; }
  });
  const [assetsReady, setAssetsReady] = useState(warmCache);
  const [progress, setProgress] = useState(8);
  useEffect(() => {
    if (!loaded || warmCache) return;
    const urls = [...new Set([
      '/logo.jpg',
      ...PRODUCTS.flatMap((p) => [...(p.images || []), ...(p.thumbs || []), p.image, p.imageAlt]),
    ].filter(Boolean))];
    if (!urls.length) { setProgress(100); setAssetsReady(true); setWarmCache(true); return; }
    let done = 0;
    const finish = () => { done += 1; setProgress(Math.round((done / urls.length) * 100)); if (done === urls.length) { setAssetsReady(true); setWarmCache(true); try { window.localStorage.setItem('iraqstore-assets-ready', '1'); } catch {} } };
    // Start every request immediately so the browser can fill its connection pool.
    urls.forEach((url) => { const img = new Image(); img.decoding = 'async'; img.onload = finish; img.onerror = finish; img.src = url; });
  }, [loaded]);
  if (warmCache || (loaded && assetsReady)) return null;
  return <div className="store-loading" role="status" aria-live="polite"><div className="store-loading__card"><div className="store-loading__brand"><div><b>IRAQI STORE</b><small>عراق ستور</small></div><img src="/logo.jpg" alt="IRAQI STORE" width="58" height="58" /></div><strong>جاري تجهيز المتجر</strong><span>نحمّل المنتجات والصور حتى تظهر الصفحة كاملة</span><div className="store-loading__progress" aria-label={`اكتمل التحميل ${progress}%`}><i style={{ width: `${progress}%` }} /></div><small>{progress}%</small></div></div>;
}
