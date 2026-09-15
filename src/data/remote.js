import { SEED_PRODUCTS, toRecord } from './products';
import { deleteIDBProduct, getIDBProducts, setIDBProduct, setIDBProducts } from './db';
import { resolveEmbeddedProducts } from './embeddedImages';
import { makeThumbnail } from '../utils/imageCompressor';

const STORAGE_KEY_PRODUCTS = 'iraqstore_products_v1';
/** Cart, favourites and preferences must always outrank the product cache. */
const PRODUCT_CACHE_BUDGET = 1_500_000;
const STORAGE_KEY_CATALOG = 'iraqstore_catalog_v1';
const STORAGE_KEY_SETTINGS = 'iraqstore_settings_v1';
const CATALOG_REFRESH_MS = 5 * 60_000;
const ORDERS_REFRESH_MS = 8_000;
const BULK_FIREBASE_CHUNK_SIZE = 80;
const BULK_INVENTORY_CONCURRENCY = 8;

/**
 * Full-size photos live under `productImages/{id}`, never inside the product
 * record itself. A product record carries only `thumb`, a ~8KB grid image.
 *
 * This is the difference between a catalogue payload every visitor downloads
 * being ~300KB instead of ~12MB, and between saving a product writing ~10KB
 * instead of ~1MB (which is what was timing out).
 */
const PRODUCT_IMAGES_PATH = 'productImages';
const FIREBASE_REST_BASE = 'https://store-29692-default-rtdb.firebaseio.com';

const imageFailureListeners = new Set();

/** Notified when a product saved but its full-size gallery did not. */
export function subscribeImageSyncFailures(cb) {
  imageFailureListeners.add(cb);
  return () => imageFailureListeners.delete(cb);
}

function reportImageSyncFailure(record, error) {
  imageFailureListeners.forEach((cb) => cb({ product: record, error }));
}

/**
 * Split a product into the lean record that ships to every visitor and the
 * heavy gallery that only a product page needs.
 */
async function splitProductImages(record) {
  const images = (Array.isArray(record.images) ? record.images : []).filter(Boolean);
  const lean = { ...record };
  delete lean.images;
  delete lean.imagesArePlaceholder;

  // Editing a split product hands back the thumbnail stand-in, not the real
  // gallery. Writing that back would destroy the original photos, so leave the
  // stored gallery alone unless the admin actually changed the images.
  const placeholderOnly = record.imagesArePlaceholder && images.length <= 1;
  if (placeholderOnly) {
    lean.thumb = record.thumb || images[0] || null;
    if (!lean.thumb) delete lean.thumb;
    if (record.imageCount === undefined) delete lean.imageCount;
    return { lean, images: null };
  }

  lean.imageCount = images.length;
  lean.thumb = images.length ? await makeThumbnail(images[0]) : null;
  if (!lean.thumb) delete lean.thumb;
  return { lean, images };
}

/**
 * Give list views something to render without changing ~20 call sites: a
 * split product exposes its thumbnail as `images`. Products saved before the
 * split still carry their own `images` and pass through untouched.
 */
function hydrateProduct(product) {
  if (!product || typeof product !== 'object') return product;
  if (Array.isArray(product.images) && product.images.length) return product;
  if (!product.thumb) return product;
  // `imagesArePlaceholder` tells the save path that `images` is a stand-in for
  // the real gallery, so it must not be written back over the originals.
  return { ...product, images: [product.thumb], imagesArePlaceholder: true };
}

function hydrateProducts(products) {
  return Array.isArray(products) ? products.map(hydrateProduct) : [];
}

const galleryCache = new Map();

/**
 * Fetch the full-size gallery for one product, on demand.
 * Falls back to whatever the record already carries (pre-split products, or a
 * thumbnail) so a product page always shows something.
 */
