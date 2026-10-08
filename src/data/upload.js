import { IMAGE_UPLOAD, uploadConfigured } from '../config';
import { compressImageToLimit, formatBytes } from '../utils/imageCompressor';
import { timeoutSignal } from '../utils/timeoutSignal';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ORIGINAL_IMAGE_LIMIT = 12 * 1024 * 1024;

/**
 * Target blob size for an upload to object storage.
 *
 * Only a path is stored, so quality is cheap to keep — but the bytes still have
 * to leave the shopkeeper's phone, and that uplink is the slowest part of the
 * whole system. 420KB at 1400px is visually indistinguishable from 700KB on a
 * product page and takes a little over half as long to send.
 */
const CDN_IMAGE_LIMIT = 420 * 1024;
/**
 * Target blob size when the image is inlined into the Realtime Database.
 * Base64 inflates by ~33%, so 190KB of bytes ≈ 260KB of stored text. Four of
 * those keep a product record near 1MB, which RTDB writes well within the
 * 20s save timeout even on a weak mobile connection.
 */
const INLINE_IMAGE_LIMIT = 190 * 1024;
/** Hard ceiling on the stored data URL string. */
const INLINE_DATAURL_LIMIT = 300 * 1024;

/**
 * Deadlines per upload attempt, in order.
 *
 * A single 25s deadline was the bug: 700KB over a weak mobile uplink needs
 * longer than that, the attempt was abandoned, and the code quietly fell back
 * to inlining the image in the database — the slow path object storage exists
 * to replace. The save then timed out too, and the shopkeeper was told the
 * internet was weak when the upload had simply been given 25 seconds to do a
 * 50-second job. Each retry gets more room.
 */
const UPLOAD_ATTEMPT_DEADLINES = [30_000, 60_000, 120_000];
const CDN_UPLOAD_TIMEOUT_MS = UPLOAD_ATTEMPT_DEADLINES[0];

/** Storage is missing, not slow — falling back to the database is correct. */
const STORAGE_ABSENT_CODES = new Set(['STORAGE_NOT_CONFIGURED', 'HTTP_404', 'HTTP_503']);

function assertImage(file) {
  if (!file) return;
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.');
  if (file.size > ORIGINAL_IMAGE_LIMIT) throw new Error('حجم الصورة الأصلية يتجاوز 12MB.');
}

