import { requireAdmin } from '../../_lib/auth.js';
import { deliveryFees, loadCatalog } from '../../_lib/catalog.js';
import { apiError, json, readJson, requestIp, sha256 } from '../../_lib/http.js';
import { verifyTurnstile } from '../../_lib/turnstile.js';

const GOVERNORATES = new Set([
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'كركوك', 'الأنبار', 'ذي قار',
  'بابل', 'ديالى', 'واسط', 'صلاح الدين', 'المثنى', 'القادسية', 'ميسان', 'دهوك', 'السليمانية',
]);

const text = (value, max) => String(value || '').trim().slice(0, max);
const integer = (value) => Number.isInteger(Number(value)) ? Number(value) : NaN;

function normalizePhone(value) {
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  const normalized = String(value || '').replace(/[٠-٩]/g, (d) => String(arabic.indexOf(d)));
  const digits = normalized.replace(/\D/g, '');
  if (/^07\d{9}$/.test(digits)) return `964${digits.slice(1)}`;
  if (/^7\d{9}$/.test(digits)) return `964${digits}`;
  if (/^009647\d{9}$/.test(digits)) return digits.slice(2);
  if (/^9647\d{9}$/.test(digits)) return digits;
  return null;
}

async function enforceRateLimit(request, env) {
  const windowStart = Math.floor(Date.now() / 600000);
  const clientKey = await sha256(`${requestIp(request)}:${env.RATE_LIMIT_SALT || 'iraqstore'}`);
  await env.DB.prepare(
    `INSERT INTO order_rate_limits (client_key, window_start, attempts) VALUES (?, ?, 1)
     ON CONFLICT(client_key, window_start) DO UPDATE SET attempts = attempts + 1`
  ).bind(clientKey, windowStart).run();
  const row = await env.DB.prepare(
    'SELECT attempts FROM order_rate_limits WHERE client_key = ? AND window_start = ?'
  ).bind(clientKey, windowStart).first();
  return Number(row?.attempts || 0) <= 10;
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة الطلبات غير مهيأة.');
  if (env.ENVIRONMENT !== 'development' && !env.RATE_LIMIT_SALT) {
    return apiError(503, 'SECURITY_NOT_CONFIGURED', 'حماية الطلبات غير مهيأة.');
  }

  let body;
  try {
    body = await readJson(request);
  } catch (error) {
    return apiError(error.status || 400, error.message, 'بيانات الطلب غير صالحة.');
  }

  if (!(await enforceRateLimit(request, env))) {
    return apiError(429, 'TOO_MANY_ORDERS', 'محاولات كثيرة. انتظر عشر دقائق ثم حاول مجددًا.');
  }
  waitUntil?.(env.DB.prepare('DELETE FROM order_rate_limits WHERE window_start < ?').bind(Math.floor(Date.now() / 600000) - 144).run());

  const turnstile = await verifyTurnstile(request, env, body.turnstileToken);
  if (!turnstile.success) {
    return apiError(403, 'BOT_CHECK_FAILED', 'تعذر التحقق الأمني. أعد تحميل الصفحة وحاول مجددًا.');
  }

  const name = text(body.name, 80);
  const phone = normalizePhone(body.phone);
  const governorate = text(body.governorate, 40);
  const city = text(body.city, 80);
  const address = text(body.address, 240);
  const notes = text(body.notes, 500);
  const payment = body.payment === 'card' ? 'card' : 'cod';
  const requestedCart = Array.isArray(body.cart) ? body.cart.slice(0, 20) : [];

  if (String(body.name || '').trim().length > 80 || String(body.city || '').trim().length > 80 ||
      String(body.address || '').trim().length > 240 || String(body.notes || '').trim().length > 500) {
    return apiError(422, 'CUSTOMER_DATA_TOO_LONG', 'أحد حقول معلومات التوصيل أطول من الحد المسموح.');
  }
  if (name.length < 2 || !phone || !GOVERNORATES.has(governorate) || city.length < 2 || address.length < 5) {
    return apiError(422, 'INVALID_CUSTOMER_DATA', 'تحقق من الاسم والهاتف والمحافظة والعنوان.');
  }
  if (!requestedCart.length || requestedCart.length !== body.cart?.length) {
    return apiError(422, 'INVALID_CART', 'السلة فارغة أو تحتوي عناصر أكثر من الحد المسموح.');
  }

  let bundle;
  try {
    bundle = await loadCatalog(env);
  } catch {
    return apiError(503, 'CATALOG_UNAVAILABLE', 'تعذر التحقق من المنتجات حاليًا.');
  }

  const products = new Map(bundle.products.map((product) => [String(product.id), product]));
  const items = [];
  let subtotal = 0;
  let itemCount = 0;

  for (const raw of requestedCart) {
    const productId = text(raw.productId || raw.product?.id, 120);
    const product = products.get(productId);
    const quantity = integer(raw.qty);
    if (!product || product.status === 'draft' || !Number.isFinite(quantity) || quantity < 1 || quantity > 10) {
      return apiError(422, 'INVALID_CART_ITEM', 'أحد منتجات السلة غير صالح أو لم يعد متوفرًا.');
    }
    const price = integer(product.price);
    if (!Number.isFinite(price) || price < 0) return apiError(422, 'INVALID_PRODUCT_PRICE', 'سعر منتج غير صالح.');

    const size = text(raw.size, 40);
    const color = text(raw.color, 60);
    if (Array.isArray(product.sizes) && product.sizes.length && !product.sizes.map(String).includes(size)) {
      return apiError(422, 'INVALID_SIZE', 'المقاس المختار غير متوفر.');
    }
    if (Array.isArray(product.colors) && product.colors.length) {
      const colors = product.colors.map((entry) => String(entry?.name || entry));
      if (!colors.includes(color)) return apiError(422, 'INVALID_COLOR', 'اللون المختار غير متوفر.');
    }

    const imageUrl = text(product.images?.[0] || product.image || '', 1000);
    const sourceStock = product.stockQuantity === undefined ? 15 : integer(product.stockQuantity);
    items.push({ productId, name: text(product.name, 160), price, quantity, size, color, imageUrl, initialStock: Math.max(0, Number.isFinite(sourceStock) ? sourceStock : 0) });
    subtotal += price * quantity;
    itemCount += quantity;
  }

  if (itemCount > 100 || subtotal > 100000000) return apiError(422, 'CART_LIMIT', 'الطلب يتجاوز الحد المسموح.');

  const fees = deliveryFees(bundle.settings);
  const fee = Math.max(0, integer(fees[governorate]) || 0);
  const total = subtotal + fee;
  const id = crypto.randomUUID();
  const orderNo = `IQ-${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`;
  const now = new Date().toISOString();

  const statements = [];
  for (const item of items) {
    statements.push(
      env.DB.prepare('INSERT OR IGNORE INTO inventory (product_id, stock, updated_at) VALUES (?, ?, ?)')
        .bind(item.productId, item.initialStock, now),
      env.DB.prepare('UPDATE inventory SET stock = stock - ?, updated_at = ? WHERE product_id = ?')
        .bind(item.quantity, now, item.productId)
    );
  }
  statements.push(
    env.DB.prepare(
      `INSERT INTO orders (id, order_no, name, phone, governorate, city, address, notes, payment,
       subtotal, fee, total, item_count, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`
    ).bind(id, orderNo, name, phone, governorate, city, address, notes, payment, subtotal, fee, total, itemCount, now, now)
  );
  for (const item of items) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, name, price, quantity, size, color, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(id, item.productId, item.name, item.price, item.quantity, item.size, item.color, item.imageUrl)
    );
  }

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error('order transaction failed', error);
    const message = String(error?.message || '');
    if (message.includes('CHECK constraint failed')) {
      return apiError(409, 'OUT_OF_STOCK', 'نفدت كمية أحد المنتجات أثناء إتمام الطلب. حدّث السلة وحاول مجددًا.');
    }
    return apiError(503, 'ORDER_SAVE_FAILED', 'تعذر حفظ الطلب. لم يتم تفريغ سلتك، حاول مجددًا.');
  }

  const cart = items.map((item) => ({
    productId: item.productId,
    qty: item.quantity,
    size: item.size,
    color: item.color,
    product: { id: item.productId, name: item.name, price: item.price, images: item.imageUrl ? [item.imageUrl] : [] },
  }));
  return json({
    ok: true,
    order: { id, orderNo, name, phone, governorate, city, address, notes, payment, paymentLabel: payment === 'card' ? 'الدفع بالبطاقة بعد التواصل' : 'الدفع عند الاستلام', subtotal, fee, total, itemCount, status: 'new', createdAt: now, cart },
  }, 201);
}

