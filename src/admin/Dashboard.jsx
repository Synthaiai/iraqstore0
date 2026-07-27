import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { CATEGORIES, GENDERS, SUBCATEGORIES } from '../data/catalog';
import { formatPrice } from '../data/products';
import {
  deleteProduct,
  listenProducts,
  saveProduct,
  saveSetting,
  seedProducts,
} from '../data/remote';
import { uploadImage } from '../data/upload';
import ProductForm from './ProductForm';

function ProductsPanel({ products }) {
  const [q, setQ] = useState('');
  const [gender, setGender] = useState('');
  const [editing, setEditing] = useState(null); // product | 'new' | null
  const [limit, setLimit] = useState(40);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!gender || p.gender === gender) &&
        (!s || `${p.name} ${p.nameEn}`.toLowerCase().includes(s))
    );
  }, [products, q, gender]);

  const save = async (record) => {
    await saveProduct(record);
    setEditing(null);
  };
  const del = async (p) => {
    if (window.confirm(`حذف «${p.name}»؟`)) await deleteProduct(p.id);
  };

  return (
    <div className="admin-panel">
      <div className="admin-toolbar">
        <input className="admin-search" placeholder="ابحث بالاسم…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">كل الأقسام</option>
          <option value="men">رجالي</option>
          <option value="women">نسائي</option>
        </select>
        <span className="admin-count">{filtered.length} منتج</span>
        <button className="admin-btn admin-btn--primary" onClick={() => setEditing('new')}>+ منتج جديد</button>
      </div>

      {filtered.length === 0 ? (
        <p className="admin-empty">لا توجد منتجات بعد. أضف منتجًا جديدًا أو استعمل «تعبئة الكتالوج» من الإعدادات.</p>
      ) : (
        <div className="admin-table">
          {filtered.slice(0, limit).map((p) => (
            <div className="admin-row" key={p.id}>
              <img className="admin-row__img" src={(p.images && p.images[0]) || p.image} alt="" loading="lazy" />
              <div className="admin-row__main">
                <strong>{p.name}</strong>
                <span>{p.nameEn}</span>
              </div>
              <div className="admin-row__meta">
                <span className="admin-tag">{p.gender === 'men' ? 'رجالي' : 'نسائي'}</span>
                <span className="admin-tag">{p.category} / {p.sub}</span>
                {p.badge && <span className="admin-tag admin-tag--accent">{p.badge}</span>}
              </div>
              <div className="admin-row__price">
                {formatPrice(p.price)}
                {p.oldPrice ? <s>{formatPrice(p.oldPrice)}</s> : null}
              </div>
              <div className="admin-row__actions">
                <button className="admin-btn admin-btn--sm" onClick={() => setEditing(p)}>تعديل</button>
                <button className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => del(p)}>حذف</button>
              </div>
            </div>
          ))}
          {filtered.length > limit && (
            <button className="admin-btn admin-btn--ghost admin-loadmore" onClick={() => setLimit((l) => l + 40)}>
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

function SectionsPanel({ products }) {
  const count = (g, c, s) =>
    products.filter((p) => p.gender === g && (!c || p.category === c) && (!s || p.sub === s)).length;

  return (
    <div className="admin-panel">
      <p className="admin-note">
        هذه الأقسام الحالية للمتجر. تعيين المنتجات للأقسام يتم من نموذج المنتج.
        (تحرير شجرة الأقسام مباشرةً من قاعدة البيانات قادم في التحديث التالي.)
      </p>
      <div className="admin-sections">
        {GENDERS.map((g) => (
          <div className="admin-section-card" key={g.slug}>
            <h3>{g.title} <span className="admin-count">{count(g.slug)} منتج</span></h3>
            {(CATEGORIES[g.slug] || []).map((c) => (
              <div className="admin-section-cat" key={c.slug}>
                <strong>{c.title} <span className="admin-count">{count(g.slug, c.slug)}</span></strong>
                <div className="admin-chips">
                  {(SUBCATEGORIES[`${g.slug}/${c.slug}`] || [])
                    .filter((s) => s.slug !== 'all')
                    .map((s) => (
                      <span className="admin-chip admin-chip--static" key={s.slug}>
                        {s.title} · {count(g.slug, c.slug, s.slug)}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ productCount }) {
  const [seeding, setSeeding] = useState(false);
  const [msg, setMsg] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);

  const doSeed = async () => {
    if (!window.confirm('سيتم كتابة الكتالوج المدمج (١٠٠+ منتج) إلى قاعدة البيانات. متابعة؟')) return;
    setSeeding(true);
    setMsg('');
    try {
      await seedProducts();
      setMsg('تمت تعبئة الكتالوج بنجاح.');
    } catch {
      setMsg('فشل — تحقق من قواعد قاعدة البيانات (يجب السماح بالكتابة للمشرف).');
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
      setMsg('تم تحديث الشعار — سيظهر في المتجر خلال ثوانٍ.');
    } catch {
      setMsg('تعذّر رفع الشعار — تحقق من قواعد Firebase Storage.');
    } finally {
      setLogoBusy(false);
    }
  };

  return (
    <div className="admin-panel admin-panel--narrow">
      <div className="admin-card">
        <h3>الشعار</h3>
        <p>ارفع شعارًا جديدًا من جهازك ليظهر مباشرةً في رأس المتجر وتذييله.</p>
        <label className="admin-btn admin-btn--primary admin-file">
          {logoBusy ? 'جارٍ الرفع…' : 'رفع شعار جديد'}
          <input type="file" accept="image/*" hidden onChange={onLogo} disabled={logoBusy} />
        </label>
      </div>

      <div className="admin-card">
        <h3>تعبئة الكتالوج</h3>
        <p>
          قاعدة البيانات تحتوي حاليًا على <b>{productCount}</b> منتج. إذا كانت فارغة، اضغط الزر
          لنسخ الكتالوج المدمج إليها كنقطة بداية.
        </p>
        <button className="admin-btn admin-btn--ghost" onClick={doSeed} disabled={seeding}>
          {seeding ? 'جارٍ التعبئة…' : 'تعبئة الكتالوج المدمج'}
        </button>
      </div>

      {msg && <p className="admin-note admin-note--ok">{msg}</p>}

      <div className="admin-card">
        <h3>قواعد قاعدة البيانات</h3>
        <p className="admin-note">
          لحماية متجرك: في Firebase → Realtime Database → Rules، اسمح بالقراءة للجميع
          والكتابة للمشرف فقط. مثال:
        </p>
        <pre className="admin-code">{`{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}`}</pre>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('products');

  useEffect(() => listenProducts(setProducts), []);

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header__brand">
          <img src="/logo.png" alt="" width="34" height="34" />
          <strong>لوحة الإدارة</strong>
        </div>
        <nav className="admin-tabs">
          <button className={tab === 'products' ? 'is-active' : ''} onClick={() => setTab('products')}>المنتجات</button>
          <button className={tab === 'sections' ? 'is-active' : ''} onClick={() => setTab('sections')}>الأقسام</button>
          <button className={tab === 'settings' ? 'is-active' : ''} onClick={() => setTab('settings')}>الإعدادات</button>
        </nav>
        <div className="admin-header__user">
          <Link to="/" className="admin-btn admin-btn--sm admin-btn--ghost">المتجر ↗</Link>
          <span className="admin-email">{user?.email}</span>
          <button className="admin-btn admin-btn--sm" onClick={logout}>خروج</button>
        </div>
      </header>

      <main className="admin-main">
        {tab === 'products' && <ProductsPanel products={products} />}
        {tab === 'sections' && <SectionsPanel products={products} />}
        {tab === 'settings' && <SettingsPanel productCount={products.length} />}
      </main>
    </div>
  );
}