export async function loadProductImages(productId, fallback = []) {
  const id = String(productId || '');
  if (!id) return fallback;
  if (galleryCache.has(id)) return galleryCache.get(id);

  const request = (async () => {
    try {
      const response = await fetch(`${FIREBASE_REST_BASE}/${PRODUCT_IMAGES_PATH}/${encodeURIComponent(id)}.json`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`IMAGES_${response.status}`);
      const body = await response.json();
      const images = (Array.isArray(body?.images) ? body.images : []).filter(Boolean);
      return images.length ? images : fallback;
    } catch {
      galleryCache.delete(id);
      return fallback;
    }
  })();

  galleryCache.set(id, request);
  return request;
}

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
let ordersFetchRequest = null;
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

function withTimeout(promise, ms = 18000, message = 'انتهت مهلة الاتصال. تحقق من الإنترنت وحاول مجددًا.') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
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

/**
 * Realtime Database socket state.
 *
 * The SDK does not open its connection until the first operation, so a save
 * used to pay for the WebSocket handshake and its auth round-trip inside the
 * write deadline. On a slow mobile link that alone exceeded the timeout, and
 * the admin was told the save had timed out when nothing had been sent yet.
 *
 * Opening the socket when the dashboard mounts means that by the time a
 * product is actually saved the connection is warm and the write is a few KB
 * over an established channel.
 */
let realtimeConnected = false;
let realtimeWarmUp = null;
const realtimeListeners = new Set();

function notifyRealtime(connected) {
  if (realtimeConnected === connected) return;
  realtimeConnected = connected;
  realtimeListeners.forEach((cb) => cb(connected));
}

export function isRealtimeConnected() {
  return realtimeConnected;
}

export function subscribeRealtimeStatus(cb) {
  realtimeListeners.add(cb);
  cb(realtimeConnected);
  return () => realtimeListeners.delete(cb);
}

/** Open the Realtime Database connection ahead of the first write. */
export function warmUpRealtimeDatabase() {
  if (realtimeWarmUp) return realtimeWarmUp;
  realtimeWarmUp = (async () => {
    const [{ onValue, ref }, { db }] = await Promise.all([
      import('firebase/database'),
      import('../firebase'),
    ]);
    // `.info/connected` is a local-only path: reading it forces the socket
    // open and reports its true state without needing any permission.
    onValue(ref(db, '.info/connected'), (snapshot) => notifyRealtime(snapshot.val() === true));
  })().catch((error) => {
    realtimeWarmUp = null;
    console.warn('Could not open the Realtime Database connection:', error);
  });
  return realtimeWarmUp;
}

/**
 * Resolve once the database socket is usable, or throw a message that says
 * what is actually wrong instead of blaming a write that never left.
 */
async function awaitRealtimeConnection(ms = 25000) {
  if (realtimeConnected) return;
  warmUpRealtimeDatabase();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم احفظ مجددًا.');
  }
  const connected = await new Promise((resolve) => {
    // `subscribeRealtimeStatus` reports the current state synchronously, so
    // neither `stop` nor `timer` may be referenced from inside the callback.
    let settle = () => {};
    let stop = () => {};
    const timer = setTimeout(() => settle(false), ms);
    settle = (value) => {
      settle = () => {};
      clearTimeout(timer);
      stop();
      resolve(value);
    };
    stop = subscribeRealtimeStatus((state) => { if (state) settle(true); });
  });
  if (!connected) {
    throw new Error('تعذر الاتصال بقاعدة البيانات. الشبكة بطيئة أو تحجب الاتصال — جرّب شبكة أخرى ثم احفظ مجددًا.');
  }
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
  // Every request gets a deadline: a hanging write used to leave the admin UI
  // spinning forever with no error.
  const response = await fetch(url, { ...fetchOptions, headers, signal: fetchOptions.signal || AbortSignal.timeout(15000) });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok || body?.ok === false) {
    const error = new Error(body?.error?.message || `HTTP_${response.status}`);
    error.code = body?.error?.code || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  if (body === null) {
    // The SPA redirect serves index.html for unknown paths, so an undeployed
    // API answers 200 with HTML. Fail loudly here instead of letting every
    // caller trip over `body.order` / `body.nextCursor`.
    const error = new Error('خدمة الطلبات غير متاحة حاليًا. حاول بعد قليل.');
    error.code = 'API_UNAVAILABLE';
    error.status = response.status;
    throw error;
  }
  return body;
}

