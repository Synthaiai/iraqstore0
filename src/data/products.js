import { POOLS, cardSrcSet, img, srcSet } from './images';

/* ============================================================
   Shared option sets
   ============================================================ */

const C = {
  black: { name: 'أسود', nameEn: 'Black', hex: '#141416' },
  white: { name: 'أبيض', nameEn: 'White', hex: '#F2F0EE' },
  cream: { name: 'كريمي', nameEn: 'Cream', hex: '#E8DFD2' },
  grey: { name: 'رمادي', nameEn: 'Grey', hex: '#8A8A90' },
  charcoal: { name: 'فحمي', nameEn: 'Charcoal', hex: '#3A3B3F' },
  navy: { name: 'كحلي', nameEn: 'Navy', hex: '#1E2A44' },
  burgundy: { name: 'عنابي', nameEn: 'Burgundy', hex: '#6B0F1A' },
  brown: { name: 'بني', nameEn: 'Brown', hex: '#6A4A32' },
  tan: { name: 'جملي', nameEn: 'Tan', hex: '#B08A5F' },
  camel: { name: 'كاميل', nameEn: 'Camel', hex: '#C4A075' },
  olive: { name: 'زيتوني', nameEn: 'Olive', hex: '#5B6045' },
  gold: { name: 'ذهبي', nameEn: 'Gold', hex: '#C8A24A' },
  silver: { name: 'فضي', nameEn: 'Silver', hex: '#C6C7CB' },
  nude: { name: 'بيج فاتح', nameEn: 'Nude', hex: '#D9C3B0' },
  rose: { name: 'وردي باهت', nameEn: 'Dusty Rose', hex: '#C9A0A0' },
  emerald: { name: 'زمردي', nameEn: 'Emerald', hex: '#1F4D3D' },
  sky: { name: 'سماوي', nameEn: 'Sky Blue', hex: '#A8C0D6' },
  denim: { name: 'دينم', nameEn: 'Denim', hex: '#4A6280' },
};

const ONE = 'مقاس واحد';
const ONE_EN = 'One size';

const SIZES = {
  shoeM: ['40', '41', '42', '43', '44', '45'],
  shoeW: ['36', '37', '38', '39', '40', '41'],
  apparel: ['S', 'M', 'L', 'XL', 'XXL'],
  apparelW: ['XS', 'S', 'M', 'L', 'XL'],
  shirt: ['38', '39', '40', '41', '42', '43'],
  one: [ONE],
};

/* Material terms repeat across products, so translate them once here. */
const MATERIALS = {
  'جلد صناعي فاخر': 'Premium synthetic leather',
  'جلد وشمواه': 'Leather & suede',
  'شبك تقني': 'Technical mesh',
  'جلد مقلوب': 'Nubuck leather',
  'جلد مصقول': 'Polished leather',
  'قطن مغسول': 'Washed cotton',
  'نسيج محبوك': 'Knit fabric',
  'قطن مطاطي': 'Stretch cotton',
  'كانفاس قطني': 'Cotton canvas',
  شمواه: 'Suede',
  'جلد طبيعي': 'Genuine leather',
  'جلد مدبوغ': 'Tanned leather',
  'جلد مصبوغ': 'Hand-dyed leather',
  'جلد ناعم': 'Soft leather',
  'جلد ومعدن مصقول': 'Leather & polished metal',
  'جلد طري': 'Supple leather',
  'مخمل قطني': 'Cotton velvet',
  'قطن ١٠٠٪': '100% cotton',
  'قطن أوكسفورد': 'Oxford cotton',
  كتان: 'Linen',
  'قطن مفرشى': 'Brushed cotton',
  ساتان: 'Satin',
  'صوف مخلوط': 'Wool blend',
  'كتان وقطن': 'Linen & cotton',
  'مخمل وساتان': 'Velvet & satin',
  غبردين: 'Gabardine',
  'غبردين قطني': 'Cotton gabardine',
  جلد: 'Leather',
  'قطن مقاوم للريح': 'Windproof cotton',
  صوف: 'Wool',
  'قطن ثقيل': 'Heavy cotton',
  'دينم قطني': 'Cotton denim',
  'كتان مغسول': 'Washed linen',
  'ستانلس ستيل': 'Stainless steel',
  'ستيل وزجاج معدني': 'Steel & mineral glass',
  'جلد وستيل': 'Leather & steel',
  'ستيل مقاوم': 'Corrosion-resistant steel',
  'جلد مطبّع': 'Embossed leather',
  'معدن وعدسات مستقطبة': 'Metal & polarized lenses',
  أسيتات: 'Acetate',
  'أسيتات وعدسات متدرّجة': 'Acetate & gradient lenses',
  'معدن خفيف': 'Lightweight metal',
  'جلد مطفي': 'Matte leather',
  'ساتان ومعدن': 'Satin & metal',
  'جلد مقاوم للماء': 'Water-resistant leather',
  'شبك وجلد': 'Mesh & leather',
  'شمواه وقماش': 'Suede & textile',
  'فيسكوز مخلوط': 'Viscose blend',
  'حياكة ناعمة': 'Fine knit',
  'تول مطرّز': 'Embroidered tulle',
  كريب: 'Crêpe',
  'قماش مزركش': 'Brocade',
  'شيفون مبطّن': 'Lined chiffon',
  'جلد ساڤيانو': 'Saffiano leather',
  معدن: 'Metal',
  'فضة مطلية بالذهب': 'Gold-plated silver',
  'لؤلؤ مستزرع': 'Cultured pearl',
  'فضة مطلية': 'Plated silver',
  'فضة مطلية وحجر': 'Plated silver & stone',
  'معدن وساتان': 'Metal & satin',
  'أسيتات ومعدن': 'Acetate & metal',
};

