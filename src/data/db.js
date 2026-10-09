/**
 * Lightweight native IndexedDB wrapper for high-capacity offline caching.
 * Easily holds 50,000+ products without blowing browser localStorage quotas.
 */

const DB_NAME = 'iraqstore_db';
const DB_VERSION = 2;
const STORE_PRODUCTS = 'products';
const STORE_CATALOG = 'catalog';
/** Photos waiting to reach object storage. See `imageQueue.js`. */
export const STORE_IMAGE_QUEUE = 'imageQueue';

export function openStoreDB() {
  return openDB();
}

function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CATALOG)) {
        db.createObjectStore(STORE_CATALOG, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_IMAGE_QUEUE)) {
        const queue = db.createObjectStore(STORE_IMAGE_QUEUE, { keyPath: 'key', autoIncrement: true });
        queue.createIndex('productId', 'productId');
      }
    };

    // A tab still holding the previous schema blocks the upgrade, and without
    // this the open promise never settles — every queue operation behind it
    // waits for ever, silently. Better to fail and let the caller carry on.
    request.onblocked = () => reject(new Error('IDB_BLOCKED'));
    request.onsuccess = () => {
      const db = request.result;
      // A newer tab asking for a later schema must not be stuck behind us.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getIDBProducts() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PRODUCTS, 'readonly');
      const store = tx.objectStore(STORE_PRODUCTS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('IndexedDB read error:', err);
    return [];
  }
}

export async function setIDBProducts(products) {
  if (!Array.isArray(products)) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.clear();
    products.forEach((p) => {
      if (p && p.id) {
        store.put(p);
      }
    });
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('IndexedDB write error:', err);
    return false;
  }
}

export async function setIDBProduct(product) {
  if (!product || !product.id) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.put(product);
  } catch (e) {
    console.warn('IndexedDB save error:', e);
  }
}

export async function deleteIDBProduct(id) {
  if (!id) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_PRODUCTS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTS);
    store.delete(id);
  } catch (e) {
    console.warn('IndexedDB delete error:', e);
  }
}