export async function onRequestGet({ request, env }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة الطلبات غير مهيأة.');
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const url = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const cursor = url.searchParams.get('before') || '';
  const separator = cursor.lastIndexOf('|');
  const beforeTime = separator > 0 ? cursor.slice(0, separator) : '9999-12-31T23:59:59.999Z';
  const beforeId = separator > 0 ? cursor.slice(separator + 1) : '~~~~';
  const result = await env.DB.prepare(
    `SELECT * FROM orders
     WHERE created_at < ? OR (created_at = ? AND id < ?)
     ORDER BY created_at DESC, id DESC LIMIT ?`
  ).bind(beforeTime, beforeTime, beforeId, limit).all();
  const rows = result.results || [];
  const itemMap = new Map();
  if (rows.length) {
    const placeholders = rows.map(() => '?').join(',');
    const itemResult = await env.DB.prepare(
      `SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`
    ).bind(...rows.map((row) => row.id)).all();
    for (const item of itemResult.results || []) {
      if (!itemMap.has(item.order_id)) itemMap.set(item.order_id, []);
      itemMap.get(item.order_id).push(item);
    }
  }
  const orders = [];
  for (const row of rows) {
    const items = itemMap.get(row.id) || [];
    orders.push({
      id: row.id, orderNo: row.order_no, name: row.name, phone: row.phone, governorate: row.governorate,
      city: row.city, address: row.address, notes: row.notes, payment: row.payment,
      paymentLabel: row.payment === 'card' ? 'الدفع بالبطاقة بعد التواصل' : 'الدفع عند الاستلام',
      subtotal: row.subtotal, fee: row.fee, total: row.total, itemCount: row.item_count,
      status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
      cart: items.map((item) => ({
        productId: item.product_id, qty: item.quantity, size: item.size, color: item.color,
        product: { id: item.product_id, name: item.name, price: item.price, images: item.image_url ? [item.image_url] : [] },
      })),
    });
  }
  const last = orders.at(-1);
  return json({ ok: true, orders, nextCursor: orders.length === limit ? `${last.createdAt}|${last.id}` : null });
}
