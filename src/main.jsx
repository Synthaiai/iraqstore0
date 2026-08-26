import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { PrefsProvider } from './store/PrefsContext';
import { LiveDataProvider } from './store/LiveDataContext';
import { StoreProvider } from './store/StoreContext';
import './styles/global.css';
import './styles/checkout.css';
import './styles/theme.css';
import './styles/admin.css';

// Ensure all mobile browsers & cached devices are immediately purged of stale service workers & caches
if (typeof window !== 'undefined') {
  try {
    // 1. Unregister any zombie Service Workers
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }
    // 2. Clear old CacheStorage caches
    if ('caches' in window) {
      caches.keys().then((keys) => {
        keys.forEach((key) => caches.delete(key));
      });
    }
    // 3. Clear old legacy build keys
    const APP_BUILD_KEY = 'iraqstore_build_v2_6';
    if (localStorage.getItem('iraqstore_build_version') !== APP_BUILD_KEY) {
      localStorage.removeItem('iraqstore_products_v1');
      localStorage.removeItem('iraqstore_catalog_v1');
      localStorage.setItem('iraqstore_build_version', APP_BUILD_KEY);
    }
  } catch (e) {
    console.warn('Cache purge error:', e);
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PrefsProvider>
          <LiveDataProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </LiveDataProvider>
        </PrefsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
