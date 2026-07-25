import { POOLS, cardSrcSet, img, srcSet } from './images';

/* ============================================================
   Shared option sets
   ============================================================ */

const C = {
  black: { name: 'أسود', hex: '#141416' },
  white: { name: 'أبيض', hex: '#F2F0EE' },
  cream: { name: 'كريمي', hex: '#E8DFD2' },
  grey: { name: 'رمادي', hex: '#8A8A90' },
  charcoal: { name: 'فحمي', hex: '#3A3B3F' },
  navy: { name: 'كحلي', hex: '#1E2A44' },
  burgundy: { name: 'عنابي', hex: '#6B0F1A' },
  brown: { name: 'بني', hex: '#6A4A32' },
  tan: { name: 'جملي', hex: '#B08A5F' },
  camel: { name: 'كاميل', hex: '#C4A075' },
  olive: { name: 'زيتوني', hex: '#5B6045' },
  gold: { name: 'ذهبي', hex: '#C8A24A' },
  silver: { name: 'فضي', hex: '#C6C7CB' },
  nude: { name: 'بيج فاتح', hex: '#D9C3B0' },
  rose: { name: 'وردي باهت', hex: '#C9A0A0' },
  emerald: { name: 'زمردي', hex: '#1F4D3D' },
  sky: { name: 'سماوي', hex: '#A8C0D6' },
  denim: { name: 'دينم', hex: '#4A6280' },
};

const SIZES = {
  shoeM: ['40', '41', '42', '43', '44', '45'],
  shoeW: ['36', '37', '38', '39', '40', '41'],
  apparel: ['S', 'M', 'L', 'XL', 'XXL'],
  apparelW: ['XS', 'S', 'M', 'L', 'XL'],
  shirt: ['38', '39', '40', '41', '42', '43'],
  one: ['مقاس واحد'],
};

/* ============================================================
   Builder
   ============================================================ */

let seq = 0;

/**
 * Turns a compact tuple table into full product records.
 * Tuple: [name, blurb, price, oldPrice, rating, reviews, badge, colors, sizes, material]
 *
 * Prices are in Iraqi dinars at ordinary high-street retail levels — this is a
 * clothing shop, not a luxury house, so a shirt sits near 25,000 and not 250,000.
 */
function build(gender, category, sub, pool, rows) {
  return rows.map((r, i) => {
    const [name, blurb, price, oldPrice, rating, reviews, badge, colors, sizes, material] = r;
    // Each product owns a 4-photo gallery drawn from its category pool,
    // so the hover cross-fade and the PDP thumbs always have distinct frames.
    const gallery = [0, 1, 2, 3].map((k) => pool[(i * 2 + k) % pool.length]);
    seq += 1;
    return {
      id: `${gender[0]}${category[0]}-${sub}-${String(seq).padStart(3, '0')}`,
      gender,
      category,
      sub,
      name,
      blurb,
      price,
      oldPrice: oldPrice || null,
      rating,
      reviews,
      badge: badge || null,
      colors,
      sizes,
      material,
      gallery,
      // Card art is small by default; `srcSet` lets the browser pick smaller still.
      image: img(gallery[0], 420, 560),
      imageSet: cardSrcSet(gallery[0]),
      imageAlt: img(gallery[1], 420, 560),
      imageAltSet: cardSrcSet(gallery[1]),
      thumbs: gallery.map((g) => img(g, 140, 140, 45)),
      large: gallery.map((g) => img(g, 720, 900, 58)),
      largeSet: gallery.map((g) => srcSet(g, [420, 640, 900, 1200], 5 / 4, 58)),
    };
  });
}

/* ============================================================
   MEN · FOOTWEAR
   ============================================================ */

const menSneakers = build('men', 'shoes', 'sneakers', POOLS.mSneakers, [
  [
    'حذاء أفينيو الجلدي الأبيض',
    'جلد ناعم بخياطة مخفية ونعل مطاطي خفيف — يمشي مع كل شيء.',
    55000, 72000, 4.8, 214, 'sale',
    [C.white, C.black, C.navy], SIZES.shoeM, 'جلد صناعي فاخر',
  ],
  [
    'حذاء كوبر الرياضي الكلاسيكي',
    'قَصّة منخفضة بلسان مبطّن ونعل مقاوم للانزلاق.',
    42000, 0, 4.6, 168, null,
    [C.white, C.grey, C.burgundy], SIZES.shoeM, 'جلد وشمواه',
  ],
  [
    'حذاء نورث ران التقني',
    'شبك هوائي ووسادة مريحة للمشي الطويل.',
    38000, 0, 4.5, 302, 'new',
    [C.black, C.charcoal, C.olive], SIZES.shoeM, 'شبك تقني',
  ],
  [
    'حذاء ميريديان المرتفع',
    'رقبة مرتفعة بجلد مقلوب وبطانة دافئة للشتاء.',
    65000, 0, 4.7, 96, null,
    [C.brown, C.black, C.cream], SIZES.shoeM, 'جلد مقلوب',
  ],
  [
    'حذاء أطلس المينيمال',
    'سطح جلدي أملس بلا شعارات — كل التفاصيل بالقَصّة.',
    49000, 0, 4.9, 141, 'best',
    [C.white, C.cream, C.charcoal], SIZES.shoeM, 'جلد مصقول',
  ],
  [
    'حذاء ريتريت الكاجوال',
    'قماش قطني مغسول بنعل مريح لأيام العطلة.',
    28000, 36000, 4.4, 187, 'sale',
    [C.olive, C.navy, C.cream], SIZES.shoeM, 'قطن مغسول',
  ],
]);