const materialEn = (m) => MATERIALS[m] || m;

/* English overlay, keyed by the Arabic product name. A missing entry falls back
   to Arabic, so the store never renders an empty string. */
const PRODUCT_EN = {
  // Men · footwear
  'حذاء أفينيو الجلدي الأبيض': { name: 'Avenue White Leather Sneaker', blurb: 'Soft leather with hidden stitching and a light rubber sole — goes with everything.' },
  'حذاء كوبر الرياضي الكلاسيكي': { name: 'Cooper Classic Sneaker', blurb: 'A low cut with a padded tongue and a grippy, slip-resistant sole.' },
  'حذاء نورث ران التقني': { name: 'North Run Technical', blurb: 'Airy mesh and a cushioned ride for long walks.' },
  'حذاء ميريديان المرتفع': { name: 'Meridian High-Top', blurb: 'A raised nubuck collar with a warm lining for winter.' },
  'حذاء أطلس المينيمال': { name: 'Atlas Minimal', blurb: 'A smooth logo-free leather upper — all the detail is in the cut.' },
  'حذاء ريتريت الكاجوال': { name: 'Retreat Casual', blurb: 'Washed cotton canvas on a comfy sole for the weekend.' },
  'ترينر كلاود اليومي': { name: 'Cloud Everyday Trainer', blurb: 'A light knit upper on a soft sole — your daily companion.' },
  'ترينر ريترو الجلدي': { name: 'Retro Leather Trainer', blurb: 'A classic cut with a sporty touch and clean side stripes.' },
  'ترينر سلِب-أون': { name: 'Slip-On Trainer', blurb: 'No laces — on in a second, and easy with jeans or shorts.' },
  'ترينر كانفاس المغسول': { name: 'Washed Canvas Trainer', blurb: 'Stone-washed cotton canvas that grows more comfortable over time.' },
  'ترينر شمواه كاجول': { name: 'Casual Suede Trainer', blurb: 'Matte suede on a crepe sole — relaxed elegance.' },
  'حذاء أكسفورد بغداد': { name: 'Baghdad Oxford', blurb: 'A classic Oxford cut on a fixed leather sole.' },
  'حذاء ديربي كرادة': { name: 'Karrada Derby', blurb: 'An open lacing that rests easier on the foot — for long days.' },
  'حذاء بروغ الكحلي': { name: 'Navy Brogue', blurb: 'Brogue perforation on hand-dyed leather with a vintage finish.' },
  'حذاء مونك ستراب': { name: 'Monk Strap', blurb: 'A single elegant buckle — no laces at all.' },
  'حذاء تشيلسي الجلدي': { name: 'Leather Chelsea Boot', blurb: 'Flexible elastic sides that suit a suit and jeans alike.' },
  'لوفر بيني الكلاسيكي': { name: 'Classic Penny Loafer', blurb: 'The original shape that never changed — in a softer leather.' },
  'لوفر تاسل الشمواه': { name: 'Suede Tassel Loafer', blurb: 'Leather tassels on matte suede.' },
  'لوفر هورس بيت': { name: 'Horsebit Loafer', blurb: 'A polished metal bit gives the shoe its signature.' },
  'لوفر درايفينغ الطري': { name: 'Soft Driving Loafer', blurb: 'A pebbled rubber sole for easy driving and a light summer look.' },
  'لوفر فيلفت المسائي': { name: 'Evening Velvet Loafer', blurb: 'Deep velvet with an embroidered trim for occasions.' },

  // Men · clothing
  'قميص بوبلين الأبيض': { name: 'White Poplin Shirt', blurb: 'Cotton with a half-fused collar and a straight cut.' },
  'قميص أوكسفورد الأزرق': { name: 'Blue Oxford Shirt', blurb: 'Oxford weave that softens with every wash.' },
  'قميص كتان صيفي': { name: 'Summer Linen Shirt', blurb: 'Linen that breathes in the July heat and stays sharp.' },
  'قميص فانيلا منقوش': { name: 'Checked Flannel Shirt', blurb: 'Brushed cotton flannel with a quiet check and light warmth.' },
  'قميص ساتان مسائي': { name: 'Evening Satin Shirt', blurb: 'Heavy drape and a soft sheen — a shirt for occasions.' },
  'بدلة ميريديان الكحلية': { name: 'Meridian Navy Suit', blurb: 'Wool blend with a natural shoulder and a light lining.' },
  'بدلة الفحمي الرسمية': { name: 'Charcoal Formal Suit', blurb: 'A classic straight cut with a padded chest.' },
  'بليزر الكتان غير المبطّن': { name: 'Unlined Linen Blazer', blurb: 'No lining at all — the lightest blazer for summer.' },
  'بدلة توكسيدو المخملية': { name: 'Velvet Tuxedo', blurb: 'A satin lapel and deep burgundy velvet for big occasions.' },
  'بليزر مزدوج الصدر': { name: 'Double-Breasted Blazer', blurb: 'Six buttons and a sharp cut that draws the shoulder.' },
  'معطف الصوف الطويل': { name: 'Long Wool Coat', blurb: 'Heavy wool cut to the knee.' },
  'ترنش كوت كلاسيكي': { name: 'Classic Trench Coat', blurb: 'Water-resistant cotton with a waist belt and epaulettes.' },
  'جاكيت جلد بومبر': { name: 'Leather Bomber Jacket', blurb: 'Supple leather with a soft lining and ribbed cuffs.' },
  'جاكيت هارينغتون': { name: 'Harrington Jacket', blurb: 'A short collar and a check-patterned lining.' },
  'سترة صوف بياقة عالية': { name: 'High-Neck Wool Sweater', blurb: 'A ribbed knit with a collar that folds twice.' },
  'بنطال الصوف المستقيم': { name: 'Straight Wool Trousers', blurb: 'A single front pleat and a clean drape to the ankle.' },
  'بنطال تشينو مغسول': { name: 'Washed Chino', blurb: 'Heavy cotton, washed to soften more each time.' },
  'جينز سليم': { name: 'Slim Jeans', blurb: 'Mid-weight denim that shapes to the wearer over time.' },
  'بنطال كتان واسع': { name: 'Wide Linen Trousers', blurb: 'A relaxed cut with a hidden elastic waist.' },

  // Men · accessories
  'ساعة ميريديان أوتوماتيك': { name: 'Meridian Automatic Watch', blurb: 'An automatic movement and scratch-resistant glass.' },
  'ساعة أطلس الكرونوغراف': { name: 'Atlas Chronograph', blurb: 'Three sub-dials and a tachymeter ring on the bezel.' },
  'ساعة كلاسيك الجلدية': { name: 'Classic Leather Watch', blurb: 'A clean matte dial and a stitched leather strap.' },
  'ساعة الغوّاص': { name: 'Diver Watch', blurb: 'A rotating bezel and water resistance for daily wear.' },
  'حزام الجلد الطبيعي': { name: 'Full-Grain Leather Belt', blurb: 'A single piece of leather with a polished metal buckle.' },
  'محفظة بيفولد النحيفة': { name: 'Slim Bifold Wallet', blurb: 'Six card slots and barely any thickness in the pocket.' },
  'حقيبة مستندات جلدية': { name: 'Leather Document Bag', blurb: 'A padded laptop compartment and a detachable shoulder strap.' },
  'حامل بطاقات مينيمال': { name: 'Minimal Card Holder', blurb: 'Four slots and a back pocket — all you actually need.' },
  'نظارة أفياتور الكلاسيكية': { name: 'Classic Aviator Sunglasses', blurb: 'A light metal frame with UV400-protected lenses.' },
  'نظارة ويفارر الأسيتات': { name: 'Acetate Wayfarer Sunglasses', blurb: 'Polished acetate with hidden metal hinges.' },
  'نظارة مربعة عريضة': { name: 'Wide Square Sunglasses', blurb: 'A bold frame with gradient lenses that suit longer faces.' },
  'نظارة مستديرة معدنية': { name: 'Round Metal Sunglasses', blurb: 'Very thin lines and a light weight.' },

  // Women · footwear
  'حذاء ستيليتو الجلدي': { name: 'Leather Stiletto', blurb: 'A 10 cm heel with a padded insole that eases the evening.' },
  'حذاء سلينغ باك المدبب': { name: 'Pointed Slingback', blurb: 'A thin back strap and a 7 cm heel for everyday elegance.' },
  'حذاء الكعب المربّع': { name: 'Block Heel', blurb: 'A wide, steady 6 cm heel — elegance that doesn’t tire.' },
  'صندل مسائي بحزام رفيع': { name: 'Thin-Strap Evening Sandal', blurb: 'Delicate satin straps and a 9 cm heel with a soft sheen.' },
  'حذاء كيتن هيل المخملي': { name: 'Velvet Kitten Heel', blurb: 'A low 4.5 cm heel in deep velvet.' },
  'حذاء رياضي أبيض مينيمال': { name: 'Minimal White Sneaker', blurb: 'A smooth logo-free leather with a slim sole.' },
  'حذاء بلاتفورم مرتفع': { name: 'Platform Sneaker', blurb: 'A 4 cm sole that lifts your height with no heel.' },
  'حذاء ريترو مخطّط': { name: 'Striped Retro Sneaker', blurb: 'Nubuck side stripes on a classic base.' },
  'حذاء نيت الخفيف': { name: 'Light Knit Sneaker', blurb: 'A one-piece knit that wraps the foot like a sock.' },
  'بوت الركبة الجلدي': { name: 'Leather Knee Boot', blurb: 'Supple leather with a full-length inner zip.' },
  'بوت أنكل بكعب مربّع': { name: 'Block-Heel Ankle Boot', blurb: 'An ankle cut with a steady 5 cm heel.' },
  'بوت تشيلسي المطاطي': { name: 'Elastic Chelsea Boot', blurb: 'Flexible sides and a ribbed sole that handles the rain.' },
  'بوت الشمواه فوق الركبة': { name: 'Over-the-Knee Suede Boot', blurb: 'Suede with an 8 cm cone heel for a full winter look.' },
  'باليرينا الجلد الطري': { name: 'Soft Leather Ballet Flat', blurb: 'A flexible sole that folds into a bag, fully lined.' },
  'باليرينا بحزام ميري جين': { name: 'Mary-Jane Ballet Flat', blurb: 'A front strap with a small buckle for a classic feel.' },
  'لوفر نسائي مسطّح': { name: 'Flat Women’s Loafer', blurb: 'A soft cut on a stitched sole.' },
  'باليرينا مدبّبة بشبك': { name: 'Pointed Mesh Flat', blurb: 'Sheer mesh with a leather trim — the lightest in the closet.' },

  // Women · clothing
  'فستان الساتان الطويل': { name: 'Long Satin Dress', blurb: 'A bias cut that flows with movement effortlessly.' },
  'فستان ميدي بحزام خصر': { name: 'Belted Midi Dress', blurb: 'Long sleeves and a self-fabric belt that defines the waist.' },
  'فستان قميص من الكتان': { name: 'Linen Shirt Dress', blurb: 'A comfortable straight cut with a full button front.' },
  'فستان محبوك': { name: 'Knit Dress', blurb: 'Excellent weight and a feel that stays soft after washing.' },
  'فستان مطرّز بخيوط ذهبية': { name: 'Gold-Embroidered Dress', blurb: 'Embroidery on sheer tulle over a satin lining.' },
  'عباية الكريب المطرّزة': { name: 'Embroidered Crêpe Abaya', blurb: 'Crêpe with a perfect drape and side embroidery.' },
  'قفطان مزركش': { name: 'Brocade Kaftan', blurb: 'Wide sleeves and a gilded trim — an occasion piece.' },
  'عباية كتان يومية': { name: 'Everyday Linen Abaya', blurb: 'Breathable linen in a wide cut for the Iraqi summer.' },
  'عباية بقَصّة معطف': { name: 'Coat-Cut Abaya', blurb: 'A button front and waist belt — coat and abaya at once.' },
  'طقم قفطان وحزام مطرّز': { name: 'Kaftan & Embroidered Belt Set', blurb: 'Two coordinated pieces with a glass-beaded embroidered belt.' },
  'معطف الكاميل الطويل': { name: 'Long Camel Coat', blurb: 'Wool in the camel tone that never leaves fashion.' },
  'ترنش كوت نسائي': { name: 'Women’s Trench Coat', blurb: 'Gabardine with a waist belt and a below-the-knee cut.' },
  'بليزر أوفرسايز': { name: 'Oversized Blazer', blurb: 'A built shoulder and a wide cut worn over everything.' },
  'جاكيت جلد نسائي': { name: 'Women’s Leather Jacket', blurb: 'Supple leather with a diagonal zip and a full lining.' },
  'بلوزة الساتان الكلاسيكية': { name: 'Classic Satin Blouse', blurb: 'A soft collar and shell buttons.' },
  'سترة محبوكة بياقة دائرية': { name: 'Crew-Neck Knit Sweater', blurb: 'A fine knit with two levels of softness and a perfect weight.' },
  'تيشيرت قطن مُمشّط': { name: 'Combed Cotton Tee', blurb: 'Long-staple cotton in a cut that keeps its shape.' },
  'بلوزة شيفون بأكمام منفوخة': { name: 'Puff-Sleeve Chiffon Blouse', blurb: 'Light chiffon with elastic cuffs and a full lining.' },
  'سترة محبوكة بياقة عالية': { name: 'High-Neck Knit Sweater', blurb: 'A wide ribbed knit with a collar that folds twice.' },

  // Women · accessories
  'حقيبة توت الجلدية الكبيرة': { name: 'Large Leather Tote', blurb: 'Fits a 13-inch laptop with an inner zip pocket.' },
  'حقيبة كتف صغيرة بسلسلة': { name: 'Small Chain Shoulder Bag', blurb: 'A detachable chain turns it into a clutch in a second.' },
  'حقيبة باكيت': { name: 'Bucket Bag', blurb: 'The classic bucket shape with a braided leather drawstring.' },
  'كلتش السهرة المعدني': { name: 'Metal Evening Clutch', blurb: 'A polished frame with a one-press clasp and a satin lining.' },
  'حقيبة كروس بودي صغيرة': { name: 'Small Crossbody Bag', blurb: 'An adjustable strap and three tidy compartments.' },
  'عقد مطلي بالذهب': { name: 'Gold-Plated Necklace', blurb: 'A fine chain worn alone or layered.' },
  'أقراط اللؤلؤ المتدلّية': { name: 'Pearl Drop Earrings', blurb: 'Cultured pearls on a polished base.' },
  'إسوارة مجدولة': { name: 'Braided Bracelet', blurb: 'Braided strands with a double safety clasp.' },
  'خاتم الحجر الملوّن': { name: 'Coloured Stone Ring', blurb: 'An angle-cut stone on a matte base.' },
  'نظارة كات آي الأنيقة': { name: 'Elegant Cat-Eye Sunglasses', blurb: 'Acetate in a cat-eye shape with gradient lenses.' },
  'نظارة أوفرسايز مربّعة': { name: 'Oversized Square Sunglasses', blurb: 'A wide frame with full coverage and UV400 protection.' },
  'نظارة مستديرة ذهبية': { name: 'Round Gold Sunglasses', blurb: 'Thin metal in a warm gold tone and a barely-there weight.' },
  'نظارة شيلد عصرية': { name: 'Modern Shield Sunglasses', blurb: 'A single wrapping lens in a minimal frame.' },
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
    const en = PRODUCT_EN[name] || {};
    seq += 1;
    return {
      id: `${gender[0]}${category[0]}-${sub}-${String(seq).padStart(3, '0')}`,
      gender,
      category,
      sub,
      name,
      nameEn: en.name || name,
      blurb,
      blurbEn: en.blurb || blurb,
      price,
      oldPrice: oldPrice || null,
      rating,
      reviews,
      badge: badge || null,
      colors,
      sizes,
      // One-size becomes "One size" in English; numeric/letter sizes are universal.
      sizesEn: sizes.map((s) => (s === ONE ? ONE_EN : s)),
      material,
      materialEn: materialEn(material),
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

/** The seed catalogue — empty by default so admin manages all products. */
/** The seed catalogue — empty by default so admin manages all products. */
export const SEED_PRODUCTS = [];

/**
 * The live catalogue & Map index for O(1) instant product lookup.
 */
export let PRODUCTS = SEED_PRODUCTS;
const PRODUCTS_MAP = new Map();
const NORMALIZED_CACHE = new Map();

export function setLiveProducts(list) {
  PRODUCTS = list || [];
  PRODUCTS_MAP.clear();
  NORMALIZED_CACHE.clear();
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (p && p.id != null) {
      PRODUCTS_MAP.set(String(p.id), p);
    }
  }
}

/**
 * Turn a raw record (from the admin form / database) into a full storefront
 * product with memoization to avoid re-normalizing thousands of unchanged objects.
 */
export function normalizeProduct(raw) {
  if (!raw || !raw.id) return null;

  const colorsHash = Array.isArray(raw.colors) ? raw.colors.map((c) => (typeof c === 'object' ? c?.name : c)).join(',') : '';
  const sizesHash = Array.isArray(raw.sizes) ? raw.sizes.join(',') : '';
  const imagesHash = Array.isArray(raw.images) ? raw.images.join('|') : (raw.image || '');
  const cacheKey = `${raw.id}_${raw.price}_${raw.oldPrice}_${raw.name}_${raw.sortOrder}_${raw.status}_${raw.badge}_${colorsHash}_${sizesHash}_${imagesHash}`;
  if (NORMALIZED_CACHE.has(cacheKey)) {
    return NORMALIZED_CACHE.get(cacheKey);
  }

  const rawColors = (raw.colors || []).map((c) =>
    typeof c === 'string' ? { name: c, nameEn: c, hex: '#888' } : c
  );
  const colors = rawColors.length ? rawColors : [{ name: 'أساسي', nameEn: 'Basic', hex: '#333333' }];
  const sizes = raw.sizes && raw.sizes.length ? raw.sizes : [ONE];

  const base = {
    id: String(raw.id),
    gender: raw.gender,
    category: raw.category,
    sub: raw.sub,
    name: raw.name || '',
    nameEn: raw.nameEn || raw.name || '',
    blurb: raw.blurb || '',
    blurbEn: raw.blurbEn || raw.blurb || '',
    price: Number(raw.price) || 0,
    oldPrice: raw.oldPrice ? Number(raw.oldPrice) : null,
    rating: raw.rating != null ? Number(raw.rating) : 4.8,
    reviews: raw.reviews != null ? Number(raw.reviews) : 12,
    badge: raw.badge || null,
    colors,
    sizes,
    sizesEn: sizes.map((s) => (s === ONE ? ONE_EN : s)),
    material: raw.material || '',
    materialEn: raw.materialEn || materialEn(raw.material || ''),
    sortOrder: raw.sortOrder,
    status: raw.status || 'active',
    stockQuantity: raw.stockQuantity,
    type: raw.type || 'general',
    heelType: raw.heelType || '',
    soleMaterial: raw.soleMaterial || '',
    fitType: raw.fitType || '',
    clothingStyle: raw.clothingStyle || '',
    perfumeVolume: raw.perfumeVolume || '',
    perfumeConcentration: raw.perfumeConcentration || '',
    perfumeNotes: raw.perfumeNotes || '',
    bagClosure: raw.bagClosure || '',
    bagDimensions: raw.bagDimensions || '',
    watchMovement: raw.watchMovement || '',
    watchWaterResistance: raw.watchWaterResistance || '',
    customSpecs: Array.isArray(raw.customSpecs) ? raw.customSpecs : [],
  };

  let normalized;
  const gallery = Array.isArray(raw.gallery) ? raw.gallery.filter(Boolean) : [];
  if (gallery.length) {
    normalized = {
      ...base,
      gallery,
      image: img(gallery[0], 420, 560),
      imageSet: cardSrcSet(gallery[0]),
      imageAlt: img(gallery[1] || gallery[0], 420, 560),
      imageAltSet: cardSrcSet(gallery[1] || gallery[0]),
      thumbs: gallery.map((g) => img(g, 140, 140, 45)),
      large: gallery.map((g) => img(g, 720, 900, 58)),
      largeSet: gallery.map((g) => srcSet(g, [420, 640, 900, 1200], 5 / 4, 58)),
    };
  } else {
    let urls = (Array.isArray(raw.images) ? raw.images.filter(Boolean) : []);
    if (!urls.length && raw.image) {
      urls = [raw.image];
    }
    const pad = urls.length ? urls : [img(POOLS.mShirts[0], 420, 560)];
    normalized = {
      ...base,
      images: urls.length ? urls : pad,
      image: pad[0],
      imageSet: undefined,
      imageAlt: pad[1] || pad[0],
      imageAltSet: undefined,
      thumbs: pad.slice(0, 4),
      large: pad,
      largeSet: pad.map(() => undefined),
    };
  }

  NORMALIZED_CACHE.set(cacheKey, normalized);
  return normalized;
}

/** Strip a storefront product down to the fields we persist to the database. */
export function toRecord(p) {
  return {
    id: String(p.id),
    gender: p.gender,
    category: p.category,
    sub: p.sub,
    name: p.name,
    nameEn: p.nameEn,
    blurb: p.blurb,
    blurbEn: p.blurbEn,
    price: Number(p.price) || 0,
    oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
    rating: p.rating != null ? Number(p.rating) : 4.8,
    reviews: p.reviews != null ? Number(p.reviews) : 12,
    badge: p.badge || null,
    colors: p.colors || [],
    sizes: p.sizes || [],
    material: p.material || '',
    materialEn: p.materialEn || '',
    sortOrder: p.sortOrder,
    status: p.status || 'active',
    stockQuantity: p.stockQuantity,
    gallery: p.gallery || null,
    images: p.images || (p.image ? [p.image] : []),
    type: p.type || 'general',
    heelType: p.heelType || '',
    soleMaterial: p.soleMaterial || '',
    fitType: p.fitType || '',
    clothingStyle: p.clothingStyle || '',
    perfumeVolume: p.perfumeVolume || '',
    perfumeConcentration: p.perfumeConcentration || '',
    perfumeNotes: p.perfumeNotes || '',
    bagClosure: p.bagClosure || '',
    bagDimensions: p.bagDimensions || '',
    watchMovement: p.watchMovement || '',
    watchWaterResistance: p.watchWaterResistance || '',
    customSpecs: Array.isArray(p.customSpecs) ? p.customSpecs : [],
  };
}

export const BADGE_LABELS = {
  new: 'جديد',
  sale: 'تخفيض',
  best: 'الأكثر مبيعًا',
};

/** Products for a listing page. `sub === 'all'` widens to the whole category. */
export function queryProducts({ gender, category, sub } = {}) {
  const list = PRODUCTS.filter(
    (p) =>
      p.status !== 'draft' &&
      (!gender || p.gender === gender) &&
      (!category || p.category === category) &&
      (!sub || sub === 'all' || p.sub === sub)
  );
  return list.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
}

export function countProducts(gender, category, sub) {
  return queryProducts({ gender, category, sub }).length;
}

export function getProduct(id) {
  if (id == null) return null;
  const sId = String(id);
  const found = PRODUCTS_MAP.get(sId);
  if (found) return found;
  return null;
}

/** Same subcategory first, then the wider category — never the product itself. */
export function relatedProducts(product, limit = 4) {
  if (!product) return [];
  const sameSub = PRODUCTS.filter(
    (p) => p.id !== product.id && p.status !== 'draft' && p.gender === product.gender && p.sub === product.sub
  );
  const sameCategory = PRODUCTS.filter(
    (p) => p.id !== product.id && p.status !== 'draft' && p.gender === product.gender && p.category === product.category && p.sub !== product.sub
  );
  return [...sameSub, ...sameCategory].slice(0, limit);
}

export function featuredProducts(limit = 8) {
  const active = PRODUCTS.filter((p) => p.status !== 'draft');
  return active.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)).slice(0, limit);
}

