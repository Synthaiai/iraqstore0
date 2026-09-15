import { requireAdmin } from '../../_lib/auth.js';
import { apiError, json, readJson } from '../../_lib/http.js';

const STATUSES = new Set(['new', 'processing', 'shipped', 'completed', 'cancelled']);

async function orderWithItems(env, id) {
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ? OR order_no = ?').bind(id, id).first();
  if (!order) return null;
  const items = await env.DB.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').bind(order.id).all();
  return { order, items: items.results || [] };
}

/**
 * Move stock by `delta` for one product.
 *
 * A bare UPDATE silently does nothing when the product has no inventory row
 * (it was created before inventory tracking, or the row was pruned), which
 * loses the returned stock. Seeding the row first makes the restore real.
 */
function adjustStock(env, productId, delta, now) {
  return [
    env.DB.prepare('INSERT OR IGNORE INTO inventory (product_id, stock, updated_at) VALUES (?, 0, ?)')
      .bind(productId, now),
    env.DB.prepare('UPDATE inventory SET stock = stock + ?, updated_at = ? WHERE product_id = ?')
      .bind(delta, now, productId),
  ];
}

export async function onRequestPatch({ request, env, params }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة الطلبات غير مهيأة.');
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await readJson(request, 4096);
  } catch {
    return apiError(400, 'INVALID_JSON', 'بيانات التحديث غير صالحة.');
  }
  const status = String(body.status || '');
  if (!STATUSES.has(status)) return apiError(422, 'INVALID_STATUS', 'حالة الطلب غير صالحة.');

  const record = await orderWithItems(env, String(params.id));
  if (!record) return apiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود.');
  if (record.order.status === status) return json({ ok: true, status });

  const now = new Date().toISOString();
  const statements = [];
  if (status === 'cancelled' && record.order.status !== 'cancelled') {
    for (const item of record.items) statements.push(...adjustStock(env, item.product_id, Number(item.quantity), now));
  } else if (record.order.status === 'cancelled' && status !== 'cancelled') {
    for (const item of record.items) statements.push(...adjustStock(env, item.product_id, -Number(item.quantity), now));
  }
  statements.push(
    env.DB.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, record.order.id)
  );

  try {
    await env.DB.batch(statements);
    return json({ ok: true, status, updatedAt: now });
  } catch (error) {
    if (String(error?.message || '').includes('CHECK constraint failed')) {
      return apiError(409, 'OUT_OF_STOCK', 'لا يمكن إعادة تفعيل الطلب لأن المخزون غير كافٍ.');
    }
    return apiError(503, 'UPDATE_FAILED', 'تعذر تحديث الطلب.');
  }
}

export async function onRequestDelete({ request, env, params }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة الطلبات غير مهيأة.');
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  const record = await orderWithItems(env, String(params.id));
  if (!record) return apiError(404, 'ORDER_NOT_FOUND', 'الطلب غير موجود.');
  const now = new Date().toISOString();
  const statements = [];
  if (record.order.status !== 'cancelled') {
    for (const item of record.items) statements.push(...adjustStock(env, item.product_id, Number(item.quantity), now));
  }
  statements.push(env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(record.order.id));
  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error('order delete failed', error);
    return apiError(503, 'DELETE_FAILED', 'تعذر حذف الطلب. حاول مجددًا.');
  }
  return json({ ok: true });
}
