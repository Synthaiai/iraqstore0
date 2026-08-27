import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { usePrefs } from '../store/PrefsContext';
import { formatPrice, searchProducts } from '../data/products';
import { STORE_CONTACT } from '../data/contact';
import Logo from './Logo';
import { Bag, Close, Facebook, Heart, Instagram, Menu, Moon, Phone, Search, Sun, Whatsapp } from './Icons';

export default function Header() {
  const { cartCount, openCart, favorites } = useStore();
  const { t, tf, theme, lang, toggleTheme, toggleLang } = usePrefs();
  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const NAV = [
    { to: '/g/men', label: t('men') },
    { to: '/g/women', label: t('women') },
  ];

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      const t2 = setTimeout(() => inputRef.current?.focus(), 260);
      return () => clearTimeout(t2);
    }
    setTerm('');
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const hits = searchProducts(term);

  const go = (to) => {
    setMenuOpen(false);
    setSearchOpen(false);
    navigate(to);
  };

  const ThemeToggle = ({ className = 'pref-btn' }) => (
    <button
      type="button"
      className={className}
      onClick={toggleTheme}
      aria-label={t('toggleTheme')}
      title={t('toggleTheme')}
    >
      {theme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );

  const LangToggle = ({ className = 'pref-btn pref-btn--lang', isDrawer = false }) => (
    <button
      type="button"
      className={className}
      onClick={toggleLang}
      aria-label={t('toggleLang')}
      title={t('toggleLang')}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
    >
      <span aria-hidden>🌐</span>
      <span>{isDrawer ? (lang === 'ar' ? 'English' : 'العربية') : (lang === 'ar' ? 'EN' : 'عربي')}</span>
    </button>
  );

  return (
    <>
      <header className={`header ${stuck ? 'is-stuck' : ''}`}>
        {/* Contact strip — phone + socials, always visible */}
        <div className="topbar">
          <div className="shell topbar__inner">
            <a className="topbar__phone" href={`tel:${STORE_CONTACT.phone}`}>
              <Phone />
              <span dir="ltr">{STORE_CONTACT.phone}</span>
            </a>
            <span className="topbar__slogan">{lang === 'en' ? STORE_CONTACT.sloganEn : STORE_CONTACT.slogan}</span>
            <div className="topbar__socials">
              <LangToggle className="topbar__lang-btn" />
              <a href={STORE_CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <Whatsapp />
              </a>
              <a href={STORE_CONTACT.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram />
              </a>
              <a href={STORE_CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook />
              </a>
            </div>
          </div>
        </div>

        <div className="shell header__bar">
          <nav className="header__nav" aria-label={t('menu')}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="icon-btn burger"
            onClick={() => setMenuOpen(true)}
            aria-label={t('menu')}
          >
            <Menu />
          </button>

          <Logo />

          <div className="header__actions">
            <LangToggle className="pref-btn pref-btn--lang header__pref" />
            <ThemeToggle className="pref-btn header__pref" />

            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label={t('search')}
              aria-expanded={searchOpen}
            >
              {searchOpen ? <Close /> : <Search />}
            </button>

            <Link to="/favorites" className="icon-btn" aria-label={t('favorites')}>
              <Heart />
              {favorites.length > 0 && <span className="icon-btn__count">{favorites.length}</span>}
            </Link>

            <button type="button" className="icon-btn" onClick={openCart} aria-label={t('cart')}>
              <Bag />
              {cartCount > 0 && <span className="icon-btn__count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* ---- Search ---- */}
      <div className={`search-panel ${searchOpen ? 'is-open' : ''}`} aria-hidden={!searchOpen}>
        <div className="shell search-panel__inner">
          <div className="search-field">
            <Search />
            <input
              ref={inputRef}
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('search')}
            />
            <button type="button" className="icon-btn" onClick={() => setSearchOpen(false)} aria-label={t('close')}>
              <Close />
            </button>
          </div>

          {term.trim().length >= 2 && (
            <>
              {hits.length === 0 ? (
                <p style={{ marginTop: '1.5rem', color: 'var(--ink-400)' }}>
                  {t('searchNoResults')} «{term}». {t('searchHint')}
                </p>
              ) : (
                <div className="search-results">
                  {hits.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="search-hit"
                      onClick={() => go(`/product/${p.id}`)}
                    >
                      <img src={(p.images && p.images[0]) || (p.thumbs && p.thumbs[0]) || p.image || '/logo.png'} alt="" loading="lazy" />
                      <span style={{ textAlign: 'start' }}>
                        <span className="search-hit__name">{tf(p, 'name')}</span>
                        <br />
                        <span className="search-hit__price">{formatPrice(p.price, lang)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {searchOpen && <div className="overlay is-open" onClick={() => setSearchOpen(false)} aria-hidden />}

      {/* ---- Mobile nav ---- */}
      <div className={`mobile-nav ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <Logo />
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label={t('close')}>
            <Close />
          </button>
        </div>
        {NAV.map((item) => (
          <Link key={item.to} to={item.to} className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link to="/favorites" className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
          {t('favorites')}
        </Link>

        <div className="mobile-nav__prefs">
          <ThemeToggle className="pref-btn pref-btn--wide" />
          <LangToggle className="pref-btn pref-btn--lang pref-btn--wide" isDrawer />
        </div>
      </div>
    </>
  );
}
