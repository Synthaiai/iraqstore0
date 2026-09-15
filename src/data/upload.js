import { IMAGE_UPLOAD, uploadConfigured } from '../config';
import { compressImageToLimit, formatBytes } from '../utils/imageCompressor';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ORIGINAL_IMAGE_LIMIT = 12 * 1024 * 1024;

/** Target blob size when the image is uploaded to a CDN (a URL is stored, so we can afford quality). */
const CDN_IMAGE_LIMIT = 700 * 1024;
/**
 * Target blob size when the image is inlined into the Realtime Database.
 * Base64 inflates by ~33%, so 190KB of bytes ≈ 260KB of stored text. Four of
 * those keep a product record near 1MB, which RTDB writes well within the
 * 20s save timeout even on a weak mobile connection.
 */
const INLINE_IMAGE_LIMIT = 190 * 1024;
/** Hard ceiling on the stored data URL string. */
const INLINE_DATAURL_LIMIT = 300 * 1024;

const CDN_UPLOAD_TIMEOUT_MS = 25_000;

function assertImage(file) {
  if (!file) return;
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.');
  if (file.size > ORIGINAL_IMAGE_LIMIT) throw new Error('حجم الصورة الأصلية يتجاوز 12MB.');
}

async function postForm(url, form) {
  const response = await fetch(url, { method: 'POST', body: form, signal: AbortSignal.timeout(CDN_UPLOAD_TIMEOUT_MS) });
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
 * Upload a File and return something storable in the Realtime Database.
 *
 * When a free image CDN is configured in `src/config.js` the image is uploaded
 * there and only a short URL is stored. Otherwise the image is compressed hard
 * and inlined as a WebP data URL — no external account needed, and small enough
 * that saving a product never hits the database write timeout.
 *
 * Firebase Storage is deliberately not used: this project runs on the Realtime
 * Database alone, and attempting a Storage upload against a disabled bucket was
 * stalling every product save.
 */
export async function uploadImage(file) {
  if (!file) return null;
  assertImage(file);

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
