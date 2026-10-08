import { requireAdmin } from '../../_lib/auth.js';
import { apiError, json, readJson } from '../../_lib/http.js';

/**
 * Write to the shop's database through this site, instead of from the browser.
 *
 * The dashboard used to write with the Firebase SDK, which opens its own
 * connection to firebaseio.com. On some Iraqi networks that connection never
 * establishes — the shop itself loads fine, images upload fine, orders go
 * through fine, because all of those travel to this origin — and the admin was
 * left with "the connection is slow" on a phone with working 4G. It was not
 * slow; that one host was unreachable.
 *
 * So a save is now an ordinary HTTPS request to the same origin as everything
 * else that already works. The Worker forwards it to the database, passing the
 * admin's own Firebase ID token, so the database rules still decide what may
 * be written — this proxies a request, it does not grant extra authority.
 */

const DEFAULT_FIREBASE_URL = 'https://store-29692-default-rtdb.firebaseio.com';

/**
 * Only these parts of the database may be written through here. The dashboard
 * has no reason to touch anything else, and a general-purpose write proxy is
 * not something to leave lying around.
 */
const WRITABLE = [
  /^products\/[A-Za-z0-9_-]{1,120}$/,
  /^products\/[A-Za-z0-9_-]{1,120}\/[A-Za-z0-9_-]{1,40}$/,
  /^products$/,
  /^productImages\/[A-Za-z0-9_-]{1,120}$/,
  /^settings$/,
  /^catalog$/,
];

const MAX_BODY = 12 * 1024 * 1024;

function firebaseBase(env) {
  return String(env.FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_URL).replace(/\/$/, '');
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function pathOf(params) {
  return (Array.isArray(params.path) ? params.path.join('/') : String(params.path || '')).replace(/^\/+|\/+$/g, '');
}

async function forward(request, env, params, method) {
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const path = pathOf(params);
  if (!WRITABLE.some((pattern) => pattern.test(path))) {
    return apiError(403, 'PATH_NOT_WRITABLE', 'لا يمكن الكتابة في هذا المسار.');
  }

  let body;
  if (method !== 'DELETE') {
    try {
      body = await readJson(request, MAX_BODY);
    } catch (error) {
      return apiError(error.status || 400, 'INVALID_JSON', 'البيانات المرسلة غير صالحة.');
    }
  }

  // The admin's own token: the database rules apply exactly as they would have
  // if the browser had reached Firebase itself.
  const url = `${firebaseBase(env)}/${path}.json?auth=${encodeURIComponent(bearer(request))}`;
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: method === 'DELETE' ? undefined : JSON.stringify(body === undefined ? null : body),
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    console.error('store write failed to reach the database', error);
    return apiError(503, 'DB_UNREACHABLE', 'تعذّر الوصول إلى قاعدة البيانات. حاول مرة أخرى.');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error('store write rejected', response.status, detail.slice(0, 200));
    if (response.status === 401 || response.status === 403) {
      return apiError(403, 'DB_FORBIDDEN', 'الحساب غير مخوّل للكتابة. سجّل الخروج ثم ادخل مجددًا.');
    }
    return apiError(502, 'DB_WRITE_FAILED', 'لم تقبل قاعدة البيانات الحفظ. حاول مرة أخرى.');
  }

  return json({ ok: true, path });
}

/** Replace the value at this path. */
export const onRequestPut = ({ request, env, params }) => forward(request, env, params, 'PUT');

/** Merge these keys into the value at this path. */
export const onRequestPatch = ({ request, env, params }) => forward(request, env, params, 'PATCH');

/** Remove the value at this path. */
export const onRequestDelete = ({ request, env, params }) => forward(request, env, params, 'DELETE');
