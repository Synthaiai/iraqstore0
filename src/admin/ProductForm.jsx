import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES, SUBCATEGORIES } from '../data/catalog';
import { formatPrice } from '../data/products';
import { uploadImage } from '../data/upload';
import { compressImage, formatBytes } from '../utils/imageCompressor';
import { parseSmartPrice } from '../utils/smartPrice';
import { autoTranslateProduct, translateArabicAsync, translateText } from '../utils/translator';

const PRODUCT_TYPES = [
  { id: 'shoes', label: '👟 أحذية (Footwear)', icon: '👟' },
  { id: 'clothing', label: '👔 ملابس (Clothing)', icon: '👔' },
  { id: 'perfume', label: '🧪 عطور وتجميل (Perfumes)', icon: '🧪' },
  { id: 'bags', label: '👜 حقائب وإكسسوارات (Bags)', icon: '👜' },
  { id: 'watches', label: '⌚ ساعات ومجوهرات (Watches)', icon: '⌚' },
  { id: 'general', label: '📦 عام / منتج آخر (General)', icon: '📦' },
];

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
  { name: 'وردي', nameEn: 'Pink', hex: '#E8A5B8' },
  { name: 'سماوي', nameEn: 'Sky Blue', hex: '#9BBECB' },
];

const SIZE_PRESETS = {
  'أحذية رجالية': ['40', '41', '42', '43', '44', '45', '46'],
  'أحذية نسائية': ['36', '37', '38', '39', '40', '41'],
  'ملابس (أحرف)': ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  'ملابس (رقمي)': ['36', '38', '40', '42', '44', '46'],
  'عطور (حجم)': ['50 ml', '100 ml', '150 ml', '200 ml'],
  'مقاس واحد': ['مقاس واحد'],
};

const BADGES = [
  { value: '', label: 'بدون شارة' },
  { value: 'new', label: 'جديد ✨' },
  { value: 'sale', label: 'تخفيض 🔥' },
  { value: 'best', label: 'الأكثر مبيعًا ⭐️' },
];

const empty = {
  type: 'shoes',
  gender: 'men',
  category: 'shoes',
  sub: '',
  name: '',
  nameEn: '',
  blurb: '',
  blurbEn: '',
  price: '',
  oldPrice: '',
  badge: '',
  material: '',
  materialEn: '',
  colors: [],
  sizes: [],
  images: [],
  // Type specific details
  stockQuantity: 15,
  status: 'active', // 'active' | 'draft'
  heelType: '',
  soleMaterial: '',
  fitType: '',
  perfumeVolume: '',
  perfumeNotes: '',
  perfumeConcentration: '',
  customSpecs: [], // [{ key: '', value: '' }]
};