export function newArrivals(limit = 8) {
  const active = PRODUCTS.filter((p) => p.status !== 'draft');
  return active.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)).slice(0, limit);
}

export function searchProducts(term, limit = 8) {
  if (!term || typeof term !== 'string') return [];
  const q = term.trim();
  if (q.length < 2) return [];
  const lower = q.toLowerCase();
  const res = [];
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    if (!p || p.status === 'draft') continue;
    const nameMatch = (p.name || '').toLowerCase().includes(lower);
    const nameEnMatch = (p.nameEn || '').toLowerCase().includes(lower);
    const catMatch = (p.category || '').toLowerCase().includes(lower);
    const subMatch = (p.sub || '').toLowerCase().includes(lower);
    const blurbMatch = (p.blurb || '').toLowerCase().includes(lower);
    const blurbEnMatch = (p.blurbEn || '').toLowerCase().includes(lower);
    const matMatch = (p.material || '').toLowerCase().includes(lower);
    if (nameMatch || nameEnMatch || catMatch || subMatch || blurbMatch || blurbEnMatch || matMatch) {
      res.push(p);
      if (res.length >= limit) break;
    }
  }
  return res;
}

/* ---------- High-Performance Filter Analysis Helper ---------- */

const LETTER_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

/**
 * Single-pass extraction of price bounds, unique colors, and unique sizes.
 * High efficiency over 5,000+ products!
 */
