import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GENDERS } from '../data/catalog';
import { POOLS, heroSrcSet, img, imgWide, srcSet } from '../data/images';
import { countProducts, featuredProducts, newArrivals } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { useLiveData } from '../store/LiveDataContext';
import Img from '../components/Img';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { ChevronLeft } from '../components/Icons';

export default function Home() {
  const { t, lang } = usePrefs();
  useLiveData(); // re-render when the live catalogue changes
  const featured = featuredProducts(8);
  const arrivals = newArrivals(4);
  const catName = (g) => (lang === 'en' ? g.latin : g.title);
  const portalMeta = lang === 'en' ? 'Footwear · Clothing · Accessories' : 'أحذية · ملابس · إكسسوارات';

  const scrollToShop = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const el = document.getElementById('shop');
    if (el) {
      const headerOffset = 75;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    let touchStartY = 0;
    let isSnapping = false;

    const handleTouchStart = (e) => {
      if (e.touches && e.touches[0]) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e) => {
      if (isSnapping) return;
      if (!e.touches || !e.touches[0]) return;
      const currentY = e.touches[0].clientY;
      const diff = touchStartY - currentY;
      // If user is at top of page / hero area and swipes down once
      if (window.scrollY < 80 && diff > 30) {
        isSnapping = true;
        scrollToShop();
        setTimeout(() => {
          isSnapping = false;
        }, 900);
      }
    };

    const handleWheel = (e) => {
      if (isSnapping) return;
      if (window.scrollY < 60 && e.deltaY > 15) {
        isSnapping = true;
        scrollToShop();
        setTimeout(() => {
          isSnapping = false;
        }, 900);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const strip = [
    { to: '/g/men/shoes/formal', title: 'أحذية رسمية', titleEn: 'Formal shoes', cover: POOLS.mFormal[1], count: countProducts('men', 'shoes', 'formal') },
    { to: '/g/women/clothing/dresses', title: 'فساتين', titleEn: 'Dresses', cover: POOLS.wDresses[2], count: countProducts('women', 'clothing', 'dresses') },
    { to: '/g/men/accessories/watches', title: 'ساعات', titleEn: 'Watches', cover: POOLS.mWatches[1], count: countProducts('men', 'accessories', 'watches') },
    { to: '/g/women/accessories/bags', title: 'حقائب', titleEn: 'Bags', cover: POOLS.wBags[1], count: countProducts('women', 'accessories', 'bags') },
  ];

  return (
    <>
      {/* ============ Hero ============ */}
      <section className="hero">
        <div className="hero__media">
          <Img
            src={imgWide(POOLS.editorial[0], 960, 540)}
            srcSet={heroSrcSet(POOLS.editorial[0])}
            sizes="100vw"
            alt=""
            eager
          />
        </div>
        <div className="hero__scrim" />
        <div className="hero__glow" aria-hidden />

        <div className="shell hero__inner">
          <span className="hero__badge">
            <span className="hero__badge-dot" aria-hidden />
            {t('newSeason')}
          </span>
          <h1 className="hero__title">
            {t('heroTitle1')}
            <br />
            <em>{t('heroTitle2')}</em>
          </h1>
          <p className="hero__lede">{t('heroLede')}</p>
          <div className="hero__cta">
            <a href="#shop" onClick={scrollToShop} className="btn btn--light btn--lg">
              {t('shopNow')}
            </a>
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToShop}
          className="hero__hint"
          aria-label={t('scroll')}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {t('scroll')}
        </button>
      </section>

      {/* ============ The two doors ============ */}
      <section id="shop" className="section shell" style={{ scrollMarginTop: '90px' }}>
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">{t('shopBy')}</span>
            <h2 className="section-head__title">{t('whereStart')}</h2>
            <p className="section-head__sub">{t('whereStartSub')}</p>
          </div>
        </Reveal>

        <div className="portal-grid">
          {GENDERS.map((g, i) => (
            <Reveal key={g.slug} delay={i * 110}>
              <Link to={`/g/${g.slug}`} className="portal">
                <Img
                  className="portal__img"
                  src={img(g.cover, 640, 800)}
                  srcSet={srcSet(g.cover, [420, 640, 900, 1200], 5 / 4)}
                  sizes="(max-width: 760px) 94vw, 47vw"
                  alt={catName(g)}
                  eager
                />
                <span className="portal__scrim" />
                <span className="portal__frame" />

                <span className="portal__body">
                  <span className="portal__label">{g.latin}</span>
                  <span className="portal__title">{catName(g)}</span>
                  <span className="portal__meta">{portalMeta}</span>
                  <span className="portal__enter">
                    {t('enterSection')}
                    <ChevronLeft />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ Best sellers ============ */}
      {featured.length > 0 && (
        <section className="section shell">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Best Sellers</span>
              <h2 className="section-head__title">{t('bestSellers')}</h2>
              <p className="section-head__sub">{t('bestSellersSub')}</p>
            </div>
            <Link to="/g/men/all" className="link-underline">
              {t('viewAll')}
            </Link>
          </Reveal>

          <div className="product-grid">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ============ New arrivals ============ */}
      {arrivals.length > 0 && (
        <section className="section shell">
          <Reveal className="section-head">
            <div>
              <span className="eyebrow">Just In</span>
              <h2 className="section-head__title">{t('newArrivals')}</h2>
              <p className="section-head__sub">{t('newArrivalsSub')}</p>
            </div>
            <Link to="/g/women/all" className="link-underline">
              {t('viewAll')}
            </Link>
          </Reveal>

          <div className="product-grid">
            {arrivals.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* ============ Quick category strip ============ */}
      <section className="section section--tight shell">
        <Reveal className="tile-grid tile-grid--4">
          {strip.map((item) => (
            <Link key={item.to} to={item.to} className="tile" style={{ aspectRatio: '1 / 1' }}>
              <Img
                className="tile__img"
                src={img(item.cover, 400, 400)}
                srcSet={srcSet(item.cover, [280, 400, 560], 1)}
                sizes="(max-width: 560px) 92vw, (max-width: 1100px) 46vw, 23vw"
                alt=""
              />
              <span className="tile__scrim" />
              <span className="tile__arrow" aria-hidden>
                <ChevronLeft />
              </span>
              <span className="tile__body">
                <span className="tile__title" style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.5rem)' }}>
                  {lang === 'en' ? item.titleEn : item.title}
                </span>
                <span className="tile__count">
                  {item.count} {t('piece')}
                </span>
              </span>
            </Link>
          ))}
        </Reveal>
      </section>
    </>
  );
}