export default function ProductForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...empty, ...(initial || {}) }));
  const [files, setFiles] = useState([]);
  const [compressionStats, setCompressionStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [err, setErr] = useState('');
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#336699');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const cats = CATEGORIES[form.gender] || [];
  const subs = (SUBCATEGORIES[`${form.gender}/${form.category}`] || []).filter((s) => s.slug !== 'all');

  useEffect(() => {
    if (!cats.find((c) => c.slug === form.category)) {
      set('category', cats[0]?.slug || 'shoes');
    }
  }, [form.gender]);

  useEffect(() => {
    if (form.sub && !subs.find((s) => s.slug === form.sub)) {
      set('sub', subs[0]?.slug || '');
    }
    if (!form.sub && subs[0]) {
      set('sub', subs[0].slug);
    }
  }, [form.gender, form.category]);

  // Auto-translate Arabic inputs to English in real-time with online API backup
  const handleArabicNameChange = (val) => {
    setForm((f) => {
      const translated = autoTranslateProduct({ name: val, blurb: f.blurb, material: f.material });
      return { ...f, name: val, nameEn: translated.nameEn };
    });
    if (val.trim()) {
      translateArabicAsync(val).then((tr) => {
        if (tr) setForm((f) => ({ ...f, nameEn: tr }));
      });
    }
  };

  const handleArabicBlurbChange = (val) => {
    setForm((f) => {
      const translated = autoTranslateProduct({ name: f.name, blurb: val, material: f.material });
      return { ...f, blurb: val, blurbEn: translated.blurbEn };
    });
    if (val.trim()) {
      translateArabicAsync(val).then((tr) => {
        if (tr) setForm((f) => ({ ...f, blurbEn: tr }));
      });
    }
  };

  const handleArabicMaterialChange = (val) => {
    setForm((f) => {
      const translated = autoTranslateProduct({ name: f.name, blurb: f.blurb, material: val });
      return { ...f, material: val, materialEn: translated.materialEn };
    });
    if (val.trim()) {
      translateArabicAsync(val).then((tr) => {
        if (tr) setForm((f) => ({ ...f, materialEn: tr }));
      });
    }
  };

  // Image Upload & Compression Handler — max 4 images per product.
  const MAX_IMAGES = 4;
  const handleFileSelection = async (selectedFiles) => {
    if (!selectedFiles || !selectedFiles.length) return;
    const existing = (form.images || []).length;
    const slots = Math.max(0, MAX_IMAGES - existing);
    if (slots === 0) {
      setErr(`الحد الأقصى ${MAX_IMAGES} صور للمنتج`);
      return;
    }
    const fileList = Array.from(selectedFiles).slice(0, slots);
    if (Array.from(selectedFiles).length > slots) {
      setErr(`تم اختيار أول ${slots} صور فقط (الحد الأقصى ${MAX_IMAGES})`);
    }
    setFiles(fileList);

    // Run preview compression statistics
    let orig = 0;
    let comp = 0;
    for (const f of fileList) {
      orig += f.size;
      const res = await compressImage(f, 1000, 0.75);
      comp += res.compressedSize;
    }

    setCompressionStats({
      original: formatBytes(orig),
      compressed: formatBytes(comp),
      savings: Math.round((1 - comp / orig) * 100),
    });
  };

  const toggleColor = (c) =>
    setForm((f) => ({
      ...f,
      colors: f.colors.some((x) => x.name === c.name)
        ? f.colors.filter((x) => x.name !== c.name)
        : [...f.colors, c],
    }));

  const addCustomColor = () => {
    if (!customColorName) return;
    const c = { name: customColorName, nameEn: translateText(customColorName), hex: customColorHex };
    toggleColor(c);
    setCustomColorName('');
  };

  const toggleSize = (sizeStr) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(sizeStr)
        ? f.sizes.filter((s) => s !== sizeStr)
        : [...f.sizes, sizeStr],
    }));
  };

  const addCustomSpec = () => {
    setForm((f) => ({
      ...f,
      customSpecs: [...(f.customSpecs || []), { key: '', value: '' }],
    }));
  };

  const updateCustomSpec = (idx, field, value) => {
    setForm((f) => {
      const updated = [...(f.customSpecs || [])];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...f, customSpecs: updated };
    });
  };

  const removeCustomSpec = (idx) => {
    setForm((f) => ({
      ...f,
      customSpecs: (f.customSpecs || []).filter((_, i) => i !== idx),
    }));
  };

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  const currentPrice = parseSmartPrice(form.price);
  const currentOldPrice = parseSmartPrice(form.oldPrice);

  const discount =
    currentOldPrice && currentPrice ? Math.round((1 - currentPrice / currentOldPrice) * 100) : 0;

  const applyDiscount = (pct) => {
    if (!currentPrice) return setErr('أدخل السعر أولًا');
    setErr('');
    set('oldPrice', String(Math.round(currentPrice / (1 - pct / 100))));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price) return setErr('اسم المنتج والسعر مطلوبة');
    setBusy(true);
    setErr('');
    setStatusText('جارٍ ضغط وحفظ الصور…');

    try {
      let images = form.images || [];
      if (files.length) {
        const uploaded = await Promise.all(files.map((f) => uploadImage(f, 'products')));
        images = [...images, ...uploaded.filter(Boolean)];
      }
      // Never persist more than 4 images.
      images = images.slice(0, 4);

      if (!images.length) {
        setBusy(false);
        return setErr('أضف صورة واحدة على الأقل للمنتج');
      }

      setStatusText('جارٍ حفظ البيانات…');
      const id = form.id || `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

      // Construct complete record with dynamic details
      const parsedPrice = parseSmartPrice(form.price);
      const parsedOldPrice = form.oldPrice ? parseSmartPrice(form.oldPrice) : null;

      const record = {
        ...form,
        id,
        nameEn: form.nameEn || translateText(form.name),
        blurbEn: form.blurbEn || translateText(form.blurb || ''),
        materialEn: form.materialEn || translateText(form.material || ''),
        price: Number(parsedPrice),
        oldPrice: parsedOldPrice ? Number(parsedOldPrice) : null,
        sizes: form.sizes.length ? form.sizes : ['مقاس واحد'],
        images,
      };

      await onSave(record);
      setBusy(false);
    } catch (e2) {
      console.error(e2);
      setErr('حدث خطأ أثناء الحفظ — تمت المحاولة محلياً.');
      setBusy(false);
    }
  };

  return (
    <div className="admin-modal" onClick={onCancel}>
      <form className="admin-modal__panel admin-modal__panel--lg" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="admin-modal__head">
          <div>
            <h2>{form.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
            <span className="admin-modal__sub">توليد الترجمة وضغط الصور يتم تلقائياً ✨</span>
          </div>
          <button type="button" className="admin-icon" onClick={onCancel} aria-label="إغلاق">✕</button>
        </header>

        <div className="admin-modal__body">
          {/* STEP 1: Product Type Selector */}
          <div className="admin-field admin-field--highlight">
            <span>نوع المنتج (يحدد الخصائص والقياسات المطلوبة)</span>
            <div className="admin-type-grid">
              {PRODUCT_TYPES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`admin-type-card ${form.type === t.id ? 'is-active' : ''}`}
                  onClick={() => set('type', t.id)}
                >
                  <span className="admin-type-card__icon">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 2: Category & Navigation */}
          <div className="admin-grid3">
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
                {cats.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.title}</option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>القسم الفرعي</span>
              <select value={form.sub} onChange={(e) => set('sub', e.target.value)}>
                {subs.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.title}</option>
                ))}
              </select>
            </label>
          </div>

          {/* STEP 3: Basic Info with Auto-Translation */}
          <div className="admin-grid2">
            <label className="admin-field">
              <span>اسم المنتج (عربي) *</span>
              <input
                value={form.name}
                onChange={(e) => handleArabicNameChange(e.target.value)}
                placeholder="مثال: حذاء رياضي أبيض كلاسيكي"
                required
              />
            </label>

            <label className="admin-field">
              <span>اسم المنتج بالإنجليزية (مترجم تلقائياً ✨)</span>
              <input
                value={form.nameEn}
                onChange={(e) => set('nameEn', e.target.value)}
                placeholder="White Classic Sneaker"
                dir="ltr"
              />
            </label>
          </div>

          <div className="admin-grid2">
            <label className="admin-field">
              <span>الوصف والتفاصيل (عربي)</span>
              <textarea
                rows={2}
                value={form.blurb}
                onChange={(e) => handleArabicBlurbChange(e.target.value)}
                placeholder="وصف مميزات المنتج والتفاصيل التي تهم الزبون..."
              />
            </label>

            <label className="admin-field">
              <span>الوصف بالإنجليزية (مترجم تلقائياً ✨)</span>
              <textarea
                rows={2}
                value={form.blurbEn}
                onChange={(e) => set('blurbEn', e.target.value)}
                dir="ltr"
              />
            </label>
          </div>

          {/* STEP 4: Pricing, Inventory & Badges */}
          <div className="admin-grid3">
            <label className="admin-field">
              <span>السعر النهائي (د.ع) *</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                onBlur={() => {
                  if (form.price) {
                    const parsed = parseSmartPrice(form.price);
                    if (parsed) set('price', String(parsed));
                  }
                }}
                placeholder="مثال: 19 أو 19.5 أو 19000"
                dir="ltr"
                required
              />
              {form.price && parseSmartPrice(form.price) > 0 && (
                <small className="admin-smart-price-badge">
                  ✨ تكملة الآلاف تلقائياً: {formatPrice(parseSmartPrice(form.price))}
                </small>
              )}
            </label>

            <label className="admin-field">
              <span>السعر قبل التخفيض (اختياري)</span>
              <input
                type="text"
                inputMode="decimal"
                value={form.oldPrice}
                onChange={(e) => set('oldPrice', e.target.value)}
                onBlur={() => {
                  if (form.oldPrice) {
                    const parsed = parseSmartPrice(form.oldPrice);
                    if (parsed) set('oldPrice', String(parsed));
                  }
                }}
                placeholder="مثال: 25 أو 25000"
                dir="ltr"
              />
              {form.oldPrice && parseSmartPrice(form.oldPrice) > 0 && (
                <small className="admin-smart-price-badge">
                  ✨ تكملة الآلاف تلقائياً: {formatPrice(parseSmartPrice(form.oldPrice))}
                </small>
              )}
            </label>

            <label className="admin-field">
              <span>شارة المنتج</span>
              <select value={form.badge} onChange={(e) => set('badge', e.target.value)}>
                {BADGES.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-grid2">
            <label className="admin-field">
              <span>الكمية المتاحة بالمعرض/المخزون</span>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={(e) => set('stockQuantity', Number(e.target.value))}
                placeholder="15"
                dir="ltr"
              />
            </label>

            <label className="admin-field">
              <span>حالة العرض بالمتجر</span>
              <select value={form.status || 'active'} onChange={(e) => set('status', e.target.value)}>
                <option value="active">🟢 نشط ومعروض للزبائن</option>
                <option value="draft">🟡 مسودة (مخفي من المتجر)</option>
              </select>
            </label>
          </div>

          <div className="admin-field">
            <span>خصم سريع {discount > 0 && <b className="admin-pill-sale">−{discount}%</b>}</span>
            <div className="admin-chips">
              {[15, 20, 25, 30, 40, 50].map((p) => (
                <button type="button" key={p} className="admin-chip" onClick={() => applyDiscount(p)}>
                  خصم {p}%
                </button>
              ))}
              <button type="button" className="admin-chip" onClick={() => set('oldPrice', '')}>إلغاء الخصم</button>
            </div>
          </div>

          {/* STEP 5: Dynamic Questions based on Product Type */}
          <div className="admin-section-divider">
            <span>تفاصيل ومواصفات مخصصة لـ ({PRODUCT_TYPES.find((t) => t.id === form.type)?.label})</span>
          </div>

          {form.type === 'shoes' && (
            <div className="admin-grid3">
              <label className="admin-field">
                <span>نوع النعل / الكعب</span>
                <input
                  value={form.heelType || ''}
                  onChange={(e) => set('heelType', e.target.value)}
                  placeholder="مثال: فلات، كعب عالي 7 سم، نعل مريح..."
                />
              </label>

              <label className="admin-field">
                <span>خامة النعل السفلي</span>
                <input
                  value={form.soleMaterial || ''}
                  onChange={(e) => set('soleMaterial', e.target.value)}
                  placeholder="مطاط مقاوم للانزلاق، كريب..."
                />
              </label>

              <label className="admin-field">
                <span>خامة الحذاء الخارجية</span>
                <input
                  value={form.material}
                  onChange={(e) => handleArabicMaterialChange(e.target.value)}
                  placeholder="جلد طبيعي، شمواه، شبك..."
                />
              </label>
            </div>
          )}

          {form.type === 'clothing' && (
            <div className="admin-grid3">
              <label className="admin-field">
                <span>نوع القماش / الخامة</span>
                <input
                  value={form.material}
                  onChange={(e) => handleArabicMaterialChange(e.target.value)}
                  placeholder="قطن 100%، كتان، صوف مخلوط..."
                />
              </label>

              <label className="admin-field">
                <span>نوع القَصّة (Fit Type)</span>
                <input
                  value={form.fitType || ''}
                  onChange={(e) => set('fitType', e.target.value)}
                  placeholder="سليم فيت (Slim)، أوفرسايز، كلاسيك..."
                />
              </label>

              <label className="admin-field">
                <span>الخامة بالإنجليزية</span>
                <input
                  value={form.materialEn}
                  onChange={(e) => set('materialEn', e.target.value)}
                  placeholder="100% Cotton, Linen..."
                  dir="ltr"
                />
              </label>
            </div>
          )}

          {form.type === 'perfume' && (
            <div className="admin-grid3">
              <label className="admin-field">
                <span>الحجم / السعة</span>
                <input
                  value={form.perfumeVolume || ''}
                  onChange={(e) => set('perfumeVolume', e.target.value)}
                  placeholder="100 ml, 50 ml..."
                />
              </label>

              <label className="admin-field">
                <span>درجة التركيز</span>
                <input
                  value={form.perfumeConcentration || ''}
                  onChange={(e) => set('perfumeConcentration', e.target.value)}
                  placeholder="Eau de Parfum / العطر الفاخر"
                />
              </label>

              <label className="admin-field">
                <span>النوتات العطرية الرئيسية</span>
                <input
                  value={form.perfumeNotes || ''}
                  onChange={(e) => set('perfumeNotes', e.target.value)}
                  placeholder="عود، مسك، عنبر، صندل، حمضيات..."
                />
              </label>
            </div>
          )}

          {/* STEP 6: Multi-Color Picker */}
          <div className="admin-field">
            <span>الألوان المتاحة للمنتج</span>
            <div className="admin-chips">
              {PALETTE.map((c) => {
                const on = form.colors.some((x) => x.name === c.name);
                return (
                  <button
                    type="button"
                    key={c.name}
                    className={`admin-swatch ${on ? 'is-on' : ''}`}
                    onClick={() => toggleColor(c)}
                  >
                    <span style={{ background: c.hex }} />
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Custom color input */}
            <div className="admin-color-custom">
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                className="admin-color-picker"
              />
              <input
                value={customColorName}
                onChange={(e) => setCustomColorName(e.target.value)}
                placeholder="اسم لون مخصص (مثال: ماروني، زيتوني...)"
              />
              <button type="button" className="admin-btn admin-btn--sm" onClick={addCustomColor}>
                + إضافة هذا اللون
              </button>
            </div>
          </div>

          {/* STEP 7: Multi-Size Picker */}
          <div className="admin-field">
            <span>القياسات الأحجام المتاحة</span>
            <div className="admin-chips admin-chips--presets">
              {Object.entries(SIZE_PRESETS).map(([label, arr]) => (
                <button
                  type="button"
                  key={label}
                  className="admin-chip admin-chip--accent"
                  onClick={() => set('sizes', arr)}
                >
                  تحديد {label}
                </button>
              ))}
            </div>

            <div className="admin-sizes-selector">
              {['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '50 ml', '100 ml', 'مقاس واحد'].map((sz) => (
                <button
                  type="button"
                  key={sz}
                  className={`admin-size-box ${form.sizes.includes(sz) ? 'is-on' : ''}`}
                  onClick={() => toggleSize(sz)}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 8: Custom Specs Table */}
          <div className="admin-field">
            <div className="admin-flex-between">
              <span>مواصفات وتفاصيل مخصصة أخرى</span>
              <button type="button" className="admin-btn admin-btn--sm" onClick={addCustomSpec}>
                + إضافة خاصية جديدة
              </button>
            </div>

            {(form.customSpecs || []).length > 0 && (
              <div className="admin-specs-list">
                {form.customSpecs.map((spec, idx) => (
                  <div className="admin-spec-row" key={idx}>
                    <input
                      placeholder="اسم الخاصية (مثال: بلد الصنع)"
                      value={spec.key}
                      onChange={(e) => updateCustomSpec(idx, 'key', e.target.value)}
                    />
                    <input
                      placeholder="القيمة (مثال: إيطاليا)"
                      value={spec.value}
                      onChange={(e) => updateCustomSpec(idx, 'value', e.target.value)}
                    />
                    <button type="button" className="admin-icon-btn admin-icon-btn--danger" onClick={() => removeCustomSpec(idx)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 9: Client Image Compressor & Upload */}
          <div className="admin-field admin-field--highlight">
            <div className="admin-flex-between">
              <span>صور المنتج — حتى ٤ صور (تُضغط تلقائياً 🗜️)</span>
              {compressionStats && (
                <span className="admin-compress-badge">
                  تم الضغط: {compressionStats.original} ➔ {compressionStats.compressed} (وفّر {compressionStats.savings}%)
                </span>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              disabled={(form.images || []).length + files.length >= 4}
              onChange={(e) => handleFileSelection(e.target.files)}
            />

            <div className="admin-thumbs">
              {(form.images || []).map((u) => (
                <span className="admin-thumb" key={u}>
                  <img src={u} alt="" />
                  <button
                    type="button"
                    onClick={() => set('images', form.images.filter((x) => x !== u))}
                  >
                    ✕
                  </button>
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
          {form.price && parseSmartPrice(form.price) > 0 && (
            <p className="admin-preview-price">
              السعر المعروض للزبون: <b>{formatPrice(parseSmartPrice(form.price))}</b>
              {form.oldPrice && parseSmartPrice(form.oldPrice) > 0 && (
                <s style={{ marginInlineStart: 8, opacity: 0.6 }}>{formatPrice(parseSmartPrice(form.oldPrice))}</s>
              )}
            </p>
          )}
        </div>

        <footer className="admin-modal__foot">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel} disabled={busy}>
            إلغاء
          </button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            {busy ? statusText || 'جارٍ الحفظ…' : 'حفظ المنتج'}
          </button>
        </footer>
      </form>
    </div>
  );
}
