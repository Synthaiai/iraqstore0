import { STORE_IMAGE_QUEUE, openStoreDB } from './db';

/**
 * An outbox for product photos.
 *
 * Saving a product used to mean compressing, uploading and writing in one
 * unbroken chain: if the connection gave out anywhere along it, nothing was
 * saved and the whole thing had to be done again. On the connections this shop
 * actually runs on, that meant a product could not be added at all.
 *
 * So the product record — about a kilobyte, which almost any link can carry —
 * is written immediately, and its photos are put in here. This queue lives in
 * IndexedDB, so it survives a closed tab, a reload, a dead battery and a night
 * with no signal. A runner drains it in the background, one image at a time,
 * retrying for as long as it takes, and attaches each photo to its product as
 * it lands.
 *
 * The product is therefore in the shop the moment it is saved. Its photos
 * arrive when the network allows.
 */

/**
 * Ask the browser not to evict this data.
 *
 * Without it the outbox is "best-effort" storage, which a browser may clear
 * when the disk gets tight. That outbox can hold a whole afternoon of a
 * shopkeeper's work — photos for a hundred products that have been saved but
 * whose pictures have not gone up yet — and losing it silently would be worse
 * than never having queued them. Granted or not, everything still works; this
 * only removes a way to lose work.
 */
let persistenceAsked = false;
export async function keepQueueOnDisk() {
  if (persistenceAsked || typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
  persistenceAsked = true;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

const listeners = new Set();

function notify() {
  pendingCount().then((count) => listeners.forEach((cb) => cb(count))).catch(() => {});
}

/** Subscribe to "how many photos are still waiting". */
export function subscribeQueue(cb) {
  listeners.add(cb);
  pendingCount().then(cb).catch(() => {});
  return () => listeners.delete(cb);
}

async function tx(mode, run) {
  const db = await openStoreDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_IMAGE_QUEUE, mode);
    const store = transaction.objectStore(STORE_IMAGE_QUEUE);
    let result;
    try {
      result = run(store);
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(result?.__value !== undefined ? result.__value : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function request(store, call) {
  const out = { __value: undefined };
  const req = call(store);
  req.onsuccess = () => { out.__value = req.result; };
  return out;
}

/** Add one photo to the outbox. `index` is its position in the gallery. */
export async function enqueueImage({ productId, productName, blob, index }) {
  await tx('readwrite', (store) => store.add({
    productId: String(productId),
    productName: productName || '',
    blob,
    index,
    attempts: 0,
    queuedAt: Date.now(),
  }));
  notify();
}

export async function listQueued() {
  return tx('readonly', (store) => request(store, (s) => s.getAll()));
}

export async function pendingCount() {
  try {
    return await tx('readonly', (store) => request(store, (s) => s.count()));
  } catch {
    return 0;
  }
}

export async function removeQueued(key) {
  await tx('readwrite', (store) => store.delete(key));
  notify();
}

export async function markAttempt(key, message) {
  const item = await tx('readonly', (store) => request(store, (s) => s.get(key)));
  if (!item) return;
  item.attempts = (item.attempts || 0) + 1;
  item.lastError = message || null;
  item.lastTriedAt = Date.now();
  await tx('readwrite', (store) => store.put(item));
  notify();
}

/** Drop everything queued for a product — used when the product is deleted. */
export async function discardQueuedFor(productId) {
  const all = await listQueued();
  const mine = all.filter((item) => String(item.productId) === String(productId));
  for (const item of mine) await tx('readwrite', (store) => store.delete(item.key));
  if (mine.length) notify();
  return mine.length;
}
