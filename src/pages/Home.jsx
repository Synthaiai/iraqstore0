import { Link } from 'react-router-dom';
import { GENDERS } from '../data/catalog';
import { POOLS, heroSrcSet, img, imgWide, srcSet } from '../data/images';
import { countProducts, featuredProducts, newArrivals } from '../data/products';
import Img from '../components/Img';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { ChevronLeft } from '../components/Icons';

const PORTAL_META = {
  men: 'أحذية · ملابس · إكسسوارات',
  women: 'أحذية · ملابس · إكسسوارات',
};

export default function Home() {
  const featured = featuredProducts(8);
  const arrivals = newArrivals(4);

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

        <div className="shell hero__inner">
          <span className="eyebrow" style={{ justifyContent: 'center' }}>
            IRAQI STORE
          </span>
          <h1 className="hero__title">
            ملابس وأحذية وإكسسوارات
            <br />
            <em>للرجال والنساء</em>
          </h1>
          <p className="hero__lede">
            تشكيلة واسعة بأسعار واضحة. اختر القسم، تصفّح المنتجات، وأضف ما يعجبك إلى السلة.
          </p>
          <div className="hero__cta">
            <Link to="/g/men" className="btn btn--light">
              تسوّق رجالي
            </Link>
            <Link to="/g/women" className="btn btn--ghost">
              تسوّق نسائي
            </Link>
          </div>
        </div>

        <span className="hero__hint" aria-hidden>
          SCROLL
        </span>
      </section>

      {/* ============ The two doors ============ */}
      <section className="section shell">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">Shop by</span>
            <h2 className="section-head__title">من أين تحب أن تبدأ؟</h2>
            <p className="section-head__sub">
              اختر قسمك، ثم تنقّل بين الأحذية والملابس والإكسسوارات في خطوتين فقط.
            </p>
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
                  alt={g.title}
                  eager
                />
                <span className="portal__scrim" />
                <span className="portal__frame" />

                <span className="portal__body">
                  <span className="portal__label">{g.latin}</span>
                  <span className="portal__title">{g.title}</span>
                  <span className="portal__meta">{PORTAL_META[g.slug]}</span>
                  <span className="portal__enter">
                    ادخل القسم
                    <ChevronLeft />
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ Best sellers ============ */}
      <section className="section shell">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">Best Sellers</span>
            <h2 className="section-head__title">الأكثر مبيعًا</h2>
            <p className="section-head__sub">المنتجات الأعلى طلبًا وتقييمًا في المتجر.</p>
          </div>
          <Link to="/g/men/shoes/all" className="link-underline">
            استعرض الكل
          </Link>
        </Reveal>

        <div className="product-grid">
          {featured.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* ============ New arrivals ============ */}
      <section className="section shell">
        <Reveal className="section-head">
          <div>
            <span className="eyebrow">Just In</span>
            <h2 className="section-head__title">وصل حديثًا</h2>
            <p className="section-head__sub">أحدث ما دخل المستودع هذا الأسبوع.</p>
          </div>
          <Link to="/g/women/clothing/all" className="link-underline">
            استعرض الكل
          </Link>
        </Reveal>

        <div className="product-grid">
          {arrivals.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* ============ Quick category strip ============ */}
      <section className="section section--tight shell">
        <Reveal className="tile-grid tile-grid--4">
          {[
            { to: '/g/men/shoes/formal', title: 'أحذية رسمية', cover: POOLS.mFormal[1], count: countProducts('men', 'shoes', 'formal') },
            { to: '/g/women/clothing/dresses', title: 'فساتين', cover: POOLS.wDresses[2], count: countProducts('women', 'clothing', 'dresses') },
            { to: '/g/men/accessories/watches', title: 'ساعات', cover: POOLS.mWatches[1], count: countProducts('men', 'accessories', 'watches') },
            { to: '/g/women/accessories/bags', title: 'حقائب', cover: POOLS.wBags[1], count: countProducts('women', 'accessories', 'bags') },
          ].map((t) => (
            <Link key={t.to} to={t.to} className="tile" style={{ aspectRatio: '1 / 1' }}>
              <Img
                className="tile__img"
                src={img(t.cover, 400, 400)}
                srcSet={srcSet(t.cover, [280, 400, 560], 1)}
                sizes="(max-width: 560px) 92vw, (max-width: 1100px) 46vw, 23vw"
                alt=""
              />
              <span className="tile__scrim" />
              <span className="tile__arrow" aria-hidden>
                <ChevronLeft />
              </span>
              <span className="tile__body">
                <span className="tile__title" style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.5rem)' }}>
                  {t.title}
                </span>
                <span className="tile__count">{t.count} قطعة</span>
              </span>
            </Link>
          ))}
        </Reveal>
      </section>
    </>
  );
}
