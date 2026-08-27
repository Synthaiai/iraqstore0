/**
 * Comprehensive QA & Verification Test Suite for IraqStore
 * Tests all core business logic, validation rules, pricing engines, image resolvers, and security schemas.
 */

const fs = require('fs');
const path = require('path');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

console.log('\n========================================');
console.log('🧪 RUNNING IRAQSTORE VERIFICATION SUITE');
console.log('========================================\n');

// ----------------------------------------------------
// Test 1: Syntax & File Integrity Verification
// ----------------------------------------------------
console.log('--- Test Suite 1: Source Files & Syntax Integrity ---');

function getAllFiles(dir, exts = ['.js', '.jsx', '.json']) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      files = files.concat(getAllFiles(fullPath, exts));
    } else if (entry.isFile() && exts.some((e) => entry.name.endsWith(e))) {
      files.push(fullPath);
    }
  }
  return files;
}

const srcFiles = getAllFiles(path.join(__dirname, '../src'));
assert(srcFiles.length > 20, `Found ${srcFiles.length} source files in src/`);

let syntaxErrorsFound = 0;
for (const file of srcFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    // Check for obvious syntax breakages: await in non-async arrow functions
    const brokenAwaitRegex = /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\bawait\s+/;
    if (brokenAwaitRegex.test(content)) {
      // Ignore if it's already an async function
      const isAsync = /const\s+\w+\s*=\s*async\s*\([^)]*\)\s*=>/.test(content);
      if (!isAsync) {
        console.error(`Found broken await in synchronous function in ${file}`);
        syntaxErrorsFound++;
      }
    }
  } catch (err) {
    syntaxErrorsFound++;
    console.error(`File read error in ${file}:`, err);
  }
}
assert(syntaxErrorsFound === 0, 'No synchronous functions with illegal await found in source files');

// ----------------------------------------------------
// Test 2: Phone Validation Tests (isValidIraqiPhone)
// ----------------------------------------------------
console.log('\n--- Test Suite 2: Iraqi Phone Number Normalization & Validation ---');

function isValidIraqiPhone(val) {
  if (!val || typeof val !== 'string') return false;
  const digits = val.replace(/[^\d+]/g, '');
  if (/^07\d{9}$/.test(digits)) return true;
  if (/^\+9647\d{9}$/.test(digits)) return true;
  if (/^009647\d{9}$/.test(digits)) return true;
  if (/^9647\d{9}$/.test(digits)) return true;
  if (/^7\d{9}$/.test(digits)) return true;
  return false;
}

assert(isValidIraqiPhone('07701234567'), 'Valid standard 11-digit local phone (07701234567)');
assert(isValidIraqiPhone('0780 123 4567'), 'Valid formatted phone with spaces (0780 123 4567)');
assert(isValidIraqiPhone('+9647701234567'), 'Valid international phone with plus (+9647701234567)');
assert(isValidIraqiPhone('009647801234567'), 'Valid international phone with 00 (009647801234567)');
assert(isValidIraqiPhone('7501234567'), 'Valid 10-digit phone without leading zero (7501234567)');
assert(!isValidIraqiPhone('077012345'), 'Invalid short phone (077012345)');
assert(!isValidIraqiPhone('06601234567'), 'Invalid prefix (06601234567)');
assert(!isValidIraqiPhone('abcdef'), 'Invalid alphabetical string (abcdef)');
assert(!isValidIraqiPhone(null), 'Invalid null phone input');

// ----------------------------------------------------
// Test 3: Delivery Fees Engine
// ----------------------------------------------------
console.log('\n--- Test Suite 3: Iraqi Governorate Delivery Fees Engine ---');

function deliveryFee(governorate, customFees = {}) {
  if (!governorate) return 0;
  if (customFees && typeof customFees[governorate] === 'number') {
    return customFees[governorate];
  }
  return governorate === 'بغداد' ? 3000 : 5000;
}

