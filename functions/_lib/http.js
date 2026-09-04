const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

export function apiError(status, code, message, details) {
  return json({ ok: false, error: { code, message, ...(details ? { details } : {}) } }, status);
}

export async function readJson(request, maxBytes = 64 * 1024) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > maxBytes) throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw Object.assign(new Error('PAYLOAD_TOO_LARGE'), { status: 413 });
  }

  try {
    return JSON.parse(text);
  } catch {
    throw Object.assign(new Error('INVALID_JSON'), { status: 400 });
  }
}

export function noMethod() {
  return apiError(405, 'METHOD_NOT_ALLOWED', 'طريقة الطلب غير مسموحة.');
}

export function requestIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
