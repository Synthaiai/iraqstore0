import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { GENDERS, updateCatalogStore } from '../data/catalog';
import { formatPrice, storefrontOrder } from '../data/products';
import { parseSmartPrice } from '../utils/smartPrice';
import {
  deleteProduct,
  getConnectionStatus,
  listenCatalog,
  listenOrders,
  listenSettings,
  listenProducts,
  saveProduct,
  migrateImagesToObjectStorage,
  saveProductsBatch,
  repriceUsdProducts,
  saveSetting,
  subscribeConnectionStatus,
  subscribeImageSyncFailures,
  subscribeRealtimeStatus,
  warmUpRealtimeDatabase,
} from '../data/remote';
import { objectStorageAvailable, prepareImageForUpload, uploadImage } from '../data/upload';
import { DEFAULT_USD_RATE, usdRate } from '../data/currency';
import { nudgeImageQueue, subscribeUploadStatus, watchImageQueue } from '../data/imageQueueRunner';
import AnalyticsPanel from './AnalyticsPanel';
import Diagnostics from './Diagnostics';
import CategoryTree from './CategoryTree';
import DeliveryFeesPanel from './DeliveryFeesPanel';
import OrdersPanel from './OrdersPanel';
import ProductForm from './ProductForm';
import ProductReorderPanel from './ProductReorderPanel';

function ConnectionStatusBadge() {
  const [status, setStatus] = useState(() => getConnectionStatus());

  useEffect(() => {
    return subscribeConnectionStatus(setStatus);
  }, []);

  const isOnline = status === 'online';
  const isChecking = status === 'checking';
  const isDegraded = status === 'degraded';
  const label = isOnline
    ? 'متصل بالخادم الآمن'
    : isChecking
      ? 'جارٍ فحص الاتصال…'
      : isDegraded
        ? 'تصفح احتياطي — الطلبات تحتاج الخادم'
        : 'غير متصل — البيانات المعروضة مخزنة مؤقتًا';

  return (
    <div className={`admin-conn-status ${isOnline ? 'is-online' : isDegraded ? 'is-degraded' : 'is-offline'}`}>
      <span className="admin-conn-dot" />
      <span>{label}</span>
    </div>
  );
}

/**
 * Products that reached the shop without a picture.
 *
 * A photo can be missing for more reasons than are worth enumerating, and
 * every one of them has so far been invisible: the product looks saved, and
 * nobody notices the blank frame until a customer does. Naming them at the top
 * of the list turns an invisible failure into a two-click fix.
 */
