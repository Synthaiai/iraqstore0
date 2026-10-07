import { requireAdmin } from '../_lib/auth.js';
import { apiError, json } from '../_lib/http.js';

/**
 * Store a product photo in R2 and return the URL the storefront will use.
 *
 * Photos used to be inlined into the Realtime Database as base64, which costs
 * ~4x the bytes, counts against a 10GB/month egress allowance that stops the
 * whole shop when exhausted, and has to travel over the database socket before
 * a product can be saved. Here the bytes go to object storage and the product
 * record keeps a short path.
 *
 * Only an admin may write. The bucket itself stays private; `/img/<key>` is the
 * only way out, and it is read-only.
 */

const MAX_BYTES = 8 * 1024 * 1024;

/** Extension per accepted type — the key carries it so `/img` can set the type. */
const EXTENSIONS = new Map([
  ['image/webp', 'webp'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/avif', 'avif'],
]);

export async function onRequestPost({ request, env }) {
  if (!env.IMAGES) return apiError(503, 'STORAGE_NOT_CONFIGURED', 'تخزين الصور غير مهيأ.');

  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  let form;
  try {
    form = await request.formData();
  } catch {
    return apiError(400, 'INVALID_UPLOAD', 'تعذّرت قراءة الصورة المرسلة.');
  }

  const file = form.get('file');
  if (!file || typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
    return apiError(400, 'NO_FILE', 'لم تصل أي صورة.');
  }

  const type = String(file.type || '').toLowerCase();
  const extension = EXTENSIONS.get(type);
  if (!extension) return apiError(415, 'UNSUPPORTED_TYPE', 'نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.');
  // `file.size` is advisory; the real guard is the byte length below.
  if (file.size > MAX_BYTES) return apiError(413, 'FILE_TOO_LARGE', 'حجم الصورة أكبر من 8 ميغابايت.');

  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) return apiError(413, 'FILE_TOO_LARGE', 'حجم الصورة أكبر من 8 ميغابايت.');
  if (!bytes.byteLength) return apiError(400, 'EMPTY_FILE', 'الصورة فارغة.');

  // Content-addressed: the same photo uploaded twice costs one object, and a
  // key can never collide or be guessed from a product id.
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  const key = `products/${hash}.${extension}`;

  try {
    await env.IMAGES.put(key, bytes, {
      httpMetadata: {
        contentType: type,
        // The key changes whenever the bytes change, so this can never go stale.
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('R2 upload failed', error);
    return apiError(503, 'UPLOAD_FAILED', 'تعذّر حفظ الصورة. حاول مجددًا.');
  }

  return json({ ok: true, url: `/img/${key}`, key, bytes: bytes.byteLength });
}