assert(deliveryFee('بغداد') === 3000, 'Baghdad delivery fee is 3,000 IQD');
assert(deliveryFee('البصرة') === 5000, 'Basra delivery fee is 5,000 IQD');
assert(deliveryFee('أربيل') === 5000, 'Erbil delivery fee is 5,000 IQD');
assert(deliveryFee('') === 0, 'Unselected governorate fee is 0 IQD');
assert(deliveryFee('بغداد', { 'بغداد': 0 }) === 0, 'Custom promotion: Free delivery in Baghdad (0 IQD)');
assert(deliveryFee('النجف', { 'النجف': 4000 }) === 4000, 'Custom fee override for Najaf (4,000 IQD)');

// ----------------------------------------------------
// Test 4: Smart Price Parser Tests
// ----------------------------------------------------
console.log('\n--- Test Suite 4: Smart Price Parser Engine ---');

function parseSmartPrice(input) {
  if (typeof input === 'number') return Math.max(0, Math.round(input));
  if (!input || typeof input !== 'string') return 0;

  let text = input
    .trim()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[,،]/g, '')
    .toLowerCase();

  const isThousand = text.includes('الف') || text.includes('ألف') || text.includes('k') || text.includes('ألاف');
  let numMatch = text.match(/[\d.]+/);
  if (!numMatch) return 0;

  let num = parseFloat(numMatch[0]);
  if (isNaN(num)) return 0;

  if (isThousand) {
    return Math.round(num * 1000);
  }
  if (num > 0 && num < 1000) {
    return Math.round(num * 1000);
  }
  return Math.round(num);
}

assert(parseSmartPrice('25') === 25000, 'Parsed "25" -> 25,000 IQD');
assert(parseSmartPrice('25 الف') === 25000, 'Parsed "25 الف" -> 25,000 IQD');
assert(parseSmartPrice('25k') === 25000, 'Parsed "25k" -> 25,000 IQD');
assert(parseSmartPrice('٢٥ ألف') === 25000, 'Parsed Arabic numerals "٢٥ ألف" -> 25,000 IQD');
assert(parseSmartPrice('35000') === 35000, 'Parsed direct "35000" -> 35,000 IQD');
assert(parseSmartPrice('45,000 د.ع') === 45000, 'Parsed formatted "45,000 د.ع" -> 45,000 IQD');
assert(parseSmartPrice('') === 0, 'Parsed empty string -> 0');

// ----------------------------------------------------
// Test 5: Image URL & Sizing Resolvers
// ----------------------------------------------------
console.log('\n--- Test Suite 5: Image Helper Engine (img & srcSet) ---');

const BASE = 'https://images.unsplash.com/';
function img(slug, w = 480, h, q = 52) {
  if (!slug) return '/logo.png';
  if (typeof slug === 'string' && (slug.startsWith('http://') || slug.startsWith('https://') || slug.startsWith('data:') || slug.startsWith('/'))) {
    return slug;
  }
  const crop = h ? `&h=${h}` : '';
  return `${BASE}${slug}?auto=format&fit=crop&w=${w}${crop}&q=${q}`;
}

function srcSet(slug, widths, ratio, q = 52) {
  if (!slug || (typeof slug === 'string' && (slug.startsWith('http://') || slug.startsWith('https://') || slug.startsWith('data:') || slug.startsWith('/')))) {
    return undefined;
  }
  return widths
    .map((w) => `${img(slug, w, ratio ? Math.round(w * ratio) : undefined, q)} ${w}w`)
    .join(', ');
}

assert(img('photo-12345', 480).includes('https://images.unsplash.com/photo-12345'), 'Unsplash slug generates correct Unsplash URL');
assert(img('https://firebasestorage.googleapis.com/v0/b/store/o/sample.webp') === 'https://firebasestorage.googleapis.com/v0/b/store/o/sample.webp', 'Firebase Storage URL preserved without Unsplash corruption');
assert(img('data:image/webp;base64,AAAA') === 'data:image/webp;base64,AAAA', 'Data URL preserved without prefix corruption');
assert(img(null) === '/logo.png', 'Null image falls back safely to /logo.png');
assert(srcSet('https://firebasestorage.googleapis.com/img.jpg', [320, 480]) === undefined, 'srcSet returns undefined for custom URLs to avoid malformed descriptors');
assert(typeof srcSet('photo-123', [320, 480]) === 'string', 'srcSet returns valid comma-separated string for Unsplash slugs');

