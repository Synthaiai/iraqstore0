import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, SUBCATEGORIES } from '../data/catalog';
import { formatPrice } from '../data/products';
import { uploadImage } from '../data/upload';

const PALETTE = [
  { name: 'أسود', nameEn: 'Black', hex: '#141416' },
  { name: 'أبيض', nameEn: 'White', hex: '#F2F0EE' },
  { name: 'رمادي', nameEn: 'Grey', hex: '#8A8A90' },
  { name: 'كحلي', nameEn: 'Navy', hex: '#1E2A44' },
  { name: 'عنابي', nameEn: 'Burgundy', hex: '#6B0F1A' },
  { name: 'بني', nameEn: 'Brown', hex: '#6A4A32' },
  { name: 'جملي', nameEn: 'Tan', hex: '#B08A5F' },
  { name: 'أخضر', nameEn: 'Green', hex: '#3F5F45' },
  { name: 'بيج', nameEn: 'Beige', hex: '#D9C3B0' },
  { name: 'ذهبي', nameEn: 'Gold', hex: '#C8A24A' },
];

const SIZE_PRESETS = {
  'أحذية رجالية': ['40', '41', '42', '43', '44', '45'],
  'أحذية نسائية': ['36', '37', '38', '39', '40', '41'],
  'ملابس': ['S', 'M', 'L', 'XL', 'XXL'],
  'مقاس واحد': ['مقاس واحد'],
};

const BADGES = [
  { value: '', label: 'بدون' },
  { value: 'new', label: 'جديد' },
  { value: 'sale', label: 'تخفيض' },
  { value: 'best', label: 'الأكثر مبيعًا' },
];

const empty = {
  gender: 'men', category: 'shoes', sub: '',
  name: '', nameEn: '', blurb: '', blurbEn: '',
  price: '', oldPrice: '', badge: '',
  material: '', materialEn: '',
  colors: [], sizes: [], images: [],
};