// Casual trainers draw from the same photo pool as the running set but rotated,
// so the two shoe subcategories never show the same frame side by side.
const CASUAL_POOL = [...POOLS.mSneakers.slice(6), ...POOLS.mSneakers.slice(0, 6)];

const menCasual = build('men', 'shoes', 'casual', CASUAL_POOL, [
  [
    'ترينر كلاود اليومي',
    'نسيج محبوك خفيف بنعل طري — رفيق المشاوير اليومية.',
    39000, 0, 4.7, 176, 'best',
    [C.white, C.grey, C.black], SIZES.shoeM, 'نسيج محبوك',
  ],
  [
    'ترينر ريترو الجلدي',
    'قَصّة كلاسيكية بلمسة رياضية وخطوط جانبية أنيقة.',
    46000, 58000, 4.6, 142, 'sale',
    [C.cream, C.navy, C.burgundy], SIZES.shoeM, 'جلد وشمواه',
  ],
  [
    'ترينر سلِب-أون',
    'بلا رباط — يُلبس بثانية ويناسب الجينز والشورت.',
    33000, 0, 4.5, 98, null,
    [C.black, C.olive, C.grey], SIZES.shoeM, 'قطن مطاطي',
  ],
  [
    'ترينر كانفاس المغسول',
    'قماش قطني مغسول حجريًا يزداد راحة مع الوقت.',
    29000, 0, 4.4, 211, 'new',
    [C.cream, C.navy, C.burgundy], SIZES.shoeM, 'كانفاس قطني',
  ],
  [
    'ترينر شمواه كاجول',
    'شمواه مطفي بنعل كريب — أناقة غير رسمية.',
    52000, 0, 4.7, 87, null,
    [C.tan, C.grey, C.olive], SIZES.shoeM, 'شمواه',
  ],
]);

const menFormal = build('men', 'shoes', 'formal', POOLS.mFormal, [
  [
    'حذاء أكسفورد بغداد',
    'قَصّة أكسفورد كلاسيكية بنعل جلدي مثبّت.',
    85000, 0, 4.9, 128, 'best',
    [C.black, C.brown], SIZES.shoeM, 'جلد طبيعي',
  ],
  [
    'حذاء ديربي كرادة',
    'رباط مفتوح يرتاح للقدم أكثر — لدوام طويل.',
    72000, 0, 4.7, 92, null,
    [C.brown, C.black, C.burgundy], SIZES.shoeM, 'جلد مدبوغ',
  ],
  [
    'حذاء بروغ الكحلي',
    'تخريم بروغ على جلد مصبوغ بلمسة عتيقة.',
    78000, 92000, 4.8, 74, 'sale',
    [C.navy, C.brown], SIZES.shoeM, 'جلد مصبوغ',
  ],
  [
    'حذاء مونك ستراب',
    'إبزيم واحد أنيق يستغني عن الرباط تمامًا.',
    95000, 0, 4.8, 61, null,
    [C.black, C.brown, C.burgundy], SIZES.shoeM, 'جلد طبيعي',
  ],
  [
    'حذاء تشيلسي الجلدي',
    'جوانب مطاطية مرنة تناسب البدلة والجينز معًا.',
    80000, 0, 4.6, 118, 'new',
    [C.black, C.brown], SIZES.shoeM, 'جلد ناعم',
  ],
]);

