import { getDownloadURL, ref as sref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase';
import { compressImage } from '../utils/imageCompressor';

/**
 * Upload a File to Storage after compressing it.
 * Images are never embedded as base64 in product records: that would make every
 * catalogue read download every image and quickly exhaust the database quota.
 */
export async function uploadImage(file, folder = 'products') {
  if (!file) return null;
  const accepted = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
  if (!accepted.has(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.');
  if (file.size > 12 * 1024 * 1024) throw new Error('حجم الصورة الأصلية يتجاوز 12MB.');

  // 1. Compress image client-side first
  const { file: compressedFile } = await compressImage(file, 1200, 0.78);
  const targetFile = compressedFile || file;

  // 2. Upload with a bounded, cancellable timeout suitable for mobile networks.
  try {
    const cleanName = targetFile.name.replace(/[^a-zA-Z0-9.]+/g, '-');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;
    const storageRef = sref(storage, path);

    const uploadTask = uploadBytesResumable(storageRef, targetFile, { contentType: targetFile.type });
    const snapshot = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error('Storage Timeout'));
      }, 30_000);
      uploadTask.on('state_changed', undefined, (error) => {
        clearTimeout(timeout);
        reject(error);
      }, () => {
        clearTimeout(timeout);
        resolve(uploadTask.snapshot);
      });
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.error('Firebase Storage upload failed:', err);
    throw new Error('تعذر رفع الصورة. تحقق من الاتصال وحاول مجددًا؛ لم تُحفظ الصورة داخل قاعدة البيانات.');
  }
}
