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

  const save = async (record) => {
    await saveProduct(record);
    setEditing(null);
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

function SettingsPanel({ productCount, products }) {
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);

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

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        const list = Array.isArray(parsed) ? parsed : parsed.products;
        if (!Array.isArray(list) || !list.length) {
          alert('ملف JSON غير صالح أو لا يحتوي على منتجات.');
          return;
        }
        if (window.confirm(`هل تريد استيراد ورفع ${list.length} منتج دفعة واحدة إلى قاعدة البيانات؟`)) {
          setMsg('جارٍ رفع وحفظ المنتجات دفعة واحدة…');
          await saveProductsBatch(list);
          setMsg(`تم استيراد ورفع ${list.length} منتج بنجاح! 🚀`);
        }
      } catch (err) {
        alert('خطأ في قراءة ملف JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
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
        <p>تصدير واستيراد الكتالوج بالكامل لرفع آلاف المنتجات دفعة واحدة إلى قاعدة البيانات في ثوانٍ.</p>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
          <button className="admin-btn admin-btn--ghost" onClick={exportDataJSON}>
            ⬇️ تصدير النسخة الاحتياطية (JSON)
          </button>
          <label className="admin-btn admin-btn--primary admin-file">
            ⬆️ استيراد جماعي (ملف JSON)
            <input type="file" accept=".json" hidden onChange={handleImportJSON} />
          </label>
        </div>
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
