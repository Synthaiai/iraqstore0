import { onValue, ref, remove, set, update } from 'firebase/database';
import { db } from '../firebase';
import { SEED_PRODUCTS, toRecord } from './products';

/* ---------------- Products ---------------- */

/** Subscribe to the whole product collection. cb receives an array of records. */
export function listenProducts(cb) {
  return onValue(ref(db, 'products'), (snap) => {
    const val = snap.val();
    cb(val ? Object.values(val) : []);
  });
}

export function saveProduct(record) {
  return set(ref(db, `products/${record.id}`), record);
}

export function deleteProduct(id) {
  return remove(ref(db, `products/${id}`));
}

/** Push the bundled seed catalogue into the database (one-time bootstrap). */
export function seedProducts() {
  const map = {};
  SEED_PRODUCTS.forEach((p) => {
    map[p.id] = toRecord(p);
  });
  return set(ref(db, 'products'), map);
}

/* ---------------- Settings (logo, promos…) ---------------- */

export function listenSettings(cb) {
  return onValue(ref(db, 'settings'), (snap) => cb(snap.val() || {}));
}

export function saveSetting(key, value) {
  return update(ref(db, 'settings'), { [key]: value });
}

/* ---------------- Catalog tree (sections) ---------------- */

export function listenCatalog(cb) {
  return onValue(ref(db, 'catalog'), (snap) => cb(snap.val() || null));
}

export function saveCatalog(tree) {
  return set(ref(db, 'catalog'), tree);
}
