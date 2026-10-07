/**
 * Serve a product photo from R2, cached at the edge.
 *
 * The bucket is private; this is its only read path. Keys are content hashes
 * and objects are immutable, so a hit can be cached effectively forever — the
 * first visitor in each location pays for the R2 read and the rest are served
 * from Cloudflare's cache, which is what keeps the free allowance untouched.
 */

/** Only the shapes `/api/upload` writes. Anything else is not ours to serve. */
const KEY_PATTERN = /^products\/[0-9a-f]{64}\.(webp|jpg|png|avif)$/;

const TYPES = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  png: 'image/png',
  avif: 'image/avif',
};

const IMMUTABLE = 'public, max-age=31536000, immutable';

export async function onRequestGet({ request, env, params, waitUntil }) {
  if (!env.IMAGES) return new Response('Image storage is not configured', { status: 503 });

  const key = Array.isArray(params.path) ? params.path.join('/') : String(params.path || '');
  // Rejecting unknown shapes keeps this from becoming a way to probe the bucket.
  if (!KEY_PATTERN.test(key)) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), request);
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const extension = key.slice(key.lastIndexOf('.') + 1);
  const headers = new Headers({
    'content-type': object.httpMetadata?.contentType || TYPES[extension] || 'application/octet-stream',
    'cache-control': IMMUTABLE,
    'x-content-type-options': 'nosniff',
  });
  if (object.httpEtag) headers.set('etag', object.httpEtag);

  const response = new Response(object.body, { headers });
  // Populate the edge cache without making this request wait for it.
  waitUntil?.(cache.put(cacheKey, response.clone()));
  return response;
}
