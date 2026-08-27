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

/* ---------------- Orders Master Store (Zero Flicker, Zero Duplication, Pure Cloud Native) ---------------- */

const masterOrdersMap = new Map();
const ordersSubscribers = new Set();

export function normalizeOrderRecord(o) {
  if (!o || (!o.id && !o.orderNo)) return null;
  const orderId = String(o.orderNo || o.id);

  // Guarantee cart is always a clean array
  let cartList = [];
  if (Array.isArray(o.cart)) {
    cartList = o.cart;
  } else if (o.cart && typeof o.cart === 'object') {
    cartList = Object.values(o.cart);
  }

  // Guarantee item quantities and prices are valid numbers
  cartList = cartList.map((item, idx) => ({
    ...item,
    key: item.key || `${item.product?.id || 'item'}-${idx}`,
    qty: Math.max(1, Number(item.qty) || 1),
    price: Number(item.product?.price || item.price) || 0,
  }));

  const subtotal = Number(o.subtotal) || 0;
  const fee = Number(o.fee) || 0;
  const total = Number(o.total) || (subtotal + fee) || 0;
  const itemCount = Number(o.itemCount) || cartList.reduce((acc, item) => acc + item.qty, 0) || 1;

  return {
    ...o,
    id: orderId,
    orderNo: orderId,
    name: o.name || 'زبون',
    phone: o.phone || '',
    governorate: o.governorate || '',
    city: o.city || '',
    address: o.address || '',
    notes: o.notes || '',
    status: o.status || 'new',
    createdAt: o.createdAt || new Date().toISOString(),
    cart: cartList,
    itemCount,
    subtotal,
    fee,
    total,
    payment: o.payment || 'cod',
    paymentLabel: o.paymentLabel || (o.payment === 'card' ? 'الدفع عن طريق الماستر الرافدين' : 'الدفع عند الاستلام'),
  };
}

// Pre-fill masterOrdersMap from persistent localStorage
try {
  const cachedOrders = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ORDERS) : null;
  if (cachedOrders) {
    const list = JSON.parse(cachedOrders);
    if (Array.isArray(list)) {
      list.forEach((raw) => {
        const norm = normalizeOrderRecord(raw);
        if (norm) masterOrdersMap.set(norm.id, norm);
      });
    }
  }
} catch (_) {}

function persistAndBroadcastOrders() {
  const list = Array.from(masterOrdersMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  // 1. Persistent local storage
  try {
    localStorage.setItem(STORAGE_KEY_ORDERS, JSON.stringify(list));
  } catch (_) {}

  // 2. Global window reference
  try {
    window.__iraqstore_orders = list;
  } catch (_) {}

  // 3. Custom event for local tabs
  try {
    window.dispatchEvent(new CustomEvent('iraqstore_orders_updated', { detail: list }));
  } catch (_) {}

  // 4. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('iraqstore_orders_channel');
      bc.postMessage({ type: 'ORDERS_SYNC', list });
      bc.close();
    }
  } catch (_) {}

  // 5. Notify in-memory subscribers
  ordersSubscribers.forEach((cb) => {
    try {
      cb(list);
    } catch (_) {}
  });
}

function ingestOrders(incoming) {
  if (!incoming) return;
  const list = Array.isArray(incoming) ? incoming : typeof incoming === 'object' ? Object.values(incoming) : [];
  if (!list.length) return;

  let hasChanges = false;
  list.forEach((raw) => {
    const o = normalizeOrderRecord(raw);
    if (o) {
      const key = o.id;
      const existing = masterOrdersMap.get(key);
      if (!existing) {
        masterOrdersMap.set(key, o);
        hasChanges = true;
      } else {
        if (
          existing.status !== o.status ||
          existing.updatedAt !== o.updatedAt ||
          existing.total !== o.total ||
          existing.notes !== o.notes ||
          JSON.stringify(existing.cart) !== JSON.stringify(o.cart)
        ) {
          masterOrdersMap.set(key, { ...existing, ...o });
          hasChanges = true;
        }
      }
    }
  });

  if (hasChanges) {
    persistAndBroadcastOrders();
  }
}

// Cross-tab broadcast listener
if (typeof window !== 'undefined') {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('iraqstore_orders_channel');
      bc.onmessage = (ev) => {
        if (ev.data && ev.data.list) {
          ingestOrders(ev.data.list);
        }
      };
    }
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY_ORDERS && e.newValue) {
        try {
          ingestOrders(JSON.parse(e.newValue));
        } catch (_) {}
      }
    });
  } catch (_) {}
}