const menLoafers = build('men', 'shoes', 'loafers', POOLS.mLoafers, [
  [
    'لوفر بيني الكلاسيكي',
    'الشكل الأصلي الذي ما تغيّر — بجلد أنعم.',
    68000, 0, 4.9, 156, 'best',
    [C.brown, C.black, C.burgundy], SIZES.shoeM, 'جلد طبيعي',
  ],
  [
    'لوفر تاسل الشمواه',
    'شراريب جلدية على شمواه مطفي.',
    74000, 88000, 4.7, 83, 'sale',
    [C.tan, C.navy, C.olive], SIZES.shoeM, 'شمواه',
  ],
  [
    'لوفر هورس بيت',
    'إبزيم معدني مصقول يمنح الحذاء توقيعه الخاص.',
    82000, 0, 4.8, 71, null,
    [C.black, C.brown], SIZES.shoeM, 'جلد ومعدن مصقول',
  ],
  [
    'لوفر درايفينغ الطري',
    'نعل حبيبات مطاطية لقيادة مريحة وإطلالة صيفية.',
    52000, 0, 4.5, 109, null,
    [C.navy, C.brown, C.cream], SIZES.shoeM, 'جلد طري',
  ],
  [
    'لوفر فيلفت المسائي',
    'مخمل عميق بحاشية مطرّزة للمناسبات.',
    79000, 0, 4.6, 44, 'new',
    [C.burgundy, C.black, C.emerald], SIZES.shoeM, 'مخمل قطني',
  ],
]);

/* ============================================================
   MEN · CLOTHING
   ============================================================ */

const menShirts = build('men', 'clothing', 'shirts', POOLS.mShirts, [
  [
    'قميص بوبلين الأبيض',
    'قطن بياقة نصف مثبتة وقَصّة مستقيمة.',
    22000, 0, 4.8, 240, 'best',
    [C.white, C.sky, C.black], SIZES.shirt, 'قطن ١٠٠٪',
  ],
  [
    'قميص أوكسفورد الأزرق',
    'نسيج أوكسفورد يزداد نعومة مع كل غسلة.',
    25000, 0, 4.7, 176, null,
    [C.sky, C.white, C.navy], SIZES.shirt, 'قطن أوكسفورد',
  ],
  [
    'قميص كتان صيفي',
    'كتان يتنفس بحرّ تموز ويبقى أنيق.',
    28000, 34000, 4.6, 131, 'sale',
    [C.cream, C.olive, C.white], SIZES.apparel, 'كتان',
  ],
  [
    'قميص فانيلا منقوش',
    'فانيلا قطنية مفرشاة بنقشة هادئة ودفء خفيف.',
    26000, 0, 4.5, 88, null,
    [C.burgundy, C.charcoal, C.olive], SIZES.apparel, 'قطن مفرشى',
  ],
  [
    'قميص ساتان مسائي',
    'انسدال ثقيل ولمعة خفيفة — قميص للمناسبات.',
    45000, 0, 4.7, 52, 'new',
    [C.black, C.burgundy, C.navy], SIZES.apparel, 'ساتان',
  ],
]);

const menSuits = build('men', 'clothing', 'suits', POOLS.mSuits, [
  [
    'بدلة ميريديان الكحلية',
    'صوف مخلوط بكتف طبيعي وبطانة خفيفة.',
    195000, 0, 4.9, 87, 'best',
    [C.navy, C.charcoal], SIZES.apparel, 'صوف مخلوط',
  ],
  [
    'بدلة الفحمي الرسمية',
    'قَصّة مستقيمة كلاسيكية بصدر مبطّن.',
    175000, 215000, 4.8, 64, 'sale',
    [C.charcoal, C.black], SIZES.apparel, 'صوف مخلوط',
  ],
  [
    'بليزر الكتان غير المبطّن',
    'بلا بطانة — أخف بليزر للصيف.',
    95000, 0, 4.6, 103, null,
    [C.cream, C.navy, C.olive], SIZES.apparel, 'كتان وقطن',
  ],
  [
    'بدلة توكسيدو المخملية',
    'ياقة ساتان ومخمل عنابي للمناسبات الكبيرة.',
    275000, 0, 4.9, 38, 'new',
    [C.burgundy, C.black, C.emerald], SIZES.apparel, 'مخمل وساتان',
  ],
  [
    'بليزر مزدوج الصدر',
    'ستة أزرار بقَصّة مُحكمة ترسم الكتف بوضوح.',
    145000, 0, 4.7, 49, null,
    [C.navy, C.charcoal, C.grey], SIZES.apparel, 'صوف مخلوط',
  ],
]);

const menOuter = build('men', 'clothing', 'outerwear', POOLS.mOuter, [
  [
    'معطف الصوف الطويل',
    'صوف ثقيل بقَصّة تصل إلى الركبة.',
    225000, 0, 4.9, 71, 'best',
    [C.camel, C.charcoal, C.navy], SIZES.apparel, 'صوف مخلوط',
  ],
  [
    'ترنش كوت كلاسيكي',
    'قطن مقاوم للماء بحزام خصر وكتفيات.',
    135000, 0, 4.7, 112, null,
    [C.camel, C.black, C.olive], SIZES.apparel, 'غبردين قطني',
  ],
  [
    'جاكيت جلد بومبر',
    'جلد طري ببطانة ناعمة وأساور مضلّعة.',
    165000, 195000, 4.8, 58, 'sale',
    [C.black, C.brown], SIZES.apparel, 'جلد',
  ],
  [
    'جاكيت هارينغتون',
    'ياقة قصيرة وبطانة مربّعة النقش.',
    75000, 0, 4.5, 94, null,
    [C.navy, C.olive, C.burgundy], SIZES.apparel, 'قطن مقاوم للريح',
  ],
  [
    'سترة صوف بياقة عالية',
    'حياكة مضلّعة بياقة تُطوى مرّتين.',
    58000, 0, 4.6, 127, 'new',
    [C.charcoal, C.cream, C.burgundy], SIZES.apparel, 'صوف',
  ],
]);

