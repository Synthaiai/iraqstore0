import { SEED_PRODUCTS, toRecord } from './products';
import { deleteIDBProduct, getIDBProducts, setIDBProduct, setIDBProducts } from './db';

const STORAGE_KEY_PRODUCTS = 'iraqstore_products_v1';
const STORAGE_KEY_CATALOG = 'iraqstore_catalog_v1';
const STORAGE_KEY_SETTINGS = 'iraqstore_settings_v1';
const CATALOG_REFRESH_MS = 5 * 60_000;
const ORDERS_REFRESH_MS = 30_000;

let connectionStatus = 'checking';
const statusListeners = new Set();
const productListeners = new Set();
const settingsListeners = new Set();
const catalogListeners = new Set();
const ordersListeners = new Set();
let memoryProductsCache = null;
let latestSettings = {};
let latestCatalog = null;
let ordersCache = [];
let ordersNextCursor = null;
let catalogTimer = null;
let ordersTimer = null;
let adminCatalogSubscribers = 0;

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

function withTimeout(promise, ms = 6000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

async function firebaseAdminContext() {
  const [{ ref, remove, set, update }, { auth, db }] = await Promise.all([
    import('firebase/database'),
    import('../firebase'),
  ]);
  if (!auth.currentUser) throw new Error('يجب تسجيل الدخول كمدير.');
  return { ref, remove, set, update, auth, db };
}

async function authHeaders(required = false) {
  const headers = { accept: 'application/json' };
  if (!required) return headers;
  const { auth } = await import('../firebase');
  if (!auth.currentUser) throw new Error('يجب تسجيل الدخول كمدير.');
  headers.authorization = `Bearer ${await auth.currentUser.getIdToken(false)}`;
  return headers;
}

async function apiJson(url, options = {}) {
  const { admin = false, ...fetchOptions } = options;
  const headers = { ...(await authHeaders(admin)), ...(fetchOptions.headers || {}) };
  const response = await fetch(url, { ...fetchOptions, headers });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok || body?.ok === false) {
    const error = new Error(body?.error?.message || `HTTP_${response.status}`);
    error.code = body?.error?.code || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return body;
}

function setLocalProducts(products) {
  memoryProductsCache = Array.isArray(products) ? products : [];
  setIDBProducts(memoryProductsCache);
  try {
    if (memoryProductsCache.length <= 80) localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(memoryProductsCache));
    else localStorage.removeItem(STORAGE_KEY_PRODUCTS);
  } catch {}
}

function decodeTreeFromFirebase(tree) {
  if (!tree) return null;
  const copy = JSON.parse(JSON.stringify(tree));
  if (copy.subcategories && typeof copy.subcategories === 'object') {
    const decoded = {};
    Object.entries(copy.subcategories).forEach(([key, value]) => { decoded[key.replaceAll('__', '/')] = value; });
    copy.subcategories = decoded;
  }
  return copy;
}

function publishBundle(bundle) {
  const products = Array.isArray(bundle?.products) ? bundle.products : [];
  if (products.length || memoryProductsCache === null) {
    setLocalProducts(products);
    productListeners.forEach((cb) => cb(products));
  }
  latestSettings = bundle?.settings || {};
  latestCatalog = decodeTreeFromFirebase(bundle?.catalog) || null;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(latestSettings));
    if (latestCatalog) localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(latestCatalog));
  } catch {}
  settingsListeners.forEach((cb) => cb(latestSettings));
  if (latestCatalog) catalogListeners.forEach((cb) => cb(latestCatalog));
}

async function fetchFirebaseFallback(includeDrafts = false) {
  const base = 'https://store-29692-default-rtdb.firebaseio.com';
  const [productsRes, settingsRes, catalogRes] = await Promise.all([
    fetch(`${base}/products.json`), fetch(`${base}/settings.json`), fetch(`${base}/catalog.json`),
  ]);
  if (!productsRes.ok) throw new Error('CATALOG_UNAVAILABLE');
  const rawProducts = await productsRes.json();
  const products = rawProducts && typeof rawProducts === 'object' ? Object.values(rawProducts) : [];
  return {
    products: includeDrafts ? products : products.filter((product) => product?.status !== 'draft'),
    settings: settingsRes.ok ? (await settingsRes.json()) || {} : {},
    catalog: catalogRes.ok ? await catalogRes.json() : null,
  };
}

export async function fetchFreshSnapshot({ includeDrafts = false } = {}) {
  try {
    const url = includeDrafts ? '/api/catalog?includeDrafts=1' : '/api/catalog';
    const body = await apiJson(url, { admin: includeDrafts });
    publishBundle(body);
    notifyStatus('online');
    return body.products || [];
  } catch {
    try {
      const bundle = await fetchFirebaseFallback(includeDrafts);
      publishBundle(bundle);
      notifyStatus('degraded');
      return bundle.products;
    } catch {
      notifyStatus('offline');
      return null;
    }
  }
}

