import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getCategory, getGender, getSubcategoryLabel } from '../data/catalog';
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

/**
 * Title for a browse route, built from the catalogue tree.
 *
 * Every `/g/...` page used to share one title ("Shop"), which is both a poor
 * browser tab and a poor search result. Returns null for a path that is not a
 * browse route at all, which is how an unknown URL is recognised.
 */
function sectionTitle(pathname, en) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'g' || parts.length < 2 || parts.length > 4) return null;
  const [, genderSlug, categorySlug, subSlug] = parts;
  const gender = getGender(genderSlug);
  if (!gender) return null;
  const genderName = en ? gender.latin || gender.slug : gender.title;
  if (!categorySlug) return genderName;
  if (categorySlug === 'all') return en ? `All ${genderName}` : `كل منتجات ${genderName}`;
  const category = getCategory(genderSlug, categorySlug);
  if (!category) return null;
  const categoryName = en ? category.latin || category.slug : category.title;
  if (!subSlug || subSlug === 'all') return `${categoryName} · ${genderName}`;
  const sub = getSubcategoryLabel(genderSlug, categorySlug, subSlug);
  return `${en ? sub.latin : sub.title} · ${genderName}`;
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
      '/invoice-image': en ? 'Save your invoice' : 'حفظ الفاتورة',
    };
    // `/admin` is a real surface with its own routes under it; it is simply not
    // a shop page, so it is titled here and excluded from indexing below.
    const page = product
      ? (en ? product.nameEn || product.name : product.name)
      : pathname.startsWith('/admin')
        ? (en ? 'Store dashboard' : 'لوحة إدارة المتجر')
        : labels[pathname] || sectionTitle(pathname, en) || (en ? 'Page not found' : 'الصفحة غير موجودة');
    document.title = pathname === '/' ? page : `${page} | IRAQI STORE`;

    const description = product?.blurbEn && en
      ? product.blurbEn
      : product?.blurb || (en
        ? 'Clothing, footwear, and accessories with delivery across Iraq.'
        : 'ملابس وأحذية وإكسسوارات مع توصيل إلى جميع محافظات العراق.');
    ensureMeta('description').content = String(description).slice(0, 160);
    // An unknown URL must not be offered to search engines as a shop page. It
    // used to be titled "Shop" and indexed like any section.
    const indexable = Boolean(product) || pathname in labels || !!sectionTitle(pathname, en) || pathname.startsWith('/product/');
    ensureMeta('robots').content = !indexable || pathname.startsWith('/admin') || ['/checkout', '/order-confirmed', '/invoice-image'].includes(pathname)
      ? 'noindex,nofollow'
      : 'index,follow,max-image-preview:large';
  }, [pathname, lang, version]);

  return null;
}