export function analyzePool(list) {
  if (!list || !list.length) {
    return { bounds: { min: 0, max: 0 }, colors: [], sizes: [] };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  const colorMap = new Map();
  const sizeSet = new Set();

  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    if (p.price < minPrice) minPrice = p.price;
    if (p.price > maxPrice) maxPrice = p.price;

    if (p.colors) {
      for (let j = 0; j < p.colors.length; j++) {
        const c = p.colors[j];
        if (c && c.name && !colorMap.has(c.name)) {
          colorMap.set(c.name, c);
        }
      }
    }

    if (p.sizes) {
      for (let k = 0; k < p.sizes.length; k++) {
        sizeSet.add(p.sizes[k]);
      }
    }
  }

  const step = 5000;
  const bounds = {
    min: minPrice === Infinity ? 0 : Math.floor(minPrice / step) * step,
    max: maxPrice === -Infinity ? 0 : Math.ceil(maxPrice / step) * step,
  };

  const colors = [...colorMap.values()];
  const sizes = [...sizeSet].sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    const la = LETTER_ORDER.indexOf(a);
    const lb = LETTER_ORDER.indexOf(b);
    if (la !== -1 && lb !== -1) return la - lb;
    return a.localeCompare(b, 'ar');
  });

  return { bounds, colors, sizes };
}

/** Price bounds for a set of products. */
export function priceBounds(list) {
  return analyzePool(list).bounds;
}

/** Every colour present in a set, de-duplicated by name. */
export function availableColors(list) {
  return analyzePool(list).colors;
}

/** Every size present in a set. */
export function availableSizes(list) {
  return analyzePool(list).sizes;
}

/** Iraqi dinar. Arabic-Indic numerals in Arabic, Western numerals + "IQD" in English. */
export function formatPrice(value, lang = 'ar') {
  if (lang === 'en') {
    return `${new Intl.NumberFormat('en-US').format(value)} IQD`;
  }
  return `${new Intl.NumberFormat('ar-IQ').format(value)} د.ع`;
}
