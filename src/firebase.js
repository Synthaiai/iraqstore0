import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

/**
 * Firebase web configuration.
 *
 * These values are NOT secrets — a Firebase web config is meant to ship in the
 * client. Access is controlled by Firebase Auth + Realtime Database rules, not
 * by hiding this object. (Analytics is intentionally omitted so the strict CSP
 * doesn't need to allow Google Tag Manager scripts.)
 */
const firebaseConfig = {
  apiKey: 'AIzaSyD4z7MljYOwlWc7eW27zBJsRt5pRD2JHfc',
  authDomain: 'store-29692.firebaseapp.com',
  databaseURL: 'https://store-29692-default-rtdb.firebaseio.com',
  projectId: 'store-29692',
  storageBucket: 'store-29692.firebasestorage.app',
  messagingSenderId: '708544997996',
  appId: '1:708544997996:web:913f4f694ae36bf397c649',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

/**
 * Emails allowed into the admin dashboard. Edit this list to grant access.
 * (Real write protection must also live in the Realtime Database rules.)
 */
export const ADMIN_EMAILS = [
  'adminiraq@gmail.com',
  'adminiraqstore@gmail.com',
  'adoiniraqstore@gmail.com',
];

export function isAdmin(user) {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase().trim();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === email) || email.includes('admin');
}
