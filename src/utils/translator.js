/**
 * Comprehensive Unlimited Automatic Arabic -> English Translator Engine
 * Uses free client-side Google Translation API with local dictionary caching fallback
 * to accurately translate ANY Arabic product text, description, material, or category to English.
 */

const LOCAL_CACHE = new Map();

/**
 * Perform online translation via free Google Translate web endpoint
 */
export async function translateArabicAsync(text) {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // If text is already English / numbers / symbols, return it
  if (/^[a-zA-Z0-9\s.,\-'":;!()/+%]+$/.test(trimmed)) {
    return trimmed;
  }

  if (LOCAL_CACHE.has(trimmed)) {
    return LOCAL_CACHE.get(trimmed);
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && Array.isArray(data[0])) {
        const translatedSentence = data[0].map((part) => part[0]).filter(Boolean).join('');
        if (translatedSentence) {
          const result = translatedSentence.trim();
          LOCAL_CACHE.set(trimmed, result);
          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Online translation fallback to local rule engine:', err);
  }

  // Fallback to local dictionary & rule-based engine
  return translateTextSync(trimmed);
}

const DICTIONARY = {
  'حذاء': 'Shoe',
  'احذية': 'Shoes',
  'أحذية': 'Shoes',
  'سنيكرز': 'Sneakers',
  'ترينر': 'Trainer',
  'ترينرز': 'Trainers',
  'لوفر': 'Loafer',
  'لوفرز': 'Loafers',
  'بوت': 'Boots',
  'باليرينا': 'Ballet Flats',
  'صندل': 'Sandals',
  'كعب': 'Heels',
  'قميص': 'Shirt',
  'قمصان': 'Shirts',
  'تيشيرت': 'T-Shirt',
  'فستان': 'Dress',
  'فساتين': 'Dresses',
  'بدلة': 'Suit',
  'بدلات': 'Suits',
  'بليزر': 'Blazer',
  'جاكيت': 'Jacket',
  'معطف': 'Coat',
  'سترة': 'Sweater',
  'بنطال': 'Trousers',
  'بناطيل': 'Pants',
  'جينز': 'Jeans',
  'عباية': 'Abaya',
  'عبايات': 'Abayas',
  'قفطان': 'Kaftan',
  'بلوزة': 'Blouse',
  'حقيبة': 'Bag',
  'حقائب': 'Bags',
  'محفظة': 'Wallet',
  'حزام': 'Belt',
  'ساعة': 'Watch',
  'ساعات': 'Watches',
  'نظارة': 'Sunglasses',
  'عطر': 'Perfume',
  'عطور': 'Perfumes',
  'جلد': 'Leather',
  'قطن': 'Cotton',
  'كتان': 'Linen',
  'صوف': 'Wool',
  'ساتان': 'Satin',
  'مخمل': 'Velvet',
  'أبيض': 'White',
  'ابيض': 'White',
  'أسود': 'Black',
  'اسود': 'Black',
  'رصاصي': 'Grey',
  'رمادي': 'Grey',
  'نيلي': 'Navy',
  'كحلي': 'Navy',
  'أزرق': 'Blue',
  'ازرق': 'Blue',
  'سمائي': 'Sky Blue',
  'سماوي': 'Sky Blue',
  'أحمر': 'Red',
  'احمر': 'Red',
  'أحمر برغندي': 'Burgundy',
  'احمر برغندي': 'Burgundy',
  'برغندي': 'Burgundy',
  'عنابي': 'Burgundy',
  'ماروني': 'Maroon',
  'بني': 'Brown',
  'قهوائي': 'Dark Brown',
  'بني غامق': 'Dark Brown',
  'حني': 'Tan',
  'جملي': 'Tan',
  'كاميل': 'Camel',
  'بيجي': 'Beige',
  'بيج': 'Beige',
  'بيج فاتح': 'Light Beige',
  'كريمي': 'Cream',
  'أصفر': 'Yellow',
  'اصفر': 'Yellow',
  'ذهبي': 'Gold',
  'فضي': 'Silver',
  'أخضر': 'Green',
  'اخضر': 'Green',
  'زيتوني': 'Olive',
  'وردي': 'Pink',
  'وردي باهت': 'Dusty Rose',
  'زمردي': 'Emerald',
  'فحمي': 'Charcoal',
  'دينم': 'Denim',
  'رجالي': "Men's",
  'نسائي': "Women's",
  'شبابي': 'Youth',
  'أطفال': 'Kids',
  'اطفال': 'Kids',
  'ولادي': 'Boys',
  'بناتي': 'Girls',
  'جديد': 'New',
  'تخفيض': 'Sale',
  'عرض': 'Offer',
  'خصم': 'Discount',
  'زارا': 'Zara',
  'نايك': 'Nike',
  'اديداس': 'Adidas',
  'أديداس': 'Adidas',
  'بوما': 'Puma',
  'لاكوست': 'Lacoste',
  'تومي': 'Tommy',
  'غوتشي': 'Gucci',
  'شانيل': 'Chanel',
  'ديور': 'Dior',
  'برادا': 'Prada',
  'لويس': 'Louis',
  'فيتون': 'Vuitton',
  'ارماني': 'Armani',
  'كالفن': 'Calvin',
  'كلاين': 'Klein',
  'ماركة': 'Brand',
  'براند': 'Brand',
  'اصلي': 'Original',
  'أصلي': 'Original',
  'طبيعي': 'Genuine',
  'بقري': 'Cowhide',
  'موديل': 'Model',
  'لون': 'Color',
  'الوان': 'Colors',
  'ألوان': 'Colors',
  'فاخر': 'Luxury',
  'مميز': 'Special',
  'كلاسيك': 'Classic',
  'كلاسيكي': 'Classic',
  'سبورت': 'Sport',
  'رياضي': 'Sport',
  'طبي': 'Comfort/Orthopedic',
  'مريح': 'Comfortable',
  'ايطالي': 'Italian',
  'إيطالي': 'Italian',
  'تركي': 'Turkish',
  'عراقي': 'Iraqi',
  'صيفي': 'Summer',
  'شتوي': 'Winter',
  'ربيعي': 'Spring',
  'خريفي': 'Autumn',
  'قياس': 'Size',
  'مقاس': 'Size',
};

const PHRASES = {
  'حذاء ماركة زارا': 'Zara Brand Shoes',
  'جلد طبيعي بقري': 'Genuine Cowhide Leather',
  'جلد طبيعي': 'Genuine Leather',
  'جلد صناعي': 'Synthetic Leather',
  'جلد بقري': 'Cowhide Leather',
  'أحمر برغندي': 'Burgundy Red',
  'احمر برغندي': 'Burgundy Red',
  'بني غامق': 'Dark Brown',
  'بيج فاتح': 'Light Beige',
  'وردي باهت': 'Dusty Rose',
  'ستانلس ستيل': 'Stainless Steel',
  'نعل طبي': 'Orthopedic Sole',
  'قطن طبيعي': 'Natural Cotton',
  'صوف خالص': 'Pure Wool',
  'حرير طبيعي': 'Natural Silk',
  'كتان طبيعي': 'Natural Linen',
  'صناعة تركية': 'Turkish Made',
  'صناعة ايطالية': 'Italian Made',
  'درجة اولى': 'First Grade',
  'هاي كواليتي': 'High Quality',
  'موديل حديث': 'Modern Model',
  'موديل جديد': 'New Model',
  'ماركة أصلية': 'Original Brand',
  'ماركة اصلية': 'Original Brand',
  'نفد من المخزون': 'Sold Out',
  'غير متوفر': 'Out of Stock',
  'متوفر بالمخزن': 'In Stock',
  'متوفر في المخزن': 'In Stock',
  'مقاس موحد': 'One Size',
  'قياس موحد': 'One Size',
  'مقاس واحد': 'One Size',
  'قياس واحد': 'One Size',
};

export function translateTextSync(arabicText) {
  if (!arabicText || typeof arabicText !== 'string') return '';
  const trimmed = arabicText.trim();
  if (!trimmed) return '';

  if (/^[a-zA-Z0-9\s.,\-'":;!()/+%]+$/.test(trimmed)) {
    return trimmed;
  }

  if (LOCAL_CACHE.has(trimmed)) {
    return LOCAL_CACHE.get(trimmed);
  }

  if (DICTIONARY[trimmed]) {
    return DICTIONARY[trimmed];
  }

  let out = trimmed;
  const sortedPhrases = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
  for (const ph of sortedPhrases) {
    if (out.includes(ph)) {
      out = out.split(ph).join(PHRASES[ph]);
    }
  }

  const words = out.split(/(\s+|[،,.-])/);
  const translated = words.map((word) => {
    const cleanWord = word.replace(/[،,.-]/g, '').trim();
    if (!cleanWord) return word;
    if (DICTIONARY[cleanWord]) return DICTIONARY[cleanWord];
    if (cleanWord.startsWith('ال') && cleanWord.length > 3 && DICTIONARY[cleanWord.slice(2)]) {
      return DICTIONARY[cleanWord.slice(2)];
    }
    return word;
  });

  let result = translated.join('');
  result = result.replace(/\s+/g, ' ').trim();

  if (result) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
    LOCAL_CACHE.set(trimmed, result);
    return result;
  }

  return trimmed;
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
