import { requireAdmin } from '../../_lib/auth.js';
import { apiError, json, readJson } from '../../_lib/http.js';

export async function onRequestPut({ request, env, params }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة المخزون غير مهيأة.');
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await readJson(request, 2048);
  } catch {
    return apiError(400, 'INVALID_JSON', 'بيانات المخزون غير صالحة.');
  }
  const stock = Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
    return apiError(422, 'INVALID_STOCK', 'كمية المخزون غير صالحة.');
  }
  const productId = String(params.id || '').slice(0, 120);
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO inventory (product_id, stock, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(product_id) DO UPDATE SET stock = excluded.stock, updated_at = excluded.updated_at`
  ).bind(productId, stock, now).run();
  return json({ ok: true, productId, stock });
}

export async function onRequestDelete({ request, env, params }) {
  if (!env.DB) return apiError(503, 'DATABASE_NOT_CONFIGURED', 'قاعدة المخزون غير مهيأة.');
  const auth = await requireAdmin(request, env);
  if (auth.error) return auth.error;
  await env.DB.prepare('DELETE FROM inventory WHERE product_id = ?').bind(String(params.id)).run();
  return json({ ok: true });
}
