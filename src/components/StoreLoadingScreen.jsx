import { useEffect, useRef, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { BRAND_LOGO, collectAssets, preloadAssets } from '../data/assetLoader';
import { fetchFreshSnapshot } from '../data/remote';
import { useLiveData } from '../store/LiveDataContext';
import { usePrefs } from '../store/PrefsContext';
import '../styles/loading.css';

export default function StoreLoadingScreen() {
  const { loaded, status, version } = useLiveData();
  const { lang } = usePrefs();
  const en = lang === 'en';
  const [visible, setVisible] = useState(false);
  const [finished, setFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [count, setCount] = useState({ success: 0, total: 0 });
  const panel = useRef(null);
  const dismiss = () => { setLeaving(true); setFinished(true); };

  useEffect(() => {
    // Cached visits finish before this threshold, without a spinner flash.
    const timer = setTimeout(() => setVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded || finished) return undefined;
    const controller = new AbortController();
    setResult(null);
    const jobs = collectAssets(PRODUCTS, document.querySelectorAll('main img, header img, footer img'));
    setCount({ success: 0, total: jobs.length });
    preloadAssets(jobs, setCount, { signal: controller.signal }).then((outcome) => {
      if (controller.signal.aborted) return;
      setResult(outcome);
      if (!outcome.failed.length) {
        window.dispatchEvent(new Event('store:images-ready'));
        dismiss();
      }
    });
    return () => controller.abort();
  }, [loaded, version, attempt, finished]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => { setVisible(false); setLeaving(false); }, 250);
    return () => clearTimeout(timer);
  }, [leaving]);

  const shown = visible && (!finished || leaving);
  useEffect(() => {
    if (!shown) return undefined;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const background = [...document.querySelector('#root').children].filter((el) => el !== panel.current);
    const inertStates = background.map((el) => el.inert);
    background.forEach((el) => { el.inert = true; });
    document.body.style.overflow = 'hidden';
    panel.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach((el, i) => { el.inert = inertStates[i]; });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [shown]);

  if (!shown) return null;
  const offline = !loaded && status === 'offline';
  const failed = result?.failed.length || 0;
  const progress = count.total ? Math.floor(count.success / count.total * 100) : 0;
  const retry = () => {
    setResult(null);
    setAttempt((n) => n + 1);
    if (!loaded) fetchFreshSnapshot();
  };

  return (
    <div ref={panel} tabIndex={-1} className={`store-loading ${leaving ? 'is-leaving' : ''}`} role="dialog" aria-modal="true" aria-labelledby="loading-title" dir={en ? 'ltr' : 'rtl'}>
      <div className="store-loading__top" aria-hidden="true"><span>IRAQI STORE</span><span>THE WARDROBE EDIT</span></div>
      <div className="store-loading__layout">
        <div className="store-loading__visual" aria-hidden="true">
          <div className="store-loading__rail" />
          <svg className="store-loading__hanger" viewBox="0 0 320 240" fill="none">
            <path d="M145 46c0-24 34-24 34-3 0 12-19 14-19 28v18L42 162c-14 9-8 25 8 25h220c16 0 22-16 8-25L160 89" />
            <path className="store-loading__stitch" d="M72 168h176" />
          </svg>
          <div className="store-loading__tag"><span className="store-loading__tag-hole" /><img src={BRAND_LOGO} alt="" width="112" height="112" /><span>IRAQI STORE</span><small>YOUR STYLE. YOUR STORY.</small><div className="store-loading__barcode" /></div>
          <span className="store-loading__edition">STYLE / DETAILS / IDENTITY</span>
        </div>
        <div className="store-loading__content">
          <span className="store-loading__eyebrow">{en ? 'CURATED FOR YOU' : 'تفاصيل تختارها. أسلوب يشبهك.'}</span>
          <h1 id="loading-title">{offline ? (en ? 'Let’s reconnect' : 'نحتاج نرجع نتّصل') : failed ? (en ? 'A few photos need another try' : 'باقي صور تحتاج محاولة') : (en ? 'Your next look,\ncoming into view.' : 'إطلالتك الجاية،\nعلى وشك الظهور.')}</h1>
          <p>{offline ? (en ? 'Check your connection and try again.' : 'تحقّق من اتصال الإنترنت وحاول مرة ثانية.') : failed ? (en ? `${failed} photos could not load. Retry, or browse what is ready.` : `تعذّر تحميل ${failed} صور. جرّب مرة ثانية أو تصفّح المتاح.`) : (en ? 'Preparing the collection and its photos for you.' : 'نجهّز لك التشكيلة وصورها، حتى تتصفّحها براحتك.')}</p>
          <div className="store-loading__meter-head"><span>{loaded ? (en ? 'Preparing photos' : 'تجهيز الصور') : (en ? 'Connecting to the store' : 'الاتصال بالمتجر')}</span><b>{loaded ? `${progress}%` : '—'}</b></div>
          <div className="store-loading__progress" role="progressbar" aria-label={en ? 'Photos ready' : 'الصور الجاهزة'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={loaded ? progress : undefined}><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
          <div className="store-loading__status" role="status" aria-live="polite">{loaded ? (en ? `${count.success} of ${count.total} photos ready` : `${count.success} من ${count.total} صورة جاهزة`) : (en ? 'Fetching the latest collection…' : 'نجلب أحدث تشكيلة…')}</div>
          {(offline || failed > 0) && <div className="store-loading__actions"><button onClick={retry}>{en ? 'Try again' : 'إعادة المحاولة'}</button><button onClick={dismiss}>{en ? 'Browse available items' : 'تصفّح المتاح'}</button></div>}
          <div className="store-loading__categories">{en ? 'CLOTHING  /  FOOTWEAR  /  ACCESSORIES' : 'ملابس  /  أحذية  /  إكسسوارات'}</div>
        </div>
      </div>
      <div className="store-loading__bottom"><span>{en ? 'IRAQ • MADE FOR YOUR EVERYDAY' : 'العراق • لكل يوم، إطلالة'}</span><span aria-hidden="true">EST. STYLE</span></div>
    </div>
  );
}
