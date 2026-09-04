import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getProduct } from '../data/products';
import { useLiveData } from '../store/LiveDataContext';
import { usePrefs } from '../store/PrefsContext';

function ensureMeta(name) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.name = name;
    document.head.appendChild(element);
  }
  return element;
}

export default function PageMeta() {
  const { pathname } = useLocation();
  const { lang } = usePrefs();
  const { version } = useLiveData();

  useEffect(() => {
    const en = lang === 'en';
    const productId = pathname.startsWith('/product/') ? pathname.slice(9) : '';
    const product = productId ? getProduct(productId) : null;
    const labels = {
      '/': en ? 'Iraqi Store — Fashion delivered across Iraq' : 'عراقي ستور — أزياء وتوصيل إلى جميع محافظات العراق',
      '/checkout': en ? 'Checkout' : 'إتمام الطلب',
      '/favorites': en ? 'Favorites' : 'المفضلة',
      '/policies': en ? 'Store policies' : 'سياسات المتجر',
      '/order-confirmed': en ? 'Order confirmed' : 'تم تأكيد الطلب',
    };
    const page = product
      ? (en ? product.nameEn || product.name : product.name)
      : labels[pathname] || (en ? 'Shop' : 'تسوق');
    document.title = pathname === '/' ? page : `${page} | IRAQI STORE`;

    const description = product?.blurbEn && en
      ? product.blurbEn
      : product?.blurb || (en
        ? 'Clothing, footwear, and accessories with delivery across Iraq.'
        : 'ملابس وأحذية وإكسسوارات مع توصيل إلى جميع محافظات العراق.');
    ensureMeta('description').content = String(description).slice(0, 160);
    ensureMeta('robots').content = pathname.startsWith('/admin') || ['/checkout', '/order-confirmed'].includes(pathname)
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large';
  }, [pathname, lang, version]);

  return null;
}
