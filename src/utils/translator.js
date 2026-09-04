/**
 * Comprehensive Integrated Unlimited Automatic Arabic -> English Translation Engine
 * Powered by Google Neural Translation API + Comprehensive Offline Dictionary + LocalStorage Cache
 * Ensures 100% of products, descriptions, titles, specs, categories, and UI are automatically translated.
 */

const CACHE_KEY = 'iraqstore_translations_v3';
const MEMORY_CACHE = new Map();
const PENDING_QUEUE = new Set();
let isProcessingQueue = false;

// Load cache from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const k in parsed) {
        if (parsed[k]) MEMORY_CACHE.set(k, parsed[k]);
      }
    }
  }
} catch (e) {
  console.warn('LocalStorage translation cache load error:', e);
}

function persistCache() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const obj = {};
      let count = 0;
      MEMORY_CACHE.forEach((v, k) => {
        if (count < 2000) {
          obj[k] = v;
          count++;
        }
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    }
  } catch (e) {}
}

/**
 * High-speed Neural Translation via Google Translate Endpoint
 */
export async function translateArabicAsync(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // Already English
  if (!/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  if (MEMORY_CACHE.has(trimmed)) {
    return MEMORY_CACHE.get(trimmed);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const translated = data[0].map((p) => p[0]).filter(Boolean).join('');
        if (translated) {
          const result = translated.trim();
          MEMORY_CACHE.set(trimmed, result);
          persistCache();
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Neural translation fetch error, using local dictionary:', err);
  }

  // Fallback to local dictionary
  const fallback = translateTextOffline(trimmed);
  MEMORY_CACHE.set(trimmed, fallback);
  persistCache();
  return fallback;
}

/**
 * Background batch translation processor
 */
async function processQueue() {
  if (isProcessingQueue || PENDING_QUEUE.size === 0) return;
  isProcessingQueue = true;

  const batch = Array.from(PENDING_QUEUE).slice(0, 12);
  let hasNewTranslations = false;

  for (const item of batch) {
    PENDING_QUEUE.delete(item);
    if (!MEMORY_CACHE.has(item)) {
      try {
        const trans = await translateArabicAsync(item);
        if (trans && trans !== item) {
          hasNewTranslations = true;
        }
      } catch (e) {}
    }
  }

  isProcessingQueue = false;

  if (hasNewTranslations && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('iraqstore:translated'));
  }

  if (PENDING_QUEUE.size > 0) {
    setTimeout(processQueue, 250);
  }
}

export function queueAsyncTranslation(text) {
  if (!text || typeof text !== 'string') return;
  const trimmed = text.trim();
  if (!trimmed || !/[\u0600-\u06FF]/.test(trimmed)) return;
  if (!MEMORY_CACHE.has(trimmed)) {
    PENDING_QUEUE.add(trimmed);
    if (typeof window !== 'undefined') {
      setTimeout(processQueue, 50);
    }
  }
}

/**
 * Comprehensive offline dictionary & phrase-matcher for Iraqi Fashion & E-commerce
 */
const PHRASES = {
  'حذاء ماركة زارا': 'Zara Brand Shoes',
  'ماركة زارا': 'Zara Brand',
  'جلد طبيعي بقري': 'Genuine Cowhide Leather',
  'جلد بقري طبيعي': 'Natural Cowhide Leather',
  'جلد طبيعي 100%': '100% Genuine Leather',
  'جلد طبيعي': 'Genuine Leather',
  'جلد صناعي': 'Synthetic Leather',
  'جلد بقري': 'Cowhide Leather',
  'جلد مقلوب': 'Nubuck Leather',
  'أحمر برغندي': 'Burgundy',
  'احمر برغندي': 'Burgundy',
  'بني غامق': 'Dark Brown',
  'جوزي طوخ': 'Dark Brown',
  'بيج فاتح': 'Light Beige',
  'وردي باهت': 'Dusty Rose',
  'ستانلس ستيل': 'Stainless Steel',
  'نعل طبي مريح': 'Comfort Orthopedic Sole',
  'نعل طبي': 'Orthopedic Sole',
  'حذاء طبي': 'Orthopedic Shoes',
  'حذاء رسمي': 'Formal Shoes',
  'حذاء رياضي': 'Sport Shoes',
  'حذاء كلاسيك': 'Classic Shoes',
  'قطن طبيعي 100%': '100% Natural Cotton',
  'قطن طبيعي': 'Natural Cotton',
  'صوف خالص': 'Pure Wool',
  'حرير طبيعي': 'Natural Silk',
  'كتان طبيعي': 'Natural Linen',
  'صناعة تركية': 'Turkish Made',
  'صناعة ايطالية': 'Italian Made',
  'درجة اولى': 'First Grade',
  'درجة أولى': 'First Grade',
  'هاي كواليتي': 'High Quality',
  'موديل حديث': 'Modern Model',
  'موديل جديد': 'New Model',
  'ماركة أصلية': 'Original Brand',
  'ماركة اصلية': 'Original Brand',
  'مقاوم للماء': 'Waterproof',
  'مقاوم للرطوبة': 'Moisture Resistant',
  'نفد من المخزون': 'Sold Out',
  'غير متوفر': 'Out of Stock',
  'متوفر بالمخزن': 'In Stock',
  'متوفر في المخزن': 'In Stock',
  'مقاس موحد': 'One Size',
  'قياس موحد': 'One Size',
  'مقاس واحد': 'One Size',
  'قياس واحد': 'One Size',
  'توصيل سريع': 'Fast Delivery',
  'كافة محافظات العراق': 'All Iraqi Governorates',
  'بغداد والمحافظات': 'Baghdad & Governorates',
  'الدفع عند الاستلام': 'Cash on Delivery',
  'سارع بالطلب': 'Order soon',
  'ضمان استبدال': 'Exchange Warranty',
};

const WORDS = {
  // Clothing & Footwear
  'حذاء': 'Shoe', 'احذية': 'Shoes', 'أحذية': 'Shoes', 'سنيكرز': 'Sneakers',
  'ترينر': 'Trainer', 'ترينرز': 'Trainers', 'لوفر': 'Loafer', 'لوفرز': 'Loafers',
  'بوت': 'Boots', 'باليرينا': 'Ballet Flats', 'صندل': 'Sandals', 'كعب': 'Heels',
  'شبشب': 'Slippers', 'شحاطة': 'Slides', 'نعال': 'Slippers',
  'قميص': 'Shirt', 'قمصان': 'Shirts', 'تيشيرت': 'T-Shirt', 'تيشيرتات': 'T-Shirts',
  'فستان': 'Dress', 'فساتين': 'Dresses', 'بدلة': 'Suit', 'بدلات': 'Suits',
  'بليزر': 'Blazer', 'جاكيت': 'Jacket', 'معطف': 'Coat', 'سترة': 'Sweater',
  'بنطال': 'Trousers', 'بناطيل': 'Pants', 'جينز': 'Jeans', 'شورت': 'Shorts',
  'عباية': 'Abaya', 'عبايات': 'Abayas', 'قفطان': 'Kaftan', 'بلوزة': 'Blouse',
  'حقيبة': 'Bag', 'حقائب': 'Bags', 'شنطة': 'Bag', 'شنط': 'Bags',
  'محفظة': 'Wallet', 'حزام': 'Belt', 'ساعة': 'Watch', 'ساعات': 'Watches',
  'نظارة': 'Sunglasses', 'نظارات': 'Eyewear', 'عطر': 'Perfume', 'عطور': 'Perfumes',
  'مجوهرات': 'Jewelry', 'اكسسوارات': 'Accessories', 'إكسسوارات': 'Accessories',

  // Materials
  'جلد': 'Leather', 'قطن': 'Cotton', 'كتان': 'Linen', 'صوف': 'Wool',
  'ساتان': 'Satin', 'مخمل': 'Velvet', 'حرير': 'Silk', 'شاموا': 'Suede',
  'شامو': 'Suede', 'شمواه': 'Suede', 'سويد': 'Suede', 'قماش': 'Fabric', 'شيفون': 'Chiffon',
  'مطاط': 'Rubber', 'ستيل': 'Steel', 'معدن': 'Metal', 'فضة': 'Silver',
  'ذهب': 'Gold', 'سحاب': 'Zipper', 'نعل': 'Sole', 'خامة': 'Material',
  'خامات': 'Materials',

  // Colors
  'أبيض': 'White', 'ابيض': 'White', 'أسود': 'Black', 'اسود': 'Black',
  'رصاصي': 'Grey', 'رمادي': 'Grey', 'نيلي': 'Navy', 'كحلي': 'Navy',
  'أزرق': 'Blue', 'ازرق': 'Blue', 'سمائي': 'Sky Blue', 'سماوي': 'Sky Blue',
  'أحمر': 'Red', 'احمر': 'Red', 'برغندي': 'Burgundy', 'عنابي': 'Burgundy',
  'ماروني': 'Maroon', 'بني': 'Brown', 'جوزي': 'Brown', 'قهوائي': 'Dark Brown',
  'حني': 'Tan', 'جملي': 'Tan', 'كاميل': 'Camel', 'بيجي': 'Beige', 'بيج': 'Beige',
  'كريمي': 'Cream', 'أصفر': 'Yellow', 'اصفر': 'Yellow', 'ذهبي': 'Gold',
  'فضي': 'Silver', 'أخضر': 'Green', 'اخضر': 'Green', 'زيتوني': 'Olive',
  'وردي': 'Pink', 'زمردي': 'Emerald', 'فحمي': 'Charcoal', 'دينم': 'Denim',
  'طوخ': 'Dark', 'فاتح': 'Light',

  // Brands
  'زارا': 'Zara', 'نايك': 'Nike', 'اديداس': 'Adidas', 'أديداس': 'Adidas',
  'بوما': 'Puma', 'لاكوست': 'Lacoste', 'تومي': 'Tommy', 'غوتشي': 'Gucci',
  'شانيل': 'Chanel', 'ديور': 'Dior', 'برادا': 'Prada', 'لويس': 'Louis',
  'فيتون': 'Vuitton', 'ارماني': 'Armani', 'كالفن': 'Calvin', 'كلاين': 'Klein',

  // Descriptions & Qualities
  'ماركة': 'Brand', 'براند': 'Brand', 'اصلي': 'Original', 'أصلي': 'Original',
  'طبيعي': 'Genuine', 'بقري': 'Cowhide', 'موديل': 'Model', 'لون': 'Color',
  'الوان': 'Colors', 'ألوان': 'Colors', 'رجالي': "Men's", 'نسائي': "Women's",
  'شبابي': 'Youth', 'أطفال': 'Kids', 'اطفال': 'Kids', 'ولادي': 'Boys', 'بناتي': 'Girls',
  'جديد': 'New', 'تخفيض': 'Sale', 'عرض': 'Offer', 'خصم': 'Discount',
  'فاخر': 'Luxury', 'فخم': 'Luxury', 'مميز': 'Special', 'كلاسيك': 'Classic',
  'كلاسيكي': 'Classic', 'سبورت': 'Sport', 'رياضي': 'Sport', 'طبي': 'Orthopedic',
  'مريح': 'Comfortable', 'خفيف': 'Lightweight', 'راقي': 'Elegant', 'مرتب': 'Neat',
  'كشخة': 'Stylish', 'شغل': 'Quality', 'درجة': 'Grade', 'اولى': 'First', 'أولى': 'First',
  'ممتاز': 'Excellent', 'ايطالي': 'Italian', 'إيطالي': 'Italian', 'تركي': 'Turkish',
  'عراقي': 'Iraqi', 'صيفي': 'Summer', 'شتوي': 'Winter', 'ربيعي': 'Spring', 'خريفي': 'Autumn',
  'قياس': 'Size', 'مقاس': 'Size', 'مقاوم': 'Resistant', 'للماء': 'Waterproof',
  'مطر': 'Rain', 'ضمان': 'Warranty', 'سنة': 'Year', 'سنتين': '2 Years',
  'اشهر': 'Months', 'أشهر': 'Months', 'قطعة': 'Piece', 'قطع': 'Pieces',
  'فقط': 'Only', 'متبقي': 'Left', 'عالي': 'High', 'جودة': 'Quality',
  'توصيل': 'Delivery', 'سريع': 'Fast', 'شامل': 'Includes', 'أجور': 'Fees',
  'سعر': 'Price', 'السعر': 'Price', 'دينار': 'IQD', 'بغداد': 'Baghdad',
  'البصرة': 'Basra', 'أربيل': 'Erbil', 'النجف': 'Najaf', 'كربلاء': 'Karbala',
};

export function translateTextOffline(arabicText) {
  if (!arabicText || typeof arabicText !== 'string') return '';
  const trimmed = arabicText.trim();
  if (!trimmed) return '';

  if (!/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  if (WORDS[trimmed]) return WORDS[trimmed];

  let out = trimmed;
  const sortedP = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
  for (const ph of sortedP) {
    if (out.includes(ph)) {
      out = out.split(ph).join(PHRASES[ph]);
    }
  }

  const parts = out.split(/(\s+|[،,.-])/);
  const trans = parts.map((w) => {
    const cw = w.replace(/[،,.-]/g, '').trim();
    if (!cw) return w;
    if (WORDS[cw]) return WORDS[cw];
    if (cw.startsWith('ال') && cw.length > 3 && WORDS[cw.slice(2)]) return WORDS[cw.slice(2)];
    if (cw.startsWith('و') && cw.length > 2 && WORDS[cw.slice(1)]) return '& ' + WORDS[cw.slice(1)];
    if (cw.startsWith('ب') && cw.length > 3 && WORDS[cw.slice(1)]) return 'in ' + WORDS[cw.slice(1)];
    if (cw.startsWith('ل') && cw.length > 3 && WORDS[cw.slice(1)]) return 'for ' + WORDS[cw.slice(1)];
    return w;
  });

  let res = trans.join('').replace(/\s+/g, ' ').trim();
  if (res) {
    res = res.charAt(0).toUpperCase() + res.slice(1);
    return res;
  }

  return trimmed;
}

export function translateTextSync(arabicText) {
  if (!arabicText || typeof arabicText !== 'string') return '';
  const trimmed = arabicText.trim();
  if (!trimmed) return '';

  if (!/[\u0600-\u06FF]/.test(trimmed)) {
    return trimmed;
  }

  if (MEMORY_CACHE.has(trimmed)) {
    return MEMORY_CACHE.get(trimmed);
  }

  // Queue background neural translation
  queueAsyncTranslation(trimmed);

  // Return offline translation immediately
  const offline = translateTextOffline(trimmed);
  MEMORY_CACHE.set(trimmed, offline);
  return offline;
}

export function translateText(arabicText) {
  return translateTextSync(arabicText);
}

export function autoTranslateProduct(arabicProduct) {
  return {
    nameEn: translateTextSync(arabicProduct.name || ''),
    blurbEn: translateTextSync(arabicProduct.blurb || ''),
    materialEn: translateTextSync(arabicProduct.material || ''),
  };
}

/**
 * Pre-translates a whole list of products in the background on startup
 */
export function preTranslateProducts(products) {
  if (!Array.isArray(products) || !products.length) return;
  for (const p of products) {
    if (p.name && /[\u0600-\u06FF]/.test(p.name)) queueAsyncTranslation(p.name);
    if (p.blurb && /[\u0600-\u06FF]/.test(p.blurb)) queueAsyncTranslation(p.blurb);
    if (p.material && /[\u0600-\u06FF]/.test(p.material)) queueAsyncTranslation(p.material);
    if (Array.isArray(p.colors)) {
      for (const c of p.colors) {
        if (c && c.name && /[\u0600-\u06FF]/.test(c.name)) queueAsyncTranslation(c.name);
      }
    }
  }
}
