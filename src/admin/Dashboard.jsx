import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { GENDERS, updateCatalogStore } from '../data/catalog';
import { formatPrice } from '../data/products';
import {
  deleteProduct,
  getConnectionStatus,
  listenCatalog,
  listenOrders,
  listenProducts,
  saveProduct,
  saveProductsBatch,
  saveSetting,
  seedProducts,
  subscribeConnectionStatus,
  subscribeImageSyncFailures,
} from '../data/remote';
import { uploadImage } from '../data/upload';
import AnalyticsPanel from './AnalyticsPanel';
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

function ProductsPanel({ products }) {
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
    return list.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
  }, [products, q, gender, stockFilter]);

  const save = async (record, options = {}) => {
    await saveProduct(record);
    setEditing(options.keepOpen ? 'new' : null);
  };

  const del = async (p) => {
    if (window.confirm(`هل أنت متأكد من حذف المنتج «${p.name}»؟`)) {
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
    if (window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} منتج محدد نهائياً؟`)) {
      for (const id of selectedIds) {
        await deleteProduct(id);
      }
      setSelectedIds([]);
    }
  };

  // Reorder product position handler
  const moveProduct = async (product, direction) => {
    const idx = filtered.findIndex((p) => p.id === product.id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= filtered.length) return;

    const otherProduct = filtered[targetIdx];
    const currentOrder = product.sortOrder ?? idx + 1;
    const targetOrder = otherProduct.sortOrder ?? targetIdx + 1;

    // Swap order numbers
    await saveProduct({ ...product, sortOrder: targetOrder === currentOrder ? targetIdx + 1 : targetOrder });
    await saveProduct({ ...otherProduct, sortOrder: currentOrder });
  };

  const moveToTop = async (product) => {
    const sorted = [...products].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    const without = sorted.filter((p) => p.id !== product.id);
    const updated = [product, ...without].map((p, i) => ({ ...p, sortOrder: i + 1 }));
    await saveProductsBatch(updated);
  };

  const moveToBottom = async (product) => {
    const sorted = [...products].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    const without = sorted.filter((p) => p.id !== product.id);
    const updated = [...without, product].map((p, i) => ({ ...p, sortOrder: i + 1 }));
    await saveProductsBatch(updated);
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
      price: Number(raw.price || raw['السعر']) || 0,
      oldPrice: raw.oldPrice ? Number(raw.oldPrice) : null,
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
    price: Number(product.price) || 0,
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
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
  let uploaded = 0;
  const total = products.reduce((sum, product) => sum + (product.imageFiles || []).filter((name) => fileMap.has(String(name).toLowerCase())).length, 0);
  if (!total) return products;

  const result = [];
  for (const product of products) {
    const localImages = [];
    for (const name of product.imageFiles || []) {
      const file = fileMap.get(String(name).toLowerCase());
      if (!file) continue;
      uploaded += 1;
      if (onProgress) onProgress(uploaded, total, file.name);
      localImages.push(await uploadImage(file, 'products'));
    }
    result.push({
      ...product,
      images: [...(product.images || []), ...localImages.filter(Boolean)].slice(0, 4),
    });
  }
  return result;
}

function SettingsPanel({ productCount, products }) {
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [importImageFiles, setImportImageFiles] = useState([]);
  const [migrating, setMigrating] = useState(false);

  /** Products still carrying base64 photos inside their own record. */
  const legacyImageCount = useMemo(
    () => products.filter((p) => Array.isArray(p.images) && p.images.some((i) => typeof i === 'string' && i.startsWith('data:'))).length,
    [products]
  );

  const doSeed = async () => {
    if (!window.confirm('سيتم كتابة الكتالوج المدمج إلى قاعدة البيانات والتخزين المحلي. متابعة؟')) return;
    setSeeding(true);
    setMsg('');
    try {
      await seedProducts();
      setMsg('تمت تعبئة الكتالوج المدمج بنجاح.');
    } catch (error) {
      setMsg(`تعذرت تعبئة الكتالوج: ${error?.message || 'تحقق من الاتصال.'}`);
    } finally {
      setSeeding(false);
    }
  };

  const onLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoBusy(true);
    setMsg('');
    try {
      const url = await uploadImage(file, 'branding');
      await saveSetting('logoUrl', url);
      setMsg('تم تحديث شعار المتجر بنجاح.');
    } catch (error) {
      setMsg(`تعذّر رفع الشعار: ${error?.message || 'تحقق من الاتصال.'}`);
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
    a.click();
    URL.revokeObjectURL(url);
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
          alert('الملف غير صالح أو لا يحتوي على منتجات مكتملة. تأكد من وجود الاسم والسعر.');
          return;
        }
        let normalized = normalizeImportProducts(list, products.length);
        if (!normalized.length) {
          alert('لم يتم العثور على منتجات صالحة. الاسم والسعر مطلوبان لكل منتج.');
          return;
        }
        if (window.confirm(`هل تريد استيراد ${normalized.length} منتج إلى قاعدة البيانات؟`)) {
          normalized = await attachImportImages(normalized, importImageFiles, (done, total, fileName) => {
            setMsg(`جارٍ ضغط ورفع صور المنتجات: ${done} من ${total} (${fileName})`);
          });
          setMsg(`جارٍ حفظ ${normalized.length} منتج…`);
          await saveProductsBatch(normalized, {
            onProgress(done, total, stage) {
              const label = stage === 'inventory' ? 'تحديث المخزون' : 'حفظ المنتجات';
              setMsg(`${label}: ${done} من ${total}`);
            },
          });
          setMsg(`تم استيراد ${normalized.length} منتج بنجاح!`);
        }
      } catch (err) {
        alert('خطأ في قراءة ملف الاستيراد: ' + err.message);
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
    const legacy = products.filter((p) => Array.isArray(p.images) && p.images.some((i) => typeof i === 'string' && i.startsWith('data:')));
    if (!legacy.length) {
      setMsg('كل المنتجات مُرحّلة بالفعل ✅');
      return;
    }
    if (!window.confirm(`سيتم ترحيل صور ${legacy.length} منتج إلى تخزين منفصل.

هذا يقلل حجم المتجر بشكل كبير ويحل مشكلة انتهاء المهلة. قد يستغرق عدة دقائق — لا تغلق الصفحة.`)) return;
    setMigrating(true);
    try {
      await saveProductsBatch(legacy, {
        onProgress(done, total, stage) {
          const label = stage === 'images' ? 'ترحيل الصور' : stage === 'inventory' ? 'تحديث المخزون' : 'حفظ المنتجات';
          setMsg(`${label}: ${done} من ${total}`);
        },
      });
      setMsg(`تم ترحيل ${legacy.length} منتج بنجاح! المتجر الآن أخف بكثير 🚀`);
    } catch (err) {
      setMsg('');
      alert('تعذر إكمال الترحيل: ' + (err?.message || 'حاول مجددًا.'));
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="admin-panel admin-panel--narrow">
      <div className="admin-card">
        <h3>شعار المتجر</h3>
        <p>ارفع شعارًا جديدًا من جهازك ليظهر في رأس الهيدر وتذييل المتجر.</p>
        <label className="admin-btn admin-btn--primary admin-file">
          {logoBusy ? 'جارٍ رفع وضغط الشعار…' : 'رفع شعار جديد'}
          <input type="file" accept="image/*" hidden onChange={onLogo} disabled={logoBusy} />
        </label>
      </div>

      <div className="admin-card">
        <h3>استيراد وتصدير المنتجات بالجملة (+1000 منتج) 🚀</h3>
        <p>استورد 200 منتج أو أكثر عبر JSON أو CSV من إكسل. للصور من جهازك، اختر الصور هنا واكتب اسم ملف الصورة في عمود imageFile.</p>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
          <button className="admin-btn admin-btn--ghost" onClick={exportDataJSON}>
            ⬇️ تصدير النسخة الاحتياطية (JSON)
          </button>
          <label className="admin-btn admin-btn--ghost admin-file">
            🖼️ اختيار صور المنتجات من الجهاز ({importImageFiles.length})
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => setImportImageFiles(Array.from(e.target.files || []))}
            />
          </label>
          <label className="admin-btn admin-btn--primary admin-file">
            ⬆️ استيراد جماعي (JSON / CSV)
            <input type="file" accept=".json,.csv,text/csv,application/json" hidden onChange={handleImportFile} />
          </label>
        </div>
        <small className="admin-help">مثال CSV: imageFile = shoe1.jpg، ولأكثر من صورة استخدم imageFile2 و imageFile3 و imageFile4.</small>
      </div>

      <div className="admin-card">
        <h3>ترحيل الصور إلى التخزين المنفصل 🚀</h3>
        <p>
          المنتجات القديمة تخزّن صورها داخل سجل المنتج نفسه، فينزّلها كل زائر بالكامل.
          الترحيل ينقلها إلى تخزين منفصل ويُبقي صورة مصغّرة فقط — يقلل حجم المتجر بأكثر من 95%
          ويحل مشكلة «انتهت المهلة» عند الإضافة.
        </p>
        <p>
          منتجات تحتاج ترحيلاً: <b>{legacyImageCount}</b> من {productCount}
        </p>
        <button className="admin-btn admin-btn--primary" onClick={migrateImages} disabled={migrating || !legacyImageCount}>
          {migrating ? 'جارٍ الترحيل…' : legacyImageCount ? `ترحيل ${legacyImageCount} منتج` : 'لا حاجة للترحيل ✅'}
        </button>
      </div>

      <div className="admin-card">
        <h3>تعبئة الكتالوج الافتراضي</h3>
        <p>
          يحتوي الكتالوج حالياً على <b>{productCount}</b> منتج.
        </p>
        <button className="admin-btn admin-btn--ghost" onClick={doSeed} disabled={seeding}>
          {seeding ? 'جارٍ التعبئة…' : 'تعبئة الكتالوج المدمج'}
        </button>
      </div>

      {msg && <p className="admin-note admin-note--ok">{msg}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('products');
  // A product can save while its photos or its stock mirror do not. Those used
  // to be console-only warnings, so the admin saw a success they did not get.
  const [syncWarnings, setSyncWarnings] = useState([]);
  const dismissWarning = (id) => setSyncWarnings((list) => list.filter((w) => w.id !== id));

  useEffect(() => subscribeImageSyncFailures(({ product, error }) => {
    setSyncWarnings((list) => [
      ...list.filter((w) => w.id !== product?.id),
      { id: product?.id || Date.now(), name: product?.name || 'منتج', message: error?.message || 'تعذر إكمال المزامنة.' },
    ]);
  }), []);

  useEffect(() => {
    const unsubP = listenProducts(setProducts, { includeDrafts: true });
    const unsubO = listenOrders(setOrders);
    const unsubC = listenCatalog((tree) => {
      if (tree) updateCatalogStore(tree);
    });
    return () => {
      unsubP();
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
        {syncWarnings.map((warning) => (
          <div key={warning.id} className="admin-note admin-note--warn" role="status">
            ⚠️ {warning.name}: {warning.message}
            <button className="admin-btn admin-btn--sm admin-btn--ghost" onClick={() => dismissWarning(warning.id)}>إخفاء</button>
          </div>
        ))}
        {tab === 'products' && <ProductsPanel products={products} />}
        {tab === 'reorder' && <ProductReorderPanel products={products} />}
        {tab === 'orders' && <OrdersPanel orders={orders} />}
        {tab === 'analytics' && <AnalyticsPanel products={products} orders={orders} />}
        {tab === 'tree' && <CategoryTree products={products} />}
        {tab === 'delivery' && <DeliveryFeesPanel />}
        {tab === 'settings' && (
          <SettingsPanel productCount={products.length} products={products} />
        )}
      </main>
    </div>
  );
}
