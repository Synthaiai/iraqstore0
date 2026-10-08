import { SEED_PRODUCTS, toRecord } from './products';
import { deleteIDBProduct, getIDBProducts, setIDBProduct, setIDBProducts } from './db';
import { resolveEmbeddedProducts } from './embeddedImages';
import { makeThumbnail } from '../utils/imageCompressor';
import { timeoutSignal } from '../utils/timeoutSignal';

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
 * Make a record safe for the Realtime Database.
 *
 * The SDK rejects the ENTIRE write — with a message naming one property — as
 * soon as any value anywhere in the tree is `undefined`. The admin form builds
 * its record by spreading state, so one untouched optional field was enough to
 * fail a save with an error no shopkeeper could act on. Empty strings are kept
 * (they are valid values); `undefined` is dropped, which is exactly what "this
 * field was never filled in" should mean.
 */
function stripUndefined(value) {
  if (Array.isArray(value)) return value.filter((item) => item !== undefined).map(stripUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (item === undefined) continue;
      out[key] = stripUndefined(item);
    }
    return out;
  }
  return value;
}

/** Fields the storefront sorts and filters on must never be stored as text. */
function coerceNumericFields(record) {
  const out = { ...record };
  const stock = Number(out.stockQuantity);
  out.stockQuantity = Number.isFinite(stock) ? Math.max(0, Math.round(stock)) : 15;
  const order = Number(out.sortOrder);
  if (Number.isFinite(order) && out.sortOrder !== '' && out.sortOrder !== null) out.sortOrder = order;
  else delete out.sortOrder;
  const price = Number(out.price);
  out.price = Number.isFinite(price) ? Math.max(0, Math.round(price)) : 0;
  const oldPrice = Number(out.oldPrice);
  out.oldPrice = Number.isFinite(oldPrice) && oldPrice > 0 ? Math.round(oldPrice) : null;
  return out;
}

function prepareForFirebase(record) {
  const normalized = coerceNumericFields(record);
  // Saving also heals the slug casing, so a product edited once stops being
  // filed under its own private variant of a section.
  for (const key of ['gender', 'category', 'sub']) {
    if (typeof normalized[key] === 'string') normalized[key] = normalized[key].trim().toLowerCase();
  }
  return stripUndefined(normalized);
}

/**
 * Split a product into the lean record that ships to every visitor and the
 * heavy gallery that only a product page needs.
 */
