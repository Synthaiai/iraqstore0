import { onValue, ref, remove, set, update } from 'firebase/database';
import { db } from '../firebase';
import { SEED_PRODUCTS, toRecord } from './products';

const STORAGE_KEY_PRODUCTS = 'iraqstore_products_v1';
const STORAGE_KEY_CATALOG = 'iraqstore_catalog_v1';
const STORAGE_KEY_SETTINGS = 'iraqstore_settings_v1';
const STORAGE_KEY_ORDERS = 'iraqstore_orders_v1';

let connectionStatus = 'checking'; // 'online' | 'offline' | 'checking'
const statusListeners = new Set();

function notifyStatus(status) {
  connectionStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

export function subscribeConnectionStatus(cb) {
  statusListeners.add(cb);
  cb(connectionStatus);
  return () => statusListeners.delete(cb);
}

export function getConnectionStatus() {
  return connectionStatus;
}

/** Helper to wrap any Firebase promise with a strict timeout */
function withTimeout(promise, ms = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT'));
    }, ms);
    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/* ---------------- Local Storage Helpers ---------------- */

function getLocalProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Base64 data-URL images (the Storage-upload fallback) are huge — caching them
 * in localStorage quickly blows the ~5 MB quota and then breaks the cart write.
 * The offline cache only needs the product metadata, so strip inline images
 * before storing; the live database still serves the real images when online.
 */
function slimForCache(products) {
  return products.map((p) => {
    if (Array.isArray(p.images) && p.images.some((u) => typeof u === 'string' && u.startsWith('data:'))) {
      return { ...p, images: p.images.filter((u) => typeof u === 'string' && !u.startsWith('data:')) };
    }
    return p;
  });
}

function setLocalProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(slimForCache(products)));
  } catch (e) {
    // Even slimmed it doesn't fit — drop the cache so the cart/favorites keys
    // always have room. The live database remains the source of truth online.
    try {
      localStorage.removeItem(STORAGE_KEY_PRODUCTS);
    } catch {
      /* ignore */
    }
    console.warn('Products cache skipped (storage full):', e);
  }
}

/* ---------------- Products Realtime & Fallback ---------------- */

export function listenProducts(cb) {
  let initialLoaded = false;

  // Immediately load local storage or empty array
  const cached = getLocalProducts();
  if (cached) {
    cb(cached);
  } else {
    cb([]);
  }

  // Subscribe to Firebase Realtime Database
  try {
    const unsub = onValue(
      ref(db, 'products'),
      (snap) => {
        initialLoaded = true;
        notifyStatus('online');
        const val = snap.val();
        const list = val ? Object.values(val) : [];
        setLocalProducts(list);
        cb(list);
      },
      (error) => {
        console.warn('Firebase DB read error:', error);
        notifyStatus('offline');
        if (!initialLoaded) {
          cb(getLocalProducts() || []);
        }
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Firebase DB connection failed:', err);
    notifyStatus('offline');
    return () => {};
  }
}

export async function saveProduct(record) {
  // Always update local cache first so user interface reflects changes instantly
  const current = getLocalProducts() || SEED_PRODUCTS.map(toRecord);
  const idx = current.findIndex((p) => p.id === record.id);
  let updated;
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = record;
  } else {
    updated = [record, ...current];
  }
  setLocalProducts(updated);

  // Try pushing to Firebase with timeout
  try {
    await withTimeout(set(ref(db, `products/${record.id}`), record), 4000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase save fallback to LocalStorage:', err);
    notifyStatus('offline');
    // Saved locally, return success so user is not stuck on "جارٍ الحفظ"
  }
  return record;
}

export async function deleteProduct(id) {
  const current = getLocalProducts() || [];
  const updated = current.filter((p) => p.id !== id);
  setLocalProducts(updated);

  try {
    await withTimeout(remove(ref(db, `products/${id}`)), 4000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase delete fallback to LocalStorage:', err);
    notifyStatus('offline');
  }
  return true;
}

export async function seedProducts() {
  const map = {};
  const list = [];
  SEED_PRODUCTS.forEach((p) => {
    const rec = toRecord(p);
    map[p.id] = rec;
    list.push(rec);
  });

  setLocalProducts(list);

  try {
    await withTimeout(set(ref(db, 'products'), map), 6000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase seed fallback to LocalStorage:', err);
    notifyStatus('offline');
  }
  return true;
}

/* ---------------- Settings (logo, promos…) ---------------- */

export function listenSettings(cb) {
  try {
    const local = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (local) cb(JSON.parse(local));
  } catch (e) {
    /* ignore */
  }

  try {
    return onValue(ref(db, 'settings'), (snap) => {
      const val = snap.val() || {};
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(val));
      } catch (e) {}
      cb(val);
    });
  } catch {
    return () => {};
  }
}

export async function saveSetting(key, value) {
  try {
    const localStr = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const local = localStr ? JSON.parse(localStr) : {};
    local[key] = value;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(local));
  } catch (e) {}

  try {
    await withTimeout(update(ref(db, 'settings'), { [key]: value }), 4000);
  } catch (err) {
    console.warn('Firebase saveSetting fallback:', err);
  }
}

/* ---------------- Catalog Tree (dynamic categories) ---------------- */

export function getLocalCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function listenCatalog(cb) {
  const cached = getLocalCatalog();
  if (cached) cb(cached);

  try {
    return onValue(ref(db, 'catalog'), (snap) => {
      const val = snap.val();
      if (val) {
        localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(val));
        cb(val);
      }
    });
  } catch {
    return () => {};
  }
}

