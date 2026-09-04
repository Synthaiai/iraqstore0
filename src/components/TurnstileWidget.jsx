import { useEffect, useRef, useState } from 'react';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID);
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(window.turnstile), { once: true });
    script.addEventListener('error', () => reject(new Error('TURNSTILE_LOAD_FAILED')), { once: true });
  });
}

export default function TurnstileWidget({ onToken, resetKey = 0, lang = 'ar' }) {
  const container = useRef(null);
  const widgetId = useRef(null);
  const [failed, setFailed] = useState(false);
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey || !container.current) return undefined;
    let alive = true;
    loadTurnstile()
      .then((turnstile) => {
        if (!alive || !turnstile || widgetId.current !== null) return;
        widgetId.current = turnstile.render(container.current, {
          sitekey,
          theme: 'auto',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (token) => onToken(token),
          'expired-callback': () => onToken(''),
          'error-callback': () => { onToken(''); setFailed(true); },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      alive = false;
      if (widgetId.current !== null && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [sitekey, onToken]);

  useEffect(() => {
    if (widgetId.current !== null && window.turnstile) {
      setFailed(false);
      window.turnstile.reset(widgetId.current);
      onToken('');
    }
  }, [resetKey, onToken]);

  if (!sitekey) {
    if (import.meta.env.DEV) return null;
    return <p className="field__error">خدمة التحقق الأمني غير مهيأة. تواصل مع المتجر.</p>;
  }
  return (
    <div className="turnstile-wrap">
      <div ref={container} />
      {failed && <p className="field__error">تعذر تحميل التحقق الأمني. {lang === 'en' ? 'Reload and try again.' : 'أعد تحميل الصفحة وحاول مجددًا.'}</p>}
    </div>
  );
}
