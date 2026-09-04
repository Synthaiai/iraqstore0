import { useState } from 'react';
import { useAuth } from '../store/AuthContext';

const ERRORS = {
  'auth/invalid-email': 'بريد إلكتروني غير صحيح',
  'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
  'auth/wrong-password': 'كلمة المرور غير صحيحة',
  'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
  'auth/too-many-requests': 'محاولات كثيرة — انتظر قليلًا ثم أعد المحاولة',
};

export default function Login({ notAllowed }) {
  const { login, logout, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(ERRORS[err.code] || 'تعذّر تسجيل الدخول');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-auth">
      <div className="admin-auth__card">
        <div className="admin-auth__brand">
          <img src="/logo.jpg" alt="" width="52" height="52" />
          <div>
            <strong>IRAQI STORE</strong>
            <span>لوحة الإدارة</span>
          </div>
        </div>

        {notAllowed ? (
          <>
            <p className="admin-auth__msg">
              الحساب <b>{user?.email}</b> غير مخوّل للوصول إلى لوحة الإدارة.
            </p>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={logout}>
              تسجيل الخروج
            </button>
          </>
        ) : (
          <form onSubmit={submit} className="admin-auth__form">
            <label className="admin-field">
              <span>البريد الإلكتروني</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                dir="ltr"
                required
              />
            </label>
            <label className="admin-field">
              <span>كلمة المرور</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                required
              />
            </label>
            {error && <p className="admin-auth__error">{error}</p>}
            <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
              {busy ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
