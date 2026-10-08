import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

/**
 * The dashboard is a view onto the shop. Where it claims to mirror the
 * storefront — the order products appear in, whether an order arrived — it has
 * to actually mirror it, or the shopkeeper is managing a shop that does not
 * match the one customers see.
 */

test('the dashboard orders products exactly as the shop does', async () => {
  const products = await read('src/data/products.js');
  const dashboard = await read('src/admin/Dashboard.jsx');
  const reorder = await read('src/admin/ProductReorderPanel.jsx');
  const browser = await read('src/components/ProductBrowser.jsx');

  // One comparator, exported once.
  assert.match(products, /export function storefrontOrder\(a, b\)/);
  // It breaks ties the same way for everyone: products that were never
  // reordered all share a rank, so the tie-breakers are what decides.
  assert.match(products, /BADGE_RANK\[a\?\.badge\] \?\? 9/);
  assert.match(products, /ratingOf\(b\) - ratingOf\(a\)/);
  // The dashboard lists raw records and the shop lists normalised ones, so the
  // missing-rating default has to be the same number on both sides.
  assert.match(products, /export const DEFAULT_RATING = 4\.8;/);
  assert.match(products, /rating: raw\.rating != null \? Number\(raw\.rating\) : DEFAULT_RATING/);
  assert.match(products, /String\(a\?\.id\)\.localeCompare/);

  // Every list that shows products uses it, on both sides of the app.
  for (const [name, source] of [['Dashboard', dashboard], ['ProductReorderPanel', reorder], ['ProductBrowser', browser]]) {
    assert.match(source, /storefrontOrder/, `${name} must sort with storefrontOrder`);
    assert.doesNotMatch(source, /sortOrder \?\? 9999/, `${name} still has its own comparator`);
  }
  // No second badge table anywhere to drift out of sync.
  assert.doesNotMatch(browser, /BADGE_ORDER/);
});

test('a manual position is a plain number, never an empty string', async () => {
  const products = await read('src/data/products.js');
  const remote = await read('src/data/remote.js');
  const form = await read('src/admin/ProductForm.jsx');

  // `'' - 9999` is -9999, so an empty string sorted a product above the shop.
  assert.match(products, /export function sortRank\(product\)/);
  assert.match(products, /product\?\.sortOrder !== ''/);
  assert.doesNotMatch(form, /sortOrder: '',/);
  // Writes coerce it, so bad data cannot get back in.
  assert.match(remote, /function coerceNumericFields/);
  assert.match(remote, /else delete out\.sortOrder/);
});

test('reordering writes one field per product, not the whole catalogue', async () => {
  const dashboard = await read('src/admin/Dashboard.jsx');
  const remote = await read('src/data/remote.js');
  // Without `reorderOnly`, moving one product rewrote every record and fired an
  // inventory call per product.
  assert.match(dashboard, /saveProductsBatch\(updated, \{ reorderOnly: true \}\)/);
  assert.doesNotMatch(dashboard, /saveProductsBatch\(updated\)\s*;/);
  assert.match(remote, /batchMap\[`\$\{record\.id\}\/sortOrder`\]/);
});

test('a newly added product is visible, not buried at the end of the shop', async () => {
  const remote = await read('src/data/remote.js');
  // Once the catalogue is in order, 1..N are taken and a product saved without
  // a position sorted below every one of them.
  assert.match(remote, /function positionForNewProduct\(current\)/);
  assert.match(remote, /return Number\.isFinite\(min\) \? min - 1 : 1;/);
  // Only brand-new records; editing must never move a product.
  assert.match(remote, /const isNew = idx < 0;/);
  assert.match(remote, /if \(isNew && !hasPosition\)/);
});

test('every stand-in gallery is flagged, on every path that creates one', async () => {
  const worker = await read('functions/_lib/catalog.js');
  const remote = await read('src/data/remote.js');

  // The editor saves whatever `images` it was handed. A one-image stand-in that
  // is not flagged therefore REPLACES the real four-photo gallery on save.
  // The Worker serves all real traffic, and it substitutes in two places.
  assert.match(worker, /product\.images = \[product\.thumb\];[\s\S]{0,80}?product\.imagesArePlaceholder = true;/);
  assert.match(worker, /product\.images = \[images\[0\]\];[\s\S]{0,300}?product\.imagesArePlaceholder = true;/);
  // The browser's direct-from-Firebase fallback trims the same way.
  assert.match(remote, /product\.images = \[images\[0\]\];[\s\S]{0,80}?product\.imagesArePlaceholder = true;/);
  // And the save path still refuses to write a flagged stand-in over a gallery.
  assert.match(remote, /const placeholderOnly = record\.imagesArePlaceholder && images\.length <= 1/);
});