const menTrousers = build('men', 'clothing', 'trousers', POOLS.mTrousers, [
  [
    'بنطال الصوف المستقيم',
    'ثنية أمامية واحدة وانسدال نظيف حتى الكاحل.',
    45000, 0, 4.7, 143, null,
    [C.charcoal, C.navy, C.black], SIZES.apparel, 'صوف مخلوط',
  ],
  [
    'بنطال تشينو مغسول',
    'قطن ثقيل مغسول يصير أطرى كل مرة.',
    32000, 38000, 4.6, 208, 'sale',
    [C.cream, C.olive, C.navy], SIZES.apparel, 'قطن ثقيل',
  ],
  [
    'جينز سليم',
    'دينم بوزن متوسط يتشكّل على صاحبه مع الوقت.',
    42000, 0, 4.8, 176, 'best',
    [C.denim, C.black], SIZES.apparel, 'دينم قطني',
  ],
  [
    'بنطال كتان واسع',
    'قَصّة مريحة بخصر مطاطي مخفي.',
    30000, 0, 4.4, 89, 'new',
    [C.cream, C.grey, C.olive], SIZES.apparel, 'كتان مغسول',
  ],
]);

/* ============================================================
   MEN · ACCESSORIES
   ============================================================ */

const menWatches = build('men', 'accessories', 'watches', POOLS.mWatches, [
  [
    'ساعة ميريديان أوتوماتيك',
    'حركة أوتوماتيكية وزجاج مقاوم للخدش.',
    285000, 0, 4.9, 64, 'best',
    [C.silver, C.gold, C.black], SIZES.one, 'ستانلس ستيل',
  ],
  [
    'ساعة أطلس الكرونوغراف',
    'ثلاثة عدّادات فرعية وحلقة تاكيميتر على الإطار.',
    165000, 195000, 4.7, 88, 'sale',
    [C.black, C.silver, C.navy], SIZES.one, 'ستيل وزجاج معدني',
  ],
  [
    'ساعة كلاسيك الجلدية',
    'مينا مطفية بلا تعقيد وسوار جلد مخيط.',
    110000, 0, 4.8, 102, null,
    [C.brown, C.black], SIZES.one, 'جلد وستيل',
  ],
  [
    'ساعة الغوّاص',
    'إطار دوّار ومقاومة ماء للاستعمال اليومي.',
    210000, 0, 4.8, 57, 'new',
    [C.navy, C.black, C.emerald], SIZES.one, 'ستيل مقاوم',
  ],
]);

const menLeather = build('men', 'accessories', 'leather', POOLS.mLeather, [
  [
    'حزام الجلد الطبيعي',
    'قطعة واحدة من الجلد بإبزيم معدني مصقول.',
    22000, 0, 4.8, 186, 'best',
    [C.brown, C.black, C.tan], SIZES.one, 'جلد طبيعي',
  ],
  [
    'محفظة بيفولد النحيفة',
    'ست فتحات بطاقات وسمك بسيط في الجيب.',
    17000, 21000, 4.7, 231, 'sale',
    [C.black, C.brown, C.burgundy], SIZES.one, 'جلد',
  ],
  [
    'حقيبة مستندات جلدية',
    'مقصورة مبطّنة للحاسوب وحزام كتف قابل للفك.',
    78000, 0, 4.9, 62, null,
    [C.brown, C.black], SIZES.one, 'جلد مدبوغ',
  ],
  [
    'حامل بطاقات مينيمال',
    'أربع فتحات وجيب خلفي — كل اللي تحتاجه.',
    11000, 0, 4.6, 297, 'new',
    [C.black, C.burgundy, C.navy], SIZES.one, 'جلد مطبّع',
  ],
]);

