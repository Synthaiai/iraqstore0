import { POOLS } from './images';
import { getLocalCatalog } from './remote';

/**
 * Navigation tree: gender → category → subcategory.
 */

export const INITIAL_GENDERS = [
  {
    slug: 'men',
    title: 'رجالي',
    latin: 'Men',
    tagline: 'خطوط نظيفة، خامات نبيلة، وحرفية تدوم',
    taglineEn: 'Clean lines, fine materials and lasting craft',
    cover: POOLS.menEditorial[0],
  },
  {
    slug: 'women',
    title: 'نسائي',
    latin: 'Women',
    tagline: 'أناقة هادئة بتفاصيل مدروسة حتى آخر غرزة',
    taglineEn: 'Quiet elegance, considered down to the last stitch',
    cover: POOLS.wDresses[1],
  },
];

export const INITIAL_CATEGORIES = {
  men: [
    {
      slug: 'shoes',
      title: 'أحذية',
      latin: 'Footwear',
      blurb: 'من الكاجول إلى الرسمي — جلد وخامات تدوم',
      blurbEn: 'From casual to formal — leather and materials that last',
      cover: POOLS.mFormal[0],
    },
    {
      slug: 'clothing',
      title: 'ملابس',
      latin: 'Clothing',
      blurb: 'قصّات مصمّمة بعناية من أقمشة طبيعية',
      blurbEn: 'Carefully cut pieces in natural fabrics',
      cover: POOLS.mSuits[0],
    },
    {
      slug: 'accessories',
      title: 'إكسسوارات',
      latin: 'Accessories',
      blurb: 'التفاصيل الصغيرة التي تُكمل الإطلالة',
      blurbEn: 'The small details that complete the look',
      cover: POOLS.mWatches[0],
    },
  ],
  women: [
    {
      slug: 'shoes',
      title: 'أحذية',
      latin: 'Footwear',
      blurb: 'من الكعب المنحوت إلى الباليرينا الطرية',
      blurbEn: 'From sculpted heels to soft ballet flats',
      cover: POOLS.wHeels[0],
    },
    {
      slug: 'clothing',
      title: 'ملابس',
      latin: 'Clothing',
      blurb: 'حرير وكتان وحياكة بقصّات تحتفي بالانسياب',
      blurbEn: 'Satin, linen and knits in cuts that celebrate flow',
      cover: POOLS.wDresses[0],
    },
    {
      slug: 'accessories',
      title: 'إكسسوارات',
      latin: 'Accessories',
      blurb: 'حقائب ومجوهرات تُوقّع الإطلالة',
      blurbEn: 'Bags and jewellery that sign off the look',
      cover: POOLS.wBags[0],
    },
  ],
};

export const INITIAL_SUBCATEGORIES = {
  'men/shoes': [
    { slug: 'all', title: 'كل الأحذية', latin: 'All Footwear', cover: POOLS.mFormal[2], feature: true },
    { slug: 'casual', title: 'أحذية كاجول (ترينرز)', latin: 'Trainers', cover: POOLS.mSneakers[5] },
    { slug: 'sneakers', title: 'أحذية ركض (سنيكرز)', latin: 'Running', cover: POOLS.mSneakers[0] },
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

let currentGenders = [...INITIAL_GENDERS];
let currentCategories = { ...INITIAL_CATEGORIES };
let currentSubcategories = { ...INITIAL_SUBCATEGORIES };

// Try loading local catalog cache at module start
const cached = getLocalCatalog();
if (cached && cached.genders) {
  currentGenders = cached.genders;
  currentCategories = cached.categories || INITIAL_CATEGORIES;
  currentSubcategories = cached.subcategories || INITIAL_SUBCATEGORIES;
}

export function updateCatalogStore(tree) {
  if (!tree) return;
  if (tree.genders) currentGenders = tree.genders;
  if (tree.categories) currentCategories = tree.categories;
  if (tree.subcategories) currentSubcategories = tree.subcategories;
}

export function getFullCatalogTree() {
  return {
    genders: currentGenders,
    categories: currentCategories,
    subcategories: currentSubcategories,
  };
}

export const GENDERS = currentGenders;
export const CATEGORIES = currentCategories;
export const SUBCATEGORIES = currentSubcategories;

export function getGender(slug) {
  return currentGenders.find((g) => g.slug === slug) || null;
}

export function getCategory(gender, slug) {
  return (currentCategories[gender] || []).find((c) => c.slug === slug) || null;
}

export function getSubcategories(gender, category) {
  return currentSubcategories[`${gender}/${category}`] || [];
}

export function getSubcategory(gender, category, slug) {
  return getSubcategories(gender, category).find((s) => s.slug === slug) || null;
}