function setLocalProducts(products) {
  memoryProductsCache = Array.isArray(products) ? products : [];
  setIDBProducts(memoryProductsCache);
  try {
    // Budget by size, not by product count: a count check once put 5MB of
    // base64 into one key, which exhausts the whole localStorage quota on
    // Safari/iOS and silently starves the cart and favourites.
    const serialized = JSON.stringify(memoryProductsCache);
    if (serialized.length <= PRODUCT_CACHE_BUDGET) localStorage.setItem(STORAGE_KEY_PRODUCTS, serialized);
    else localStorage.removeItem(STORAGE_KEY_PRODUCTS);
  } catch {
    try { localStorage.removeItem(STORAGE_KEY_PRODUCTS); } catch {}
  }
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
  const products = hydrateProducts(bundle?.products);
  if (Array.isArray(bundle?.products)) {
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
    fetch(`${base}/products.json`, { signal: AbortSignal.timeout(10000) }), fetch(`${base}/settings.json`, { signal: AbortSignal.timeout(10000) }), fetch(`${base}/catalog.json`, { signal: AbortSignal.timeout(10000) }),
  ]);
  if (!productsRes.ok) throw new Error('CATALOG_UNAVAILABLE');
  const rawProducts = await productsRes.json();
  const products = rawProducts && typeof rawProducts === 'object' ? Object.entries(rawProducts).filter(([, p]) => p && typeof p === 'object').map(([id, p]) => ({ ...p, id: p.id || id })) : [];
  return {
    products: await resolveEmbeddedProducts(includeDrafts ? products : products.filter((product) => product?.status !== 'draft')),
    settings: settingsRes.ok ? (await settingsRes.json()) || {} : {},
    catalog: catalogRes.ok ? await catalogRes.json() : null,
  };
}

const catalogRequests = new Map();
export function fetchFreshSnapshot({ includeDrafts = false } = {}) {
  if (catalogRequests.has(includeDrafts)) return catalogRequests.get(includeDrafts);
  const request = fetchSnapshot(includeDrafts).finally(() => catalogRequests.delete(includeDrafts));
  catalogRequests.set(includeDrafts, request);
  return request;
}
async function fetchSnapshot(includeDrafts) {
  notifyStatus('checking');
  try {
    const url = includeDrafts ? '/api/catalog?includeDrafts=1' : '/api/catalog';
    const body = await apiJson(url, { admin: includeDrafts });
    if (!Array.isArray(body?.products)) throw new Error('INVALID_CATALOG');
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
  else getIDBProducts().then((cached) => {
    if (memoryProductsCache === null && productListeners.has(cb) && cached?.length) cb(cached);
  }).catch(() => {});
  fetchFreshSnapshot({ includeDrafts });
  ensureCatalogRefresh();
  return () => {
    productListeners.delete(cb);
    if (includeDrafts) adminCatalogSubscribers = Math.max(0, adminCatalogSubscribers - 1);
    stopCatalogRefreshIfIdle();
  };
}

/**
 * Mirror the stock count into the Cloudflare D1 inventory table.
 *
 * This is a best-effort optimisation, not the source of truth — stock lives in
 * the product record in the Realtime Database. The Worker is not available in
 * local dev and may not be configured in every deployment, so a failure here
 * must never undo or block a product save that already succeeded.
 */
async function syncInventory(record) {
  const stock = record.stockQuantity === undefined ? 15 : Number(record.stockQuantity);
  try {
    await apiJson(`/api/inventory/${encodeURIComponent(record.id)}`, {
      admin: true, method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stock }),
    });
  } catch (err) {
    console.warn('Inventory sync skipped (product was saved to Firebase):', err);
    // D1 overrides the Firebase value when the catalogue is served, so a failed
    // sync makes an edited stock count silently revert. Say so.
    reportImageSyncFailure(record, new Error('تعذر تحديث كمية المخزون على الخادم. قد تظهر الكمية القديمة حتى تعيد المحاولة.'));
  }
}

