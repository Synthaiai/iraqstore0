import { getDownloadURL, ref as sref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Upload a File to Storage under `folder/` and return its public download URL.
 * Lives in its own module so `firebase/storage` only ships with the admin chunk.
 */
export async function uploadImage(file, folder = 'products') {
  const clean = file.name.replace(/[^a-zA-Z0-9.]+/g, '-');
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${clean}`;
  const r = sref(storage, path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}