const menEyewear = build('men', 'accessories', 'eyewear', POOLS.eyewear, [
  [
    'نظارة أفياتور الكلاسيكية',
    'إطار معدني خفيف وعدسات بحماية UV400.',
    32000, 0, 4.8, 154, 'best',
    [C.gold, C.silver, C.black], SIZES.one, 'معدن وعدسات مستقطبة',
  ],
  [
    'نظارة ويفارر الأسيتات',
    'أسيتات مصقول بمفصلات معدنية مخفية.',
    38000, 45000, 4.7, 119, 'sale',
    [C.black, C.brown, C.navy], SIZES.one, 'أسيتات',
  ],
  [
    'نظارة مربعة عريضة',
    'إطار جريء بعدسات متدرّجة يناسب الوجوه الطويلة.',
    29000, 0, 4.5, 76, null,
    [C.black, C.charcoal], SIZES.one, 'أسيتات وعدسات متدرّجة',
  ],
  [
    'نظارة مستديرة معدنية',
    'خطوط رفيعة جدًا ووزن خفيف.',
    27000, 0, 4.6, 68, 'new',
    [C.gold, C.silver], SIZES.one, 'معدن خفيف',
  ],
]);

/* ============================================================
   WOMEN · FOOTWEAR
   ============================================================ */

const womenHeels = build('women', 'shoes', 'heels', POOLS.wHeels, [
  [
    'حذاء ستيليتو الجلدي',
    'كعب ١٠ سم بنعلة داخلية مبطّنة تخفّف التعب.',
    62000, 0, 4.8, 172, 'best',
    [C.black, C.nude, C.burgundy], SIZES.shoeW, 'جلد ناعم',
  ],
  [
    'حذاء سلينغ باك المدبب',
    'حزام خلفي رفيع وكعب ٧ سم للاستعمال اليومي.',
    52000, 62000, 4.7, 138, 'sale',
    [C.nude, C.black, C.white], SIZES.shoeW, 'جلد',
  ],
  [
    'حذاء الكعب المربّع',
    'كعب عريض ثابت ٦ سم — أناقة ما تتعب.',
    47000, 0, 4.6, 194, null,
    [C.black, C.cream, C.emerald], SIZES.shoeW, 'جلد مطفي',
  ],
  [
    'صندل مسائي بحزام رفيع',
    'أحزمة ساتان دقيقة وكعب ٩ سم بلمعة خافتة.',
    56000, 0, 4.7, 87, 'new',
    [C.gold, C.silver, C.black], SIZES.shoeW, 'ساتان ومعدن',
  ],
  [
    'حذاء كيتن هيل المخملي',
    'كعب منخفض ٤٫٥ سم بمخمل عميق.',
    45000, 0, 4.5, 103, null,
    [C.burgundy, C.navy, C.black], SIZES.shoeW, 'مخمل قطني',
  ],
]);

const womenWSneakers = build('women', 'shoes', 'sneakers', POOLS.wSneakers, [
  [
    'حذاء رياضي أبيض مينيمال',
    'جلد أملس بلا شعارات ونعل رفيع.',
    48000, 0, 4.8, 268, 'best',
    [C.white, C.cream, C.rose], SIZES.shoeW, 'جلد',
  ],
  [
    'حذاء بلاتفورم مرتفع',
    'نعل ٤ سم يرفع القامة بدون كعب.',
    44000, 52000, 4.6, 152, 'sale',
    [C.white, C.black], SIZES.shoeW, 'جلد ومطاط',
  ],
  [
    'حذاء ريترو مخطّط',
    'خطوط جانبية بالجلد المقلوب على قاعدة كلاسيكية.',
    36000, 0, 4.5, 211, null,
    [C.cream, C.navy, C.burgundy], SIZES.shoeW, 'شمواه وقماش',
  ],
  [
    'حذاء نيت الخفيف',
    'نسيج محبوك قطعة واحدة يلتف حول القدم.',
    33000, 0, 4.4, 176, 'new',
    [C.black, C.grey, C.rose], SIZES.shoeW, 'نسيج محبوك',
  ],
]);

const womenBoots = build('women', 'shoes', 'boots', POOLS.wBoots, [
  [
    'بوت الركبة الجلدي',
    'جلد طري بسحّاب داخلي كامل الطول.',
    105000, 0, 4.9, 94, 'best',
    [C.black, C.brown, C.burgundy], SIZES.shoeW, 'جلد طري',
  ],
  [
    'بوت أنكل بكعب مربّع',
    'قَصّة تصل للكاحل بكعب ٥ سم ثابت.',
    72000, 85000, 4.7, 131, 'sale',
    [C.black, C.tan], SIZES.shoeW, 'جلد مطفي',
  ],
  [
    'بوت تشيلسي المطاطي',
    'جوانب مرنة ونعل مضلّع يتعامل مع المطر.',
    62000, 0, 4.6, 168, null,
    [C.black, C.brown, C.olive], SIZES.shoeW, 'جلد مقاوم للماء',
  ],
  [
    'بوت الشمواه فوق الركبة',
    'شمواه بكعب مخروطي ٨ سم لإطلالة شتوية.',
    118000, 0, 4.8, 57, 'new',
    [C.camel, C.black, C.charcoal], SIZES.shoeW, 'شمواه',
  ],
]);

