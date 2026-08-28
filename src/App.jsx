import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';
import Header from './components/Header';
import ScrollToTop from './components/ScrollToTop';
import Toasts from './components/Toasts';
import BackToTop from './components/BackToTop';
import AutoTranslator from './components/AutoTranslator';
import AllProductsPage from './pages/AllProductsPage';
import CategoryPage from './pages/CategoryPage';
import CheckoutPage from './pages/CheckoutPage';
import FavoritesPage from './pages/FavoritesPage';
import GenderPage from './pages/GenderPage';
import Home from './pages/Home';
import ListingPage from './pages/ListingPage';
import NotFound from './pages/NotFound';
import OrderConfirmedPage from './pages/OrderConfirmedPage';
import ProductPage from './pages/ProductPage';

// Admin (with Firebase auth + storage) is a separate lazy chunk — the storefront
// never downloads it.
const AdminApp = lazy(() => import('./admin/AdminApp'));

export default function App() {
  const location = useLocation();

  // The admin panel is a full-screen surface with its own chrome.
  if (location.pathname.startsWith('/admin')) {
    return (
      <>
        <ScrollToTop />
        <Suspense fallback={<div className="admin-auth"><div className="admin-spinner" /></div>}>
          <AdminApp />
        </Suspense>
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Header />

      {/* Re-keying on the path restarts the entrance animation each navigation. */}
      <main key={location.pathname}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/g/:gender" element={<GenderPage />} />
          {/* Static "all" ranks above :category, so /g/men/all is the gender-wide list. */}
          <Route path="/g/:gender/all" element={<AllProductsPage />} />
          <Route path="/g/:gender/:category" element={<CategoryPage />} />
          <Route path="/g/:gender/:category/:sub" element={<ListingPage />} />
          <Route path="/product/:id" element={<ProductPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmed" element={<OrderConfirmedPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      <CartDrawer />
      <Toasts />
      <BackToTop />
      <AutoTranslator />
    </>
  );
}
