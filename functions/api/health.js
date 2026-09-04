import { apiError, json } from '../_lib/http.js';

export async function onRequestGet({ env }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة الطلبات غير مهيأة.');
  if (env.ENVIRONMENT !== 'development' && (!env.FIREBASE_WEB_API_KEY || !env.TURNSTILE_SECRET || !env.RATE_LIMIT_SALT)) {
    return apiError(503, 'SECURITY_NOT_CONFIGURED', 'إعدادات حماية الخادم غير مكتملة.');
  }
  try {
    await env.DB.prepare('SELECT 1 AS healthy').first();
    return json({ ok: true, service: 'iraqstore-api', database: 'ready', security: 'ready' });
  } catch {
    return apiError(503, 'DATABASE_UNAVAILABLE', 'قاعدة الطلبات غير متاحة حاليًا.');
  }
}
