import manifest from './embeddedImageManifest.js';

export async function resolveEmbeddedImage(source) {
  if (typeof source !== 'string' || !source.startsWith('data:image/')) return source;
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const digest = Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, '0')).join('');
  // An edited/new photo keeps its original data until it has its own exact match.
  return manifest[digest] || source;
}

export async function resolveEmbeddedProducts(products) {
  return Promise.all(products.map(async (product) => ({
    ...product,
    ...(Array.isArray(product.images) ? { images: await Promise.all(product.images.map(resolveEmbeddedImage)) } : {}),
    ...(product.image ? { image: await resolveEmbeddedImage(product.image) } : {}),
  })));
}
