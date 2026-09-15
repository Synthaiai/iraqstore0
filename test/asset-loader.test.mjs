import test from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_SCREEN_PRODUCTS, collectAssets, loadAsset, preloadAssets } from '../src/data/assetLoader.js';

test('launch preload collects card art only, deduplicated, with responsive choices', () => {
  const jobs = collectAssets([{
    image: '/a', imageSet: '/a 400w, /a2 800w', imageAlt: '/alt',
    images: ['/a', '/b'], thumbs: ['/t'], large: ['/l'], largeSet: ['/l 600w, /xl 1200w'],
  }]);
  assert.equal(jobs.filter((j) => j.src === '/a').length, 1);
  assert(jobs.some((j) => j.src === '/a' && j.srcSet?.includes('/a2')));
  assert(jobs.some((j) => j.src === '/alt'));
  // Gallery-only sizes belong to the product page, which loads them on demand.
  assert(!jobs.some((j) => j.src === '/l' || j.src === '/xl'));
  // Only the first image of a card is needed before the store opens.
  assert(!jobs.some((j) => j.src === '/b'));
});

test('launch preload never blocks on more than the first screen of products', () => {
  const many = Array.from({ length: 200 }, (_, i) => ({ image: `/p${i}`, images: [`/p${i}`] }));
  const jobs = collectAssets(many);
  // The brand logo plus at most one card image per first-screen product.
  assert(jobs.length <= FIRST_SCREEN_PRODUCTS + 1, `expected a bounded job list, got ${jobs.length}`);
  assert(jobs.some((j) => j.src === '/p0'));
  assert(!jobs.some((j) => j.src === '/p199'));
});

test('a data URL does not retain its own bytes as a cache key', () => {
  const big = `data:image/webp;base64,${'A'.repeat(300_000)}`;
  const jobs = collectAssets([{ image: big, images: [big] }]);
  const job = jobs.find((j) => j.src === big);
  assert(job, 'the data URL should still be collected');
  // Deduplication must still work without holding a second copy of the bytes.
  assert.equal(jobs.filter((j) => j.src === big).length, 1);
});

test('a slow connection cannot hold the store closed indefinitely', async () => {
  const result = await preloadAssets(
    Array.from({ length: 30 }, (_, i) => ({ src: i })),
    () => {},
    { concurrency: 2, deadlineMs: 40, load: () => new Promise((resolve) => setTimeout(() => resolve(true), 25)) }
  );
  assert.equal(result.timedOut, true);
  assert(result.success < result.total, 'the run should stop early rather than decode everything');
});

test('bounded concurrency retries failures and never counts them as success', async () => {
  let active = 0, peak = 0;
  const attempts = new Map();
  const updates = [];
  const result = await preloadAssets(Array.from({ length: 9 }, (_, i) => ({ src: i })), s => updates.push(s), {
    concurrency: 3,
    load: async ({ src }) => {
      attempts.set(src, (attempts.get(src) || 0) + 1);
      peak = Math.max(peak, ++active);
      await new Promise(r => setTimeout(r, 2));
      active--;
      return src !== 4;
    },
  });
  assert.equal(peak, 3);
  assert.equal(attempts.get(4), 2);
  assert.equal(result.success, 8);
  assert.equal(result.failed.length, 1);
  assert(updates.every(s => s.success < s.total));
});

test('image readiness waits for decoding and rejects error, timeout and failed decode', async () => {
  let decoded = false;
  class GoodImage {
    naturalWidth = 100;
    set src(value) { if (value) queueMicrotask(() => this.onload?.()); }
    async decode() { await new Promise(r => setTimeout(r, 5)); decoded = true; }
  }
  assert.equal(await loadAsset({ src: '/good' }, { ImageClass: GoodImage }), true);
  assert(decoded);
  class BrokenImage extends GoodImage { async decode() { throw Error('decode'); } }
  assert.equal(await loadAsset({ src: '/bad-decode' }, { ImageClass: BrokenImage }), false);
  class StalledImage { set src(value) {} }
  assert.equal(await loadAsset({ src: '/stalled' }, { ImageClass: StalledImage, timeout: 5 }), false);
});

test('cancelled runs do not publish obsolete progress', async () => {
  const controller = new AbortController();
  let updates = 0;
  await preloadAssets([{ src: '/cancel' }], () => updates++, { signal: controller.signal, load: async () => { controller.abort(); return true; } });
  assert.equal(updates, 0);
});
