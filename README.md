# IraqStore | عراق ستور

**مباشر:** https://iraqstore.pages.dev — منشور على Cloudflare Pages.

متجر أزياء بواجهة عربية (RTL) — React + Vite، بلا أي إطار CSS خارجي.

## النشر على Cloudflare Pages

الموقع ثابت (SPA)، مخرجاته في `dist`.

| الإعداد | القيمة |
| --- | --- |
| أمر البناء | `npm run build` |
| مجلد المخرجات | `dist` |
| إصدار Node | `20` (من `.node-version`) |

نشر يدوي عبر Wrangler:

```bash
npm run build
npx wrangler pages deploy dist --project-name iraqstore --branch main
```

أو اربط مستودع GitHub من لوحة Cloudflare Pages ليُبنى تلقائيًا مع كل `push`.

### الأمان

- **HTTPS إجباري** عبر HSTS لمدة سنتين (`Strict-Transport-Security … preload`).
- **CSP صارم**: `script-src 'self'` فقط (لا سكربتات خارجية أو inline)؛ الصور من Unsplash والخطوط من Google Fonts حصرًا.
- `X-Frame-Options: DENY` و `frame-ancestors 'none'` — حماية من clickjacking.
- `X-Content-Type-Options: nosniff` · `Referrer-Policy` · `Permissions-Policy` (تعطيل الموقع والكاميرا والميكروفون والدفع).
- كل هذا في [public/_headers](public/_headers)، وتوجيه SPA في [public/_redirects](public/_redirects).

## التشغيل

```bash
npm install
```

```bash
npm run dev
```

ثم افتح `http://localhost:5173`.

للبناء الإنتاجي:

```bash
npm run build
```

## اللغات والتقنيات

| الطبقة | المستخدم |
| --- | --- |
| المنطق والواجهات | **JavaScript (ES2022)** بصيغة **JSX** |
| المكتبة | **React 18** + **React Router 6** |
| التنسيق | **CSS3** خام — بلا Tailwind أو أي إطار |
| البنية | **HTML5** |
| أداة البناء | **Vite 5** |
| الخلفية | لا يوجد — الموقع واجهة كاملة تعمل في المتصفح |

## الهوية البصرية

| العنصر | القيمة |
| --- | --- |
| أحمر الشعار | `#D81F26` (`--brand-red`) |
| العنابي الأساسي | `#6B0F1A` (`--burgundy-700`) |
| الأسود | `#0B0B0C` (`--ink-900`) |
| المحايدات | أبيض `#FFFFFF` · رمادي فاتح `#F4F2F1` · حدود `#E7E4E2` |
| الخط | **IBM Plex Sans Arabic** — أربعة أوزان فقط (400/500/600/700) |

الشعار مرسوم كـ SVG داخلي في [Logo.jsx](src/components/Logo.jsx) — يبقى حادًّا بأي حجم
ولا يكلّف أي طلب شبكة.

## الأداء على الإنترنت الضعيف

- كل صورة تُطلب بـ `srcSet` + `sizes`، فالهاتف ينزّل ملفًا بحجم الهاتف لا حجم الشاشة الكبيرة.
- جودة الضغط `q=52` مع `auto=format` (AVIF/WebP) — متوسط صورة البطاقة **~13 كيلوبايت**.
- الصورة الثانية في البطاقة (تأثير المرور) لا تُطلب إطلاقًا حتى يصل المؤشر فعليًا.
- `preconnect` لمضيف الصور، و`loading="lazy"` لكل ما هو خارج الشاشة.
- هيكل تحميل بلمعة (skeleton) يمنع قفز التخطيط أثناء وصول البيانات.

صفحة قائمة منتجات كاملة (١٨ صورة) تزن **~٢٤٢ كيلوبايت**.

كل الرموز معرّفة في `:root` داخل [global.css](src/styles/global.css).

### ملاحظتان على الطباعة العربية

- لا يوجد `letter-spacing` على أي نص عربي — الخط العربي متصل، والتباعد يكسره.
- `--lh-display: 1.5` و `--lh-body: 1.85` هما الحد الأدنى لارتفاع السطر؛ أي قيمة أقل تقصّ أعلى الحروف والتشكيل، خصوصًا داخل `-webkit-line-clamp`.

