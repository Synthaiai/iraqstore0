import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Firebase stock and order writes require an allowlisted admin account', async () => {
  const rules = JSON.parse(await read('database.rules.json'));
  const clientAuth = await read('src/firebase.js');
  const serverAuth = await read('functions/_lib/auth.js');
  const stockRule = rules.rules.products.$productId.stockQuantity['.write'];
  assert.equal(stockRule, undefined);
  assert.match(rules.rules.products.$productId['.write'], /auth\.token\.email == 'adminiraq@gmail\.com'/);
  assert.match(rules.rules.products.$productId['.write'], /auth\.token\.email == 'avxdevolper@gmail\.com'/);
  assert.match(clientAuth, /'avxdevolper@gmail\.com'/);
  assert.match(serverAuth, /'avxdevolper@gmail\.com'/);
  // Full-size galleries are a separate node and must stay admin-only to write.
  assert.match(rules.rules.productImages.$productId['.write'], /auth\.token\.email == 'adminiraq@gmail\.com'/);
  assert.equal(rules.rules.productImages['.write'], undefined);
  // Orders live in Cloudflare D1, written only by the order API. A rules block
  // here implied a second source of truth that nothing actually wrote to.
  assert.equal(rules.rules.orders, undefined);
});

test('product records stay small enough to save and to serve', async () => {
  const remote = await read('src/data/remote.js');
  // Photos are split out of the record: the blocking write is a few KB, and the
  // public catalogue every visitor downloads no longer carries base64 images.
  assert.match(remote, /const PRODUCT_IMAGES_PATH = 'productImages'/);
  assert.match(remote, /delete lean\.images/);
  assert.match(remote, /saveProductGallery\(lean, images\)\.catch/);
  // The product cache must be budgeted by bytes, not by product count, or it
  // eats the whole localStorage quota and starves the cart.
  assert.match(remote, /serialized\.length <= PRODUCT_CACHE_BUDGET/);
  // An undeployed Worker answers 200 with HTML; that must not reach callers.
  assert.match(remote, /code = 'API_UNAVAILABLE'/);
});

test('editing a split product cannot overwrite its gallery with the thumbnail', async () => {
  const remote = await read('src/data/remote.js');
  const form = await read('src/admin/ProductForm.jsx');
  // List views receive `images: [thumb]` as a stand-in. Saving that back would
  // destroy the original photos, so it must be flagged and skipped.
  assert.match(remote, /imagesArePlaceholder: true/);
  assert.match(remote, /const placeholderOnly = record\.imagesArePlaceholder && images\.length <= 1/);
  assert.match(remote, /if \(images === null\) return cached/);
  // The edit form loads the real gallery, and refuses to save until it has.
  assert.match(form, /loadProductImages\(initial\.id\)/);
  assert.match(form, /if \(galleryLoading\) return setErr/);
  assert.match(form, /imagesArePlaceholder: Boolean\(init\.imagesArePlaceholder\)/);
});

test('production build starts from source instead of a committed bundle', async () => {
  const html = await read('index.html');
  assert.match(html, /src="\/src\/main\.jsx"/);
  assert.doesNotMatch(html, /index-v\d+-iraqstore/);
  assert.doesNotMatch(html, /Node\.prototype\.(removeChild|insertBefore)/);
});

test('client never writes orders or stock directly to Firebase', async () => {
  const remote = await read('src/data/remote.js');
  assert.doesNotMatch(remote, /firebaseio\.com\/orders/);
  assert.doesNotMatch(remote, /stockQuantity\.json/);
  assert.match(remote, /api\/orders/);
});

test('phone validation rejects short and non-Iraqi numbers', async () => {
  const module = await import('../src/data/iraq.js');
  assert.equal(module.isValidIraqiPhone('07701234567'), true);
  assert.equal(module.isValidIraqiPhone('+9647701234567'), true);
  assert.equal(module.isValidIraqiPhone('123456'), false);
  assert.equal(module.isValidIraqiPhone('06601234567'), false);
});

test('checkout clears cart only after a confirmed API response', async () => {
  const checkout = await read('src/pages/CheckoutPage.jsx');
  const saveAt = checkout.indexOf('await saveOrder(orderData)');
  const clearAt = checkout.indexOf('clearCart()');
  assert.ok(saveAt >= 0 && clearAt > saveAt);
  assert.match(checkout, /state: savedOrder/);
});

