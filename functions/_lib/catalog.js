const DEFAULT_FIREBASE_URL = 'https://store-29692-default-rtdb.firebaseio.com';

function firebaseUrl(env, path) {
  const base = String(env.FIREBASE_DATABASE_URL || DEFAULT_FIREBASE_URL).replace(/\/$/, '');
  return `${base}/${path}.json`;
}

async function firebaseJson(env, path) {
  const response = await fetch(firebaseUrl(env, path), {
    headers: { accept: 'application/json' },
    cf: { cacheTtl: 30, cacheEverything: true },
  });
  if (!response.ok) throw new Error(`CATALOG_${response.status}`);
  return response.json();
}

export async function loadCatalog(env) {
  const [rawProducts, settings, catalog] = await Promise.all([
    firebaseJson(env, 'products'),
    firebaseJson(env, 'settings'),
    firebaseJson(env, 'catalog'),
  ]);

  const products = rawProducts && typeof rawProducts === 'object' ? Object.values(rawProducts) : [];
  if (env.DB && products.length) {
    const placeholders = products.map(() => '?').join(',');
    const ids = products.map((p) => String(p.id));
    const result = await env.DB.prepare(
      `SELECT product_id, stock FROM inventory WHERE product_id IN (${placeholders})`
    ).bind(...ids).all();
    const inventory = new Map((result.results || []).map((row) => [String(row.product_id), Number(row.stock)]));
    for (const product of products) {
      if (inventory.has(String(product.id))) product.stockQuantity = inventory.get(String(product.id));
    }
  }

  return { products, settings: settings || {}, catalog: catalog || null };
}

export function deliveryFees(settings) {
  const defaults = {
    'بغداد': 3000,
    'البصرة': 5000,
    'نينوى': 5000,
    'أربيل': 5000,
    'النجف': 5000,
    'كربلاء': 5000,
    'كركوك': 5000,
    'الأنبار': 5000,
    'ذي قار': 5000,
    'بابل': 5000,
    'ديالى': 5000,
    'واسط': 5000,
    'صلاح الدين': 5000,
    'المثنى': 5000,
    'القادسية': 5000,
    'ميسان': 5000,
    'دهوك': 5000,
    'السليمانية': 5000,
  };
  const configured = settings?.deliveryFees || {};
  const safe = { ...defaults };
  for (const governorate of Object.keys(defaults)) {
    const fee = Number(configured[governorate]);
    if (Number.isInteger(fee) && fee >= 0 && fee <= 100000) safe[governorate] = fee;
  }
  return safe;
}