function refreshCatalogWhenVisible() {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine) {
    fetchFreshSnapshot({ includeDrafts: adminCatalogSubscribers > 0 });
  }
}

function ensureCatalogRefresh() {
  if (catalogTimer || typeof window === 'undefined') return;
  catalogTimer = setInterval(refreshCatalogWhenVisible, CATALOG_REFRESH_MS);
  window.addEventListener('online', refreshCatalogWhenVisible);
  window.addEventListener('visibilitychange', refreshCatalogWhenVisible);
}

function stopCatalogRefreshIfIdle() {
  if (productListeners.size || settingsListeners.size || catalogListeners.size || !catalogTimer) return;
  clearInterval(catalogTimer);
  catalogTimer = null;
  window.removeEventListener('online', refreshCatalogWhenVisible);
  window.removeEventListener('visibilitychange', refreshCatalogWhenVisible);
}

export function listenProducts(cb, { includeDrafts = false } = {}) {
  productListeners.add(cb);
  if (includeDrafts) adminCatalogSubscribers += 1;
  if (memoryProductsCache) cb(memoryProductsCache);
  else getIDBProducts().then((cached) => cached?.length && cb(cached));
  fetchFreshSnapshot({ includeDrafts });
  ensureCatalogRefresh();
  return () => {
    productListeners.delete(cb);
    if (includeDrafts) adminCatalogSubscribers = Math.max(0, adminCatalogSubscribers - 1);
    stopCatalogRefreshIfIdle();
  };
}

async function syncInventory(record) {
  const stock = record.stockQuantity === undefined ? 15 : Number(record.stockQuantity);
  await apiJson(`/api/inventory/${encodeURIComponent(record.id)}`, {
    admin: true, method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stock }),
  });
}

export async function saveProduct(record) {
  const { ref, set, db } = await firebaseAdminContext();
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const idx = current.findIndex((p) => String(p.id) === String(record.id));
  const updated = idx >= 0 ? current.map((p, i) => (i === idx ? record : p)) : [record, ...current];
  await withTimeout(set(ref(db, `products/${record.id}`), record));
  await syncInventory(record);
  setLocalProducts(updated);
  setIDBProduct(record);
  notifyStatus('online');
  productListeners.forEach((cb) => cb(updated));
  return record;
}

export async function deleteProduct(id) {
  const { ref, remove, db } = await firebaseAdminContext();
  await withTimeout(remove(ref(db, `products/${id}`)));
  await apiJson(`/api/inventory/${encodeURIComponent(id)}`, { admin: true, method: 'DELETE' });
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const updated = current.filter((p) => String(p.id) !== String(id));
  setLocalProducts(updated);
  deleteIDBProduct(id);
  productListeners.forEach((cb) => cb(updated));
  return true;
}

export async function saveProductsBatch(recordsList) {
  const { ref, update, db } = await firebaseAdminContext();
  if (!Array.isArray(recordsList) || !recordsList.length) return true;
  const batchMap = {};
  recordsList.forEach((record) => { if (record?.id) batchMap[record.id] = record; });
  await withTimeout(update(ref(db, 'products'), batchMap), 12_000);
  await Promise.all(recordsList.map(syncInventory));
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const map = new Map(current.map((p) => [String(p.id), p]));
  recordsList.forEach((p) => p?.id && map.set(String(p.id), p));
  const merged = [...map.values()];
  setLocalProducts(merged);
  productListeners.forEach((cb) => cb(merged));
  return true;
}

export async function seedProducts() {
  if (!SEED_PRODUCTS.length) return [];
  const records = SEED_PRODUCTS.map(toRecord);
  await saveProductsBatch(records);
  return records;
}

export function listenSettings(cb) {
  settingsListeners.add(cb);
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS) || '{}');
    if (cached && typeof cached === 'object') cb(cached);
  } catch {}
  if (Object.keys(latestSettings).length) cb(latestSettings);
  ensureCatalogRefresh();
  return () => { settingsListeners.delete(cb); stopCatalogRefreshIfIdle(); };
}

export async function saveSetting(key, value) {
  const { ref, update, db } = await firebaseAdminContext();
  await withTimeout(update(ref(db, 'settings'), { [key]: value }));
  latestSettings = { ...latestSettings, [key]: value };
  try { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(latestSettings)); } catch {}
  settingsListeners.forEach((cb) => cb(latestSettings));
}

