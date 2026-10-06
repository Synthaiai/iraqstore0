import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

/**
 * The dashboard is a view onto the shop. Where it claims to mirror the
 * storefront — the order products appear in, whether an order arrived — it has
 * to actually mirror it, or the shopkeeper is managing a shop that does not
 * match the one customers see.
 */

test('the dashboard orders products exactly as the shop does', async () => {
  const products = await read('src/data/products.js');
  const dashboard = await read('src/admin/Dashboard.jsx');
  const reorder = await read('src/admin/ProductReorderPanel.jsx');
  const browser = await read('src/components/ProductBrowser.jsx');

  // One comparator, exported once.
  assert.match(products, /export function storefrontOrder\(a, b\)/);
  // It breaks ties the same way for everyone: products that were never
  // reordered all share a rank, so the tie-breakers are what decides.
  assert.match(products, /BADGE_RANK\[a\?\.badge\] \?\? 9/);
  assert.match(products, /ratingOf\(b\) - ratingOf\(a\)/);
  // The dashboard lists raw records and the shop lists normalised ones, so the
  // missing-rating default has to be the same number on both sides.
  assert.match(products, /export const DEFAULT_RATING = 4\.8;/);
  assert.match(products, /rating: raw\.rating != null \? Number\(raw\.rating\) : DEFAULT_RATING/);
  assert.match(products, /String\(a\?\.id\)\.localeCompare/);

  // Every list that shows products uses it, on both sides of the app.
  for (const [name, source] of [['Dashboard', dashboard], ['ProductReorderPanel', reorder], ['ProductBrowser', browser]]) {
    assert.match(source, /storefrontOrder/, `${name} must sort with storefrontOrder`);
    assert.doesNotMatch(source, /sortOrder \?\? 9999/, `${name} still has its own comparator`);
  }
  // No second badge table anywhere to drift out of sync.
  assert.doesNotMatch(browser, /BADGE_ORDER/);
});

test('a manual position is a plain number, never an empty string', async () => {
  const products = await read('src/data/products.js');
  const remote = await read('src/data/remote.js');
  const form = await read('src/admin/ProductForm.jsx');

  // `'' - 9999` is -9999, so an empty string sorted a product above the shop.
  assert.match(products, /export function sortRank\(product\)/);
  assert.match(products, /product\?\.sortOrder !== ''/);
  assert.doesNotMatch(form, /sortOrder: '',/);
  // Writes coerce it, so bad data cannot get back in.
  assert.match(remote, /function coerceNumericFields/);
  assert.match(remote, /else delete out\.sortOrder/);
});

test('reordering writes one field per product, not the whole catalogue', async () => {
  const dashboard = await read('src/admin/Dashboard.jsx');
  const remote = await read('src/data/remote.js');
  // Without `reorderOnly`, moving one product rewrote every record and fired an
  // inventory call per product.
  assert.match(dashboard, /saveProductsBatch\(updated, \{ reorderOnly: true \}\)/);
  assert.doesNotMatch(dashboard, /saveProductsBatch\(updated\)\s*;/);
  assert.match(remote, /batchMap\[`\$\{record\.id\}\/sortOrder`\]/);
});

test('a newly added product is visible, not buried at the end of the shop', async () => {
  const remote = await read('src/data/remote.js');
  // Once the catalogue is in order, 1..N are taken and a product saved without
  // a position sorted below every one of them.
  assert.match(remote, /function positionForNewProduct\(current\)/);
  assert.match(remote, /return Number\.isFinite\(min\) \? min - 1 : 1;/);
  // Only brand-new records; editing must never move a product.
  assert.match(remote, /const isNew = idx < 0;/);
  assert.match(remote, /if \(isNew && !hasPosition\)/);
});

test('an unreachable orders service is reported, not shown as zero orders', async () => {
  const remote = await read('src/data/remote.js');
  const panel = await read('src/admin/OrdersPanel.jsx');

  // The failure has to leave the data layer at all.
  assert.match(remote, /export function subscribeOrdersError\(cb\)/);
  assert.match(remote, /function setOrdersError\(error\)/);
  assert.match(remote, /\.catch\(\(error\) => \{\s*\n\s*ordersFailureStreak \+= 1;/);
  // And a success has to clear it, or the warning becomes permanent.
  assert.match(remote, /ordersFailureStreak = 0;\s*\n\s*setOrdersError\(null\);/);

  // The panel subscribes and separates "none yet" from "could not read".
  assert.match(panel, /subscribeOrdersError\(setFeedError\)/);
  assert.match(panel, /feedError \? \(/);
  assert.match(panel, /لم يصل أي طلب بعد/);
  assert.match(panel, /retryOrdersNow/);
});

test('polling backs off instead of hammering a service that is down', async () => {
  const remote = await read('src/data/remote.js');
  // 8s polling against a dead endpoint is 450 failed requests an hour.
  assert.match(remote, /if \(ordersFailureStreak && Date\.now\(\) < ordersNextAttemptAt\) return;/);
  assert.match(remote, /Math\.min\(300_000, ORDERS_REFRESH_MS \* 2 \*\* ordersFailureStreak\)/);
  // The admin can always override the backoff by asking.
  assert.match(remote, /export function retryOrdersNow\(\)/);
  assert.match(remote, /ordersNextAttemptAt = 0;/);
});

test('orders keep arriving while the dashboard sits in a background tab', async () => {
  const remote = await read('src/data/remote.js');
  // Polling stopped dead while hidden, so a new order raised no alert and no
  // sound until someone clicked the tab.
  assert.match(remote, /const ORDERS_BACKGROUND_REFRESH_MS = 30_000;/);
  assert.match(remote, /if \(hidden\) \{/);
  // The early return that used to skip every hidden tick must be gone.
  assert.doesNotMatch(
    remote,
    /function refreshOrdersWhenActive\(\)\s*\{\s*\n\s*if \(typeof document !== 'undefined' && document\.visibilityState !== 'visible'\) return;/
  );
});

test('saving a product never blocks on the optional stock mirror', async () => {
  const remote = await read('src/data/remote.js');
  // Awaiting it added up to 15s to every save, for a call the deployment may
  // not even serve; and a missing mirror was reported as a failed save.
  assert.match(remote, /syncInventory\(record\)\.catch\(\(\) => \{\}\)/);
  assert.match(remote, /const INVENTORY_ABSENT_CODES = new Set\(\[/);
  assert.match(remote, /if \(!INVENTORY_ABSENT_CODES\.has\(err\?\.code\)\)/);
});

test('a product save survives an untouched optional field', async () => {
  const remote = await read('src/data/remote.js');
  // The Realtime Database rejects the whole write for one `undefined` value,
  // and the admin form builds its record by spreading state.
  assert.match(remote, /function stripUndefined\(value\)/);
  assert.match(remote, /function prepareForFirebase\(record\)/);
  assert.match(remote, /const lean = prepareForFirebase\(record\)/);
});

test('section slugs are matched case-insensitively', async () => {
  const products = await read('src/data/products.js');
  const remote = await read('src/data/remote.js');
  // Ten products sat under `Trainers` and ten under `trainers`: one section
  // split in two, listed twice in the filter, half its products unreachable.
  assert.match(products, /export function slug\(value\)/);
  assert.match(products, /gender: slug\(raw\.gender\)/);
  assert.match(products, /sub: slug\(raw\.sub\)/);
  // Saving heals the stored casing too.
  assert.match(remote, /for \(const key of \['gender', 'category', 'sub'\]\)/);
});