async function runWithConcurrency(items, limit, worker, onProgress) {
  let index = 0;
  let done = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index];
      index += 1;
      await worker(item);
      done += 1;
      if (onProgress) onProgress(done, items.length);
    }
  });
  await Promise.all(workers);
}

/**
 * Persist the full-size gallery. Separated from the product write so a slow
 * upload of ~1MB of photos never holds up (or fails) the product itself.
 */
async function saveProductGallery(record, images) {
  const { ref, set, remove, db } = await firebaseAdminContext();
  const path = `${PRODUCT_IMAGES_PATH}/${record.id}`;
  if (!images.length) {
    await withTimeout(remove(ref(db, path)), 30000, 'انتهت مهلة تحديث صور المنتج.');
    return;
  }
  await withTimeout(
    set(ref(db, path), { images, updatedAt: Date.now() }),
    90000,
    'انتهت مهلة رفع صور المنتج. المنتج محفوظ، لكن صور المعرض لم تُحدَّث.'
  );
  galleryCache.set(String(record.id), Promise.resolve(images));
}

export async function saveProduct(record) {
  const { ref, set, db } = await firebaseAdminContext();
  // Fail with the real reason before starting a write that cannot land.
  await awaitRealtimeConnection();
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const idx = current.findIndex((p) => String(p.id) === String(record.id));

  const { lean, images } = await splitProductImages(record);
  const cached = hydrateProduct({ ...lean, images: [] });
  const updated = idx >= 0 ? current.map((p, i) => (i === idx ? cached : p)) : [cached, ...current];

  // A few KB over a connection that is already open. The deadline only has to
  // cover a slow round-trip, not a cold handshake.
  await withTimeout(
    set(ref(db, `products/${record.id}`), lean),
    45000,
    'استغرق حفظ المنتج وقتًا أطول من المتوقع. المنتج قد يكون حُفظ — حدّث الصفحة قبل إعادة المحاولة.'
  );

  if (idx < 0 || Number(current[idx].stockQuantity ?? 15) !== Number(record.stockQuantity ?? 15)) await syncInventory(record);
  setLocalProducts(updated);
  setIDBProduct(cached);
  notifyStatus('online');
  productListeners.forEach((cb) => cb(updated));

  // Photos upload after the admin already has their confirmation. A null
  // gallery means the admin never touched the images, so there is nothing to write.
  if (images === null) return cached;
  saveProductGallery(lean, images).catch(async (error) => {
    console.error('Product gallery upload failed:', error);
    // Put the photos back into the product record rather than losing them.
    // That is the pre-split shape, which the storefront still reads natively.
    try {
      await set(ref(db, `products/${record.id}/images`), images);
    } catch (restoreError) {
      console.error('Could not restore images onto the product record:', restoreError);
    }
    reportImageSyncFailure(lean, error);
  });

  return cached;
}

export async function deleteProduct(id) {
  const { ref, remove, db } = await firebaseAdminContext();
  await withTimeout(remove(ref(db, `products/${id}`)), 20000, 'انتهت مهلة حذف المنتج من Firebase.');
  galleryCache.delete(String(id));
  remove(ref(db, `${PRODUCT_IMAGES_PATH}/${id}`)).catch((error) => console.warn('Gallery cleanup failed:', error));
  try {
    await apiJson(`/api/inventory/${encodeURIComponent(id)}`, { admin: true, method: 'DELETE' });
  } catch (err) {
    console.warn('Inventory delete skipped (product was removed from Firebase):', err);
  }
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const updated = current.filter((p) => String(p.id) !== String(id));
  setLocalProducts(updated);
  deleteIDBProduct(id);
  productListeners.forEach((cb) => cb(updated));
  return true;
}