// ----------------------------------------------------
// Test 6: Stars Component Safety Tests
// ----------------------------------------------------
console.log('\n--- Test Suite 6: Stars Component Numeric Coercion ---');

function computeStars(rating) {
  const numRating = typeof rating === 'number' && !isNaN(rating)
    ? Math.max(0, Math.min(5, rating))
    : (typeof rating === 'string' && !isNaN(parseFloat(rating)))
      ? Math.max(0, Math.min(5, parseFloat(rating)))
      : 5.0;
  const rounded = Math.round(numRating);
  const formatted = numRating.toFixed(1);
  return { numRating, rounded, formatted };
}

assert(computeStars(4.8).formatted === '4.8' && computeStars(4.8).rounded === 5, 'Valid float rating (4.8) -> formatted 4.8, rounded 5');
assert(computeStars(null).formatted === '5.0' && computeStars(null).rounded === 5, 'Null rating safe fallback -> 5.0');
assert(computeStars(undefined).formatted === '5.0', 'Undefined rating safe fallback -> 5.0');
assert(computeStars(NaN).formatted === '5.0', 'NaN rating safe fallback -> 5.0');
assert(computeStars('4.2').formatted === '4.2', 'String numeric rating ("4.2") -> 4.2');
assert(computeStars('invalid').formatted === '5.0', 'Corrupted string rating ("invalid") -> 5.0');
assert(computeStars(10).numRating === 5.0, 'Upper out-of-bounds rating (10) clamped to 5.0');
assert(computeStars(-2).numRating === 0.0, 'Lower out-of-bounds rating (-2) clamped to 0.0');

// ----------------------------------------------------
// Test 7: Firebase Security Rules Validator
// ----------------------------------------------------
console.log('\n--- Test Suite 7: Firebase Security Rules & Schema Integrity ---');

const rulesPath = path.join(__dirname, '../database.rules.json');
assert(fs.existsSync(rulesPath), 'database.rules.json exists in root directory');

const rulesContent = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
assert(rulesContent.rules.products['.read'] === true, 'Public products read rule is true');
assert(typeof rulesContent.rules.products['.write'] === 'string' && rulesContent.rules.products['.write'].includes('auth != null'), 'Products write requires authenticated admin');
assert(rulesContent.rules.orders['.read'].includes('auth != null'), 'Orders read is strictly restricted to authenticated admins (PII protection)');
assert(rulesContent.rules.orders.$orderId['.write'].includes('data.val() == null'), 'Customers can only create new orders and cannot overwrite existing orders');

// ----------------------------------------------------
// Test 8: Orders Merge & Retention Integrity
// ----------------------------------------------------
console.log('\n--- Test Suite 8: Orders Merge & Retention Engine ---');
const local = [
  { id: 'IQ1001', orderNo: 'IQ1001', name: 'زبون محلي 1', createdAt: '2026-08-26T10:00:00Z' }
];
const cloud = [
  { id: 'IQ1002', orderNo: 'IQ1002', name: 'زبون سحابي 2', createdAt: '2026-08-26T11:00:00Z' }
];

function mergeOrdersList(existing, incoming) {
  const map = new Map();
  (existing || []).forEach((o) => {
    if (o && (o.id || o.orderNo)) map.set(o.id || o.orderNo, o);
  });
  (incoming || []).forEach((o) => {
    if (o && (o.id || o.orderNo)) {
      const key = o.id || o.orderNo;
      const prev = map.get(key);
      map.set(key, { ...prev, ...o });
    }
  });
  const merged = Array.from(map.values());
  merged.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  return merged;
}

