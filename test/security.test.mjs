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