test('image uploads never touch Firebase Storage and stay small enough to save', async () => {
  const upload = await read('src/data/upload.js');
  const firebase = await read('src/firebase.js');
  // Storage is not part of this project: attempting an upload against a
  // disabled bucket used to stall every product save until a 60s timeout.
  assert.doesNotMatch(upload, /firebase\/storage/);
  assert.doesNotMatch(firebase, /firebase\/storage|storageBucket|getStorage/);
  // Inline images must stay well under the 20s Realtime Database write budget.
  assert.match(upload, /INLINE_IMAGE_LIMIT = 190 \* 1024/);
  assert.match(upload, /INLINE_DATAURL_LIMIT = 300 \* 1024/);
  assert.match(upload, /compressImageToLimit/);
  // Every outbound CDN upload is deadline-bounded.
  assert.match(upload, /AbortSignal\.timeout\(CDN_UPLOAD_TIMEOUT_MS\)/);
});

test('product saves are never blocked by the optional inventory mirror', async () => {
  const remote = await read('src/data/remote.js');
  // Writes used to get no AbortSignal at all, so a hanging /api/inventory PUT
  // left the admin UI spinning with no error.
  assert.doesNotMatch(remote, /fetchOptions\.method === 'GET'\) \? AbortSignal/);
  assert.match(remote, /signal: fetchOptions\.signal \|\| AbortSignal\.timeout\(15000\)/);
  assert.match(remote, /Inventory sync skipped \(product was saved to Firebase\)/);
});

test('draft products require authenticated catalogue access', async () => {
  const catalogApi = await read('functions/api/catalog.js');
  assert.match(catalogApi, /requireAdmin/);
  assert.match(catalogApi, /product\.status !== 'draft'/);
  assert.match(catalogApi, /private, no-store/);
});

test('deleting a non-cancelled order restores inventory atomically', async () => {
  const orderApi = await read('functions/api/orders/[id].js');
  assert.match(orderApi, /record\.order\.status !== 'cancelled'/);
  assert.match(orderApi, /SET stock = stock \+ \?/);
  assert.match(orderApi, /DB\.batch\(statements\)/);
});

