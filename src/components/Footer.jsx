import { Link } from 'react-router-dom';
import { usePrefs } from '../store/PrefsContext';
import Logo from './Logo';
import { Facebook, Instagram, Whatsapp } from './Icons';

export default function Footer() {
  const { t } = usePrefs();

  const columns = [
    {
      title: t('men'),
      links: [
        { label: t('allProducts'), to: '/g/men/all' },
        { label: t('allShoes'), to: '/g/men/shoes/all' },
        { label: t('suits'), to: '/g/men/clothing/suits' },
        { label: t('watches'), to: '/g/men/accessories/watches' },
      ],
    },
    {
      title: t('women'),
      links: [
        { label: t('allProducts'), to: '/g/women/all' },
        { label: t('dresses'), to: '/g/women/clothing/dresses' },
        { label: t('modest'), to: '/g/women/clothing/modest' },
        { label: t('bags'), to: '/g/women/accessories/bags' },
      ],
    },
    {
      title: t('footerLinks'),
      links: [
        { label: t('favorites'), to: '/favorites' },
        { label: t('jewelry'), to: '/g/women/accessories/jewelry' },
        { label: t('eyewear'), to: '/g/women/accessories/eyewear' },
      ],
    },
  ];

  return (
    <footer className="footer">
      <div className="shell">
        <div className="footer__grid">
          <div className="footer__brand">
            <Logo />
            <p className="footer__about">{t('footerAbout')}</p>
          </div>

          {columns.map((col) => (
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
          <span>
            © {new Date().getFullYear()} IRAQI STORE. {t('rightsReserved')}
          </span>
          <div className="footer__socials">
            <a href="#" aria-label="Instagram">
              <Instagram />
            </a>
            <a href="#" aria-label="Facebook">
              <Facebook />
            </a>
            <a href="#" aria-label="WhatsApp">
              <Whatsapp />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