test('product photos go to object storage, and the bucket is not public', async () => {
  const upload = await read('functions/api/upload.js');
  const serve = await read('functions/img/[[path]].js');
  const client = await read('src/data/upload.js');
  const config = await read('wrangler.toml');

  // Writing is admin-only and bounded; the shop must not become an open host.
  assert.match(upload, /const auth = await requireAdmin\(request, env\);/);
  assert.match(upload, /if \(auth\.error\) return auth\.error;/);
  assert.match(upload, /bytes\.byteLength > MAX_BYTES/);
  assert.match(upload, /EXTENSIONS\.get\(type\)/);

  // Content-addressed keys: no collisions, nothing guessable from a product id.
  assert.match(upload, /crypto\.subtle\.digest\('SHA-256', bytes\)/);
  assert.match(upload, /`products\/\$\{hash\}\.\$\{extension\}`/);

  // Reading is the only way out of a private bucket, and it validates the key.
  assert.match(serve, /const KEY_PATTERN = .+products.+\[0-9a-f\]\{64\}/);
  assert.match(serve, /if \(!KEY_PATTERN\.test\(key\)\) return new Response\('Not found', \{ status: 404 \}\)/);
  // Immutable objects, cached at the edge, so R2 reads stay near zero.
  assert.match(serve, /caches\.default/);
  assert.match(serve, /max-age=31536000, immutable/);

  // Bound in both environments, or a preview deploy silently inlines base64.
  assert.match(config, /\[\[env\.production\.r2_buckets\]\][\s\S]{0,120}?binding = "IMAGES"/);
  assert.match(config, /\[\[env\.preview\.r2_buckets\]\][\s\S]{0,120}?binding = "IMAGES"/);

  // A slow link gets more time rather than being abandoned after one try.
  assert.match(client, /const UPLOAD_ATTEMPT_DEADLINES = \[30_000, 60_000, 120_000\];/);
  assert.match(client, /return await uploadToOwnStorage\(compressed \|\| file, onAttempt\);/);
  // Falling back means inlining megabytes over the connection that was just too
  // slow for a 420KB upload, so it is reserved for storage being absent.
  assert.match(client, /if \(!STORAGE_ABSENT_CODES\.has\(error\?\.code\)\) \{/);
  assert.match(client, /const STORAGE_ABSENT_CODES = new Set/);
  // Re-running the migration must not re-upload what is already a path.
  assert.match(client, /if \(typeof stored !== 'string' \|\| !stored\.startsWith\('data:image\/'\)\) return stored;/);
});

test('a slow connection is given time, not a dead end', async () => {
  const client = await read('src/data/upload.js');
  const form = await read('src/admin/ProductForm.jsx');
  const remote = await read('src/data/remote.js');

  // 25s for a 700KB upload over a weak mobile uplink is not enough time, and
  // abandoning the attempt fell back to inlining the image in the database —
  // the slow path storage replaced. Each retry now gets more room.
  assert.match(client, /const UPLOAD_ATTEMPT_DEADLINES = \[30_000, 60_000, 120_000\];/);
  assert.match(client, /for \(let i = 0; i < UPLOAD_ATTEMPT_DEADLINES\.length; i \+= 1\)/);
  // Fewer bytes leave the phone in the first place.
  assert.match(client, /const CDN_IMAGE_LIMIT = 420 \* 1024;/);
  // Things a retry cannot fix must still fail fast.
  assert.match(client, /if \(error\?\.message === 'يجب تسجيل الدخول كمدير\.'\) throw error;/);
  assert.match(client, /navigator\.onLine === false\) throw error;/);

  // The admin sees the retry instead of a frozen button.
  assert.match(form, /onAttempt\(attempt, total\)/);
  assert.match(form, /إعادة المحاولة \$\{attempt\} من \$\{total\}/);

  // And a save that times out says what to do next, not just what went wrong.
  assert.match(remote, /اضغط «حفظ المنتج» مرة ثانية/);
  assert.match(remote, /بياناتك ما زالت مكتوبة في الصفحة/);
});

