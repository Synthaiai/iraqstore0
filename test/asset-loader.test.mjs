import test from 'node:test';
import assert from 'node:assert/strict';
import { collectAssets, loadAsset, preloadAssets } from '../src/data/assetLoader.js';

test('collects all galleries, deduplicates URLs and preserves responsive choices', () => {
  const jobs = collectAssets([{ image: '/a', images: ['/a', '/b'], thumbs: ['/t'], large: ['/l'], largeSet: ['/l 600w, /xl 1200w'] }]);
  assert.equal(jobs.filter(j => j.src === '/a').length, 1);
  assert(jobs.some(j => j.src === '/b'));
  assert(jobs.some(j => j.src === '/l' && j.srcSet?.includes('/xl')));
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
