import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('Firebase stock and order writes require verified admin', async () => {
  const rules = JSON.parse(await read('database.rules.json'));
  const stockRule = rules.rules.products.$productId.stockQuantity['.write'];
  assert.equal(stockRule, undefined);
  assert.match(rules.rules.products.$productId['.write'], /email_verified/);
  assert.doesNotMatch(rules.rules.orders.$orderId['.write'], /data\.val\(\) == null/);
  assert.match(rules.rules.orders.$orderId['.write'], /email_verified/);
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

test('images are not embedded into Realtime Database as base64 fallback', async () => {
  const upload = await read('src/data/upload.js');
  const categories = await read('src/admin/CategoryTree.jsx');
  assert.doesNotMatch(upload, /readAsDataURL/);
  assert.match(upload, /throw new Error/);
  assert.doesNotMatch(categories, /setCover\(dataUrl\)/);
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
  assert.match(remote, /if \(!reorderOnly\) await Promise.all\(recordsList.map\(syncInventory\)\)/);
  assert.match(remote, /batchMap\[\`\$\{record.id\}\/sortOrder\`\]/);
});