async function postForm(url, form) {
  const response = await fetch(url, { method: 'POST', body: form, signal: timeoutSignal(CDN_UPLOAD_TIMEOUT_MS) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error?.message || `فشل رفع الصورة (HTTP ${response.status}).`);
  return body;
}

async function uploadToCloudinary(file) {
  const { cloudName, uploadPreset } = IMAGE_UPLOAD.cloudinary;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  const body = await postForm(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, form);
  if (!body?.secure_url) throw new Error('Cloudinary لم يُرجع رابط الصورة.');
  return body.secure_url;
}

async function uploadToImgbb(file) {
  const form = new FormData();
  form.append('image', file);
  const body = await postForm(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMAGE_UPLOAD.imgbb.apiKey)}`, form);
  const url = body?.data?.display_url || body?.data?.url;
  if (!url) throw new Error('ImgBB لم يُرجع رابط الصورة.');
  return url;
}

/**
 * Send the image to this site's own object storage and return its path.
 *
 * Needs no third-party account, which matters: Cloudinary refuses sign-ups from
 * Iraq outright, and ImgBB answers "you have been forbidden to use this
 * website" to uploads from here. The bucket belongs to the same Cloudflare
 * account that already serves the shop.
 */
async function postToStorage(file, deadlineMs) {
  const form = new FormData();
  form.append('file', file, file.name || 'product.webp');
  const { auth } = await import('../firebase');
  if (!auth.currentUser) throw new Error('يجب تسجيل الدخول كمدير.');
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { authorization: `Bearer ${await auth.currentUser.getIdToken(false)}` },
    body: form,
    signal: timeoutSignal(deadlineMs),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.url) {
    const error = new Error(body?.error?.message || `تعذّر رفع الصورة (HTTP ${response.status}).`);
    error.code = body?.error?.code || `HTTP_${response.status}`;
    throw error;
  }
  return body.url;
}

/**
 * Upload to object storage, giving a slow connection room to finish.
 *
 * A slow link is not a broken one. Each attempt gets a longer deadline than the
 * last, and `onAttempt` lets the form say so instead of looking frozen. Only a
 * refusal that cannot improve with time — no admin session, a rejected file, no
 * bucket — gives up immediately.
 */
async function uploadToOwnStorage(file, onAttempt) {
  let lastError;
  for (let i = 0; i < UPLOAD_ATTEMPT_DEADLINES.length; i += 1) {
    try {
      onAttempt?.(i + 1, UPLOAD_ATTEMPT_DEADLINES.length);
      return await postToStorage(file, UPLOAD_ATTEMPT_DEADLINES[i]);
    } catch (error) {
      lastError = error;
      // Retrying will not fix any of these.
      if (error?.message === 'يجب تسجيل الدخول كمدير.') throw error;
      if (STORAGE_ABSENT_CODES.has(error?.code)) throw error;
      if (/^HTTP_4/.test(error?.code || '') && error.code !== 'HTTP_408') throw error;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw error;
    }
  }
  throw lastError;
}

/**
 * Upload a File and return something storable in the Realtime Database.
 *
 * Object storage first: the record keeps a short path and the bytes never
 * travel over the database socket. A deployment without the bucket bound falls
 * back to the old behaviour — the image is compressed hard and inlined as a
 * WebP data URL — so the dashboard keeps working rather than refusing saves.
 *
 * Firebase Storage is deliberately not used: this project runs on the Realtime
 * Database alone, and attempting a Storage upload against a disabled bucket was
 * stalling every product save.
 */
export async function uploadImage(file, { onAttempt } = {}) {
  if (!file) return null;
  assertImage(file);

  // Resized and re-encoded here, not on the server: the phone doing the upload
  // is also the slowest link, so fewer bytes leave the device.
  const { file: compressed } = await compressImageToLimit(file, { maxBytes: CDN_IMAGE_LIMIT });

  try {
    return await uploadToOwnStorage(compressed || file, onAttempt);
  } catch (error) {
    if (error?.message === 'يجب تسجيل الدخول كمدير.') throw error;

    // Falling back means inlining the image in the database — megabytes over a
    // socket, on the very connection that just proved too slow for a 420KB
    // HTTP upload. That turns a slow save into a failed one, which is what the
    // "your internet is weak" dead end actually was. Only do it when storage is
    // genuinely absent; a slow or flaky link is told the truth instead.
    if (!STORAGE_ABSENT_CODES.has(error?.code)) {
      throw new Error(
        'ما قدرنا نرفع الصورة — الاتصال بطيء أو متقطع. الصورة والبيانات ما زالت مكتوبة، '
        + 'جرّب الحفظ مرة ثانية، أو انقل الهاتف لمكان أقوى إشارة.'
      );
    }
    console.warn('Object storage is not configured here; storing this image inline instead:', error);
  }

  if (uploadConfigured()) {
    const { file: cdnFile } = await compressImageToLimit(file, { maxBytes: CDN_IMAGE_LIMIT });
    const target = cdnFile || file;
    if (IMAGE_UPLOAD.provider === 'cloudinary') return uploadToCloudinary(target);
    if (IMAGE_UPLOAD.provider === 'imgbb') return uploadToImgbb(target);
  }

  const best = await compressImageToLimit(file, {
    maxBytes: INLINE_IMAGE_LIMIT,
    initialMaxDimension: 1000,
    minDimension: 520,
    initialQuality: 0.74,
    minQuality: 0.4,
  });

  const dataUrl = best?.dataUrl;
  if (!dataUrl) throw new Error('تعذر ضغط الصورة. جرّب صورة أخرى.');
  if (dataUrl.length > INLINE_DATAURL_LIMIT) {
    throw new Error(`الصورة بعد الضغط ما زالت كبيرة (${formatBytes(best.compressedSize || file.size)}). اقتصّ الصورة أو اختر صورة أصغر.`);
  }
  return dataUrl;
}

/** True when this deployment can store images outside the database. */
export async function objectStorageAvailable() {
  try {
    const response = await fetch('/api/health', { signal: timeoutSignal(8000) });
    const body = await response.json().catch(() => null);
    return body?.storage === 'ready';
  } catch {
    return false;
  }
}

/**
 * Move an already-stored image into object storage.
 *
 * Takes what a product record holds today — a base64 data URL — and returns the
 * short path that replaces it. Anything that is already a path or an external
 * URL is returned untouched, so running the migration twice is harmless.
 */
export async function relocateStoredImage(stored) {
  if (typeof stored !== 'string' || !stored.startsWith('data:image/')) return stored;

  const comma = stored.indexOf(',');
  const header = stored.slice(5, comma);
  const type = header.split(';')[0] || 'image/webp';
  const binary = atob(stored.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const extension = type === 'image/jpeg' ? 'jpg' : type.split('/')[1] || 'webp';
  const file = new File([bytes], `migrated.${extension}`, { type });
  return uploadToOwnStorage(file);
}