export default function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...empty, ...(initial || {}) }));
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cats = CATEGORIES[form.gender] || [];
  const subs = (SUBCATEGORIES[`${form.gender}/${form.category}`] || []).filter((s) => s.slug !== 'all');

  // Keep category/sub valid when gender changes.
  useEffect(() => {
    if (!cats.find((c) => c.slug === form.category)) set('category', cats[0]?.slug || 'shoes');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.gender]);
  useEffect(() => {
    if (form.sub && !subs.find((s) => s.slug === form.sub)) set('sub', subs[0]?.slug || '');
    if (!form.sub && subs[0]) set('sub', subs[0].slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.gender, form.category]);

  const discount = form.oldPrice && form.price
    ? Math.round((1 - Number(form.price) / Number(form.oldPrice)) * 100)
    : 0;

  const applyDiscount = (pct) => {
    const price = Number(form.price);
    if (!price) return setErr('أدخل السعر أولًا');
    setErr('');
    set('oldPrice', String(Math.round(price / (1 - pct / 100))));
  };

  const toggleColor = (c) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.some((x) => x.name === c.name)
        ? f.colors.filter((x) => x.name !== c.name)
        : [...f.colors, c],
    }));

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.sub) return setErr('الاسم والسعر والقسم مطلوبة');
    setBusy(true);
    setErr('');
    try {
      let images = form.images || [];
      if (files.length) {
        const uploaded = await Promise.all(files.map((f) => uploadImage(f)));
        images = [...images, ...uploaded];
      }
      if (!images.length) {
        setBusy(false);
        return setErr('أضف صورة واحدة على الأقل');
      }
      const id = form.id || `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      onSave({
        ...form,
        id,
        price: Number(form.price),
        oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
        sizes: form.sizes.length ? form.sizes : ['مقاس واحد'],
        images,
      });
    } catch (e2) {
      setErr('تعذّر الحفظ / رفع الصور — تحقق من قواعد Firebase Storage');
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal" onClick={onCancel}>
      <form className="admin-modal__panel" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="admin-modal__head">
          <h2>{form.id ? 'تعديل منتج' : 'منتج جديد'}</h2>
          <button type="button" className="admin-icon" onClick={onCancel} aria-label="إغلاق">✕</button>
        </header>

        <div className="admin-modal__body">
          <div className="admin-grid2">
            <label className="admin-field">
              <span>القسم الرئيسي</span>
              <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="men">رجالي</option>
                <option value="women">نسائي</option>
              </select>
            </label>
            <label className="admin-field">
              <span>الفئة</span>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {cats.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
              </select>
            </label>
          </div>

          <label className="admin-field">
            <span>القسم الفرعي</span>
            <select value={form.sub} onChange={(e) => set('sub', e.target.value)}>
              {subs.map((s) => <option key={s.slug} value={s.slug}>{s.title}</option>)}
            </select>
          </label>

          <div className="admin-grid2">
            <label className="admin-field">
              <span>الاسم (عربي)</span>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="حذاء كلاسيكي" />
            </label>
            <label className="admin-field">
              <span>الاسم (إنجليزي)</span>
              <input value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Classic Shoe" dir="ltr" />
            </label>
          </div>

          <div className="admin-grid2">
            <label className="admin-field">
              <span>الوصف (عربي)</span>
              <textarea rows={2} value={form.blurb} onChange={(e) => set('blurb', e.target.value)} />
            </label>
            <label className="admin-field">
              <span>الوصف (إنجليزي)</span>
              <textarea rows={2} value={form.blurbEn} onChange={(e) => set('blurbEn', e.target.value)} dir="ltr" />
            </label>
          </div>

          <div className="admin-grid2">
            <label className="admin-field">
              <span>السعر (د.ع)</span>
              <input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="50000" dir="ltr" />
            </label>
            <label className="admin-field">
              <span>السعر قبل التخفيض (اختياري)</span>
              <input type="number" value={form.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} placeholder="—" dir="ltr" />
            </label>
          </div>

          <div className="admin-field">
            <span>خصم سريع {discount > 0 && <b className="admin-pill-sale">−{discount}%</b>}</span>
            <div className="admin-chips">
              {[20, 30, 40, 50, 70].map((p) => (
                <button type="button" key={p} className="admin-chip" onClick={() => applyDiscount(p)}>{p}%</button>
              ))}
              <button type="button" className="admin-chip" onClick={() => set('oldPrice', '')}>بدون خصم</button>
            </div>
          </div>

          <label className="admin-field">
            <span>الشارة</span>
            <select value={form.badge} onChange={(e) => set('badge', e.target.value)}>
              {BADGES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </label>

          <div className="admin-field">
            <span>الألوان</span>
            <div className="admin-chips">
              {PALETTE.map((c) => {
                const on = form.colors.some((x) => x.name === c.name);
                return (
                  <button type="button" key={c.name} className={`admin-swatch ${on ? 'is-on' : ''}`} onClick={() => toggleColor(c)} title={c.name}>
                    <span style={{ background: c.hex }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="admin-field">
            <span>المقاسات</span>
            <div className="admin-chips">
              {Object.entries(SIZE_PRESETS).map(([label, arr]) => (
                <button type="button" key={label} className="admin-chip" onClick={() => set('sizes', arr)}>{label}</button>
              ))}
            </div>
            <input
              value={form.sizes.join(', ')}
              onChange={(e) => set('sizes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              placeholder="40, 41, 42…"
              dir="ltr"
              style={{ marginTop: '0.5rem' }}
            />
          </div>

          <div className="admin-grid2">
            <label className="admin-field">
              <span>الخامة (عربي)</span>
              <input value={form.material} onChange={(e) => set('material', e.target.value)} placeholder="جلد طبيعي" />
            </label>
            <label className="admin-field">
              <span>الخامة (إنجليزي)</span>
              <input value={form.materialEn} onChange={(e) => set('materialEn', e.target.value)} placeholder="Genuine leather" dir="ltr" />
            </label>
          </div>

          <div className="admin-field">
            <span>الصور (من الجهاز)</span>
            <input type="file" accept="image/*" multiple onChange={(e) => setFiles([...e.target.files])} />
            <div className="admin-thumbs">
              {(form.images || []).map((u) => (
                <span className="admin-thumb" key={u}>
                  <img src={u} alt="" />
                  <button type="button" onClick={() => set('images', form.images.filter((x) => x !== u))}>✕</button>
                </span>
              ))}
              {previews.map((u, i) => (
                <span className="admin-thumb admin-thumb--new" key={u}>
                  <img src={u} alt="" />
                  <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
                </span>
              ))}
            </div>
          </div>

          {err && <p className="admin-auth__error">{err}</p>}
          {form.price && (
            <p className="admin-preview-price">
              السعر المعروض: <b>{formatPrice(Number(form.price))}</b>
              {form.oldPrice && <s style={{ marginInlineStart: 8, opacity: 0.6 }}>{formatPrice(Number(form.oldPrice))}</s>}
            </p>
          )}
        </div>

        <footer className="admin-modal__foot">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>إلغاء</button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ المنتج'}
          </button>
        </footer>
      </form>
    </div>
  );
}