const womenFlats = build('women', 'shoes', 'flats', POOLS.wFlats, [
  [
    'باليرينا الجلد الطري',
    'نعل مرن يُطوى بالحقيبة وبطانة كاملة.',
    38000, 0, 4.7, 224, 'best',
    [C.black, C.nude, C.rose], SIZES.shoeW, 'جلد طري',
  ],
  [
    'باليرينا بحزام ميري جين',
    'حزام أمامي بإبزيم صغير بطابع كلاسيكي.',
    41000, 48000, 4.6, 143, 'sale',
    [C.black, C.burgundy, C.cream], SIZES.shoeW, 'جلد مصقول',
  ],
  [
    'لوفر نسائي مسطّح',
    'قَصّة ناعمة بنعل مخيط.',
    45000, 0, 4.7, 116, null,
    [C.brown, C.black, C.emerald], SIZES.shoeW, 'جلد مدبوغ',
  ],
  [
    'باليرينا مدبّبة بشبك',
    'شبك شفاف بحاشية جلدية — الأخف بالخزانة.',
    35000, 0, 4.5, 89, 'new',
    [C.black, C.nude], SIZES.shoeW, 'شبك وجلد',
  ],
]);

/* ============================================================
   WOMEN · CLOTHING
   ============================================================ */

const womenDresses = build('women', 'clothing', 'dresses', POOLS.wDresses, [
  [
    'فستان الساتان الطويل',
    'قَصّة منحازة تنساب مع الحركة بلا مجهود.',
    95000, 0, 4.9, 118, 'best',
    [C.burgundy, C.black, C.emerald], SIZES.apparelW, 'ساتان',
  ],
  [
    'فستان ميدي بحزام خصر',
    'أكمام طويلة وحزام من القماش نفسه يرسم الخصر.',
    68000, 80000, 4.7, 164, 'sale',
    [C.cream, C.navy, C.olive], SIZES.apparelW, 'فيسكوز مخلوط',
  ],
  [
    'فستان قميص من الكتان',
    'قَصّة مستقيمة مريحة بأزرار أمامية كاملة.',
    52000, 0, 4.6, 137, null,
    [C.white, C.sky, C.cream], SIZES.apparelW, 'كتان',
  ],
  [
    'فستان محبوك',
    'ثقل ممتاز وملمس يبقى ناعم بعد الغسل.',
    105000, 0, 4.8, 71, 'new',
    [C.camel, C.charcoal, C.rose], SIZES.apparelW, 'حياكة ناعمة',
  ],
  [
    'فستان مطرّز بخيوط ذهبية',
    'تطريز على تول شفاف فوق بطانة ساتان.',
    135000, 0, 4.9, 43, null,
    [C.black, C.burgundy], SIZES.apparelW, 'تول مطرّز',
  ],
]);

const womenModest = build('women', 'clothing', 'modest', POOLS.wModest, [
  [
    'عباية الكريب المطرّزة',
    'كريب بانسدال مثالي وتطريز جانبي.',
    75000, 0, 4.9, 152, 'best',
    [C.black, C.charcoal, C.navy], SIZES.apparelW, 'كريب',
  ],
  [
    'قفطان مزركش',
    'أكمام واسعة وحاشية مذهّبة — قطعة مناسبات.',
    115000, 135000, 4.8, 87, 'sale',
    [C.emerald, C.burgundy, C.gold], SIZES.apparelW, 'قماش مزركش',
  ],
  [
    'عباية كتان يومية',
    'كتان يتنفس بقَصّة واسعة تناسب صيف العراق.',
    48000, 0, 4.6, 196, null,
    [C.cream, C.grey, C.olive], SIZES.apparelW, 'كتان مغسول',
  ],
  [
    'عباية بقَصّة معطف',
    'أزرار أمامية وحزام خصر — معطف وعباية بآن.',
    82000, 0, 4.7, 104, 'new',
    [C.black, C.camel, C.navy], SIZES.apparelW, 'صوف مخلوط',
  ],
  [
    'طقم قفطان وحزام مطرّز',
    'قطعتان منسّقتان بحزام مطرّز بحبات زجاجية.',
    105000, 0, 4.8, 62, null,
    [C.rose, C.emerald, C.black], SIZES.apparelW, 'شيفون مبطّن',
  ],
]);

const womenOuter = build('women', 'clothing', 'outerwear', POOLS.wOuter, [
  [
    'معطف الكاميل الطويل',
    'صوف بلون الكاميل الذي ما يخرج من الموضة.',
    165000, 0, 4.9, 96, 'best',
    [C.camel, C.charcoal, C.cream], SIZES.apparelW, 'صوف مخلوط',
  ],
  [
    'ترنش كوت نسائي',
    'غبردين بحزام خصر وقَصّة تحت الركبة.',
    110000, 128000, 4.7, 128, 'sale',
    [C.camel, C.black, C.olive], SIZES.apparelW, 'غبردين قطني',
  ],
  [
    'بليزر أوفرسايز',
    'كتف مبني وقَصّة واسعة تُلبس فوق كل شيء.',
    68000, 0, 4.8, 187, null,
    [C.black, C.cream, C.burgundy], SIZES.apparelW, 'صوف مخلوط',
  ],
  [
    'جاكيت جلد نسائي',
    'جلد طري بسحّاب مائل وبطانة كاملة.',
    128000, 0, 4.8, 74, 'new',
    [C.black, C.brown], SIZES.apparelW, 'جلد',
  ],
]);

