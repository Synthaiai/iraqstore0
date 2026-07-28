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

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
