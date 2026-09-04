import { useEffect, useMemo, useState } from 'react';
import { CATEGORIES } from '../data/catalog';
import { formatPrice } from '../data/products';
import { saveProductsBatch } from '../data/remote';

export default function ProductReorderPanel({ products }) {
  const [genderFilter, setGenderFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');
  const [list, setList] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Sync internal list when products change
  useEffect(() => {
    const sorted = [...(products || [])].sort(
      (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)
    );
    setList(sorted);
  }, [products]);

  // Categories list for selected gender
  const availableCats = useMemo(() => {
    if (genderFilter === 'men') return CATEGORIES.men;
    if (genderFilter === 'women') return CATEGORIES.women;
    return [...CATEGORIES.men, ...CATEGORIES.women];
  }, [genderFilter]);

  // Filtered view
  const displayItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      const matchGender = !genderFilter || p.gender === genderFilter;
      const matchCategory = !categoryFilter || p.category === categoryFilter;
      const matchQ =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.nameEn && p.nameEn.toLowerCase().includes(q));
      return matchGender && matchCategory && matchQ;
    });
  }, [list, genderFilter, categoryFilter, search]);

  // Helper to reassign sortOrder based on current list order
  const persistOrder = async (newList) => {
    const updated = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    setList(updated);
    setSaving(true);
    setMsg('');
    try {
      await saveProductsBatch(updated, { reorderOnly: true });
      setMsg('✅ تم حفظ الترتيب بنجاح ويظهر الآن في المتجر!');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg(`⚠️ لم يتم حفظ الترتيب: ${e?.message || 'تحقق من الاتصال.'}`);
    } finally {
      setSaving(false);
    }
  };

  // Move 1 position Up
  const moveUp = (item) => {
    const currentIdx = list.findIndex((p) => p.id === item.id);
    if (currentIdx <= 0) return;
    const targetIdx = currentIdx - 1;
    const next = [...list];
    const temp = next[currentIdx];
    next[currentIdx] = next[targetIdx];
    next[targetIdx] = temp;
    persistOrder(next);
  };

  // Move 1 position Down
  const moveDown = (item) => {
    const currentIdx = list.findIndex((p) => p.id === item.id);
    if (currentIdx < 0 || currentIdx >= list.length - 1) return;
    const targetIdx = currentIdx + 1;
    const next = [...list];
    const temp = next[currentIdx];
    next[currentIdx] = next[targetIdx];
    next[targetIdx] = temp;
    persistOrder(next);
  };

  // Move directly to Top (First)
  const moveToTop = (item) => {
    const currentIdx = list.findIndex((p) => p.id === item.id);
    if (currentIdx <= 0) return;
    const next = [item, ...list.filter((p) => p.id !== item.id)];
    persistOrder(next);
  };

  // Move directly to Bottom (Last)
  const moveToBottom = (item) => {
    const currentIdx = list.findIndex((p) => p.id === item.id);
    if (currentIdx < 0 || currentIdx === list.length - 1) return;
    const next = [...list.filter((p) => p.id !== item.id), item];
    persistOrder(next);
  };

  // Direct number input
  const handleDirectRankChange = (item, newRankStr) => {
    const targetRank = parseInt(newRankStr, 10);
    if (isNaN(targetRank) || targetRank < 1) return;
    const targetIdx = Math.min(Math.max(0, targetRank - 1), list.length - 1);
    const withoutItem = list.filter((p) => p.id !== item.id);
    withoutItem.splice(targetIdx, 0, item);
    persistOrder(withoutItem);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, targetDisplayIdx) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetDisplayIdx) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const draggedItem = displayItems[draggedIndex];
    const targetItem = displayItems[targetDisplayIdx];

    const actualDraggedIdx = list.findIndex((p) => p.id === draggedItem.id);
    const actualTargetIdx = list.findIndex((p) => p.id === targetItem.id);

    if (actualDraggedIdx < 0 || actualTargetIdx < 0) return;

    const next = [...list];
    next.splice(actualDraggedIdx, 1);
    next.splice(actualTargetIdx, 0, draggedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    persistOrder(next);
  };

  return (
    <div className="admin-panel admin-reorder-panel">
      {/* Header Info */}
      <div className="admin-card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ↕️ ترتيب ظهور المنتجات في المتجر
            </h3>
            <p style={{ margin: '0.3rem 0 0', color: 'var(--a-dim)', fontSize: '0.9rem' }}>
              اسحب أي منتج أو استخدم أزرار (صعود ⬆️ / نزول ⬇️ / الأول 🔝) للتحكم بترتيب عرض المنتجات أمام الزبائن فوراً.
            </p>
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            onClick={() => persistOrder(list)}
            disabled={saving}
          >
            {saving ? 'جارٍ الحفظ…' : '💾 حفظ الترتيب الآن'}
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="admin-toolbar">
        <input
          className="admin-search"
          placeholder="ابحث باسم المنتج لتغيير ترتيبه..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setCategoryFilter(''); }}>
          <option value="">جميع الأقسام (رجالي ونسائي)</option>
          <option value="men">قسم الرجال 👔</option>
          <option value="women">قسم النساء 👗</option>
        </select>

        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">جميع الفئات</option>
          {availableCats.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.title} ({c.latin})
            </option>
          ))}
        </select>

        <span className="admin-count">{displayItems.length} منتج</span>
      </div>

      {msg && <p className="admin-note admin-note--ok" style={{ margin: '0.75rem 0' }}>{msg}</p>}

      {/* Products Vertical Reorder List */}
      {displayItems.length === 0 ? (
        <div className="admin-empty">
          <p>لا توجد منتجات مطابقة لهذا الفلتر أو البحث.</p>
        </div>
      ) : (
        <div className="admin-reorder-list">
          {displayItems.map((p, idx) => {
            const actualRank = list.findIndex((item) => item.id === p.id) + 1;
            const isFirst = actualRank === 1;
            const isLast = actualRank === list.length;
            const isDragging = draggedIndex === idx;
            const isDragOver = dragOverIndex === idx;

            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={() => { setDraggedIndex(null); setDragOverIndex(null); }}
                className={`admin-reorder-card ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-dragover' : ''}`}
              >
                {/* Drag Handle */}
                <div className="admin-reorder-handle" title="اسحب لتغيير الترتيب">
                  ⠿
                </div>

                {/* Rank Badge */}
                <div className="admin-reorder-rank">
                  <span className="admin-rank-num">#{actualRank}</span>
                  <input
                    type="number"
                    min="1"
                    max={list.length}
                    value={actualRank}
                    onChange={(e) => handleDirectRankChange(p, e.target.value)}
                    className="admin-rank-input"
                    title="اكتب رقم الترتيب مباشرة"
                  />
                </div>

                {/* Thumbnail */}
                <img
                  src={p.images?.[0] || p.image || '/logo.jpg'}
                  alt=""
                  className="admin-reorder-thumb"
                  loading="lazy"
                />

                {/* Product Info */}
                <div className="admin-reorder-info">
                  <div className="admin-reorder-title-row">
                    <strong>{p.name}</strong>
                    {p.badge && (
                      <span className="admin-tag admin-tag--accent">{p.badge}</span>
                    )}
                  </div>
                  <div className="admin-reorder-sub-row">
                    <span>{p.nameEn || ''}</span>
                    <span className="admin-dim">
                      {p.gender === 'men' ? 'رجالي' : 'نسائي'} · {p.category} / {p.sub}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="admin-reorder-price">
                  <strong>{formatPrice(p.price)}</strong>
                </div>

                {/* Ordering Buttons */}
                <div className="admin-reorder-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={() => moveToTop(p)}
                    disabled={isFirst}
                    title="اجعل هذا المنتج في قمة المتجر أول واحد"
                  >
                    🔝 الأول
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={() => moveUp(p)}
                    disabled={isFirst}
                    title="تحريك خطوة للأعلى"
                  >
                    ⬆️ صعود
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm"
                    onClick={() => moveDown(p)}
                    disabled={isLast}
                    title="تحريك خطوة للأسفل"
                  >
                    ⬇️ نزول
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--sm admin-btn--ghost"
                    onClick={() => moveToBottom(p)}
                    disabled={isLast}
                    title="نقل هذا المنتج لآخر القائمة"
                  >
                    🔚 الأخير
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