export function getLocalOrders() {
  return Array.from(masterOrdersMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );
}

export async function fetchCloudOrdersSnapshot(cb) {
  // 1. Local Network Server
  try {
    const locRes = await fetch('/api/orders?t=' + Date.now(), { headers: { 'Cache-Control': 'no-cache' } });
    if (locRes.ok) {
      const locData = await locRes.json();
      if (Array.isArray(locData)) ingestOrders(locData);
    }
  } catch (_) {}

  // 2. Firebase Cloud REST (Pure online without server)
  try {
    let url = 'https://store-29692-default-rtdb.firebaseio.com/orders.json';
    if (auth && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken(false);
        if (token) url += '?auth=' + token;
      } catch (_) {}
    }
    const res = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now(), {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object' && !data.error) {
        ingestOrders(data);
      }
    }
  } catch (_) {}

  const current = getLocalOrders();
  if (cb) cb(current);
  return current;
}

export function listenOrders(cb) {
  ordersSubscribers.add(cb);

  // Immediate emit from master cache
  cb(getLocalOrders());

  // Background cloud fetch
  fetchCloudOrdersSnapshot(cb);

  let unsubWs = () => {};
  const attachLiveListener = () => {
    try {
      if (unsubWs) {
        try { unsubWs(); } catch (_) {}
      }
      unsubWs = onValue(
        ref(db, 'orders'),
        (snap) => {
          const val = snap.val();
          if (val) ingestOrders(val);
        },
        () => {
          fetchCloudOrdersSnapshot(cb);
        }
      );
    } catch (_) {}
  };

  attachLiveListener();

  // Listen to Auth State Changes so when admin logs in on GitHub / Cloudflare, orders sync immediately!
  let unsubAuth = () => {};
  try {
    if (auth && typeof onAuthStateChanged === 'function') {
      unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          await fetchCloudOrdersSnapshot(cb);
          attachLiveListener();
        }
      });
    }
  } catch (_) {}

  // Polling interval every 4s (ensures zero orders are missed online)
  const pollTimer = setInterval(() => {
    fetchCloudOrdersSnapshot(cb);
  }, 4000);

  return () => {
    ordersSubscribers.delete(cb);
    clearInterval(pollTimer);
    if (unsubWs) unsubWs();
    if (unsubAuth) unsubAuth();
  };
}

/**
 * Deduct stock for all items in a placed order
 */
export async function deductStockForOrder(cartItems) {
  if (!Array.isArray(cartItems) || !cartItems.length) return;
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const toUpdate = [];

  for (const item of cartItems) {
    if (!item) continue;
    const prodId = item.productId || (item.product && item.product.id);
    const qty = Math.max(1, Number(item.qty) || 1);
    if (!prodId) continue;

    const prod = current.find((p) => String(p.id) === String(prodId));
    if (prod) {
      const curStock = prod.stockQuantity !== undefined ? Number(prod.stockQuantity) : 15;
      const newStock = Math.max(0, curStock - qty);
      const updated = { ...prod, stockQuantity: newStock };
      toUpdate.push(updated);

      // Push stock quantity directly to Firebase RTDB endpoint
      try {
        fetch(`https://store-29692-default-rtdb.firebaseio.com/products/${prod.id}/stockQuantity.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStock),
        }).catch(() => {});
      } catch (_) {}
    }
  }

  if (toUpdate.length > 0) {
    await saveProductsBatch(toUpdate);
  }
}

/**
 * Restore stock if an order is cancelled
 */
export async function restoreStockForOrder(cartItems) {
  if (!Array.isArray(cartItems) || !cartItems.length) return;
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const toUpdate = [];

  for (const item of cartItems) {
    if (!item) continue;
    const prodId = item.productId || (item.product && item.product.id);
    const qty = Math.max(1, Number(item.qty) || 1);
    if (!prodId) continue;

    const prod = current.find((p) => String(p.id) === String(prodId));
    if (prod) {
      const curStock = prod.stockQuantity !== undefined ? Number(prod.stockQuantity) : 15;
      const newStock = curStock + qty;
      const updated = { ...prod, stockQuantity: newStock };
      toUpdate.push(updated);

      // Push stock quantity directly to Firebase RTDB endpoint
      try {
        fetch(`https://store-29692-default-rtdb.firebaseio.com/products/${prod.id}/stockQuantity.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStock),
        }).catch(() => {});
      } catch (_) {}
    }
  }

  if (toUpdate.length > 0) {
    await saveProductsBatch(toUpdate);
  }
}

