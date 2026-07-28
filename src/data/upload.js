import { getDownloadURL, ref as sref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';
import { compressImage } from '../utils/imageCompressor';

/**
 * Upload a File to Storage after compressing it.
 * Falls back to compressed data URL if Firebase Storage is unavailable/offline/permission-denied.
 */
export async function uploadImage(file, folder = 'products') {
  if (!file) return null;

  // 1. Compress image client-side first
  const { file: compressedFile, dataUrl } = await compressImage(file, 1000, 0.75);
  const targetFile = compressedFile || file;

  // 2. Try Firebase Storage with 4-second timeout
  try {
    const cleanName = targetFile.name.replace(/[^a-zA-Z0-9.]+/g, '-');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${cleanName}`;
    const storageRef = sref(storage, path);

    const uploadTask = uploadBytes(storageRef, targetFile);
    const timeoutTask = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Storage Timeout')), 4000)
    );

    await Promise.race([uploadTask, timeoutTask]);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn('Firebase Storage upload failed or timed out — using compressed data URL:', err);
    // Fallback to compressed base64 data URL so image saving NEVER fails or hangs!
    return dataUrl || URL.createObjectURL(targetFile);
  }
}
