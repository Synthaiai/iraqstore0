import { onAuthStateChanged } from 'firebase/auth';
import { onValue, ref, remove, set, update } from 'firebase/database';
import { auth, db } from '../firebase';
import { SEED_PRODUCTS, toRecord } from './products';

import { deleteIDBProduct, getIDBProducts, setIDBProduct, setIDBProducts } from './db';

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

/* ---------------- IndexedDB & Cache Helpers ---------------- */

let memoryProductsCache = null;

function getLocalProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    return raw ? JSON.parse(raw) : memoryProductsCache;
  } catch {
    return memoryProductsCache;
  }
}

function setLocalProducts(products) {
  memoryProductsCache = products;
  // Safely write to IndexedDB without blocking
  setIDBProducts(products);

  // Try storing a tiny snapshot (first 50 items) in localStorage if needed, without throwing quota error
  try {
    if (products && products.length <= 80) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
    } else {
      localStorage.removeItem(STORAGE_KEY_PRODUCTS);
    }
  } catch (e) {
    try {
      localStorage.removeItem(STORAGE_KEY_PRODUCTS);
    } catch {}
  }
}

const RTDB_REST_URL = 'https://store-29692-default-rtdb.firebaseio.com/products.json';

export async function fetchFreshSnapshot() {
  try {
    const res = await fetch(`${RTDB_REST_URL}?cacheBust=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        const list = Object.values(data);
        if (list.length > 0) {
          setLocalProducts(list);
          return list;
        }
      }
    }
  } catch (e) {
    console.warn('REST fetch fallback error:', e);
  }
  return null;
}

/* ---------------- Products Realtime & Fallback ---------------- */

export function listenProducts(cb) {
  let initialLoaded = false;

  // 1. Instantly return memory or IndexedDB cache for instant render
  if (memoryProductsCache && memoryProductsCache.length) {
    cb(memoryProductsCache);
  } else {
    getIDBProducts().then((cached) => {
      if (!initialLoaded && cached && cached.length) {
        memoryProductsCache = cached;
        cb(cached);
      }
    });
  }

  // 2. Immediate REST snapshot in parallel to bypass throttled mobile WebSockets
  fetchFreshSnapshot().then((fresh) => {
    if (fresh && fresh.length) {
      initialLoaded = true;
      notifyStatus('online');
      cb(fresh);
    }
  });

  // 3. Listen for mobile tab reactivation (unlocking phone / returning to browser tab)
  if (typeof window !== 'undefined') {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchFreshSnapshot().then((fresh) => {
          if (fresh && fresh.length) cb(fresh);
        });
      }
    };
    const onOnline = () => {
      fetchFreshSnapshot().then((fresh) => {
        if (fresh && fresh.length) cb(fresh);
      });
    };
    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('online', onOnline);
  }

  // 4. Realtime sync online for ALL users via Firebase Realtime Database
  try {
    const unsub = onValue(
      ref(db, 'products'),
      (snap) => {
        initialLoaded = true;
        notifyStatus('online');
        const val = snap.val();
        
        if (val && typeof val === 'object' && Object.keys(val).length > 0) {
          const cloudList = Object.values(val);
          // Directly apply cloud truth so deleted/updated products are strictly reflected on all devices
          setLocalProducts(cloudList);
          cb(cloudList);
        } else {
          // Cloud has no products or null — NEVER wipe local cache!
          getIDBProducts().then((cached) => {
            const list = cached && cached.length ? cached : (memoryProductsCache || getLocalProducts() || []);
            if (list.length > 0) {
              setLocalProducts(list);
              cb(list);
              // If admin is active, auto-push existing products to Firebase cloud
              try {
                const batchMap = {};
                list.forEach((p) => { if (p && p.id) batchMap[p.id] = p; });
                update(ref(db, 'products'), batchMap).catch((e) => console.warn('Auto cloud sync:', e));
              } catch (e) {}
            } else {
              cb([]);
            }
          });
        }
      },
      (error) => {
        console.warn('Firebase DB read error:', error);
        notifyStatus('offline');
        getIDBProducts().then((cached) => cb(cached || getLocalProducts() || []));
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
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const idx = current.findIndex((p) => String(p.id) === String(record.id));
  let updated;
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = record;
  } else {
    updated = [record, ...current];
  }
  setLocalProducts(updated);
  setIDBProduct(record);

  // Push to Firebase Realtime DB online so all users receive the updated product instantly
  try {
    await withTimeout(set(ref(db, `products/${record.id}`), record), 6000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase save fallback to local IDB:', err);
    notifyStatus('offline');
  }
  return record;
}

export async function deleteProduct(id) {
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const updated = current.filter((p) => String(p.id) !== String(id));
  setLocalProducts(updated);
  deleteIDBProduct(id);

  try {
    await withTimeout(remove(ref(db, `products/${id}`)), 5000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase delete fallback:', err);
    notifyStatus('offline');
  }
  return true;
}

export async function saveProductsBatch(recordsList) {
  if (!Array.isArray(recordsList) || !recordsList.length) return true;

  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const map = new Map(current.map((p) => [String(p.id), p]));
  const dbBatchMap = {};

  recordsList.forEach((rec) => {
    map.set(String(rec.id), rec);
    dbBatchMap[rec.id] = rec;
  });

  const updatedList = Array.from(map.values());
  setLocalProducts(updatedList);

  try {
    await withTimeout(update(ref(db, 'products'), dbBatchMap), 12000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase saveProductsBatch fallback to IDB:', err);
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
    await withTimeout(set(ref(db, 'products'), map), 8000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase seed fallback:', err);
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

function encodeTreeForFirebase(tree) {
  if (!tree) return null;
  const copy = JSON.parse(JSON.stringify(tree));
  if (copy.subcategories && typeof copy.subcategories === 'object') {
    const encodedSubs = {};
    for (const [k, v] of Object.entries(copy.subcategories)) {
      const safeKey = k.replace(/\//g, '___');
      encodedSubs[safeKey] = v;
    }
    copy.subcategories = encodedSubs;
  }
  return copy;
}

function decodeTreeFromFirebase(tree) {
  if (!tree) return null;
  const copy = JSON.parse(JSON.stringify(tree));
  if (copy.subcategories && typeof copy.subcategories === 'object') {
    const decodedSubs = {};
    for (const [k, v] of Object.entries(copy.subcategories)) {
      const normalKey = k.replace(/___/g, '/');
      decodedSubs[normalKey] = v;
    }
    copy.subcategories = decodedSubs;
  }
  return copy;
}

export function getLocalCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    return raw ? decodeTreeFromFirebase(JSON.parse(raw)) : null;
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
        const decoded = decodeTreeFromFirebase(val);
        try {
          localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(decoded));
        } catch (e) {}
        cb(decoded);
      }
    });
  } catch {
    return () => {};
  }
}

export async function saveCatalog(tree) {
  const decodedTree = decodeTreeFromFirebase(tree);
  try {
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(decodedTree));
  } catch (e) {}

  try {
    const encodedTree = encodeTreeForFirebase(decodedTree);
    await withTimeout(set(ref(db, 'catalog'), encodedTree), 8000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase saveCatalog fallback:', err);
    notifyStatus('offline');
  }
  return decodedTree;
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
  } catch (err) {
    console.warn('Firebase save fallback to local IDB:', err);
    notifyStatus('offline');
  }
  return record;
}

export async function deleteProduct(id) {
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const updated = current.filter((p) => String(p.id) !== String(id));
  setLocalProducts(updated);
  deleteIDBProduct(id);

  try {
    await withTimeout(remove(ref(db, `products/${id}`)), 5000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase delete fallback:', err);
    notifyStatus('offline');
  }
  return true;
}

export async function saveProductsBatch(recordsList) {
  if (!Array.isArray(recordsList) || !recordsList.length) return true;

  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const map = new Map(current.map((p) => [String(p.id), p]));
  const dbBatchMap = {};

  recordsList.forEach((rec) => {
    map.set(String(rec.id), rec);
    dbBatchMap[rec.id] = rec;
  });

  const updatedList = Array.from(map.values());
  setLocalProducts(updatedList);

  try {
    await withTimeout(update(ref(db, 'products'), dbBatchMap), 12000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase saveProductsBatch fallback to IDB:', err);
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
    await withTimeout(set(ref(db, 'products'), map), 8000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase seed fallback:', err);
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

function encodeTreeForFirebase(tree) {
  if (!tree) return null;
  const copy = JSON.parse(JSON.stringify(tree));
  if (copy.subcategories && typeof copy.subcategories === 'object') {
    const encodedSubs = {};
    for (const [k, v] of Object.entries(copy.subcategories)) {
      const safeKey = k.replace(/\//g, '___');
      encodedSubs[safeKey] = v;
    }
    copy.subcategories = encodedSubs;
  }
  return copy;
}

function decodeTreeFromFirebase(tree) {
  if (!tree) return null;
  const copy = JSON.parse(JSON.stringify(tree));
  if (copy.subcategories && typeof copy.subcategories === 'object') {
    const decodedSubs = {};
    for (const [k, v] of Object.entries(copy.subcategories)) {
      const normalKey = k.replace(/___/g, '/');
      decodedSubs[normalKey] = v;
    }
    copy.subcategories = decodedSubs;
  }
  return copy;
}

export function getLocalCatalog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATALOG);
    return raw ? decodeTreeFromFirebase(JSON.parse(raw)) : null;
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
        const decoded = decodeTreeFromFirebase(val);
        try {
          localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(decoded));
        } catch (e) {}
        cb(decoded);
      }
    });
  } catch {
    return () => {};
  }
}

export async function saveCatalog(tree) {
  const decodedTree = decodeTreeFromFirebase(tree);
  try {
    localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(decodedTree));
  } catch (e) {}

  try {
    const encodedTree = encodeTreeForFirebase(decodedTree);
    await withTimeout(set(ref(db, 'catalog'), encodedTree), 8000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase saveCatalog fallback:', err);
    notifyStatus('offline');
  }
  return decodedTree;
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

export async function fetchCloudOrdersSnapshot(cb) {
  try {
    let url = 'https://store-29692-default-rtdb.firebaseio.com/orders.json';
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(true);
        if (token) url += '?auth=' + token;
      } catch (_) {}
    }
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && !data.error) {
        const list = Object.values(data);
        const merged = mergeOrdersList(getLocalOrders(), list);
        setLocalOrders(merged);
        if (cb) cb(merged);
        return merged;
      }
    }
  } catch (e) {
    console.warn('fetchCloudOrdersSnapshot fallback:', e);
  }
  return null;
}

function mergeOrdersList(existing, incoming) {
  const map = new Map();
  (existing || []).forEach((o) => {
    if (o && (o.id || o.orderNo)) map.set(o.id || o.orderNo, o);
  });
  (incoming || []).forEach((o) => {
    if (o && (o.id || o.orderNo)) {
      const key = o.id || o.orderNo;
      const prev = map.get(key);
      map.set(key, { ...prev, ...o });
    }
  });
  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return merged;
}

export function listenOrders(cb) {
  cb(getLocalOrders());

  let bc = null;
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('iraqstore_orders_channel');
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.list) {
          const merged = mergeOrdersList(getLocalOrders(), ev.data.list);
          setLocalOrders(merged);
          cb(merged);
        } else if (ev.data && ev.data.order) {
          const merged = mergeOrdersList(getLocalOrders(), [ev.data.order]);
          setLocalOrders(merged);
          cb(merged);
        }
      };
    }
  } catch (_) {}

  fetchCloudOrdersSnapshot(cb);

  let unsubWs = () => {};
  const setupRealtime = () => {
    try {
      if (unsubWs) { try { unsubWs(); } catch (_) {} }
      unsubWs = onValue(
        ref(db, 'orders'),
        (snap) => {
          notifyStatus('online');
          const val = snap.val();
          if (val && typeof val === 'object') {
            const list = Object.values(val);
            const merged = mergeOrdersList(getLocalOrders(), list);
            setLocalOrders(merged);
            cb(merged);
          }
        },
        () => {
          fetchCloudOrdersSnapshot(cb);
        }
      );
    } catch (_) {}
  };

  setupRealtime();

  let unsubAuth = () => {};
  try {
    if (auth) {
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          fetchCloudOrdersSnapshot(cb);
          setupRealtime();
        }
      });
    }
  } catch (_) {}

  const orderUpdateHandler = (e) => cb(e.detail || getLocalOrders());
  const storageHandler = (e) => {
    if (e.key === STORAGE_KEY_ORDERS) cb(getLocalOrders());
  };
  const visibilityHandler = () => {
    if (document.visibilityState === 'visible') fetchCloudOrdersSnapshot(cb);
  };
  const onlineHandler = () => fetchCloudOrdersSnapshot(cb);

  if (typeof window !== 'undefined') {
    window.addEventListener('iraqstore_orders_updated', orderUpdateHandler);
    window.addEventListener('storage', storageHandler);
    window.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('online', onlineHandler);
  }

  return () => {
    if (unsubWs) unsubWs();
    if (unsubAuth) unsubAuth();
    if (bc) {
      try { bc.close(); } catch (_) {}
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('iraqstore_orders_updated', orderUpdateHandler);
      window.removeEventListener('storage', storageHandler);
      window.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('online', onlineHandler);
    }
  };
}

export async function saveOrder(orderRecord) {
  const orderId = orderRecord.orderNo || `IQ${Date.now().toString().slice(-6)}`;
  const fullOrder = {
    id: orderId,
    orderNo: orderId,
    status: 'new', // 'new' | 'processing' | 'shipped' | 'completed' | 'cancelled'
    createdAt: new Date().toISOString(),
    ...orderRecord,
  };

  const current = getLocalOrders();
  const updated = [fullOrder, ...current.filter((o) => o.id !== fullOrder.id && o.orderNo !== fullOrder.id)];
  setLocalOrders(updated);

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('iraqstore_orders_updated', { detail: updated }));
    } catch (_) {}

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('iraqstore_orders_channel');
        bc.postMessage({ type: 'NEW_ORDER', order: fullOrder, list: updated });
        bc.close();
      }
    } catch (_) {}
  }

  // Push to Firebase Realtime Database with timeout and fallback
  try {
    await withTimeout(set(ref(db, `orders/${fullOrder.id}`), fullOrder), 6000);
    notifyStatus('online');
  } catch (err) {
    console.warn('Firebase set order fallback to REST:', err);
    try {
      await fetch(`https://store-29692-default-rtdb.firebaseio.com/orders/${fullOrder.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullOrder),
        keepalive: true,
      });
    } catch (e) {
      console.warn('REST order save error:', e);
    }
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
