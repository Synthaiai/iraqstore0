import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { PrefsProvider } from './store/PrefsContext';
import { LiveDataProvider } from './store/LiveDataContext';
import { StoreProvider } from './store/StoreContext';
import './styles/global.css';
import './styles/checkout.css';
import './styles/theme.css';
import './styles/admin.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PrefsProvider>
        <LiveDataProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </LiveDataProvider>
      </PrefsProvider>
    </BrowserRouter>
  </StrictMode>
);