test('no plaintext test password is committed in the E2E test', async () => {
  const e2e = await read('test/e2e_orders_test.py');
  assert.match(e2e, /E2E_ADMIN_PASSWORD/);
  assert.doesNotMatch(e2e, /fill\([^\n]+password[^\n]+['"]\d{6}['"]/i);
});

test('secure D1 schema enforces non-negative inventory and valid totals', async () => {
  const migration = await read('migrations/0001_secure_orders.sql');
  assert.match(migration, /CHECK \(stock >= 0\)/);
  assert.match(migration, /CHECK \(total = subtotal \+ fee\)/);
  assert.match(migration, /FOREIGN KEY|REFERENCES orders/);
});


test('phone accepts both Arabic digit sets and rejects embedded letters', async () => {
  const { normalizeIraqiPhone, isValidIraqiPhone } = await import('../src/data/iraq.js');
  for (const number of ['٠٧٧٠١٢٣٤٥٦٧', '۰۷۷۰۱۲۳۴۵۶۷', '+964 770 123 4567', '009647701234567']) {
    assert.equal(normalizeIraqiPhone(number), '9647701234567');
  }
  assert.equal(isValidIraqiPhone('0770abc1234567'), false);
});

test('catalogue batches large stock lookups and restores legacy product IDs', async () => {
  const { loadCatalog } = await import('../functions/_lib/catalog.js');
  const oldFetch = globalThis.fetch;
  const records = Object.fromEntries(Array.from({ length: 235 }, (_, i) => [`p${i}`, { name: 'shoe', stockQuantity: 15 }]));
  globalThis.fetch = async (url) => Response.json(url.includes('/products.json') ? records : {});
  const batches = [];
  try {
    const result = await loadCatalog({ DB: { prepare: () => ({ bind: (...ids) => {
      batches.push(ids.length);
      assert.ok(ids.length <= 90);
      return { all: async () => ({ results: ids.map((id) => ({ product_id: id, stock: 3 })) }) };
    } }) } });
    assert.deepEqual(batches, [90, 90, 55]);
    assert.equal(result.products.length, 235);
    assert.equal(result.products[234].id, 'p234');
    assert.equal(result.products[234].stockQuantity, 3);
  } finally { globalThis.fetch = oldFetch; }
});

test('image URL handling preserves signed URLs and encodes Storage object paths', async () => {
  const { img } = await import('../src/data/images.js');
  assert.equal(img(' https://example.com/shoe.jpg?token=123 '), 'https://example.com/shoe.jpg?token=123');
  assert.equal(img('gs://store.appspot.com/products/shoe one.webp'), 'https://firebasestorage.googleapis.com/v0/b/store.appspot.com/o/products%2Fshoe%20one.webp?alt=media');
  assert.equal(img(null), '/logo.jpg');
  assert.equal(img({ url: 'bad' }), '/logo.jpg');
});


test('reordering changes only display order and never resets sold inventory', async () => {
  const panel = await read('src/admin/ProductReorderPanel.jsx');
  const remote = await read('src/data/remote.js');
  assert.match(panel, /reorderOnly: true/);
  assert.match(remote, /if \(!reorderOnly\) \{/);
  assert.match(remote, /runWithConcurrency\(validRecords, BULK_INVENTORY_CONCURRENCY, syncInventory/);
  assert.match(remote, /batchMap\[\`\$\{record.id\}\/sortOrder\`\]/);
});

test('invoices save as images without using browser share sheets', async () => {
  const ordersPanel = await read('src/admin/OrdersPanel.jsx');
  const confirmedPage = await read('src/pages/OrderConfirmedPage.jsx');
  const invoice = await read('src/utils/invoice.js');
  assert.match(ordersPanel, /generateInvoiceImage/);
  assert.doesNotMatch(ordersPanel, /navigator\.share|canShare/);
  assert.doesNotMatch(confirmedPage, /navigator\.share|canShare|openWhatsAppInvoice|حفظ أو مشاركة|إرسال نسخة عبر الواتساب/);
  assert.match(ordersPanel, /فتح للحفظ بالاستديو/);
  assert.match(confirmedPage, /تنزيل الصورة للاندرويد فقط/);
  assert.match(confirmedPage, /download=\{invoiceName/);
  assert.doesNotMatch(confirmedPage, /rememberInvoiceImage|تنزيل للملفات/);
  assert.match(invoice, /Object\.values\(order\.cart\)/);
  assert.match(invoice, /readAsDataURL\(blob\)/);
  assert.match(invoice, /URL\.createObjectURL\(blob\)/);
  assert.match(ordersPanel, /blobToObjectUrl/);
  assert.match(confirmedPage, /blobToObjectUrl/);
});

test('admin orders refresh quickly and on app focus', async () => {
  const remote = await read('src/data/remote.js');
  assert.match(remote, /const ORDERS_REFRESH_MS = 8_000/);
  assert.match(remote, /ordersFetchRequest/);
  assert.match(remote, /if \(ordersFetchRequest\) return ordersFetchRequest/);
  assert.match(remote, /window\.addEventListener\('focus', refreshOrdersWhenActive\)/);
  assert.match(remote, /window\.addEventListener\('visibilitychange', refreshOrdersWhenActive\)/);
});



test('shoe subcategories fall back to the official six Arabic shoe sections', async () => {
  const catalog = await read('src/data/catalog.js');
  const browser = await read('src/components/ProductBrowser.jsx');
  const form = await read('src/admin/ProductForm.jsx');
  for (const label of ['أحذية كاجول', 'أحذية ترينرز', 'أحذية ركض (سنيكرز)', 'أحذية رسمية', 'أحذية لوفرز', 'بوتات']) {
    assert.match(catalog, new RegExp(label.replace(/[()]/g, '\\$&')));
  }
  assert.match(catalog, /mergeRequiredSubcategories/);
  assert.match(catalog, /'men\/shoes': mergeRequiredSubcategories\('men\/shoes'/);
  assert.match(catalog, /getSubcategories\(gender, category\)/);
  assert.match(browser, /getSubcategoryLabel/);
  assert.match(form, /INITIAL_CATEGORIES/);
  assert.doesNotMatch(form, />No Options</);
});


test('invoice image page gives iPhone a same-origin save surface', async () => {
  const app = await read('src/App.jsx');
  const page = await read('src/pages/InvoiceImagePage.jsx');
  const save = await read('src/utils/invoiceSave.js');
  assert.match(app, /path="\/invoice-image"/);
  assert.match(page, /Save to Photos|حفظ إلى الصور/);
  assert.match(page, /فاتورة الطلب للحفظ في الاستديو/);
  assert.match(save, /localStorage\.setItem/);
});

test('order totals and stock are decided by the server, never the client', async () => {
  const api = await read('functions/api/orders/index.js');
  // Price, fee and total come from the catalogue and settings, not the payload.
  assert.match(api, /const price = integer\(product\.price\)/);
  assert.match(api, /subtotal \+= price \* quantity/);
  assert.match(api, /const fees = deliveryFees\(bundle\.settings\)/);
  assert.doesNotMatch(api, /body\.(total|subtotal|price)/);
  // Draft products must never be purchasable.
  assert.match(api, /product\.status === 'draft'/);
  // Inventory moves inside the same atomic batch as the order insert.
  assert.match(api, /await env\.DB\.batch\(statements\)/);
});

test('a request body is bounded while it streams, not after it is buffered', async () => {
  const http = await read('functions/_lib/http.js');
  // content-length is optional, so the guard cannot rely on it alone.
  assert.match(http, /request\.body\?\.getReader\(\)/);
  assert.match(http, /received > maxBytes/);
  assert.match(http, /await reader\.cancel\(\)/);
  assert.doesNotMatch(http, /const text = await request\.text\(\)/);
});

test('cancelling an order really returns its stock', async () => {
  const api = await read('functions/api/orders/[id].js');
  // A bare UPDATE is a no-op when the product has no inventory row yet, which
  // silently loses the returned stock.
  assert.match(api, /INSERT OR IGNORE INTO inventory \(product_id, stock, updated_at\) VALUES \(\?, 0, \?\)/);
  assert.match(api, /adjustStock\(env, item\.product_id, Number\(item\.quantity\), now\)/);
  assert.match(api, /adjustStock\(env, item\.product_id, -Number\(item\.quantity\), now\)/);
  // Every write path answers with a clean error instead of an unhandled throw.
  assert.match(api, /DELETE_FAILED/);
});

test('production users never see raw error internals', async () => {
  const boundary = await read('src/components/ErrorBoundary.jsx');
  assert.match(boundary, /import\.meta\.env\.DEV/);
});

test('every outbound third-party request has a deadline', async () => {
  const translator = await read('src/utils/translator.js');
  // A hung translate request used to leave `isProcessingQueue` true forever.
  assert.match(translator, /fetch\(url, \{ signal: AbortSignal\.timeout\(\d+\) \}\)/);
});

test('migrating a product can never leave its photos nowhere', async () => {
  const remote = await read('src/data/remote.js');
  // Photos must be copied to their new home before the product record drops
  // them, so an interrupted run leaves the old (still readable) shape intact.
  const galleryWrite = remote.indexOf('await saveProductGallery(gallery.record, gallery.images)');
  const recordWrite = remote.indexOf("await withTimeout(update(ref(db, 'products'), batchMap)");
  assert(galleryWrite > 0 && recordWrite > 0, 'both writes should exist');
  assert(galleryWrite < recordWrite, 'the gallery copy must happen before the product record is slimmed');
  // A product whose gallery failed is left untouched rather than half-migrated.
  assert.match(remote, /batchMap\[gallery\.record\.id\] = gallery\.record;/);
  // A single save that loses its gallery upload puts the photos back.
  assert.match(remote, /set\(ref\(db, `products\/\$\{record\.id\}\/images`\), images\)/);
});

test('a save never pays for a cold database handshake', async () => {
  const remote = await read('src/data/remote.js');
  const dashboard = await read('src/admin/Dashboard.jsx');
  // The SDK opens its socket on first use, so the dashboard opens it on mount
  // rather than letting a save absorb the handshake inside its deadline.
  assert.match(remote, /ref\(db, '\.info\/connected'\)/);
  const shell = await read('src/admin/AdminApp.jsx');
  // Warm up from the login screen, not just once the dashboard renders.
  assert.match(shell, /warmUpRealtimeDatabase\(\)/);
  assert.match(dashboard, /warmUpRealtimeDatabase\(\)/);
  // A write that cannot land must say so, instead of blaming a timeout.
  assert.match(remote, /await awaitRealtimeConnection\(\)/);
  assert.match(remote, /لا يوجد اتصال بالإنترنت/);
  assert.match(remote, /تعذر الاتصال بقاعدة البيانات/);
});