function MissingPhotoNotice({ products, onFix }) {
  const missing = useMemo(
    () => products.filter((p) => !p.thumb && !(Array.isArray(p.images) && p.images.some(Boolean))),
    [products]
  );
  if (!missing.length) return null;
  return (
    <div className="admin-note admin-note--warn admin-missing-photos" role="status">
      <span>
        🖼️ <b>{missing.length}</b> منتج بدون صورة — الزبون يشوفها فارغة.
        {' '}اضغط «أضف صورة» واختر صورة المنتج.
      </span>
      <div className="admin-missing-photos__list">
        {missing.slice(0, 6).map((p) => (
          <button key={p.id} type="button" className="admin-btn admin-btn--sm" onClick={() => onFix(p)}>
            أضف صورة: {p.name || p.id}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductsPanel({ products, settings }) {
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [stockFilter, setStockFilter] = useState(''); // '' | 'low' | 'draft' | 'active'
  const [editing, setEditing] = useState(null); // product | 'new' | null
  const [limit, setLimit] = useState(40);
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = products.filter((p) => {
      const matchQ = !s || `${p.name} ${p.nameEn || ''}`.toLowerCase().includes(s);
      const matchGender = !gender || p.gender === gender;
      
      let matchStock = true;
      if (stockFilter === 'out') {
        matchStock = p.stockQuantity !== undefined && Number(p.stockQuantity) <= 0;
      } else if (stockFilter === 'low') {
        matchStock = p.stockQuantity !== undefined && Number(p.stockQuantity) > 0 && Number(p.stockQuantity) <= 3;
      } else if (stockFilter === 'draft') {
        matchStock = p.status === 'draft';
      } else if (stockFilter === 'active') {
        matchStock = p.status !== 'draft';
      }

      return matchQ && matchGender && matchStock;
    });
    return list.sort(storefrontOrder);
  }, [products, q, gender, stockFilter]);

  const save = async (record, options = {}) => {
    await saveProduct(record, { queueImages: options.queueImages || [] });
    setEditing(options.keepOpen ? 'new' : null);
  };

  const del = async (p) => {
    // Name the product and say the deletion is permanent: "are you sure?" on
    // its own is a reflex click.
    if (window.confirm(`حذف «${p.name}» نهائياً من المتجر؟

لا يمكن التراجع عن هذا.`)) {
      await deleteProduct(p.id);
    }
  };

  const toggleProductStatus = async (p) => {
    const nextStatus = p.status === 'draft' ? 'active' : 'draft';
    await saveProduct({ ...p, status: nextStatus });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (window.confirm(`حذف ${selectedIds.length} منتج نهائياً من المتجر؟

لا يمكن التراجع عن هذا. احفظ نسخة احتياطية أولاً إذا لم تكن متأكداً.`)) {
      for (const id of selectedIds) {
        await deleteProduct(id);
      }
      setSelectedIds([]);
    }
  };

  /**
   * Renumbering the shop is a change to one field on each product.
   *
   * Without `reorderOnly` this rewrote every full product record and then fired
   * an inventory call per product, so moving one item to the top cost hundreds
   * of writes and could take minutes. `reorderOnly` writes `products/<id>/sortOrder`
   * and nothing else.
   */
  const persistOrder = async (ordered) => {
    const updated = ordered.map((p, i) => ({ ...p, sortOrder: i + 1 }));
    await saveProductsBatch(updated, { reorderOnly: true });
  };

  /**
   * Swap one product with its neighbour.
   *
   * The whole shop is renumbered from the full catalogue rather than swapping
   * two numbers: products without a `sortOrder`, and duplicates left behind by
   * earlier swaps, meant the old arithmetic could place an item in a slot that
   * another product already held, and nothing moved.
   */
  const moveProduct = async (product, direction) => {
    const idx = filtered.findIndex((p) => p.id === product.id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;

    const neighbour = filtered[targetIdx];
    const ordered = [...products].sort(storefrontOrder);
    const from = ordered.findIndex((p) => p.id === product.id);
    const to = ordered.findIndex((p) => p.id === neighbour.id);
    if (from < 0 || to < 0) return;
    ordered.splice(to, 0, ordered.splice(from, 1)[0]);
    await persistOrder(ordered);
  };

  const moveToTop = async (product) => {
    const sorted = [...products].sort(storefrontOrder);
    const without = sorted.filter((p) => p.id !== product.id);
    await persistOrder([product, ...without]);
  };

  const moveToBottom = async (product) => {
    const sorted = [...products].sort(storefrontOrder);
    const without = sorted.filter((p) => p.id !== product.id);
    await persistOrder([...without, product]);
  };

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="ابحث باسم المنتج بالعربية أو الإنجليزية…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">كل الأقسام الرئيسية</option>
          <option value="men">رجالي</option>
          <option value="women">نسائي</option>
        </select>
        <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)}>
          <option value="">جميع المنتجات</option>
          <option value="active">النشطة بالمعرض 🟢</option>
          <option value="out">نفد من المخزون (0) 🔴</option>
          <option value="low">مخزون منخفض (1-3) ⚠️</option>
          <option value="draft">المسودات (مخفية) 🟡</option>
        </select>

        <span className="admin-count">{filtered.length} منتج</span>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')}>
          + إضافة منتج جديد
        </button>
      </div>

      {/* Bulk actions header bar */}
      <MissingPhotoNotice products={products} onFix={setEditing} />

      {selectedIds.length > 0 && (
        <div className="admin-bulk-bar">
          <span>تم تحديد <b>{selectedIds.length}</b> منتج</span>
          <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={handleBulkDelete}>
            حذف المحدد 🗑️
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <p>لا توجد منتجات مطابقة في الكتالوج.</p>
          <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')}>
            + إضافة أول منتج الآن
          </button>
        </div>
      ) : (
        <div className="admin-table">
          <div className="admin-table-head-row">
            <input
              type="checkbox"
              onChange={handleSelectAll}
              checked={selectedIds.length > 0 && selectedIds.length === filtered.length}
            />
            <span>الترتيب</span>
            <span>المنتج والمعلومات</span>
            <span>الأقسام والشارات</span>
            <span>المخزون والحالة</span>
            <span>السعر</span>
            <span>إجراءات</span>
          </div>

          {filtered.slice(0, limit).map((p, idx) => {
            const isDraft = p.status === 'draft';
            const curStock = p.stockQuantity !== undefined ? Number(p.stockQuantity) : 15;
            const isOut = curStock <= 0;
            const isLow = curStock > 0 && curStock <= 3;
            return (
              <div className={`admin-row ${isDraft ? 'admin-row--draft' : ''}`} key={p.id}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(p.id)}
                  onChange={() => toggleSelect(p.id)}
                />

                {/* Product Reorder Controls */}
                <div className="admin-reorder-box">
                  <button
                    className="admin-icon-btn"
                    onClick={() => moveToTop(p)}
                    disabled={idx === 0}
                    title="اجعل المنتج أول واحد بالمتجر 🔝"
                  >
                    🔝
                  </button>
                  <button
                    className="admin-icon-btn"
                    onClick={() => moveProduct(p, 'up')}
                    disabled={idx === 0}
                    title="تحريك للأعلى ⬆️"
                  >
                    ▲
                  </button>
                  <span className="admin-rank-pill" title="رقم الترتيب الحالي">#{idx + 1}</span>
                  <button
                    className="admin-icon-btn"
                    onClick={() => moveProduct(p, 'down')}
                    disabled={idx === filtered.length - 1}
                    title="تحريك للأسفل ⬇️"
                  >
                    ▼
                  </button>
                  <button
                    className="admin-icon-btn"
                    onClick={() => moveToBottom(p)}
                    disabled={idx === filtered.length - 1}
                    title="نقل المنتج لآخر المتجر 🔚"
                  >
                    🔚
                  </button>
                </div>

                <div className="admin-row__product-cell">
                  <img
                    className="admin-row__img"
                    src={(p.images && p.images[0]) || p.image}
                    alt=""
                    loading="lazy"
                  />
                  <div className="admin-row__main">
                    <strong>{p.name}</strong>
                    <span>{p.nameEn}</span>
                    {p.material && <small className="admin-dim">الخامة: {p.material}</small>}
                  </div>
                </div>

                <div className="admin-row__meta">
                  <span className="admin-tag">{p.gender === 'men' ? 'رجالي' : 'نسائي'}</span>
                  <span className="admin-tag">{p.category} / {p.sub}</span>
                  {p.badge && <span className="admin-tag admin-tag--accent">{p.badge}</span>}
                </div>

                <div className="admin-row__stock">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
                      onClick={() => saveProduct({ ...p, stockQuantity: Math.max(0, curStock - 1) })}
                      title="إنقاص المخزون بمقدار 1"
                    >
                      −
                    </button>
                    <span className={`admin-stock-badge ${isOut ? 'is-low' : isLow ? 'is-low' : 'is-ok'}`} style={isOut ? { background: 'rgba(239,68,68,0.15)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' } : {}}>
                      {isOut ? 'نفد (0)' : `${curStock} قطع`}
                    </span>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      style={{ width: '22px', height: '22px', fontSize: '11px', padding: 0 }}
                      onClick={() => saveProduct({ ...p, stockQuantity: curStock + 1 })}
                      title="زيادة المخزون بمقدار 1"
                    >
                      +
                    </button>
                  </div>
                  <button
                    className={`admin-status-toggle ${isDraft ? 'is-draft' : 'is-active'}`}
                    onClick={() => toggleProductStatus(p)}
                    title="انقر لتبديل حالة العرض"
                  >
                    {isDraft ? '🟡 مسودة' : '🟢 نشط'}
                  </button>
                </div>

                <div className="admin-row__price">
                  {formatPrice(p.price)}
                  {p.oldPrice ? <s>{formatPrice(p.oldPrice)}</s> : null}
                </div>

                <div className="admin-row__actions">
                  <button className="admin-btn admin-btn--sm" onClick={() => setEditing(p)}>
                    تعديل
                  </button>
                  <button
                    className="admin-btn admin-btn--sm admin-btn--danger"
                    onClick={() => del(p)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length > limit && (
            <button
              className="admin-btn admin-btn--ghost admin-loadmore"
              onClick={() => setLimit((l) => l + 40)}
            >
              عرض المزيد ({filtered.length - limit})
            </button>
          )}
        </div>
      )}

      {editing && (
        <ProductForm
          initial={editing === 'new' ? null : editing}
          onSave={save}
          onCancel={() => setEditing(null)}
          settings={settings}
          onSaveRate={(value) => saveSetting('usdRate', value)}
        />
      )}
    </div>
  );
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsvProducts(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('ملف CSV يحتاج صف عناوين وصف منتج واحد على الأقل.');
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line, idx) => {
    const cells = splitCsvLine(line);
    const raw = {};
    headers.forEach((header, i) => { raw[header] = cells[i] || ''; });
    const id = raw.id || `bulk-${Date.now().toString(36)}-${idx + 1}`;
    const images = [raw.image, raw.image2, raw.image3, raw.image4].filter(Boolean);
    const imageFiles = [raw.imageFile, raw.imageFile2, raw.imageFile3, raw.imageFile4, raw['اسم الصورة']].filter(Boolean);
    return {
      id,
      name: raw.name || raw['اسم المنتج'] || '',
      nameEn: raw.nameEn || '',
      blurb: raw.blurb || raw.description || raw['الوصف'] || '',
      blurbEn: raw.blurbEn || '',
      price: parseSmartPrice(raw.price || raw['السعر']),
      oldPrice: raw.oldPrice ? parseSmartPrice(raw.oldPrice) : null,
      gender: raw.gender || 'men',
      category: raw.category || 'shoes',
      sub: raw.sub || '',
      type: raw.type || 'general',
      status: raw.status || 'active',
      stockQuantity: raw.stockQuantity !== '' ? Number(raw.stockQuantity) : 15,
      images,
      imageFiles,
      colors: raw.colors ? raw.colors.split('|').map((name) => ({ name: name.trim(), nameEn: name.trim(), hex: '#777777' })).filter((c) => c.name) : [],
      sizes: raw.sizes ? raw.sizes.split('|').map((s) => s.trim()).filter(Boolean) : [],
      material: raw.material || '',
      materialEn: raw.materialEn || '',
      badge: raw.badge || null,
      rating: raw.rating ? Number(raw.rating) : 4.8,
      reviews: raw.reviews ? Number(raw.reviews) : 12,
      sortOrder: raw.sortOrder ? Number(raw.sortOrder) : undefined,
      customSpecs: [],
    };
  }).filter((product) => product.name && product.price > 0);
}

function normalizeImportProducts(list, existingCount = 0) {
  return list.map((product, idx) => ({
    ...product,
    id: String(product.id || `bulk-${Date.now().toString(36)}-${idx + 1}`),
    price: parseSmartPrice(product.price),
    oldPrice: product.oldPrice ? parseSmartPrice(product.oldPrice) : null,
    stockQuantity: Number.isFinite(Number(product.stockQuantity)) ? Number(product.stockQuantity) : 15,
    status: product.status || 'active',
    type: product.type || 'general',
    images: Array.isArray(product.images) ? product.images.filter(Boolean).slice(0, 4) : [product.image].filter(Boolean),
    imageFiles: Array.isArray(product.imageFiles) ? product.imageFiles.filter(Boolean).slice(0, 4) : [product.imageFile].filter(Boolean),
    sortOrder: product.sortOrder ?? existingCount + idx + 1,
  })).filter((product) => product.name && product.price > 0);
}

async function attachImportImages(products, files, onProgress) {
  const fileMap = new Map(Array.from(files || []).map((file) => [file.name.toLowerCase(), file]));
  let prepared = 0;
  const total = products.reduce((sum, product) => sum + (product.imageFiles || []).filter((name) => fileMap.has(String(name).toLowerCase())).length, 0);
  // `imageFiles` is a spreadsheet column naming local files. It is stripped on
  // every path, including this one, so it is never written to the database.
  const strip = (list) => list.map(({ imageFiles, ...product }) => product);
  if (!total) return { products: strip(products), queued: [] };

  // Compressed here, uploaded later. An import of 150 products carries 600
  // photos — a quarter of a gigabyte — and uploading them before writing a
  // single record meant one dropped connection threw all of it away. The
  // records go in first; these go to the outbox and drain in the background.
  const queued = [];
  for (const product of products) {
    for (const name of product.imageFiles || []) {
      const file = fileMap.get(String(name).toLowerCase());
      if (!file) continue;
      prepared += 1;
      if (onProgress) onProgress(prepared, total, file.name);
      try {
        queued.push({
          productId: String(product.id),
          productName: product.name,
          blob: await prepareImageForUpload(file),
          index: queued.filter((q) => q.productId === String(product.id)).length,
        });
      } catch (error) {
        console.warn('Skipped an unreadable image during import:', name, error);
      }
    }
  }
  return { products: strip(products), queued };
}

/**
 * Does this product still keep its photos inside its own record?
 *
 * A migrated product is handed to list views as `images: [thumb]`, and that
 * thumbnail is itself a data URL — so looking only at `images` counted every
 * already-migrated product as needing migration. The dashboard offered to
 * migrate 26 of 41 products when 3 actually needed it, and the number never
 * reached zero however many times it was run. `imagesArePlaceholder` is the
 * flag that says "this is the stand-in, not the real gallery".
 */
function needsImageMigration(product) {
  if (!product || product.imagesArePlaceholder) return false;
  return Array.isArray(product.images)
    && product.images.some((image) => typeof image === 'string' && image.startsWith('data:'));
}

function SettingsPanel({ productCount, products, settings }) {
  const [msg, setMsg] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [importImageFiles, setImportImageFiles] = useState([]);
  const [migrating, setMigrating] = useState(false);
  const [storageReady, setStorageReady] = useState(null);
  const [relocating, setRelocating] = useState(false);
  const [relocateReport, setRelocateReport] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const [rateBusy, setRateBusy] = useState(false);
  const storedRate = usdRate(settings);

  /** Products whose dinar price is pegged to a dollar figure. */
  const peggedCount = useMemo(() => products.filter((p) => Number(p?.priceUsd) > 0).length, [products]);

  const saveRate = async (e) => {
    e.preventDefault();
    const value = Number(String(rateInput).replace(/[^\d.]/g, ''));
    if (!Number.isFinite(value) || value <= 0) {
      setMsg('اكتب سعر صرف صحيح، مثل 1320');
      return;
    }
    const next = Math.round(value);
    if (peggedCount > 0 && !window.confirm(
      `تغيير سعر الصرف إلى ${next.toLocaleString('en-US')} د.ع للدولار.

`
      + `سيُعاد حساب أسعار ${peggedCount} منتج مُسعّر بالدولار تلقائياً.
`
      + `المنتجات المسعّرة بالدينار لا تتغيّر.`
    )) return;

    setRateBusy(true);
    try {
      await saveSetting('usdRate', next);
      let repriced = { updated: 0 };
      if (peggedCount > 0) {
        setMsg('جارٍ تحديث أسعار المنتجات…');
        repriced = await repriceUsdProducts(next, {
          onProgress: (done, total) => setMsg(`تحديث الأسعار: ${done} من ${total}`),
        });
      }
      setMsg(repriced.updated
        ? `تم ضبط الصرف على ${next.toLocaleString('en-US')} وتحديث ${repriced.updated} منتج ✅`
        : `تم ضبط سعر الصرف على ${next.toLocaleString('en-US')} د.ع للدولار ✅`);
      setRateInput('');
    } catch (error) {
      setMsg(`ما قدرنا نحفظ سعر الصرف: ${error?.message || 'حاول مرة ثانية.'}`);
    } finally {
      setRateBusy(false);
    }
  };

  useEffect(() => { objectStorageAvailable().then(setStorageReady); }, []);

  /** Products whose photos are still stored as text rather than as files. */
  const heavyImageCount = useMemo(
    () => products.filter((p) => needsImageMigration(p) || (typeof p.thumb === 'string' && p.thumb.startsWith('data:'))).length,
    [products]
  );

  const relocateToStorage = async () => {
    if (!window.confirm(`تخفيف صور ${heavyImageCount} منتج؟

الصور تبقى بنفس الجودة، والعملية آمنة ويمكن إعادتها.
قد تستغرق عدة دقائق — لا تغلق الصفحة.`)) return;
    setRelocating(true);
    setRelocateReport(null);
    setMsg('');
    try {
      const report = await migrateImagesToObjectStorage({
        onProgress({ stage, done, total, name }) {
          const label = stage === 'upload' ? 'جارٍ رفع الصور' : 'جارٍ الفحص';
          setMsg(`${label}: ${done} من ${total}${name ? ` — ${name}` : ''}`);
        },
      });
      setRelocateReport(report);
      setMsg('');
    } catch (error) {
      setMsg(`ما قدرنا نكمل: ${error?.message || 'حاول مرة ثانية.'}`);
    } finally {
      setRelocating(false);
    }
  };

  /** Products still carrying base64 photos inside their own record. */
  const legacyImageCount = useMemo(() => products.filter(needsImageMigration).length, [products]);

  const onLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoBusy(true);
    setMsg('');
    try {
      const url = await uploadImage(file);
      await saveSetting('logoUrl', url);
      setMsg('تم تغيير الشعار ✅');
    } catch (error) {
      setMsg(`ما قدرنا نرفع الشعار: ${error?.message || 'تحقق من الإنترنت.'}`);
    } finally {
      setLogoBusy(false);
    }
  };

  const exportDataJSON = () => {
    const dataStr = JSON.stringify({ products, exportedAt: new Date().toISOString() }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iraqstore-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari cancels an in-flight download when its blob URL is revoked in the
    // same tick, so the backup silently produced nothing.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        let list;
        if (file.name.toLowerCase().endsWith('.csv')) {
          list = parseCsvProducts(text);
        } else {
          const parsed = JSON.parse(text);
          list = Array.isArray(parsed) ? parsed : parsed.products;
        }
        if (!Array.isArray(list) || !list.length) {
          alert('الملف ما فيه منتجات. تأكد أن فيه عمود للاسم وعمود للسعر.');
          return;
        }
        let normalized = normalizeImportProducts(list, products.length);
        if (!normalized.length) {
          alert('ما لقينا منتجات صالحة. كل منتج يحتاج اسم وسعر.');
          return;
        }
        if (window.confirm(`إضافة ${normalized.length} منتج إلى المتجر؟

المنتج الذي يحمل نفس الرقم سيُستبدل بالكامل.`)) {
          const prep = await attachImportImages(normalized, importImageFiles, (done, total) => {
            setMsg(`جارٍ تجهيز الصور: ${done} من ${total}`);
          });
          normalized = prep.products;

          // Records first: small, quick, and the part that must not be lost.
          setMsg(`جارٍ إضافة ${normalized.length} منتج…`);
          await saveProductsBatch(normalized, {
            onProgress(done, total) {
              setMsg(`جارٍ الحفظ: ${done} من ${total}`);
            },
          });

          // Photos after, through the outbox, so the import survives a closed
          // tab or a connection that gives out halfway through.
          if (prep.queued.length) {
            const { enqueueImage } = await import('../data/imageQueue');
            for (let i = 0; i < prep.queued.length; i += 1) {
              await enqueueImage(prep.queued[i]);
              setMsg(`جارٍ جدولة الصور: ${i + 1} من ${prep.queued.length}`);
            }
            nudgeImageQueue();
          }

          setMsg(prep.queued.length
            ? `تمت إضافة ${normalized.length} منتج ✅ — و${prep.queued.length} صورة تُرفع بالخلفية.`
            : `تمت إضافة ${normalized.length} منتج ✅`);
        }
      } catch (err) {
        alert('ما قدرنا نقرأ الملف. تأكد أنه ملف إكسل أو JSON سليم.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  /**
   * Move base64 photos out of the product records and into `productImages/{id}`.
   *
   * Products saved before the split still carry ~330KB of inline images each,
   * which is what every visitor downloads. Re-saving them through the normal
   * batch path rebuilds them in the split shape.
   */
  const migrateImages = async () => {
    const legacy = products.filter(needsImageMigration);
    if (!legacy.length) {
      setMsg('كل الصور سليمة — ما في شي يحتاج إصلاح ✅');
      return;
    }
    if (!window.confirm(`إصلاح صور ${legacy.length} منتج؟

قد يستغرق عدة دقائق — لا تغلق الصفحة.`)) return;
    setMigrating(true);
    try {
      await saveProductsBatch(legacy, {
        onProgress(done, total, stage) {
          setMsg(`جارٍ العمل: ${done} من ${total}`);
        },
      });
      setMsg(`تم إصلاح ${legacy.length} منتج ✅`);
    } catch (err) {
      setMsg('');
      alert('ما قدرنا نكمل: ' + (err?.message || 'حاول مرة ثانية.'));
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="admin-panel admin-panel--narrow">
      {storageReady === false && (
        <div className="admin-card admin-card--warn">
          <h3>⚠️ صور المتجر تحتاج انتباه</h3>
          <p>
            صور منتجاتك محفوظة بطريقة تستهلك مساحة كبيرة، وقد تجعل المتجر يتوقف مؤقتاً
            إذا زاد عدد الزوّار. تواصل مع من جهّز لك الموقع ليُكمل الإعداد.
          </p>
        </div>
      )}

      {storageReady && heavyImageCount > 0 && (
        <div className="admin-card admin-card--warn">
          <h3>🚚 تخفيف صور المتجر</h3>
          <p>
            صور <b>{heavyImageCount}</b> منتج محفوظة بطريقة قديمة تثقّل المتجر على الزبائن.
            اضغط الزر لتخفيفها — المتجر يصير أسرع، والصور تبقى كما هي بنفس الجودة.
          </p>
          <p className="admin-help">
            قد تستغرق عدة دقائق حسب سرعة الإنترنت. اترك الصفحة مفتوحة حتى تنتهي.
          </p>
          <button className="admin-btn admin-btn--primary" onClick={relocateToStorage} disabled={relocating}>
            {relocating ? 'جارٍ العمل…' : `تخفيف صور ${heavyImageCount} منتج`}
          </button>
        </div>
      )}

      {relocateReport && (
        <div className={`admin-card ${relocateReport.failures.length ? 'admin-card--warn' : ''}`}>
          <h3>{relocateReport.failures.length ? '⚠️ انتهى العمل مع ملاحظات' : '✅ تم بنجاح'}</h3>
          <p>
            تم تخفيف <b>{relocateReport.migrated}</b> منتج.
            {relocateReport.skipped > 0 && <> و{relocateReport.skipped} منتج كان جاهزاً أصلاً.</>}
          </p>
          {relocateReport.failures.length > 0 && (
            <>
              <p>هذه المنتجات لم تتغيّر، وصورها سليمة كما هي. تقدر تعيد المحاولة:</p>
              <ul className="admin-help">
                {relocateReport.failures.map((f) => <li key={f.id}>{f.name || f.id}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="admin-card">
        <h3>شعار المتجر</h3>
        <p>اختر صورة من جهازك لتظهر في أعلى المتجر وأسفله.</p>
        <label className="admin-btn admin-btn--primary admin-file">
          {logoBusy ? 'جارٍ الرفع…' : 'تغيير الشعار'}
          <input type="file" accept="image/*" hidden onChange={onLogo} disabled={logoBusy} />
        </label>
      </div>

      <div className="admin-card">
        <h3>سعر صرف الدولار</h3>
        <p>
          عند إضافة منتج تقدر تكتب السعر بالدولار بدل الدينار، ويتحوّل تلقائياً بهذا السعر.
          السعر المخزَّن في المتجر يبقى بالدينار دائماً.
        </p>
        <p>
          السعر الحالي: <b>{storedRate.toLocaleString('en-US')}</b> د.ع لكل دولار
          {!settings?.usdRate && <> (الافتراضي — غيّره لسعر السوق عندك)</>}
        </p>
        <p>
          {peggedCount > 0
            ? <>🔗 <b>{peggedCount}</b> منتج مُسعّر بالدولار — أسعارهم تتحدّث تلقائياً عند تغيير الصرف.</>
            : <>لا يوجد منتج مُسعّر بالدولار بعد. أي منتج تضيفه بالدولار سيُربط بهذا السعر.</>}
        </p>
        <form onSubmit={saveRate} className="admin-rate-row">
          <input
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            placeholder={String(DEFAULT_USD_RATE)}
            aria-label="سعر صرف الدولار بالدينار"
          />
          <button className="admin-btn admin-btn--primary" type="submit" disabled={rateBusy}>
            {rateBusy ? 'جارٍ الحفظ…' : 'حفظ السعر'}
          </button>
        </form>
        <small className="admin-help">
          المنتجات المسعّرة بالدينار لا تتأثّر إطلاقاً — تتغيّر فقط المنتجات التي أدخلت سعرها بالدولار.
        </small>
      </div>

      <div className="admin-card">
        <h3>نسخة احتياطية</h3>
        <p>
          احفظ نسخة من منتجاتك على جهازك. ينزل ملف واحد تقدر ترجع له لو صار شي.
          ما يغيّر أي شيء في المتجر.
        </p>
        <button className="admin-btn admin-btn--primary" onClick={exportDataJSON}>
          ⬇️ حفظ نسخة احتياطية
        </button>
      </div>

      <Diagnostics />

      <div className="admin-card">
        <h3>معلومات المتجر</h3>
        <p>
          عدد المنتجات المعروضة: <b>{productCount}</b>
        </p>
      </div>

      {/* Everything below can change or replace many products at once. It is
          kept shut by default so it cannot be clicked while looking for the
          everyday settings above. */}
      <div className="admin-card admin-danger-zone">
        <button
          type="button"
          className="admin-danger-zone__toggle"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <span>⚠️ أدوات متقدّمة — للخبراء فقط</span>
          <span aria-hidden="true">{showAdvanced ? '▲' : '▼'}</span>
        </button>

        {showAdvanced && (
          <div className="admin-danger-zone__body">
            <p className="admin-danger-zone__lead">
              هذه الأدوات تعدّل منتجات كثيرة دفعة واحدة، ويصعب التراجع عنها.
              <b> احفظ نسخة احتياطية قبل استخدامها.</b>
            </p>

            <div className="admin-danger-zone__item">
              <h4>إضافة منتجات كثيرة من ملف</h4>
              <p>
                لإضافة عشرات المنتجات مرة واحدة من ملف إكسل. المنتج الذي يحمل نفس الرقم
                يُستبدل بالكامل.
              </p>
              <div className="admin-danger-zone__actions">
                <label className="admin-btn admin-btn--ghost admin-file">
                  🖼️ اختيار الصور من الجهاز ({importImageFiles.length})
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => setImportImageFiles(Array.from(e.target.files || []))}
                  />
                </label>
                <label className="admin-btn admin-btn--danger admin-file">
                  ⬆️ إضافة من ملف
                  <input type="file" accept=".json,.csv,text/csv,application/json" hidden onChange={handleImportFile} />
                </label>
              </div>
              <small className="admin-help">
                في ملف إكسل: عمود <b>name</b> للاسم و<b>price</b> للسعر و<b>imageFile</b> لاسم ملف الصورة.
              </small>
            </div>

            {legacyImageCount > 0 && (
              <div className="admin-danger-zone__item">
                <h4>إصلاح صور قديمة</h4>
                <p>
                  <b>{legacyImageCount}</b> منتج محفوظ بطريقة قديمة جداً. استخدم «تخفيف صور
                  المتجر» بالأعلى أولاً — هذا الزر للحالات التي لا ينفع معها.
                </p>
                <button className="admin-btn admin-btn--danger" onClick={migrateImages} disabled={migrating}>
                  {migrating ? 'جارٍ العمل…' : `إصلاح ${legacyImageCount} منتج`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {msg && <p className="admin-note admin-note--ok">{msg}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [settings, setSettings] = useState({});
  const [tab, setTab] = useState('products');
  // A product can save while its photos or its stock mirror do not. Those used
  // to be console-only warnings, so the admin saw a success they did not get.
  const [syncWarnings, setSyncWarnings] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [slowLink, setSlowLink] = useState(false);
  // Photos still on their way to storage. A product is saved long before its
  // pictures arrive on a bad connection, and silence there looks like failure.
  const [uploads, setUploads] = useState({ pending: 0, running: false, current: null, lastError: null, stuck: [] });

  useEffect(() => {
    watchImageQueue();
    return subscribeUploadStatus(setUploads);
  }, []);

  // Open the database connection now, not on the first save. Filling in a
  // product takes far longer than the handshake, so by the time the admin
  // presses save the socket is warm.
  useEffect(() => {
    warmUpRealtimeDatabase();
    return subscribeRealtimeStatus(setDbReady);
  }, []);

  // Saving is never blocked on this, so only mention it once the link has
  // actually been slow for a while - and never as a reason to wait.
  useEffect(() => {
    if (dbReady) { setSlowLink(false); return undefined; }
    const timer = setTimeout(() => setSlowLink(true), 12000);
    return () => clearTimeout(timer);
  }, [dbReady]);
  const dismissWarning = (id) => setSyncWarnings((list) => list.filter((w) => w.id !== id));

  useEffect(() => subscribeImageSyncFailures(({ product, error }) => {
    setSyncWarnings((list) => [
      ...list.filter((w) => w.id !== product?.id),
      { id: product?.id || Date.now(), name: product?.name || 'منتج', message: error?.message || 'تعذر إكمال المزامنة.' },
    ]);
  }), []);

  useEffect(() => {
    const unsubP = listenProducts(setProducts, { includeDrafts: true });
    const unsubS = listenSettings((next) => setSettings(next || {}));
    const unsubO = listenOrders(setOrders);
    const unsubC = listenCatalog((tree) => {
      if (tree) updateCatalogStore(tree);
    });
    return () => {
      unsubP();
      unsubS();
      unsubO();
      unsubC();
    };
  }, []);

  return (
    <div className="admin" data-admin="on">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src="/brand-logo.jpg" alt="" width="34" height="34" />
          <div>
            <strong>لوحة إدارة المتجر</strong>
            <ConnectionStatusBadge />
          </div>
        </div>

        <nav className="admin-tabs">
          <button
            className={tab === 'products' ? 'is-active' : ''}
            onClick={() => setTab('products')}
          >
            📦 المنتجات والمخزون ({products.length})
          </button>
          <button
            className={tab === 'reorder' ? 'is-active' : ''}
            onClick={() => setTab('reorder')}
          >
            ↕️ ترتيب المنتجات
          </button>
          <button
            className={tab === 'orders' ? 'is-active' : ''}
            onClick={() => setTab('orders')}
          >
            🛍️ الطلبات ({orders.length})
          </button>
          <button
            className={tab === 'analytics' ? 'is-active' : ''}
            onClick={() => setTab('analytics')}
          >
            📊 الإحصائيات
          </button>
          <button
            className={tab === 'tree' ? 'is-active' : ''}
            onClick={() => setTab('tree')}
          >
            🌳 شجرة الأقسام
          </button>
          <button
            className={tab === 'delivery' ? 'is-active' : ''}
            onClick={() => setTab('delivery')}
          >
            🚚 أسعار التوصيل
          </button>
          <button
            className={tab === 'settings' ? 'is-active' : ''}
            onClick={() => setTab('settings')}
          >
            ⚙️ الإعدادات والنسخ
          </button>
        </nav>

        <div className="admin-header__user">
          <Link to="/" className="admin-btn admin-btn--sm admin-btn--ghost">
            عرض المتجر ↗
          </Link>
          <span className="admin-email">{user?.email || 'مشرف النظام'}</span>
          <button className="admin-btn admin-btn--sm" onClick={logout}>
            خروج
          </button>
        </div>
      </header>

      <main className="admin-main">
        {uploads.pending > 0 && (
          <div className="admin-note admin-note--ok admin-upload-note" role="status">
            <span>
              🖼️ <b>{uploads.pending}</b> صورة قيد الرفع
              {uploads.current?.name ? <> — {uploads.current.name}</> : null}
              {uploads.lastError
                ? <> · الاتصال ضعيف، نعيد المحاولة تلقائياً. <b>منتجاتك محفوظة</b> والصور تُكمل لوحدها.</>
                : <> · تقدر تكمل شغلك عادي، وحتى تسكّر الصفحة — يكمل الرفع لما تفتحها مرة ثانية.</>}
              {uploads.stuck?.length > 0 && (
                <> <br />⏳ متعثّرة ومستمرّة بالمحاولة: {uploads.stuck.map((x) => x.name || 'منتج').join('، ')}</>
              )}
            </span>
            <button type="button" className="admin-btn admin-btn--sm admin-btn--ghost" onClick={nudgeImageQueue}>
              إعادة المحاولة الآن
            </button>
          </div>
        )}
        {/* `.info/connected` says whether the browser reached Firebase directly.
            Saving no longer depends on that — it goes through this site — so a
            failed direct connection is not news the shopkeeper can act on, and
            telling them their internet is slow while their 4G works fine was
            worse than saying nothing. */}
        {slowLink && (
          <div className="admin-note" role="status">
            ℹ️ الحفظ يمرّ عبر خادم المتجر. كل شي يشتغل عادي.
          </div>
        )}
        {syncWarnings.map((warning) => (
          <div key={warning.id} className="admin-note admin-note--warn" role="status">
            ⚠️ {warning.name}: {warning.message}
            <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => dismissWarning(warning.id)}>إخفاء</button>
          </div>
        ))}
        {tab === 'products' && <ProductsPanel products={products} settings={settings} />}
        {tab === 'reorder' && <ProductReorderPanel products={products} />}
        {tab === 'orders' && <OrdersPanel orders={orders} />}
        {tab === 'analytics' && <AnalyticsPanel products={products} orders={orders} />}
        {tab === 'tree' && <CategoryTree products={products} />}
        {tab === 'delivery' && <DeliveryFeesPanel />}
        {tab === 'settings' && (
          <SettingsPanel productCount={products.length} products={products} settings={settings} />
        )}
      </main>
    </div>
  );
}
