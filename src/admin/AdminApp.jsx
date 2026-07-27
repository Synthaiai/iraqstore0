import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../store/AuthContext';
import Dashboard from './Dashboard';
import Login from './Login';

function AdminGate() {
  const { ready, user, isAdmin } = useAuth();

  // The admin dashboard is always dark, regardless of the storefront theme.
  useEffect(() => {
    document.documentElement.setAttribute('data-admin', 'on');
    return () => document.documentElement.removeAttribute('data-admin');
  }, []);

  if (!ready) {
    return (
      <div className="admin-auth">
        <div className="admin-spinner" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  if (!user) return <Login />;
  if (!isAdmin) return <Login notAllowed />;
  return <Dashboard />;
}

/** The whole /admin surface. Auth lives here (not app-wide) so `firebase/auth`
    only ships in the lazily-loaded admin chunk. */
export default function AdminApp() {
  return (
    <AuthProvider>
      <AdminGate />
    </AuthProvider>
  );
}
