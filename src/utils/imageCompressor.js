/**
 * High-Quality Client-Side Image Compressor Utility
 * Resizes and compresses uploaded images while maintaining high visual clarity,
 * crisp detail, and vibrant colors (Max 1800px, WebP quality 0.88, High Smoothing).
 */

/**
 * Decode a File into something drawable, honouring EXIF orientation.
 *
 * `createImageBitmap` with `imageOrientation: 'from-image'` applies the camera's
 * rotation tag, which a plain `<img>` on a canvas does not: phone photos taken
 * in portrait were being stored sideways. Older Safari lacks the option (and
 * sometimes the function), so an `<img>` decode is kept as the fallback.
 */
async function decodeImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to the <img> path */
    }
  }
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.onload = (e) => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error('DECODE_FAILED'));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

function fittedSize(source, maxDimension) {
  let width = source.width;
  let height = source.height;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }
  return { width: Math.max(1, width), height: Math.max(1, height) };
}

export async function compressImage(file, maxDimension = 1800, quality = 0.88) {
  if (!file || !file.type || !file.type.startsWith('image/')) {
    return { file, dataUrl: null, originalSize: file?.size || 0, compressedSize: file?.size || 0 };
  }

  const originalSize = file.size;
  let source;
  try {
    source = await decodeImage(file);
  } catch {
    return { file, dataUrl: null, originalSize, compressedSize: originalSize };
  }

  const { width, height } = fittedSize(source, maxDimension);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  if (typeof source.close === 'function') source.close();

  // One encode, not two. Encoding to a data URL and then again to a Blob made
  // every compression pass twice as expensive, and the search in
  // `compressImageToLimit` runs this repeatedly.
  const supportsWebp = canvas.toDataURL('image/webp', 0.5).startsWith('data:image/webp');
  const mimeType = supportsWebp ? 'image/webp' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const blob = await new Promise((resolve) => {
    try {
      canvas.toBlob((result) => resolve(result), mimeType, quality);
    } catch {
      resolve(null);
    }
  });

  if (!blob) return { file, dataUrl, originalSize, compressedSize: originalSize };
  const extension = mimeType === 'image/webp' ? '.webp' : '.jpg';
  const cleanName = String(file.name || 'image').replace(/\.[^/.]+$/, '') + extension;
  return {
    file: new File([blob], cleanName, { type: mimeType }),
    dataUrl,
    originalSize,
    compressedSize: blob.size,
    ratio: Math.max(0, Math.round((1 - blob.size / originalSize) * 100)),
  };
}

export async function compressImageToLimit(file, {
  maxBytes = 650 * 1024,
  initialMaxDimension = 1200,
  minDimension = 640,
  initialQuality = 0.78,
  minQuality = 0.48,
} = {}) {
  let maxDimension = initialMaxDimension;
  let quality = initialQuality;
  let best = await compressImage(file, maxDimension, quality);

  while ((best.compressedSize || file.size) > maxBytes && (maxDimension > minDimension || quality > minQuality)) {
    if (quality > minQuality) quality = Math.max(minQuality, quality - 0.08);
    else maxDimension = Math.max(minDimension, Math.round(maxDimension * 0.82));
    best = await compressImage(file, maxDimension, quality);
  }

  return best;
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/** Longest edge of the grid thumbnail that ships inside the product record. */
export const THUMB_DIMENSION = 260;
const THUMB_QUALITY = 0.5;

function drawToDataUrl(image, maxDimension, quality) {
  let { width, height } = image;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const webp = canvas.toDataURL('image/webp', quality);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', quality);
}

/**
 * Build the small grid thumbnail that lives inside the product record.
 *
 * Full-size photos are stored in a separate `productImages/{id}` node so the
 * public catalogue stays small; this is the one image every listing view needs,
 * so it has to be tiny — roughly 6-10KB.
 *
 * Accepts a File, a data URL, or a remote/absolute URL. A non-data URL is
 * already cheap to serve, so it is returned unchanged.
 */
export async function makeThumbnail(source, maxDimension = THUMB_DIMENSION) {
  if (!source) return null;
  if (typeof source === 'string' && !source.startsWith('data:image/')) return source;

  // A File goes through the orientation-aware decoder, so a portrait phone photo
  // does not produce a sideways thumbnail.
  if (typeof source !== 'string') {
    try {
      const bitmap = await decodeImage(source);
      const thumb = drawToDataUrl(bitmap, maxDimension, THUMB_QUALITY);
      if (typeof bitmap.close === 'function') bitmap.close();
      return thumb;
    } catch {
      // A thumbnail is a nice-to-have: never fail a product save over one.
      return null;
    }
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onerror = () => resolve(source);
    image.onload = () => {
      try {
        resolve(drawToDataUrl(image, maxDimension, THUMB_QUALITY));
      } catch {
        resolve(source);
      }
    };
    image.src = source;
  });
}