async function splitProductImages(record) {
  let images = (Array.isArray(record.images) ? record.images : []).filter(Boolean);
  const lean = prepareForFirebase(record);
  delete lean.images;
  delete lean.imagesArePlaceholder;

  // The admin added photos to a product whose real gallery never loaded, so
  // `images[0]` is still the thumbnail stand-in. Writing this list as-is would
  // replace the originals with a 260px thumbnail, so swap the stand-in for the
  // gallery it stands for before anything is written.
  if (record.imagesArePlaceholder && images.length > 1 && record.id) {
    const stored = await loadProductImages(record.id, null);
    if (Array.isArray(stored) && stored.length) {
      images = [...stored, ...images.slice(1)].filter(Boolean).slice(0, 4);
    }
  }

  // Editing a split product hands back the thumbnail stand-in, not the real
  // gallery. Writing that back would destroy the original photos, so leave the
  // stored gallery alone unless the admin actually changed the images.
  const placeholderOnly = record.imagesArePlaceholder && images.length <= 1;
  if (placeholderOnly) {
    // A record that never had its photos split still keeps them in `images`, and
    // `update()` replaces the whole child — so writing a lean record here would
    // delete a gallery that was never copied anywhere. `imageCount` says the
    // product has more photos than this stand-in carries; keep the stored
    // record exactly as it is rather than write a lossy version of it.
    const standsInForMore = Number(record.imageCount) > images.length;
    if (standsInForMore && !record.thumb) return { lean: null, images: null };

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

  const readJsonPath = async (path) => {
    const response = await fetch(`${FIREBASE_REST_BASE}/${path}`, { signal: timeoutSignal(20000) });
    if (!response.ok) throw new Error(`IMAGES_${response.status}`);
    return response.json();
  };

  const request = (async () => {
    try {
      const body = await readJsonPath(`${PRODUCT_IMAGES_PATH}/${encodeURIComponent(id)}.json`);
      const images = (Array.isArray(body?.images) ? body.images : []).filter(Boolean);
      if (images.length) return images;
    } catch {
      /* fall through to the product's own record */
    }
    try {
      // A product saved before the split keeps its gallery inside its own
      // record. The catalogue only ships the first of those images, so the
      // rest are read from here — without this a legacy product page showed
      // one photo where the shop has four.
      const own = await readJsonPath(`products/${encodeURIComponent(id)}/images.json`);
      const images = (Array.isArray(own) ? own : []).filter(Boolean);
      if (images.length) return images;
    } catch {
      /* nothing stored anywhere */
    }
    galleryCache.delete(id);
    return fallback;
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
 * Explain a write that ran out of time.
 *
 * Connection state is only ever used to word the failure. Gating the write on
 * it would be worse than the bug it was meant to fix: `.info/connected` can
 * read false on a connection that works (an older browser, a proxied network),
 * and a save that would have succeeded must never be refused for that.
 */
function describeWriteFailure(fallback) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم احفظ مجددًا — بياناتك ما زالت مكتوبة في الصفحة.';
  }
  if (!realtimeConnected) {
    // The old wording named the problem and stopped there. The product record
    // itself is a few KB, so a save that times out here is worth retrying as
    // it is; nothing has been lost and nothing needs re-entering.
    return 'الاتصال بطيء ولم يكتمل الحفظ. بياناتك ما زالت مكتوبة في الصفحة — اضغط «حفظ المنتج» مرة ثانية، '
      + 'ولو تكررت جرّب شبكة أخرى أو مكاناً أقوى إشارة.';
  }
  return fallback;
}

async function authHeaders(required = false) {
  const headers = { accept: 'application/json' };
  if (!required) return headers;
  const { auth } = await import('../firebase');
  if (!auth.currentUser) throw new Error('يجب تسجيل الدخول كمدير.');
  headers.authorization = `Bearer ${await auth.currentUser.getIdToken(false)}`;
  return headers;
}

/**
 * A sentence for a customer, for a response that carried no message of its own.
 * Status codes are for the console; the person waiting on a checkout button
 * needs to know whether to retry, wait, or phone the shop.
 */
function describeHttpFailure(status) {
  if (status === 401 || status === 403) return 'انتهت صلاحية الجلسة أو لا تملك صلاحية لهذا الإجراء. أعد تحميل الصفحة.';
  if (status === 404) return 'خدمة الطلبات غير متاحة حاليًا. سلّتك محفوظة — حاول بعد قليل أو اتصل بالمتجر.';
  if (status === 429) return 'محاولات كثيرة خلال وقت قصير. انتظر قليلاً ثم حاول مجددًا.';
  if (status >= 500) return 'الخادم لا يستجيب حاليًا. سلّتك محفوظة — حاول مرة أخرى بعد قليل.';
  return 'تعذّر إكمال الطلب. تحقق من الاتصال وحاول مجددًا.';
}

async function apiJson(url, options = {}) {
  const { admin = false, ...fetchOptions } = options;
  const headers = { ...(await authHeaders(admin)), ...(fetchOptions.headers || {}) };
  // Every request gets a deadline: a hanging write used to leave the admin UI
  // spinning forever with no error.
  const response = await fetch(url, { ...fetchOptions, headers, signal: fetchOptions.signal || timeoutSignal(15000) });
  let body = null;
  try { body = await response.json(); } catch {}
  if (!response.ok || body?.ok === false) {
    // The server's own Arabic message when it sent one. Otherwise a sentence a
    // shopper can act on — a checkout that failed used to read "HTTP_404".
    const code = body?.error?.code || `HTTP_${response.status}`;
    const error = new Error(body?.error?.message || describeHttpFailure(response.status));
    error.code = code;
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
    Object.entries(copy.subcategories).forEach(([key, value]) => { decoded[key.split('__').join('/')] = value; });
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
    fetch(`${base}/products.json`, { signal: timeoutSignal(10000) }), fetch(`${base}/settings.json`, { signal: timeoutSignal(10000) }), fetch(`${base}/catalog.json`, { signal: timeoutSignal(10000) }),
  ]);
  if (!productsRes.ok) throw new Error('CATALOG_UNAVAILABLE');
  const rawProducts = await productsRes.json();
  const products = rawProducts && typeof rawProducts === 'object' ? Object.entries(rawProducts).filter(([, p]) => p && typeof p === 'object').map(([id, p]) => ({ ...p, id: p.id || id })) : [];
  const visible = includeDrafts ? products : products.filter((product) => product?.status !== 'draft');
  // Mirrors `trimInlineGalleries` in the Worker: when the API is unreachable the
  // browser reads Firebase directly, and it must not pull megabytes of inline
  // photos into a product grid either.
  for (const product of includeDrafts ? [] : visible) {
    const images = Array.isArray(product.images) ? product.images : null;
    if (!images || images.length < 2) continue;
    if (!images.some((image) => typeof image === 'string' && image.startsWith('data:'))) continue;
    product.imageCount = product.imageCount || images.length;
    product.images = [images[0]];
    product.imagesArePlaceholder = true;
  }
  return {
    products: await resolveEmbeddedProducts(visible),
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

/**
 * Codes that mean "there is no inventory mirror here", not "the mirror rejected
 * the write". When the Worker or its database is absent the catalogue is served
 * straight from Firebase, so the stock the admin just saved is the stock the
 * store shows — there is nothing to warn about.
 */
const INVENTORY_ABSENT_CODES = new Set([
  'API_UNAVAILABLE', 'DATABASE_NOT_CONFIGURED', 'AUTH_NOT_CONFIGURED', 'HTTP_404', 'HTTP_405',
]);

async function syncInventory(record) {
  const stock = record.stockQuantity === undefined ? 15 : Number(record.stockQuantity);
  try {
    await apiJson(`/api/inventory/${encodeURIComponent(record.id)}`, {
      admin: true, method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ stock }),
    });
  } catch (err) {
    console.warn('Inventory sync skipped (product was saved to Firebase):', err);
    // D1 overrides the Firebase value when the catalogue is served, so a failed
    // sync makes an edited stock count silently revert. Say so — but only when
    // there is a mirror to revert to, or every save on a deployment without one
    // reports a failure that did not happen.
    if (!INVENTORY_ABSENT_CODES.has(err?.code)) {
      reportImageSyncFailure(record, new Error('ما قدرنا نحدّث الكمية. قد تظهر الكمية القديمة للزبائن حتى تعيد المحاولة.'));
    }
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
    // Only reached when images were inlined rather than uploaded, which means
    // megabytes over the socket on a link already known to be slow.
    180000,
    'انتهت مهلة رفع صور المنتج. المنتج محفوظ، لكن صور المعرض لم تُحدَّث.'
  );
  galleryCache.set(String(record.id), Promise.resolve(images));
}

/**
 * Where a brand-new product lands in the shop.
 *
 * Once the catalogue has been put in order, every position from 1..N is taken,
 * so a product saved without one sorted below all of them — the shopkeeper
 * added an item and it was buried at the bottom of a 41-product shop. A new
 * product goes to the front, which is also what the dashboard's own local
 * cache has always assumed by prepending it.
 *
 * Only brand-new records are given a position; editing an existing product
 * never moves it.
 */
function positionForNewProduct(current) {
  let min = Infinity;
  for (const product of current) {
    const value = Number(product?.sortOrder);
    if (Number.isFinite(value) && product.sortOrder !== '' && product.sortOrder !== null) {
      min = Math.min(min, value);
    }
  }
  return Number.isFinite(min) ? min - 1 : 1;
}

export async function saveProduct(record) {
  const { ref, set, db } = await firebaseAdminContext();
  // Opening the socket early is what makes the save fast; it is never a gate.
  warmUpRealtimeDatabase();
  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const idx = current.findIndex((p) => String(p.id) === String(record.id));

  const isNew = idx < 0;
  const hasPosition = record.sortOrder !== undefined && record.sortOrder !== '' && record.sortOrder !== null
    && Number.isFinite(Number(record.sortOrder));
  if (isNew && !hasPosition) {
    record = { ...record, sortOrder: positionForNewProduct(current) };
  }

  const { lean, images } = await splitProductImages(record);
  if (!lean) {
    throw new Error('صور هذا المنتج لم تُحمَّل بالكامل. حدّث الصفحة ثم افتح المنتج مرة أخرى قبل الحفظ.');
  }
  const cached = hydrateProduct({ ...lean, images: [] });
  const updated = idx >= 0 ? current.map((p, i) => (i === idx ? cached : p)) : [cached, ...current];

  // A few KB, usually over a socket the dashboard opened minutes ago.
  try {
    await withTimeout(set(ref(db, `products/${record.id}`), lean), 45000, 'WRITE_TIMEOUT');
  } catch (error) {
    if (error?.message !== 'WRITE_TIMEOUT') throw error;
    throw new Error(describeWriteFailure(
      'استغرق حفظ المنتج وقتًا أطول من المتوقع. قد يكون حُفظ فعلاً — حدّث الصفحة وتأكد قبل إعادة المحاولة.'
    ));
  }

  // The product is saved; the stock mirror is a side effect. Awaiting it here
  // added up to 15s to every single save for a call the Worker may not even
  // serve, so it runs in the background and reports itself if it fails.
  if (idx < 0 || Number(current[idx].stockQuantity ?? 15) !== Number(record.stockQuantity ?? 15)) {
    syncInventory(record).catch(() => {});
  }
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
  await withTimeout(remove(ref(db, `products/${id}`)), 20000, 'استغرق الحذف وقتاً أطول من المتوقع. حدّث الصفحة وتأكد.');
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
  warmUpRealtimeDatabase();
  if (!Array.isArray(recordsList) || !recordsList.length) return true;
  const validRecords = recordsList.filter((record) => record?.id);
  const skipped = [];
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
      // `null` means writing this record would lose photos; skip it untouched.
      if (!lean) skipped.push(record);
      else if (images?.length) galleries.push({ record: lean, images, original: record });
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
  skipped.forEach((record) => reportImageSyncFailure(
    record,
    new Error('تُرك هذا المنتج كما هو: صوره لم تصل كاملة إلى المتصفح، وحفظه كان سيحذف بعضها.')
  ));
  return true;
}

/**
 * Move every base64 photo this shop still stores into object storage.
 *
 * Photos live in two places for historical reasons: inside the product record
 * for anything saved before the split, and under `productImages/{id}` for
 * everything after. Both forms are base64, which inflates the bytes by a third
 * and spends the database's egress allowance on every product page view. This
 * walks both, uploads each image once, and rewrites the record to hold paths.
 *
 * Safe to re-run: an image that is already a path is returned untouched, and a
 * product is only rewritten once all of its images have uploaded successfully,
 * so an interrupted run leaves every product either fully migrated or exactly
 * as it was.
 */
export async function migrateImagesToObjectStorage({ onProgress } = {}) {
  const { ref, set, update, db } = await firebaseAdminContext();
  const { relocateStoredImage } = await import('./upload');

  const current = memoryProductsCache || (await getIDBProducts()) || [];
  const report = { scanned: 0, migrated: 0, images: 0, skipped: 0, failures: [] };
  const say = (stage, done, total, name) => onProgress?.({ stage, done, total, name });

  const ids = current.map((p) => String(p?.id)).filter(Boolean);
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const product = current.find((p) => String(p.id) === id) || {};
    say('scan', i + 1, ids.length, product.name);
    report.scanned += 1;

    // The record is the source of truth, not the list view's stand-in.
    let stored = null;
    try {
      const response = await fetch(`${FIREBASE_REST_BASE}/${PRODUCT_IMAGES_PATH}/${encodeURIComponent(id)}.json`, { signal: timeoutSignal(30000) });
      const body = response.ok ? await response.json() : null;
      if (Array.isArray(body?.images) && body.images.length) stored = body.images;
    } catch { /* fall through to the record's own images */ }

    if (!stored) {
      const own = Array.isArray(product.images) && !product.imagesArePlaceholder ? product.images : null;
      if (own?.length) stored = own;
    }

    const inline = (stored || []).filter((image) => typeof image === 'string' && image.startsWith('data:image/'));
    if (!inline.length) { report.skipped += 1; continue; }

    try {
      // A product's photos upload together rather than one after another. Four
      // sequential uploads over a phone connection is most of the wait, and
      // they do not depend on each other. `Promise.all` also means a single
      // failure abandons the whole product before anything has been rewritten,
      // which is exactly the behaviour the ordering below relies on.
      let done = 0;
      say('upload', 0, stored.length, product.name);
      const relocated = await Promise.all(stored.map(async (image) => {
        const path = await relocateStoredImage(image);
        done += 1;
        report.images += 1;
        say('upload', done, stored.length, product.name);
        return path;
      }));

      // Gallery first, then the record. The reverse order would leave a product
      // pointing at photos that had not been written yet.
      await withTimeout(set(ref(db, `${PRODUCT_IMAGES_PATH}/${id}`), { images: relocated, updatedAt: Date.now() }), 60000, 'انتهت مهلة حفظ صور المنتج.');
      await withTimeout(update(ref(db, `products/${id}`), {
        thumb: relocated[0],
        imageCount: relocated.length,
        images: null, // the record stops carrying photos of its own
      }), 30000, 'انتهت مهلة تحديث سجل المنتج.');

      galleryCache.set(id, Promise.resolve(relocated));
      report.migrated += 1;
    } catch (error) {
      console.error('Image migration failed for', id, error);
      report.failures.push({ id, name: product.name, message: error?.message || 'سبب غير معروف' });
    }
  }

  await fetchFreshSnapshot({ includeDrafts: true });
  return report;
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
  await withTimeout(update(ref(db, 'settings'), { [key]: value }), 20000, 'استغرق حفظ الإعدادات وقتاً أطول من المتوقع. حاول مرة ثانية.');
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
    Object.entries(copy.subcategories).forEach(([key, value]) => { encoded[key.split('/').join('__')] = value; });
    copy.subcategories = encoded;
  }
  return copy;
}