const womenTops = build('women', 'clothing', 'tops', POOLS.wTops, [
  [
    'بلوزة الساتان الكلاسيكية',
    'ياقة ناعمة وأزرار صدفية.',
    55000, 0, 4.8, 163, 'best',
    [C.cream, C.black, C.rose], SIZES.apparelW, 'ساتان',
  ],
  [
    'سترة محبوكة بياقة دائرية',
    'حياكة ناعمة بدرجتين من الملمس وثقل مثالي.',
    82000, 95000, 4.9, 92, 'sale',
    [C.cream, C.camel, C.burgundy], SIZES.apparelW, 'حياكة ناعمة',
  ],
  [
    'تيشيرت قطن مُمشّط',
    'قطن طويل التيلة بقَصّة تحافظ على شكلها.',
    17000, 0, 4.6, 312, null,
    [C.white, C.black, C.grey], SIZES.apparelW, 'قطن مُمشّط',
  ],
  [
    'بلوزة شيفون بأكمام منفوخة',
    'شيفون خفيف بأساور مطاطية وبطانة كاملة.',
    38000, 0, 4.5, 121, 'new',
    [C.white, C.sky, C.nude], SIZES.apparelW, 'شيفون مبطّن',
  ],
  [
    'سترة محبوكة بياقة عالية',
    'حياكة مضلّعة عريضة بياقة تُطوى مرّتين.',
    46000, 0, 4.7, 148, null,
    [C.charcoal, C.cream, C.emerald], SIZES.apparelW, 'صوف مخلوط',
  ],
]);

/* ============================================================
   WOMEN · ACCESSORIES
   ============================================================ */

const womenBags = build('women', 'accessories', 'bags', POOLS.wBags, [
  [
    'حقيبة توت الجلدية الكبيرة',
    'تتّسع لحاسوب ١٣ إنشًا وجيب داخلي بسحّاب.',
    115000, 0, 4.9, 148, 'best',
    [C.tan, C.black, C.burgundy], SIZES.one, 'جلد طبيعي',
  ],
  [
    'حقيبة كتف صغيرة بسلسلة',
    'سلسلة قابلة للفك تحوّلها إلى كلتش بثانية.',
    88000, 102000, 4.8, 116, 'sale',
    [C.black, C.cream, C.rose], SIZES.one, 'جلد مطبّع',
  ],
  [
    'حقيبة باكيت',
    'شكل الدلو الكلاسيكي برباط علوي مجدول.',
    78000, 0, 4.7, 89, null,
    [C.brown, C.black, C.emerald], SIZES.one, 'جلد مدبوغ',
  ],
  [
    'كلتش السهرة المعدني',
    'إطار مصقول بإغلاق بضغطة واحدة وبطانة ساتان.',
    64000, 0, 4.6, 63, 'new',
    [C.gold, C.silver, C.black], SIZES.one, 'معدن وساتان',
  ],
  [
    'حقيبة كروس بودي صغيرة',
    'حزام قابل للتعديل وثلاث مقصورات مرتّبة.',
    56000, 0, 4.7, 194, null,
    [C.burgundy, C.black, C.tan], SIZES.one, 'جلد',
  ],
]);

const womenJewelry = build('women', 'accessories', 'jewelry', POOLS.wJewelry, [
  [
    'عقد مطلي بالذهب',
    'سلسلة رفيعة تُلبس منفردة أو بطبقات.',
    135000, 0, 4.9, 87, 'best',
    [C.gold, C.silver], SIZES.one, 'فضة مطلية بالذهب',
  ],
  [
    'أقراط اللؤلؤ المتدلّية',
    'لؤلؤ مستزرع على قاعدة مصقولة.',
    76000, 89000, 4.8, 112, 'sale',
    [C.gold, C.cream], SIZES.one, 'لؤلؤ مستزرع',
  ],
  [
    'إسوارة مجدولة',
    'خيوط مجدولة بإغلاق أمان مزدوج.',
    108000, 0, 4.7, 68, null,
    [C.gold, C.silver], SIZES.one, 'فضة مطلية',
  ],
  [
    'خاتم الحجر الملوّن',
    'حجر مقطوع بزاوية على قاعدة مطفية.',
    58000, 0, 4.6, 74, 'new',
    [C.emerald, C.burgundy, C.gold], SIZES.one, 'فضة مطلية وحجر',
  ],
]);