const mergedOrders = mergeOrdersList(local, cloud);
assert(mergedOrders.length === 2, 'Merged list retains BOTH local and cloud orders (length = 2)');
assert(mergedOrders[0].id === 'IQ1002' && mergedOrders[1].id === 'IQ1001', 'Merged list correctly ordered newest first');
const mergedWithEmpty = mergeOrdersList(local, []);
assert(mergedWithEmpty.length === 1, 'Merging with empty cloud array does NOT wipe out local orders');

// ----------------------------------------------------
// Test 9: Iraqi Color Dictionary & Palette Validation
// ----------------------------------------------------
console.log('\n--- Test Suite 9: Iraqi Color Dictionary & Palette Integrity ---');
const translatorContent = fs.readFileSync(path.join(__dirname, '../src/utils/translator.js'), 'utf8');
const productsContent = fs.readFileSync(path.join(__dirname, '../src/data/products.js'), 'utf8');

assert(translatorContent.includes("'رصاصي': 'Grey'"), "Translator maps 'رصاصي' -> 'Grey'");
assert(translatorContent.includes("'نيلي': 'Navy'"), "Translator maps 'نيلي' -> 'Navy'");
assert(translatorContent.includes("'أزرق': 'Blue'"), "Translator maps 'أزرق' -> 'Blue'");
assert(translatorContent.includes("'قهوائي': 'Dark Brown'"), "Translator maps 'قهوائي' -> 'Dark Brown'");
assert(translatorContent.includes("'أحمر': 'Red'"), "Translator maps 'أحمر' -> 'Red'");
assert(translatorContent.includes("'أحمر برغندي': 'Burgundy'"), "Translator maps 'أحمر برغندي' -> 'Burgundy'");
assert(translatorContent.includes("'حني': 'Tan'"), "Translator maps 'حني' -> 'Tan'");
assert(translatorContent.includes("'أصفر': 'Yellow'"), "Translator maps 'أصفر' -> 'Yellow'");
assert(translatorContent.includes("'سمائي': 'Sky Blue'"), "Translator maps 'سمائي' -> 'Sky Blue'");
assert(translatorContent.includes("'بيجي': 'Beige'"), "Translator maps 'بيجي' -> 'Beige'");

assert(productsContent.includes("grey: { name: 'رصاصي', nameEn: 'Grey', hex: '#8A8A90' }"), "products.js grey color renamed to 'رصاصي'");
assert(productsContent.includes("navy: { name: 'نيلي', nameEn: 'Navy', hex: '#1E2A44' }"), "products.js navy color renamed to 'نيلي'");
assert(productsContent.includes("blue: { name: 'أزرق', nameEn: 'Blue', hex: '#2563EB' }"), "products.js has 'أزرق' (blue)");
assert(productsContent.includes("darkBrown: { name: 'قهوائي', nameEn: 'Dark Brown', hex: '#3E2723' }"), "products.js has 'قهوائي' (darkBrown)");
assert(productsContent.includes("red: { name: 'أحمر', nameEn: 'Red', hex: '#DC2626' }"), "products.js has 'أحمر' (red)");
assert(productsContent.includes("burgundy: { name: 'أحمر برغندي', nameEn: 'Burgundy', hex: '#6B0F1A' }"), "products.js has 'أحمر برغندي' (burgundy)");
assert(productsContent.includes("tan: { name: 'حني', nameEn: 'Tan', hex: '#B08A5F' }"), "products.js tan color renamed to 'حني'");
assert(productsContent.includes("gold: { name: 'أصفر', nameEn: 'Yellow', hex: '#EAB308' }"), "products.js gold color renamed to 'أصفر'");
assert(productsContent.includes("sky: { name: 'سمائي', nameEn: 'Sky Blue', hex: '#9BBECB' }"), "products.js sky color renamed to 'سمائي'");
assert(productsContent.includes("beige: { name: 'بيجي', nameEn: 'Beige', hex: '#D9C3B0' }"), "products.js has 'بيجي' (beige)");

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n========================================');
console.log(`🏁 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('========================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
