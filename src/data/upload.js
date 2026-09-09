import { getDownloadURL, ref as sref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase';
import { compressImage, formatBytes } from '../utils/imageCompressor';

const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ORIGINAL_IMAGE_LIMIT = 12 * 1024 * 1024;
const INLINE_IMAGE_LIMIT = 950 * 1024;
let storageUnavailableForSession = false;

function assertImage(file) {
  if (!file) return;
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) throw new Error('نوع الصورة غير مدعوم. استخدم JPG أو PNG أو WebP أو AVIF.');
  if (file.size > ORIGINAL_IMAGE_LIMIT) throw new Error('حجم الصورة الأصلية يتجاوز 12MB.');
}

async function uploadToFirebaseStorage(file, folder) {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]+/g, '-');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;
  const storageRef = sref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });
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
  return getDownloadURL(snapshot.ref);
}

async function inlineCompressedImage(file) {
  const firstPass = await compressImage(file, 900, 0.62);
  let dataUrl = firstPass.dataUrl;
  let compressedSize = firstPass.compressedSize || dataUrl?.length || file.size;

  if (!dataUrl || dataUrl.length > INLINE_IMAGE_LIMIT) {
    const secondPass = await compressImage(firstPass.file || file, 720, 0.52);
    dataUrl = secondPass.dataUrl;
    compressedSize = secondPass.compressedSize || dataUrl?.length || compressedSize;
  }

  if (!dataUrl || dataUrl.length > INLINE_IMAGE_LIMIT) {
    throw new Error(`الصورة بعد الضغط ما زالت كبيرة (${formatBytes(compressedSize)}). اختر صورة أصغر أو قصّها ثم حاول مجدداً.`);
  }

  return dataUrl;
}

/**
 * Upload a File. Firebase Storage is preferred when available, but the store can
 * still work on the free setup: if Storage is not enabled, save a small WebP data
 * URL inside the product record so adding products does not fail.
 */
export async function uploadImage(file, folder = 'products') {
  if (!file) return null;
  assertImage(file);

  const { file: compressedFile } = await compressImage(file, 1200, 0.78);
  const targetFile = compressedFile || file;

  if (!storageUnavailableForSession) {
    try {
      return await uploadToFirebaseStorage(targetFile, folder);
    } catch (err) {
      storageUnavailableForSession = true;
      console.warn('Firebase Storage upload failed; falling back to inline compressed image:', err);
    }
  }

  try {
    return await inlineCompressedImage(file);
  } catch (err) {
    throw new Error(err?.message || 'تعذر تجهيز الصورة مجاناً. اختر صورة أصغر وحاول مجدداً.');
  }
}