const womenEyewear = build('women', 'accessories', 'eyewear', POOLS.eyewear, [
  [
    'نظارة كات آي الأنيقة',
    'أسيتات بشكل عين القط وعدسات متدرّجة.',
    38000, 0, 4.8, 132, 'best',
    [C.black, C.brown, C.rose], SIZES.one, 'أسيتات',
  ],
  [
    'نظارة أوفرسايز مربّعة',
    'إطار عريض بتغطية كاملة وحماية UV400.',
    42000, 49000, 4.7, 96, 'sale',
    [C.black, C.charcoal], SIZES.one, 'أسيتات وعدسات مستقطبة',
  ],
  [
    'نظارة مستديرة ذهبية',
    'معدن رفيع بلون ذهبي دافئ ووزن خفيف.',
    34000, 0, 4.6, 81, null,
    [C.gold, C.silver], SIZES.one, 'معدن خفيف',
  ],
  [
    'نظارة شيلد عصرية',
    'عدسة واحدة ممتدة بإطار مينيمال.',
    36000, 0, 4.5, 58, 'new',
    [C.black, C.silver], SIZES.one, 'أسيتات ومعدن',
  ],
]);

/* ============================================================
   Exports & queries
   ============================================================ */

export const PRODUCTS = [
  ...menCasual, ...menSneakers, ...menFormal, ...menLoafers,
  ...menShirts, ...menSuits, ...menOuter, ...menTrousers,
  ...menWatches, ...menLeather, ...menEyewear,
  ...womenHeels, ...womenWSneakers, ...womenBoots, ...womenFlats,
  ...womenDresses, ...womenModest, ...womenOuter, ...womenTops,
  ...womenBags, ...womenJewelry, ...womenEyewear,
];

export const BADGE_LABELS = {
  new: 'جديد',
  sale: 'تخفيض',
  best: 'الأكثر مبيعًا',
};

/** Products for a listing page. `sub === 'all'` widens to the whole category. */
export function queryProducts({ gender, category, sub }) {
  return PRODUCTS.filter(
    (p) =>
      (!gender || p.gender === gender) &&
      (!category || p.category === category) &&
      (!sub || sub === 'all' || p.sub === sub)
  );
}

export function countProducts(gender, category, sub) {
  return queryProducts({ gender, category, sub }).length;
}

export function getProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}

/** Same subcategory first, then the wider category — never the product itself. */
export function relatedProducts(product, limit = 4) {
  const sameSub = PRODUCTS.filter(
    (p) => p.id !== product.id && p.gender === product.gender && p.sub === product.sub
  );
  const sameCategory = PRODUCTS.filter(
    (p) => p.id !== product.id && p.gender === product.gender && p.category === product.category && p.sub !== product.sub
  );
  return [...sameSub, ...sameCategory].slice(0, limit);
}

export function featuredProducts(limit = 8) {
  return PRODUCTS.filter((p) => p.badge === 'best')
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export function newArrivals(limit = 8) {
  return PRODUCTS.filter((p) => p.badge === 'new').slice(0, limit);
}

export function searchProducts(term, limit = 8) {
  const q = term.trim();
  if (q.length < 2) return [];
  return PRODUCTS.filter(
    (p) => p.name.includes(q) || p.blurb.includes(q) || p.material.includes(q)
  ).slice(0, limit);
}

/* ---------- Filter helpers ---------- */

/** Price bounds for a set of products, rounded out to clean 5,000 steps. */
export function priceBounds(list) {
  if (!list.length) return { min: 0, max: 0 };
  const prices = list.map((p) => p.price);
  const step = 5000;
  return {
    min: Math.floor(Math.min(...prices) / step) * step,
    max: Math.ceil(Math.max(...prices) / step) * step,
  };
}

/** Every colour present in a set, de-duplicated by name, in catalogue order. */
export function availableColors(list) {
  const seen = new Map();
  list.forEach((p) => p.colors.forEach((c) => seen.has(c.name) || seen.set(c.name, c)));
  return [...seen.values()];
}

/** Every size present in a set. Numeric sizes sort numerically, letters by scale. */
const LETTER_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export function availableSizes(list) {
  const set = new Set();
  list.forEach((p) => p.sizes.forEach((s) => set.add(s)));
  return [...set].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    const la = LETTER_ORDER.indexOf(a);
    const lb = LETTER_ORDER.indexOf(b);
    if (la !== -1 && lb !== -1) return la - lb;
    return a.localeCompare(b, 'ar');
  });
}

/** Iraqi dinar, Arabic-Indic grouping via the browser's own formatter. */
export function formatPrice(value) {
  return `${new Intl.NumberFormat('ar-IQ').format(value)} د.ع`;
}
