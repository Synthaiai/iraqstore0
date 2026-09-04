export async function verifyTurnstile(request, env, token) {
  if (!env.TURNSTILE_SECRET) {
    return env.ENVIRONMENT === 'development'
      ? { success: true }
      : { success: false, reason: 'TURNSTILE_NOT_CONFIGURED' };
  }

  if (!token || typeof token !== 'string' || token.length > 2048) {
    return { success: false, reason: 'MISSING_TOKEN' };
  }

  const form = new FormData();
  form.set('secret', env.TURNSTILE_SECRET);
  form.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);
  form.set('idempotency_key', crypto.randomUUID());

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
    });
    const result = await response.json();
    return { success: result.success === true, reason: result['error-codes']?.[0] || null };
  } catch {
    return { success: false, reason: 'VERIFY_UNAVAILABLE' };
  }
}
