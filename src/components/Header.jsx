import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { formatPrice, searchProducts } from '../data/products';
import Logo from './Logo';
import { Bag, Close, Heart, Menu, Search } from './Icons';

// Entry to the store is a gender choice; categories live one level in, on the
// gender page. Keeping the top bar to two doors matches how the shop is browsed.
const NAV = [
  { to: '/g/men', label: 'رجالي' },
  { to: '/g/women', label: 'نسائي' },
];

export default function Header() {
  const { cartCount, openCart, favorites } = useStore();
  const [stuck, setStuck] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      // Wait a frame so the panel has finished sliding before we steal focus.
      const t = setTimeout(() => inputRef.current?.focus(), 260);
      return () => clearTimeout(t);
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

  return (
    <>
      <header className={`header ${stuck ? 'is-stuck' : ''}`}>
        <div className="shell header__bar">
          <nav className="header__nav" aria-label="التنقل الرئيسي">
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
            aria-label="فتح القائمة"
          >
            <Menu />
          </button>

          <Logo />

          <div className="header__actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="بحث"
              aria-expanded={searchOpen}
            >
              {searchOpen ? <Close /> : <Search />}
            </button>

            <Link to="/favorites" className="icon-btn" aria-label="المفضلة">
              <Heart />
              {favorites.length > 0 && <span className="icon-btn__count">{favorites.length}</span>}
            </Link>

            <button type="button" className="icon-btn" onClick={openCart} aria-label="السلة">
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
              placeholder="ابحث عن حذاء، معطف، ساعة…"
              aria-label="البحث في المنتجات"
            />
            <button type="button" className="icon-btn" onClick={() => setSearchOpen(false)} aria-label="إغلاق البحث">
              <Close />
            </button>
          </div>

          {term.trim().length >= 2 && (
            <>
              {hits.length === 0 ? (
                <p style={{ marginTop: '1.5rem', color: 'var(--ink-400)' }}>
                  لا توجد نتائج لـ «{term}». جرّب كلمة أعمّ مثل «جلد» أو «كشمير».
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
                      <img src={p.thumbs[0]} alt="" loading="lazy" />
                      <span style={{ textAlign: 'start' }}>
                        <span className="search-hit__name">{p.name}</span>
                        <br />
                        <span className="search-hit__price">{formatPrice(p.price)}</span>
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
          <button type="button" className="icon-btn" onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة">
            <Close />
          </button>
        </div>
        {NAV.map((item) => (
          <Link key={item.to} to={item.to} className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
            {item.label}
          </Link>
        ))}
        <Link to="/favorites" className="mobile-nav__link" onClick={() => setMenuOpen(false)}>
          المفضلة
        </Link>
      </div>
    </>
  );
}
