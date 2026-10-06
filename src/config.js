/**
 * Image hosting configuration.
 *
 * Base64 images stored in the database bloat it and slow the storefront. To keep
 * the whole site light and free, product images are uploaded to a free image CDN
 * and only a small URL is stored. Two free providers are supported; pick one and
 * fill its values, or leave everything empty to fall back to base64 (works, but
 * doesn't scale).
 *
 * ── Recommended: Cloudinary (free 25GB, auto WebP/AVIF, responsive, CDN) ──
 *   1. Create a free account at https://cloudinary.com
 *   2. Dashboard → note your "Cloud name"
 *   3. Settings → Upload → Add upload preset → Signing mode: "Unsigned" → Save
 *      → copy the preset name
 *   4. Put both below. That's it.
 *
 * ── Simpler alternative: ImgBB (free, just an API key) ──
 *   1. Sign in at https://imgbb.com → https://api.imgbb.com → get your API key
 *   2. Set provider to 'imgbb' and paste the key.
 *
 * These values are NOT secret — unsigned presets / public keys are meant to ship
 * in client code.
 */
/**
 * Values can come from build variables instead of edits to this file, which is
 * what a Cloudflare Pages deploy wants:
 *   VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET, VITE_IMGBB_API_KEY
 * A value written in this file wins, so either way works.
 */
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const IMAGE_UPLOAD = {
  // 'cloudinary' | 'imgbb' | 'base64'
  provider: env.VITE_IMAGE_PROVIDER || 'cloudinary',

  cloudinary: {
    cloudName: env.VITE_CLOUDINARY_CLOUD_NAME || '', // e.g. 'dxxxxxx'
    uploadPreset: env.VITE_CLOUDINARY_UPLOAD_PRESET || '', // e.g. 'iraqstore_unsigned'
  },

  imgbb: {
    apiKey: env.VITE_IMGBB_API_KEY || '',
  },
};

/** True when the chosen provider is actually configured. */
export function uploadConfigured() {
  const { provider, cloudinary, imgbb } = IMAGE_UPLOAD;
  if (provider === 'cloudinary') return !!(cloudinary.cloudName && cloudinary.uploadPreset);
  if (provider === 'imgbb') return !!imgbb.apiKey;
  return false;
}

/**
 * Rewrite a Cloudinary delivery URL to serve an optimised, resized image
 * (auto format + quality, capped width). Keeps the storefront featherweight.
 * Non-Cloudinary URLs (base64, ImgBB, Unsplash) are returned unchanged.
 */
export function cdnImage(url, width = 800) {
  if (typeof url !== 'string') return url;
  if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
  }
  return url;
}
