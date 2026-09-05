import { useEffect, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { useLiveData } from '../store/LiveDataContext';

export default function StoreLoadingScreen() {
  const { loaded, status } = useLiveData();
  const [assetsReady, setAssetsReady] = useState(false);
  const [progress, setProgress] = useState(8);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => { const id = setTimeout(() => setTimedOut(true), 10000); return () => clearTimeout(id); }, []);
  useEffect(() => {
    if (!loaded) return;
    const urls = PRODUCTS.slice(0, 10).map((p) => p.images?.[0] || p.image).filter(Boolean);
    if (!urls.length) { setProgress(100); setAssetsReady(true); return; }
    let done = 0;
    urls.forEach((url) => { const img = new Image(); const finish = () => { done += 1; setProgress(Math.round(8 + (done / urls.length) * 92)); if (done === urls.length) setAssetsReady(true); }; img.onload = finish; img.onerror = finish; img.src = url; });
  }, [loaded]);
  if (timedOut || status === 'offline' || (loaded && assetsReady)) return null;
  return <div className="store-loading" role="status" aria-live="polite"><div className="store-loading__card"><div className="store-loading__brand"><div><b>IRAQI STORE</b><small>عراق ستور</small></div><img src="/logo.jpg" alt="IRAQI STORE" width="58" height="58" /></div><strong>جاري تجهيز المتجر</strong><span>نحمّل المنتجات والصور حتى تظهر الصفحة كاملة</span><div className="store-loading__progress" aria-label={`اكتمل التحميل ${progress}%`}><i style={{ width: `${progress}%` }} /></div><small>{progress}%</small></div></div>;
}
