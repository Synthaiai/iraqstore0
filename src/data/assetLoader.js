// Shared requests survive StrictMode effects. Only successfully decoded images
// are reusable in this page; localStorage cannot prove an HTTP cache still exists.
const requests = new Map();
export const BRAND_LOGO = '/brand-logo.jpg';
export const CARD_SIZES = '(max-width: 380px) 92vw, (max-width: 760px) 46vw, (max-width: 1100px) 30vw, 22vw';
const keyOf = (job) => JSON.stringify([job.src, job.srcSet || '', job.sizes || '']);

export function collectAssets(products, visibleImages = []) {
  const jobs = new Map();
  const add = (src, srcSet, sizes) => {
    if (typeof src !== 'string' || !src.trim()) return;
    const job = { src, srcSet: srcSet || undefined, sizes: srcSet ? sizes : undefined };
    jobs.set(keyOf(job), job);
  };
  add(BRAND_LOGO);
  for (const el of visibleImages) add(el.getAttribute('src'), el.getAttribute('srcset'), el.getAttribute('sizes'));
  for (const p of products) {
    add(p.image, p.imageSet, CARD_SIZES);
    add(p.imageAlt, p.imageAltSet, CARD_SIZES);
    for (const src of [...(p.images || []), ...(p.thumbs || []), ...(p.large || [])]) add(src);
    (p.large || []).forEach((src, i) => {
      if (p.largeSet?.[i]) add(src, p.largeSet[i], '(max-width: 900px) 92vw, 48vw');
    });
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
  requests.set(key, request);
  request.then((ok) => { if (!ok) requests.delete(key); });
  return request;
}

export async function preloadAssets(jobs, onProgress, { signal, concurrency = 6, load = loadAsset } = {}) {
  let next = 0;
  let success = 0;
  const failed = [];
  const worker = async () => {
    while (!signal?.aborted && next < jobs.length) {
      const job = jobs[next++];
      let ok = await load(job);
      if (!ok && !signal?.aborted) ok = await load(job);
      if (signal?.aborted) return;
      if (ok) success += 1;
      else failed.push(job);
      onProgress({ success, total: jobs.length, failed: failed.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, jobs.length) }, worker));
  return { success, total: jobs.length, failed };
}
