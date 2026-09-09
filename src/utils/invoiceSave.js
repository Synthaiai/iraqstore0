const INVOICE_IMAGE_PREFIX = 'iraqstore.invoice.image.';

export function rememberInvoiceImage(dataUrl, filename = 'iraq-store-invoice.png') {
  if (!dataUrl) return '';
  const key = `${INVOICE_IMAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = JSON.stringify({ dataUrl, filename, createdAt: Date.now() });
  try {
    localStorage.setItem(key, payload);
    return `/invoice-image?key=${encodeURIComponent(key)}`;
  } catch {
    return dataUrl;
  }
}

export function readRememberedInvoiceImage(key) {
  if (!key || !key.startsWith(INVOICE_IMAGE_PREFIX)) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload?.dataUrl) return null;
    return payload;
  } catch {
    return null;
  }
}

export function forgetOldInvoiceImages(maxAgeMs = 60 * 60 * 1000) {
  try {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(INVOICE_IMAGE_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      const payload = raw ? JSON.parse(raw) : null;
      if (!payload?.createdAt || now - payload.createdAt > maxAgeMs) localStorage.removeItem(key);
    }
  } catch {
    // Best-effort cleanup only.
  }
}