export async function saveProductsBatch(recordsList, { reorderOnly = false, onProgress } = {}) {
  const { ref, update, db } = await firebaseAdminContext();
  await awaitRealtimeConnection();
  if (!Array.isArray(recordsList) || !recordsList.length) return true;
  const validRecords = recordsList.filter((record) => record?.id);
  for (let offset = 0; offset < validRecords.length; offset += BULK_FIREBASE_CHUNK_SIZE) {
    const chunk = validRecords.slice(offset, offset + BULK_FIREBASE_CHUNK_SIZE);
    const batchMap = {};
    const galleries = [];
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(chunk.map(async (record) => {
      if (reorderOnly) {
        batchMap[`${record.id}/sortOrder`] = Number(record.sortOrder) || 0;
        return;
      }
      const { lean, images } = await splitProductImages(record);
      if (images?.length) galleries.push({ record: lean, images, original: record });
      else batchMap[record.id] = lean;
    }));

    // Photos are copied to their new home BEFORE the product record drops them.
    // The reverse order would mean an interrupted run (a closed tab, a dropped
    // connection) leaves products whose images exist nowhere at all.
    for (let i = 0; i < galleries.length; i += 1) {
      const gallery = galleries[i];
      try {
        // eslint-disable-next-line no-await-in-loop
        await saveProductGallery(gallery.record, gallery.images);
        batchMap[gallery.record.id] = gallery.record;
      } catch (error) {
        // Leave this product exactly as it was: still carrying its own images,
        // which the storefront reads natively. Nothing is lost, and re-running
        // the migration will pick it up again.
        console.error('Gallery copy failed; leaving the product untouched:', error);
        reportImageSyncFailure(gallery.record, error);
      }
      if (onProgress) onProgress(i + 1, galleries.length, 'images');
    }

    if (Object.keys(batchMap).length) {
      // eslint-disable-next-line no-await-in-loop
      await withTimeout(update(ref(db, 'products'), batchMap), 30000, 'انتهت مهلة حفظ دفعة من المنتجات.');
    }
    if (onProgress) onProgress(Math.min(offset + chunk.length, validRecords.length), validRecords.length, 'products');
  }
  if (!reorderOnly) {
    await runWithConcurrency(validRecords, BULK_INVENTORY_CONCURRENCY, syncInventory, (done, total) => {
      if (onProgress) onProgress(done, total, 'inventory');
    });
  }
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const map = new Map(current.map((p) => [String(p.id), p]));
  validRecords.forEach((p) => {
    if (p?.id) map.set(String(p.id), reorderOnly ? { ...(map.get(String(p.id)) || p), sortOrder: p.sortOrder } : hydrateProduct(p));
  });
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
  await withTimeout(update(ref(db, 'settings'), { [key]: value }), 20000, 'انتهت مهلة حفظ إعدادات المتجر.');
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
  await withTimeout(set(ref(db, 'catalog'), encodeTreeForFirebase(tree)), 20000, 'انتهت مهلة حفظ أقسام المتجر.');
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
  if (ordersFetchRequest) return ordersFetchRequest;
  ordersFetchRequest = apiJson('/api/orders?limit=100', { admin: true })
    .then((body) => {
      ordersNextCursor = body.nextCursor || null;
      publishOrders(body.orders || []);
      notifyStatus('online');
      if (cb) cb(ordersCache);
      return ordersCache;
    })
    .finally(() => {
      ordersFetchRequest = null;
    });
  return ordersFetchRequest;
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

function refreshOrdersWhenActive() {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  fetchCloudOrdersSnapshot().catch(() => notifyStatus('degraded'));
}

export function listenOrders(cb) {
  ordersListeners.add(cb);
  cb(ordersCache);
  fetchCloudOrdersSnapshot().catch(() => notifyStatus('degraded'));
  if (!ordersTimer) {
    ordersTimer = setInterval(refreshOrdersWhenActive, ORDERS_REFRESH_MS);
    window.addEventListener('focus', refreshOrdersWhenActive);
    window.addEventListener('online', refreshOrdersWhenActive);
    window.addEventListener('visibilitychange', refreshOrdersWhenActive);
  }
  return () => {
    ordersListeners.delete(cb);
    if (!ordersListeners.size && ordersTimer) {
      clearInterval(ordersTimer);
      ordersTimer = null;
      window.removeEventListener('focus', refreshOrdersWhenActive);
      window.removeEventListener('online', refreshOrdersWhenActive);
      window.removeEventListener('visibilitychange', refreshOrdersWhenActive);
    }
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
