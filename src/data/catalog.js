import { POOLS } from './images';

/**
 * The navigation tree: gender → category → subcategory.
 * `slug` values are what appear in the URL; `cover` is the tile photograph.
 */

export const GENDERS = [
  {
    slug: 'men',
    title: 'رجالي',
    latin: 'Men',
    tagline: 'خطوط نظيفة، خامات نبيلة، وحرفية تدوم',
    cover: POOLS.menEditorial[0],
  },
  {
    slug: 'women',
    title: 'نسائي',
    latin: 'Women',
    tagline: 'أناقة هادئة بتفاصيل مدروسة حتى آخر غرزة',
    cover: POOLS.wDresses[1],
  },
];

export const CATEGORIES = {
  men: [
    {
      slug: 'shoes',
      title: 'أحذية',
      latin: 'Footwear',
      blurb: 'جلد إيطالي مدبوغ نباتيًا ونعال مخيطة يدويًا',
      cover: POOLS.mFormal[0],
    },
    {
      slug: 'clothing',
      title: 'ملابس',
      latin: 'Clothing',
      blurb: 'قصّات مصمّمة بعناية من أقمشة طبيعية بالكامل',
      cover: POOLS.mSuits[0],
    },
    {
      slug: 'accessories',
      title: 'إكسسوارات',
      latin: 'Accessories',
      blurb: 'التفاصيل الصغيرة التي تُكمل الإطلالة',
      cover: POOLS.mWatches[0],
    },
  ],
  women: [
    {
      slug: 'shoes',
      title: 'أحذية',
      latin: 'Footwear',
      blurb: 'من الكعب المنحوت إلى الباليرينا الطرية',
      cover: POOLS.wHeels[0],
    },
    {
      slug: 'clothing',
      title: 'ملابس',
      latin: 'Clothing',
      blurb: 'حرير وكشمير وكتان بقصّات تحتفي بالانسياب',
      cover: POOLS.wDresses[0],
    },
    {
      slug: 'accessories',
      title: 'إكسسوارات',
      latin: 'Accessories',
      blurb: 'حقائب ومجوهرات تُوقّع الإطلالة',
      cover: POOLS.wBags[0],
    },
  ],
};

export const SUBCATEGORIES = {
  'men/shoes': [
    { slug: 'all', title: 'كل الأحذية', latin: 'All Footwear', cover: POOLS.mFormal[2], feature: true },
    { slug: 'sneakers', title: 'أحذية رياضية', latin: 'Sneakers', cover: POOLS.mSneakers[0] },
    { slug: 'formal', title: 'أحذية رسمية', latin: 'Formal', cover: POOLS.mFormal[1] },
    { slug: 'loafers', title: 'أحذية لوفرز', latin: 'Loafers', cover: POOLS.mLoafers[0] },
  ],
  'men/clothing': [
    { slug: 'all', title: 'كل الملابس', latin: 'All Clothing', cover: POOLS.mSuits[4], feature: true },
    { slug: 'shirts', title: 'قمصان', latin: 'Shirts', cover: POOLS.mShirts[0] },
    { slug: 'suits', title: 'بدلات', latin: 'Tailoring', cover: POOLS.mSuits[1] },
    { slug: 'outerwear', title: 'معاطف وجاكيتات', latin: 'Outerwear', cover: POOLS.mOuter[0] },
    { slug: 'trousers', title: 'بناطيل', latin: 'Trousers', cover: POOLS.mTrousers[0] },
  ],
  'men/accessories': [
    { slug: 'all', title: 'كل الإكسسوارات', latin: 'All Accessories', cover: POOLS.mLeather[0], feature: true },
    { slug: 'watches', title: 'ساعات', latin: 'Watches', cover: POOLS.mWatches[1] },
    { slug: 'leather', title: 'أحزمة ومحافظ', latin: 'Leather Goods', cover: POOLS.mLeather[1] },
    { slug: 'eyewear', title: 'نظارات شمسية', latin: 'Eyewear', cover: POOLS.eyewear[0] },
  ],
  'women/shoes': [
    { slug: 'all', title: 'كل الأحذية', latin: 'All Footwear', cover: POOLS.wHeels[2], feature: true },
    { slug: 'heels', title: 'كعب عالي', latin: 'Heels', cover: POOLS.wHeels[1] },
    { slug: 'sneakers', title: 'أحذية رياضية', latin: 'Sneakers', cover: POOLS.wSneakers[0] },
    { slug: 'boots', title: 'بوت', latin: 'Boots', cover: POOLS.wBoots[0] },
    { slug: 'flats', title: 'باليرينا', latin: 'Flats', cover: POOLS.wFlats[0] },
  ],
  'women/clothing': [
    { slug: 'all', title: 'كل الملابس', latin: 'All Clothing', cover: POOLS.wDresses[3], feature: true },
    { slug: 'dresses', title: 'فساتين', latin: 'Dresses', cover: POOLS.wDresses[2] },
    { slug: 'modest', title: 'عبايات وقفاطين', latin: 'Modest', cover: POOLS.wModest[0] },
    { slug: 'outerwear', title: 'معاطف وجاكيتات', latin: 'Outerwear', cover: POOLS.wOuter[0] },
    { slug: 'tops', title: 'بلوزات وتيشيرتات', latin: 'Tops', cover: POOLS.wTops[0] },
  ],
  'women/accessories': [
    { slug: 'all', title: 'كل الإكسسوارات', latin: 'All Accessories', cover: POOLS.wBags[2], feature: true },
    { slug: 'bags', title: 'حقائب', latin: 'Bags', cover: POOLS.wBags[1] },
    { slug: 'jewelry', title: 'مجوهرات', latin: 'Jewellery', cover: POOLS.wJewelry[0] },
    { slug: 'eyewear', title: 'نظارات شمسية', latin: 'Eyewear', cover: POOLS.eyewear[3] },
  ],
};

export function getGender(slug) {
  return GENDERS.find((g) => g.slug === slug) || null;
}

export function getCategory(gender, slug) {
  return (CATEGORIES[gender] || []).find((c) => c.slug === slug) || null;
}

export function getSubcategories(gender, category) {
  return SUBCATEGORIES[`${gender}/${category}`] || [];
}

export function getSubcategory(gender, category, slug) {
  return getSubcategories(gender, category).find((s) => s.slug === slug) || null;
}