export async function saveOrder(orderRecord) {
  const orderId = orderRecord.orderNo || `IQ${Date.now().toString().slice(-6)}`;
  const fullOrder = normalizeOrderRecord({
    id: orderId,
    orderNo: orderId,
    status: 'new', // 'new' | 'processing' | 'shipped' | 'completed' | 'cancelled'
    createdAt: new Date().toISOString(),
    ...orderRecord,
  });

  // Ingest immediately into local memory store & persistent cache
  ingestOrders([fullOrder]);

  // 1. Instant save to local network server API (if available)
  try {
    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullOrder),
      keepalive: true,
    });
  } catch (_) {}

  // 2. Direct REST save to Firebase Realtime Database (Works on GitHub Pages & Cloudflare)
  try {
    await fetch(`https://store-29692-default-rtdb.firebaseio.com/orders/${fullOrder.id}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullOrder),
      keepalive: true,
    });
  } catch (_) {}

  // 3. WebSocket push to Firebase Realtime Database
  try {
    await withTimeout(set(ref(db, `orders/${fullOrder.id}`), fullOrder), 5000);
    notifyStatus('online');
  } catch (_) {}

  // 4. Smart Stock Deduction: decrement stockQuantity for each item in cart
  try {
    if (Array.isArray(fullOrder.cart) && fullOrder.cart.length > 0) {
      await deductStockForOrder(fullOrder.cart);
    }
  } catch (stockErr) {
    console.warn('Stock deduction error:', stockErr);
  }

  return fullOrder;
}

export async function updateOrderStatus(orderId, status) {
  const existing = masterOrdersMap.get(String(orderId));
  if (existing) {
    // Check if status transitioned to/from 'cancelled' to adjust stock
    try {
      if (Array.isArray(existing.cart) && existing.cart.length > 0) {
        if (status === 'cancelled' && existing.status !== 'cancelled') {
          await restoreStockForOrder(existing.cart);
        } else if (existing.status === 'cancelled' && status !== 'cancelled') {
          await deductStockForOrder(existing.cart);
        }
      }
    } catch (stockErr) {
      console.warn('Stock status transition error:', stockErr);
    }

    masterOrdersMap.set(String(orderId), { ...existing, status, updatedAt: new Date().toISOString() });
    persistAndBroadcastOrders();
  }

  // Update local server (if present)
  try {
    await fetch(`/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, orderNo: orderId, status, updatedAt: new Date().toISOString() }),
    });
  } catch (_) {}

  // Update Firebase REST with token
  try {
    let token = null;
    if (auth && auth.currentUser) {
      try { token = await auth.currentUser.getIdToken(false); } catch (_) {}
    }
    let url = `https://store-29692-default-rtdb.firebaseio.com/orders/${orderId}.json`;
    if (token) url += '?auth=' + token;
    await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, updatedAt: new Date().toISOString() }),
    });
  } catch (_) {}

  // Update Firebase WebSocket
  try {
    await withTimeout(update(ref(db, `orders/${orderId}`), { status, updatedAt: new Date().toISOString() }), 4000);
    notifyStatus('online');
  } catch (_) {}
}

export async function deleteOrder(orderId) {
  masterOrdersMap.delete(String(orderId));
  persistAndBroadcastOrders();

  // Delete from local server (if present)
  try {
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
  } catch (_) {}

  // Delete from Firebase REST with token
  try {
    let token = null;
    if (auth && auth.currentUser) {
      try { token = await auth.currentUser.getIdToken(false); } catch (_) {}
    }
    let url = `https://store-29692-default-rtdb.firebaseio.com/orders/${orderId}.json`;
    if (token) url += '?auth=' + token;
    await fetch(url, { method: 'DELETE' });
  } catch (_) {}

  // Delete from Firebase WebSocket
  try {
    await withTimeout(remove(ref(db, `orders/${orderId}`)), 4000);
    notifyStatus('online');
  } catch (_) {}
  return true;
}
