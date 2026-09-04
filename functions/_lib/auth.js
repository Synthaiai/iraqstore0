import { apiError } from './http.js';

const DEFAULT_ADMINS = [
  'adminiraq@gmail.com',
  'adminiraqstore@gmail.com',
  'adoiniraqstore@gmail.com',
];

function adminEmails(env) {
  return String(env.ADMIN_EMAILS || DEFAULT_ADMINS.join(','))
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(request, env) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return { error: apiError(401, 'AUTH_REQUIRED', 'يجب تسجيل الدخول كمدير.') };

  const apiKey = env.FIREBASE_WEB_API_KEY;
  if (!apiKey) {
    return { error: apiError(503, 'AUTH_NOT_CONFIGURED', 'مصادقة الخادم غير مهيأة.') };
  }

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!response.ok) return { error: apiError(401, 'INVALID_TOKEN', 'جلسة الإدارة غير صالحة.') };

    const body = await response.json();
    const user = body.users?.[0];
    const email = String(user?.email || '').trim().toLowerCase();
    if (!user?.localId || !user.emailVerified || !adminEmails(env).includes(email)) {
      return { error: apiError(403, 'NOT_ADMIN', 'هذا الحساب غير مخوّل للإدارة.') };
    }
    return { user: { uid: user.localId, email } };
  } catch {
    return { error: apiError(503, 'AUTH_UNAVAILABLE', 'تعذر التحقق من حساب الإدارة.') };
  }
}