export function getLocalCatalog() {
  if (latestCatalog) return latestCatalog;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY_CATALOG) || 'null'); } catch { return null; }
}

export function listenCatalog(cb) {
  catalogListeners.add(cb);
  const cached = getLocalCatalog();
  if (cached) cb(cached);
  ensureCatalogRefresh();
  return () => { catalogListeners.delete(cb); stopCatalogRefreshIfIdle(); };
}

function encodeTreeForFirebase(tree) {
  if (!tree) return null;
  const copy = JSON.parse(JSON.stringify(tree));
  if (copy.subcategories && typeof copy.subcategories === 'object') {
    const encoded = {};
    Object.entries(copy.subcategories).forEach(([key, value]) => { encoded[key.replaceAll('/', '__')] = value; });
    copy.subcategories = encoded;
  }
  return copy;
}

export async function saveCatalog(tree) {
  const { ref, set, db } = await firebaseAdminContext();
  await withTimeout(set(ref(db, 'catalog'), encodeTreeForFirebase(tree)));
  latestCatalog = tree;
  try { localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(tree)); } catch {}
  catalogListeners.forEach((cb) => cb(tree));
  return tree;
}

export function normalizeOrderRecord(order) {
  if (!order?.id && !order?.orderNo) return null;
  const cart = Array.isArray(order.cart) ? order.cart : [];
  return {
    ...order, id: String(order.id || order.orderNo), orderNo: String(order.orderNo || order.id),
    status: order.status || 'new', cart, subtotal: Number(order.subtotal) || 0,
    fee: Number(order.fee) || 0, total: Number(order.total) || 0,
    itemCount: Number(order.itemCount) || cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
  };
}

function publishOrders(orders) {
  ordersCache = (orders || []).map(normalizeOrderRecord).filter(Boolean);
  ordersListeners.forEach((cb) => cb(ordersCache));
}

export function getLocalOrders() { return ordersCache; }

export async function fetchCloudOrdersSnapshot(cb) {
  const body = await apiJson('/api/orders?limit=100', { admin: true });
  ordersNextCursor = body.nextCursor || null;
  publishOrders(body.orders || []);
  if (cb) cb(ordersCache);
  return ordersCache;
}

export function hasMoreCloudOrders() { return Boolean(ordersNextCursor); }

export async function loadMoreCloudOrders() {
  if (!ordersNextCursor) return ordersCache;
  const body = await apiJson(`/api/orders?limit=100&before=${encodeURIComponent(ordersNextCursor)}`, { admin: true });
  ordersNextCursor = body.nextCursor || null;
  const merged = new Map(ordersCache.map((order) => [order.id, order]));
  (body.orders || []).map(normalizeOrderRecord).filter(Boolean).forEach((order) => merged.set(order.id, order));
  publishOrders([...merged.values()]);
  return ordersCache;
}

export function listenOrders(cb) {
  ordersListeners.add(cb);
  cb(ordersCache);
  fetchCloudOrdersSnapshot().catch(() => notifyStatus('degraded'));
  if (!ordersTimer) {
    ordersTimer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchCloudOrdersSnapshot().catch(() => notifyStatus('degraded'));
    }, ORDERS_REFRESH_MS);
  }
  return () => {
    ordersListeners.delete(cb);
    if (!ordersListeners.size && ordersTimer) { clearInterval(ordersTimer); ordersTimer = null; }
  };
}

export async function saveOrder(orderRecord) {
  const cart = (orderRecord.cart || []).map((line) => ({
    productId: line.productId || line.product?.id, qty: Number(line.qty), size: line.size, color: line.color,
  }));
  const body = await apiJson('/api/orders', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: orderRecord.name, phone: orderRecord.phone, governorate: orderRecord.governorate,
      city: orderRecord.city, address: orderRecord.address, notes: orderRecord.notes,
      payment: orderRecord.payment, turnstileToken: orderRecord.turnstileToken, cart,
    }),
  });
  return normalizeOrderRecord(body.order);
}

export async function updateOrderStatus(orderId, status) {
  const body = await apiJson(`/api/orders/${encodeURIComponent(orderId)}`, {
    admin: true, method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }),
  });
  publishOrders(ordersCache.map((order) => order.id === String(orderId) ? { ...order, status, updatedAt: body.updatedAt } : order));
  return true;
}

export async function deleteOrder(orderId) {
  await apiJson(`/api/orders/${encodeURIComponent(orderId)}`, { admin: true, method: 'DELETE' });
  publishOrders(ordersCache.filter((order) => order.id !== String(orderId)));
  return true;
}

export async function deductStockForOrder() { throw new Error('Stock may only be changed by the secure order API.'); }
export async function restoreStockForOrder() { throw new Error('Stock may only be changed by the secure order API.'); }
