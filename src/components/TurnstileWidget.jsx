import { useEffect, useRef, useState } from 'react';
import { STORE_CONTACT } from '../data/contact';

const SCRIPT_ID = 'cf-turnstile-script';
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** A script tag that never fires load or error would leave checkout disabled forever. */
const SCRIPT_TIMEOUT_MS = 15000;

/**
 * How long to wait for a token once the widget itself has rendered.
 *
 * A site key that does not list this hostname renders its container and then
 * does nothing at all: no iframe, no token, and no error callback. Checkout
 * stays disabled behind a button that never becomes clickable, which is a shop
 * silently refusing every order. Nothing here can fix the key — but the
 * customer must be told, and given a way to order anyway.
 */
const TOKEN_TIMEOUT_MS = 20000;

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
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    const timer = setTimeout(
      () => finish(reject, new Error('TURNSTILE_LOAD_TIMEOUT')),
      SCRIPT_TIMEOUT_MS
    );
    script.addEventListener('load', () => finish(resolve, window.turnstile), { once: true });
    script.addEventListener('error', () => finish(reject, new Error('TURNSTILE_LOAD_FAILED')), { once: true });
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
    let settled = false;
    // A silent widget is indistinguishable from a slow one until this fires.
    const stall = setTimeout(() => {
      if (alive && !settled) { onToken(''); setFailed(true); }
    }, TOKEN_TIMEOUT_MS);

    loadTurnstile()
      .then((turnstile) => {
        if (!alive || !turnstile || widgetId.current !== null) return;
        widgetId.current = turnstile.render(container.current, {
          sitekey,
          theme: 'auto',
          size: 'flexible',
          appearance: 'interaction-only',
          callback: (token) => { settled = true; clearTimeout(stall); setFailed(false); onToken(token); },
          'expired-callback': () => { settled = false; onToken(''); },
          'error-callback': () => { settled = true; clearTimeout(stall); onToken(''); setFailed(true); },
        });
      })
      .catch(() => { if (alive) { settled = true; clearTimeout(stall); onToken(''); setFailed(true); } });

    return () => {
      alive = false;
      clearTimeout(stall);
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
      {failed && (
        <div className="turnstile-wrap__failed" role="alert">
          <p className="field__error">
            {lang === 'en'
              ? 'The security check could not load, so the order cannot be sent from here.'
              : 'تعذّر تحميل التحقق الأمني، فلا يمكن إرسال الطلب من هنا.'}
          </p>
          {/* Never lose the sale to a broken bot check: the shop still answers. */}
          <p className="turnstile-wrap__fallback">
            {lang === 'en' ? 'Order directly instead — we reply right away:' : 'اطلب مباشرة بدلاً من ذلك — نرد فوراً:'}
            {' '}
            <a href={`tel:${STORE_CONTACT.phone}`} dir="ltr">{STORE_CONTACT.phone}</a>
            {' · '}
            <a href={STORE_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer">
              {lang === 'en' ? 'WhatsApp' : 'واتساب'}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