export async function saveCatalog(tree) {
  try {
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(tree));
  } catch (e) {}

  try {
    await withTimeout(set(ref(db, 'catalog'), tree), 4000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase saveCatalog fallback:', err);
    notifyStatus('offline');
  }
  return tree;
}

/* ---------------- Orders Realtime & Fallback ---------------- */

function getLocalOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(orders));
  } catch (e) {
    console.warn('LocalStorage save orders failed:', e);
  }
}

export function listenOrders(cb) {
  let initialLoaded = false;
  const cached = getLocalOrders();
  cb(cached);

  try {
    const unsub = onValue(
      ref(db, 'orders'),
      (snap) => {
        initialLoaded = true;
        notifyStatus('online');
        const val = snap.val();
        const list = val ? Object.values(val) : [];
        setLocalOrders(list);
        cb(list);
      },
      (error) => {
        console.warn('Firebase orders read error:', error);
        notifyStatus('offline');
        if (!initialLoaded) cb(getLocalOrders());
      }
    );
    return unsub;
  } catch (err) {
    console.warn('Firebase orders connection failed:', err);
    notifyStatus('offline');
    return () => {};
  }
}

export async function saveOrder(orderRecord) {
  const fullOrder = {
    id: orderRecord.orderNo || `IQ${Date.now()}`,
    status: 'new', // 'new' | 'processing' | 'shipped' | 'completed' | 'cancelled'
    createdAt: new Date().toISOString(),
    ...orderRecord,
  };

  const current = getLocalOrders();
  const updated = [fullOrder, ...current.filter((o) => o.id !== fullOrder.id)];
  setLocalOrders(updated);

  try {
    await withTimeout(set(ref(db, `orders/${fullOrder.id}`), fullOrder), 4000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase saveOrder fallback:', err);
    notifyStatus('offline');
  }

  return fullOrder;
}

export async function updateOrderStatus(orderId, status) {
  const current = getLocalOrders();
  const idx = current.findIndex((o) => o.id === orderId || o.orderNo === orderId);
  if (idx >= 0) {
    current[idx].status = status;
    current[idx].updatedAt = new Date().toISOString();
    setLocalOrders(current);
  }

  try {
    await withTimeout(update(ref(db, `orders/${orderId}`), { status, updatedAt: new Date().toISOString() }), 4000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase updateOrderStatus fallback:', err);
    notifyStatus('offline');
  }
}

export async function deleteOrder(orderId) {
  const current = getLocalOrders();
  const updated = current.filter((o) => o.id !== orderId && o.orderNo !== orderId);
  setLocalOrders(updated);

  try {
    await withTimeout(remove(ref(db, `orders/${orderId}`)), 4000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase deleteOrder fallback:', err);
    notifyStatus('offline');
  }
  return true;
}