test('the image migration writes the gallery before the record points at it', async () => {
  const remote = await read('src/data/remote.js');
  assert.match(remote, /export async function migrateImagesToObjectStorage/);
  // Every image must upload before anything is rewritten, so an interrupted run
  // leaves a product either fully migrated or exactly as it was.
  // All of a product's photos upload together and must all succeed; a single
  // failure abandons the product before anything has been rewritten.
  assert.match(remote, /await Promise\.all\(stored\.map\(async \(image\) => \{/);
  assert.match(remote, /const path = await relocateStoredImage\(image\);/);
  assert.match(remote, /PRODUCT_IMAGES_PATH\}\/\$\{id\}`\), \{ images: relocated[\s\S]{0,200}?update\(ref\(db, `products\/\$\{id\}`\)/);
  // A failure is recorded per product, never thrown away and never partial.
  assert.match(remote, /report\.failures\.push\(\{ id, name: product\.name/);
});

test('a customer never gets a half-translated page', async () => {
  const confirmed = await read('src/pages/OrderConfirmedPage.jsx');
  const strings = await read('src/i18n/strings.js');

  // English mode falls back to a word-level dictionary for any Arabic left in
  // the DOM, which turns "عرض صورة الفاتورة" into "Offer صورة الفاتورة" and
  // "رسوم التوصيل" into "Fees Delivery". The fix is for the page not to hand
  // it any Arabic in the first place.
  const markup = confirmed.slice(confirmed.indexOf('return ('));
  assert.ok(!/>\s*[؀-ۿ]/.test(markup), 'the confirmation page still hard-codes Arabic');

  for (const key of ['confirmLead', 'confirmOrderNo', 'confirmTotal', 'confirmInvoiceToggle', 'confirmKeepInvoice']) {
    assert.ok(confirmed.includes(`t('${key}')`), `${key} is not used`);
    // Present in both tables, or one language silently falls through.
    assert.ok(strings.split(`${key}:`).length === 3, `${key} is missing a translation`);
  }
});

test('an empty section does not blame the filters a shopper never set', async () => {
  const browser = await read('src/components/ProductBrowser.jsx');
  const strings = await read('src/i18n/strings.js');
  // "Try widening the price range" sends someone who set no filters to a button
  // that cannot change anything.
  assert.match(browser, /\{pool\.length === 0 \? \(/);
  assert.match(browser, /t\('sectionEmpty'\)/);
  assert.ok(strings.split('sectionEmpty:').length === 3);
});

test('the dashboard speaks to a shopkeeper, and keeps bulk tools out of reach', async () => {
  const dashboard = await read('src/admin/Dashboard.jsx');
  const css = await read('src/styles/admin.css');

  // Nothing in the settings a shopkeeper reads should name the plumbing.
  const settings = dashboard.slice(dashboard.indexOf('admin-panel--narrow'));
  for (const jargon of ['base64', 'قاعدة البيانات', 'VITE_', 'Cloudinary', 'JSON / CSV', 'imageFile2', 'Pages']) {
    assert.ok(!settings.includes(jargon), `settings still mention "${jargon}"`);
  }

  // Bulk import and the legacy repair rewrite many products at once, so they
  // sit behind a collapsed section rather than beside "change the logo".
  assert.match(dashboard, /const \[showAdvanced, setShowAdvanced\] = useState\(false\);/);
  assert.match(dashboard, /admin-danger-zone__toggle/);
  assert.match(dashboard, /\{showAdvanced && \(/);
  assert.match(css, /\.admin-danger-zone \{/);

  // A deletion prompt names what is being deleted and that it is permanent.
  assert.match(dashboard, /حذف «\$\{p\.name\}» نهائياً من المتجر؟/);
  assert.match(dashboard, /لا يمكن التراجع عن هذا/);
});

test('the dashboard is never served a trimmed gallery, and refuses lossy writes', async () => {
  const lib = await read('functions/_lib/catalog.js');
  const route = await read('functions/api/catalog.js');
  const remote = await read('src/data/remote.js');

  // Trimming is a shop-payload optimisation. Applying it to the dashboard hands
  // the migration one image out of four, and the migration writes back what it
  // was given — so the other three would be deleted.
  assert.doesNotMatch(lib, /^\s*trimInlineGalleries\(products\);/m);
  assert.match(route, /trimInlineGalleries/);
  assert.match(route, /product\.status !== 'draft'\);[\s\S]{0,160}?trimInlineGalleries\(bundle\.products\)/);
  assert.match(remote, /includeDrafts \? \[\] : visible/);

  // Belt and braces: the writer itself refuses a record whose stand-in covers
  // more photos than it carries, rather than trusting every caller.
  assert.match(remote, /const standsInForMore = Number\(record\.imageCount\) > images\.length;/);
  assert.match(remote, /if \(standsInForMore && !record\.thumb\) return \{ lean: null, images: null \};/);
  assert.match(remote, /if \(!lean\) \{/);
  assert.match(remote, /if \(!lean\) skipped\.push\(record\);/);
});

test('the migration counter counts only products that still need migrating', async () => {
  const dashboard = await read('src/admin/Dashboard.jsx');
  // A migrated product is shown as `images: [thumb]`, and the thumb is itself a
  // data URL, so an `images`-only check counted it as unmigrated forever.
  assert.match(dashboard, /function needsImageMigration\(product\)/);
  assert.match(dashboard, /if \(!product \|\| product\.imagesArePlaceholder\) return false;/);
  assert.match(dashboard, /products\.filter\(needsImageMigration\)/);
  // Neither the badge nor the migration itself may use the old test.
  assert.doesNotMatch(dashboard, /Array\.isArray\(p\.images\) && p\.images\.some/);
});

test('an unreachable orders service is reported, not shown as zero orders', async () => {
  const remote = await read('src/data/remote.js');
  const panel = await read('src/admin/OrdersPanel.jsx');

  // The failure has to leave the data layer at all.
  assert.match(remote, /export function subscribeOrdersError\(cb\)/);
  assert.match(remote, /function setOrdersError\(error\)/);
  assert.match(remote, /\.catch\(\(error\) => \{\s*\n\s*ordersFailureStreak \+= 1;/);
  // And a success has to clear it, or the warning becomes permanent.
  assert.match(remote, /ordersFailureStreak = 0;\s*\n\s*setOrdersError\(null\);/);

  // The panel subscribes and separates "none yet" from "could not read".
  assert.match(panel, /subscribeOrdersError\(setFeedError\)/);
  assert.match(panel, /feedError \? \(/);
  assert.match(panel, /لم يصل أي طلب بعد/);
  assert.match(panel, /retryOrdersNow/);
});

test('polling backs off instead of hammering a service that is down', async () => {
  const remote = await read('src/data/remote.js');
  // 8s polling against a dead endpoint is 450 failed requests an hour.
  assert.match(remote, /if \(ordersFailureStreak && Date\.now\(\) < ordersNextAttemptAt\) return;/);
  assert.match(remote, /Math\.min\(300_000, ORDERS_REFRESH_MS \* 2 \*\* ordersFailureStreak\)/);
  // The admin can always override the backoff by asking.
  assert.match(remote, /export function retryOrdersNow\(\)/);
  assert.match(remote, /ordersNextAttemptAt = 0;/);
});

test('orders keep arriving while the dashboard sits in a background tab', async () => {
  const remote = await read('src/data/remote.js');
  // Polling stopped dead while hidden, so a new order raised no alert and no
  // sound until someone clicked the tab.
  assert.match(remote, /const ORDERS_BACKGROUND_REFRESH_MS = 30_000;/);
  assert.match(remote, /if \(hidden\) \{/);
  // The early return that used to skip every hidden tick must be gone.
  assert.doesNotMatch(
    remote,
    /function refreshOrdersWhenActive\(\)\s*\{\s*\n\s*if \(typeof document !== 'undefined' && document\.visibilityState !== 'visible'\) return;/
  );
});

test('saving a product never blocks on the optional stock mirror', async () => {
  const remote = await read('src/data/remote.js');
  // Awaiting it added up to 15s to every save, for a call the deployment may
  // not even serve; and a missing mirror was reported as a failed save.
  assert.match(remote, /syncInventory\(record\)\.catch\(\(\) => \{\}\)/);
  assert.match(remote, /const INVENTORY_ABSENT_CODES = new Set\(\[/);
  assert.match(remote, /if \(!INVENTORY_ABSENT_CODES\.has\(err\?\.code\)\)/);
});

test('a product save survives an untouched optional field', async () => {
  const remote = await read('src/data/remote.js');
  // The Realtime Database rejects the whole write for one `undefined` value,
  // and the admin form builds its record by spreading state.
  assert.match(remote, /function stripUndefined\(value\)/);
  assert.match(remote, /function prepareForFirebase\(record\)/);
  assert.match(remote, /const lean = prepareForFirebase\(record\)/);
});

test('section slugs are matched case-insensitively', async () => {
  const products = await read('src/data/products.js');
  const remote = await read('src/data/remote.js');
  // Ten products sat under `Trainers` and ten under `trainers`: one section
  // split in two, listed twice in the filter, half its products unreachable.
  assert.match(products, /export function slug\(value\)/);
  assert.match(products, /gender: slug\(raw\.gender\)/);
  assert.match(products, /sub: slug\(raw\.sub\)/);
  // Saving heals the stored casing too.
  assert.match(remote, /for \(const key of \['gender', 'category', 'sub'\]\)/);
});
