import { useState } from 'react';

/**
 * What actually works on this device, right now.
 *
 * Two people on two networks were getting the same unhelpful sentence about a
 * slow connection, and every round of guessing cost a day. This runs the four
 * things a save depends on and says which of them answered, so the next report
 * is a result rather than a description.
 */

const BUILD_STAMP = __BUILD_STAMP__;

async function timed(run) {
  const started = Date.now();
  try {
    const detail = await run();
    return { ok: true, ms: Date.now() - started, detail };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, detail: String(error?.message || error).slice(0, 90) };
  }
}

const CHECKS = [
  {
    key: 'site',
    label: 'الاتصال بخادم المتجر',
    note: 'الطريق الذي يمرّ منه الحفظ',
    run: () => timed(async () => {
      const r = await fetch('/api/health?cb=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const b = await r.json();
      if (!b?.ok) throw new Error('الخادم ردّ بخطأ');
      return `قاعدة البيانات ${b.database} · التخزين ${b.storage}`;
    }),
  },
  {
    key: 'write',
    label: 'صلاحية الحفظ',
    note: 'هل يقبل الخادم كتابتك',
    run: () => timed(async () => {
      const { auth } = await import('../firebase');
      if (!auth.currentUser) throw new Error('لست مسجّل الدخول');
      const token = await auth.currentUser.getIdToken(false);
      const r = await fetch('/api/store/settings', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ diagnosticsPingAt: Date.now() }),
        signal: AbortSignal.timeout(20000),
      });
      const b = await r.json().catch(() => null);
      if (!r.ok) throw new Error(b?.error?.message || `رُفض (${r.status})`);
      return 'الكتابة نجحت';
    }),
  },
  {
    key: 'auth',
    label: 'جلسة الدخول',
    note: 'تجديد رمز الهوية',
    run: () => timed(async () => {
      const { auth } = await import('../firebase');
      if (!auth.currentUser) throw new Error('لست مسجّل الدخول');
      await auth.currentUser.getIdToken(true);
      return auth.currentUser.email || 'سليمة';
    }),
  },
  {
    key: 'firebase',
    label: 'الاتصال المباشر بقاعدة البيانات',
    note: 'غير مطلوب للحفظ — للعلم فقط',
    optional: true,
    run: () => timed(async () => {
      const r = await fetch('https://store-29692-default-rtdb.firebaseio.com/.json?shallow=true', {
        signal: AbortSignal.timeout(12000),
      });
      return `ردّ بالرمز ${r.status}`;
    }),
  },
];

export default function Diagnostics() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setResults({});
    for (const check of CHECKS) {
      // eslint-disable-next-line no-await-in-loop
      const result = await check.run();
      setResults((r) => ({ ...r, [check.key]: result }));
    }
    setRunning(false);
  };

  const summary = () => {
    const lines = CHECKS
      .filter((c) => results[c.key])
      .map((c) => `${results[c.key].ok ? 'OK ' : 'FAIL'} ${c.label} (${results[c.key].ms}ms) — ${results[c.key].detail}`);
    return [`build ${BUILD_STAMP}`, ...lines].join('\n');
  };

  return (
    <div className="admin-card">
      <h3>🩺 فحص الاتصال</h3>
      <p>
        إذا واجهت مشكلة في الحفظ، شغّل هذا الفحص وأرسل النتيجة. يوضّح أي جزء لا يستجيب
        بدل التخمين.
      </p>

      <div className="admin-diag">
        {CHECKS.map((check) => {
          const r = results[check.key];
          return (
            <div className="admin-diag__row" key={check.key}>
              <span className="admin-diag__state">
                {!r ? '⋯' : r.ok ? '✅' : check.optional ? '⚠️' : '❌'}
              </span>
              <span className="admin-diag__label">
                <b>{check.label}</b>
                <small>{r ? `${r.detail} · ${r.ms}ms` : check.note}</small>
              </span>
            </div>
          );
        })}
      </div>

      <div className="admin-diag__actions">
        <button className="admin-btn admin-btn--primary" onClick={runAll} disabled={running}>
          {running ? 'جارٍ الفحص…' : 'ابدأ الفحص'}
        </button>
        {Object.keys(results).length > 0 && !running && (
          <button
            className="admin-btn admin-btn--ghost"
            onClick={() => navigator.clipboard?.writeText(summary())}
          >
            نسخ النتيجة
          </button>
        )}
      </div>
      <small className="admin-help">إصدار النسخة: {BUILD_STAMP}</small>
    </div>
  );
}
