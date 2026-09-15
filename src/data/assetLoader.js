// Shared requests survive StrictMode effects. Only successfully decoded images
// are reusable in this page; localStorage cannot prove an HTTP cache still exists.
const requests = new Map();
/** Keeps a long browsing session from retaining every image ever decoded. */
const MAX_TRACKED_REQUESTS = 400;
export const BRAND_LOGO = '/brand-logo.jpg';
export const CARD_SIZES = '(max-width: 380px) 92vw, (max-width: 760px) 46vw, (max-width: 1100px) 30vw, 22vw';
/**
 * How many products the launch screen is allowed to block on.
 *
 * Preloading the whole catalogue does not scale: at 36 products that is ~140
 * images before the store opens, and it grows linearly with the catalogue.
 * Only the first screenful needs to be decoded up front — everything below the
 * fold is lazy-loaded by the cards themselves.
 */
export const FIRST_SCREEN_PRODUCTS = 12;

/**
 * A data URL is its own identity and can be hundreds of KB. Keying the cache by
 * the raw string would retain every image's bytes twice, so long sources are
 * keyed by a cheap non-cryptographic digest instead.
 */
function sourceKey(src) {
  if (src.length <= 256) return src;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < src.length; i += 1) {
    const c = src.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193);
    h2 = Math.imul(h2 + c, 0x85ebca6b);
  }
  return `#${src.length}:${(h1 >>> 0).toString(36)}${(h2 >>> 0).toString(36)}`;
}

const keyOf = (job) => `${sourceKey(job.src)}|${job.srcSet || ''}|${job.sizes || ''}`;

/**
 * Build the preload list for the launch screen.
 *
 * `limit` caps how many products contribute images; pass Infinity to collect
 * the whole catalogue (only sensible for small, known-bounded sets).
 */
export function collectAssets(products, visibleImages = [], limit = FIRST_SCREEN_PRODUCTS) {
  const jobs = new Map();
  const add = (src, srcSet, sizes) => {
    if (typeof src !== 'string' || !src.trim()) return;
    const job = { src, srcSet: srcSet || undefined, sizes: srcSet ? sizes : undefined };
    jobs.set(keyOf(job), job);
  };
  add(BRAND_LOGO);
  for (const el of visibleImages) add(el.getAttribute('src'), el.getAttribute('srcset'), el.getAttribute('sizes'));
  // Card art only: the gallery sizes (`large`/`largeSet`) belong to a product
  // page, which loads them on demand rather than at launch.
  for (const p of (Array.isArray(products) ? products : []).slice(0, limit)) {
    add(p.image, p.imageSet, CARD_SIZES);
    add(p.imageAlt, p.imageAltSet, CARD_SIZES);
    // Only fall back to the raw list when the card has no resolved art; adding
    // the same source again without its srcSet would decode it a second time.
    const seen = new Set([p.image, p.imageAlt].filter(Boolean));
    const primary = (p.images || [])[0] || (p.thumbs || [])[0];
    if (primary && !seen.has(primary)) add(primary);
  }
  return [...jobs.values()];
}

export function loadAsset(job, { ImageClass = Image, timeout = 15000 } = {}) {
  const key = keyOf(job);
  if (requests.has(key)) return requests.get(key);
  const request = new Promise((resolve) => {
    const image = new ImageClass();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      resolve(ok);
    };
    const timer = setTimeout(() => { finish(false); image.src = ''; }, timeout);
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        finish(image.naturalWidth > 0);
      } catch { finish(false); }
    };
    image.onerror = () => finish(false);
    image.decoding = 'async';
    if (job.sizes) image.sizes = job.sizes;
    if (job.srcSet) image.srcset = job.srcSet;
    image.src = job.src;
  });
  if (requests.size >= MAX_TRACKED_REQUESTS) {
    // Oldest-first eviction; these entries only memoise "already decoded once".
    const oldest = requests.keys().next().value;
    if (oldest !== undefined) requests.delete(oldest);
  }
  requests.set(key, request);
  request.then((ok) => { if (!ok) requests.delete(key); });
  return request;
}

/**
 * Decode a batch of images, reporting progress.
 *
 * `deadlineMs` bounds the whole run: a slow connection must not hold the store
 * closed indefinitely, so anything still pending when the deadline passes is
 * reported as timed out and left to lazy-load normally.
 */
export async function preloadAssets(jobs, onProgress, { signal, concurrency = 6, load = loadAsset, deadlineMs = 12000 } = {}) {
  let next = 0;
  let success = 0;
  const failed = [];
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; }, deadlineMs);
  const worker = async () => {
    while (!signal?.aborted && !timedOut && next < jobs.length) {
      const job = jobs[next++];
      let ok = await load(job);
      if (!ok && !signal?.aborted && !timedOut) ok = await load(job);
      if (signal?.aborted) return;
      if (ok) success += 1;
      else failed.push(job);
      onProgress({ success, total: jobs.length, failed: failed.length });
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  } finally {
    clearTimeout(deadline);
  }
  return { success, total: jobs.length, failed, timedOut };
}
