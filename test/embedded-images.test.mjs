import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import manifest from '../src/data/embeddedImageManifest.js';
import { resolveEmbeddedImage } from '../src/data/embeddedImages.js';

test('all extracted photos resolve from their exact bytes to existing static files', async () => {
  for (const path of Object.values(manifest)) {
    const bytes = await readFile(new URL(`../public${path}`, import.meta.url));
    const mime = path.endsWith('.jpg') ? 'jpeg' : path.split('.').pop();
    const source = `data:image/${mime};base64,${bytes.toString('base64')}`;
    assert.equal(await resolveEmbeddedImage(source), path);
  }
});

test('new or edited photos and remote URLs are never replaced by stale files', async () => {
  for (const source of ['data:image/jpeg;base64,bmV3', 'https://example.com/new.jpg']) {
    assert.equal(await resolveEmbeddedImage(source), source);
  }
});