## بنية التنقّل

```
/                                  الرئيسية — بطاقتا رجالي/نسائي
/g/:gender                         ثلاث بطاقات: أحذية · ملابس · إكسسوارات
/g/:gender/:category               بطاقات الأقسام الفرعية (كل الأحذية، رياضية، رسمية، لوفرز…)
/g/:gender/:category/:sub          شبكة المنتجات مع الفرز والتصفية
/product/:id                       صفحة المنتج
/favorites                         المفضلة
/checkout                          إتمام الطلب — الدفع عند الاستلام
/order-confirmed                   تأكيد الطلب (يُوصل إليه بعد الإرسال فقط)
```

## إتمام الطلب

الدفع عند الاستلام (COD) — النمط السائد في العراق. النموذج في
[CheckoutPage.jsx](src/pages/CheckoutPage.jsx) يطلب الاسم والهاتف والمحافظة والمدينة
والعنوان، مع تحقّق:

- رقم هاتف عراقي صحيح (١١ رقمًا يبدأ بـ 07) عبر `isValidIraqiPhone` في [iraq.js](src/data/iraq.js).
- رسوم توصيل حسب المحافظة (بغداد ٣٬٠٠٠، بقية المحافظات ٥٬٠٠٠) — لا تُضاف للإجمالي حتى تُختار المحافظة.

عند التأكيد يُفرَّغ السلة ويُنتقل إلى صفحة التأكيد برقم طلب. لا خلفية — الطلب محاكاة محلية.

## الملفات

| المسار | الدور |
| --- | --- |
| [src/data/images.js](src/data/images.js) | بنوك الصور (Unsplash) + `img()` لتحديد المقاس والصيغة |
| [src/data/catalog.js](src/data/catalog.js) | شجرة الأقسام والأقسام الفرعية |
| [src/data/products.js](src/data/products.js) | ١٠٠ منتج + دوال الاستعلام والفرز والتصفية وتنسيق السعر |
| [src/components/SectionNav.jsx](src/components/SectionNav.jsx) | شريط تصفّح دائم — كل قسم على بُعد نقرة واحدة |
| [src/components/FilterPanel.jsx](src/components/FilterPanel.jsx) | تصفية بالسعر واللون والمقاس والعروض |
| [src/components/Img.jsx](src/components/Img.jsx) | صورة تدريجية بـ srcSet وهيكل تحميل |
| [src/store/StoreContext.jsx](src/store/StoreContext.jsx) | السلة والمفضلة والإشعارات — محفوظة في `localStorage` |
| [src/styles/global.css](src/styles/global.css) | نظام التصميم بالكامل |

## الاستجابة

سلّم نقاط التوقّف: `1280 · 1100 · 900 · 760 · 560 · 380`، إضافةً إلى
`(hover: none)` للّمس و `(orientation: landscape)` للشاشات القصيرة.

على اللمس تُعرض أزرار «إضافة إلى السلة» والمفضلة دائمًا بدل الاعتماد على `hover`.

## الصور

الصور من Unsplash عبر روابط مباشرة، ومُنقّاة يدويًا لاستبعاد أي علامة تجارية
ظاهرة لطرف ثالث — شعار منافس في واجهة المتجر أسوأ من غياب الصورة.

للتحقق من أن كل الروابط ما زالت تعمل، نفّذ في الـ console:

```js
const m = await import('/src/data/images.js');
const all = [...new Set(Object.values(m.POOLS).flat())];
const bad = (await Promise.all(all.map(s => new Promise(r => {
  const i = new Image();
  i.onload = () => r(null);
  i.onerror = () => r(s);
  i.src = `https://images.unsplash.com/${s}?w=80&h=80&fit=crop`;
})))).filter(Boolean);
console.log(bad);
```

## نطاق المشروع

المتجر معروض كمتجر يبيع ملابس — لا يوجد سرد لعلامة تجارية، ولا نشرة بريدية،
ولا وعود شحن أو ضمانات أو استرجاع في أي مكان. المحتوى منتجات وأقسام فقط.

## غير منجَز

الواجهة فقط — لا يوجد خلفية. زر «إتمام الشراء» لا يربط ببوابة دفع.
