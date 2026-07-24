import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Facebook, Instagram, Whatsapp } from './Icons';

const COLUMNS = [
  {
    title: 'رجالي',
    links: [
      { label: 'أحذية', to: '/g/men/shoes/all' },
      { label: 'ملابس', to: '/g/men/clothing/all' },
      { label: 'إكسسوارات', to: '/g/men/accessories/all' },
      { label: 'بدلات', to: '/g/men/clothing/suits' },
      { label: 'ساعات', to: '/g/men/accessories/watches' },
    ],
  },
  {
    title: 'نسائي',
    links: [
      { label: 'أحذية', to: '/g/women/shoes/all' },
      { label: 'ملابس', to: '/g/women/clothing/all' },
      { label: 'إكسسوارات', to: '/g/women/accessories/all' },
      { label: 'فساتين', to: '/g/women/clothing/dresses' },
      { label: 'حقائب', to: '/g/women/accessories/bags' },
    ],
  },
  {
    title: 'روابط',
    links: [
      { label: 'المفضلة', to: '/favorites' },
      { label: 'كل الأحذية', to: '/g/men/shoes/all' },
      { label: 'عبايات وقفاطين', to: '/g/women/clothing/modest' },
      { label: 'نظارات شمسية', to: '/g/women/accessories/eyewear' },
      { label: 'مجوهرات', to: '/g/women/accessories/jewelry' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__grid">
          <div className="footer__brand">
            <Logo />
            <p className="footer__about">
              متجر إلكتروني لبيع الملابس والأحذية والإكسسوارات الرجالية والنسائية.
              تصفّح الأقسام واختر ما يناسبك.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <div className="footer__col-title">{col.title}</div>
              <div className="footer__links">
                {col.links.map((l) => (
                  <Link key={l.label} to={l.to}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </nav>
          ))}
        </div>

        <div className="footer__bar">
          <span>© {new Date().getFullYear()} IraqStore · عراق ستور. جميع الحقوق محفوظة.</span>
          <div className="footer__socials">
            <a href="#" aria-label="إنستغرام">
              <Instagram />
            </a>
            <a href="#" aria-label="فيسبوك">
              <Facebook />
            </a>
            <a href="#" aria-label="واتساب">
              <Whatsapp />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
