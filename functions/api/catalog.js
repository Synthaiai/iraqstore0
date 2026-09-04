import { loadCatalog } from '../_lib/catalog.js';
import { apiError, json } from '../_lib/http.js';
import { requireAdmin } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  try {
    const bundle = await loadCatalog(env);
    const includeDrafts = new URL(request.url).searchParams.get('includeDrafts') === '1';
    if (includeDrafts) {
      const auth = await requireAdmin(request, env);
      if (auth.error) return auth.error;
    } else {
      bundle.products = bundle.products.filter((product) => product.status !== 'draft');
    }
    return json(
      { ok: true, ...bundle },
      200,
      includeDrafts
        ? { 'cache-control': 'private, no-store' }
        : { 'cache-control': 'public, max-age=15, s-maxage=30, stale-while-revalidate=60' }
    );
  } catch (error) {
    console.error('catalog fetch failed', error);
    return apiError(503, 'CATALOG_UNAVAILABLE', 'تعذر تحميل بيانات المتجر حاليًا.');
  }
}