export async function saveCatalog(tree) {
  const { ref, set, db } = await firebaseAdminContext();
  await withTimeout(set(ref(db, 'catalog'), encodeTreeForFirebase(tree)), 20000, 'استغرق حفظ الأقسام وقتاً أطول من المتوقع. حاول مرة ثانية.');
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

/**
 * Why the orders list is empty.
 *
 * A failed fetch used to be swallowed into a connection badge, so a dashboard
 * that could not reach the orders service was indistinguishable from a shop
 * that had taken no orders: "الطلبات (0)", no error, nothing to act on. The
 * panel subscribes here and says which of the two it is.
 */
const ordersErrorListeners = new Set();
let ordersError = null;

export function subscribeOrdersError(cb) {
  ordersErrorListeners.add(cb);
  cb(ordersError);
  return () => ordersErrorListeners.delete(cb);
}

export function getOrdersError() {
  return ordersError;
}

function setOrdersError(error) {
  const next = error
    ? { message: error.message || 'تعذر جلب الطلبات.', code: error.code || null, at: Date.now() }
    : null;
  ordersError = next;
  ordersErrorListeners.forEach((cb) => cb(next));
}

/** Consecutive failures, used to stop hammering a service that is down. */
let ordersFailureStreak = 0;

export async function fetchCloudOrdersSnapshot(cb) {
  if (ordersFetchRequest) return ordersFetchRequest;
  ordersFetchRequest = apiJson('/api/orders?limit=100', { admin: true })
    .then((body) => {
      ordersNextCursor = body.nextCursor || null;
      publishOrders(body.orders || []);
      notifyStatus('online');
      ordersFailureStreak = 0;
      setOrdersError(null);
      if (cb) cb(ordersCache);
      return ordersCache;
    })
    .catch((error) => {
      ordersFailureStreak += 1;
      setOrdersError(error);
      throw error;
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

/**
 * Poll, but not into a wall. Eight seconds is right for a shop taking orders;
 * against a service that is down it was 450 failed requests an hour, every
 * one of them re-reporting the same error. The interval still fires on its
 * own schedule — this skips the ticks while a failure streak backs off.
 */
let ordersNextAttemptAt = 0;
let ordersLastHiddenPoll = 0;

/** How often to keep checking while the dashboard is in a background tab. */
const ORDERS_BACKGROUND_REFRESH_MS = 30_000;

function refreshOrdersWhenActive() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  // A dashboard left open in a background tab is the normal state in a shop.
  // Stopping entirely while hidden meant a new order raised no alert and no
  // sound until somebody happened to click the tab — which reads, from behind
  // the counter, as orders simply not arriving. Keep checking, just slower.
  const hidden = typeof document !== 'undefined' && document.visibilityState !== 'visible';
  if (hidden) {
    if (Date.now() - ordersLastHiddenPoll < ORDERS_BACKGROUND_REFRESH_MS) return;
    ordersLastHiddenPoll = Date.now();
  }
  if (ordersFailureStreak && Date.now() < ordersNextAttemptAt) return;
  fetchCloudOrdersSnapshot().catch(() => {
    notifyStatus('degraded');
    // 16s, 32s, 64s … capped at five minutes.
    ordersNextAttemptAt = Date.now() + Math.min(300_000, ORDERS_REFRESH_MS * 2 ** ordersFailureStreak);
  });
}

/** Let the admin retry immediately after a failure, ignoring the backoff. */
export function retryOrdersNow() {
  ordersFailureStreak = 0;
  ordersNextAttemptAt = 0;
  return fetchCloudOrdersSnapshot();
}

export function listenOrders(cb) {
  ordersListeners.add(cb);
  cb(ordersCache);
  fetchCloudOrdersSnapshot().catch(() => notifyStatus('degraded'));
  // (the error itself reaches the panel through `subscribeOrdersError`)
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
