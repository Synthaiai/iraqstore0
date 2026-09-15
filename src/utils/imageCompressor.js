/**
 * High-Quality Client-Side Image Compressor Utility
 * Resizes and compresses uploaded images while maintaining high visual clarity,
 * crisp detail, and vibrant colors (Max 1800px, WebP quality 0.88, High Smoothing).
 */

export async function compressImage(file, maxDimension = 1800, quality = 0.88) {
  if (!file || !file.type.startsWith('image/')) {
    return { file, dataUrl: null, originalSize: file?.size || 0, compressedSize: file?.size || 0 };
  }

  const originalSize = file.size;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve({ file, dataUrl: null, originalSize, compressedSize: originalSize });
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve({ file, dataUrl: null, originalSize, compressedSize: originalSize });
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize only if image exceeds maxDimension (e.g. 1800px)
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
        
        // High quality scaling options
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP for superior quality-to-size ratio, fallback to JPEG
        let mimeType = 'image/webp';
        let dataUrl = canvas.toDataURL(mimeType, quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          mimeType = 'image/jpeg';
          dataUrl = canvas.toDataURL(mimeType, quality);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve({ file, dataUrl, originalSize, compressedSize: originalSize });
            }
            const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            const compressedFile = new File([blob], cleanName, { type: mimeType });
            resolve({
              file: compressedFile,
              dataUrl,
              originalSize,
              compressedSize: blob.size,
              ratio: Math.max(0, Math.round((1 - (blob.size / originalSize)) * 100)),
            });
          },
          mimeType,
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
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

  const src = typeof source === 'string'
    ? source
    : await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(source);
    });

  return new Promise((resolve) => {
    const image = new Image();
    // A thumbnail is a nice-to-have: never fail a product save over one.
    image.onerror = () => resolve(typeof source === 'string' ? source : null);
    image.onload = () => {
      try {
        resolve(drawToDataUrl(image, maxDimension, THUMB_QUALITY));
      } catch {
        resolve(typeof source === 'string' ? source : null);
      }
    };
    image.src = src;
  });
}
