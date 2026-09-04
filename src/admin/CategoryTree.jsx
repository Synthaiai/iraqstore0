import { useState } from 'react';
import {
  INITIAL_CATEGORIES,
  INITIAL_GENDERS,
  INITIAL_SUBCATEGORIES,
  getFullCatalogTree,
  updateCatalogStore,
} from '../data/catalog';
import { saveCatalog } from '../data/remote';
import { translateText } from '../utils/translator';
import { uploadImage } from '../data/upload';

export default function CategoryTree({ products, onCatalogUpdated }) {
  const [tree, setTree] = useState(() => getFullCatalogTree());
  const [editingItem, setEditingItem] = useState(null); // { type: 'gender'|'category'|'sub', parentGender, parentCat, item }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const countProducts = (g, c, s) => {
    return (products || []).filter(
      (p) => p.gender === g && (!c || p.category === c) && (!s || p.sub === s)
    ).length;
  };

  const persist = async (newTree) => {
    setTree(newTree);
    updateCatalogStore(newTree);
    setBusy(true);
    setMsg('');
    try {
      await saveCatalog(newTree);
      setMsg('تم حفظ شجرة الأقسام بنجاح.');
      if (onCatalogUpdated) onCatalogUpdated();
    } catch {
      setMsg('تم الحفظ في التخزين المحلي.');
    } finally {
      setBusy(false);
    }
  };

  // Add or Edit Handler
  const saveItem = (formData) => {
    if (!editingItem) return;
    const { type, parentGender, parentCat, isNew, item } = editingItem;
    const slug = formData.slug || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const updatedTree = JSON.parse(JSON.stringify(tree));

    if (type === 'gender') {
      const genders = updatedTree.genders || [];
      const newItem = {
        slug,
        title: formData.title,
        latin: formData.latin || translateText(formData.title),
        tagline: formData.tagline || '',
        taglineEn: formData.taglineEn || translateText(formData.tagline || ''),
        cover: formData.cover !== undefined ? formData.cover : (item?.cover || ''),
      };
      if (isNew) {
        genders.push(newItem);
        if (!updatedTree.categories[slug]) updatedTree.categories[slug] = [];
      } else {
        const idx = genders.findIndex((g) => g.slug === item.slug);
        if (idx >= 0) genders[idx] = { ...genders[idx], ...newItem };
      }
      updatedTree.genders = genders;
    } else if (type === 'category') {
      const cats = updatedTree.categories[parentGender] || [];
      const newItem = {
        slug,
        title: formData.title,
        latin: formData.latin || translateText(formData.title),
        blurb: formData.blurb || '',
        blurbEn: formData.blurbEn || translateText(formData.blurb || ''),
        cover: formData.cover !== undefined ? formData.cover : (item?.cover || ''),
      };
      if (isNew) {
        cats.push(newItem);
        const subKey = `${parentGender}/${slug}`;
        if (!updatedTree.subcategories[subKey]) {
          updatedTree.subcategories[subKey] = [
            { slug: 'all', title: `كل ${formData.title}`, latin: `All ${newItem.latin}`, feature: true },
          ];
        }
      } else {
        const idx = cats.findIndex((c) => c.slug === item.slug);
        if (idx >= 0) cats[idx] = { ...cats[idx], ...newItem };
      }
      updatedTree.categories[parentGender] = cats;
    } else if (type === 'sub') {
      const subKey = `${parentGender}/${parentCat}`;
      const subs = updatedTree.subcategories[subKey] || [];
      const newItem = {
        slug,
        title: formData.title,
        latin: formData.latin || translateText(formData.title),
        cover: formData.cover !== undefined ? formData.cover : (item?.cover || ''),
      };
      if (isNew) {
        subs.push(newItem);
      } else {
        const idx = subs.findIndex((s) => s.slug === item.slug);
        if (idx >= 0) {
          subs[idx] = { ...subs[idx], ...newItem };
        }
      }
      updatedTree.subcategories[subKey] = subs;
    }

    setEditingItem(null);
    persist(updatedTree);
  };

  const moveSubcategory = (parentGender, parentCat, targetSlug, direction) => {
    const subKey = `${parentGender}/${parentCat}`;
    const updatedTree = JSON.parse(JSON.stringify(tree));
    const subs = [...(updatedTree.subcategories[subKey] || [])];
    
    const allItem = subs.find((s) => s.slug === 'all');
    const realSubs = subs.filter((s) => s.slug !== 'all');
    const realIdx = realSubs.findIndex((s) => s.slug === targetSlug);
    if (realIdx < 0) return;

    if (direction === 'top') {
      const item = realSubs[realIdx];
      const newReal = [item, ...realSubs.filter((s) => s.slug !== targetSlug)];
      updatedTree.subcategories[subKey] = allItem ? [allItem, ...newReal] : newReal;
    } else if (direction === 'bottom') {
      const item = realSubs[realIdx];
      const newReal = [...realSubs.filter((s) => s.slug !== targetSlug), item];
      updatedTree.subcategories[subKey] = allItem ? [allItem, ...newReal] : newReal;
    } else if (direction === 'up' && realIdx > 0) {
      const temp = realSubs[realIdx];
      realSubs[realIdx] = realSubs[realIdx - 1];
      realSubs[realIdx - 1] = temp;
      updatedTree.subcategories[subKey] = allItem ? [allItem, ...realSubs] : realSubs;
    } else if (direction === 'down' && realIdx < realSubs.length - 1) {
      const temp = realSubs[realIdx];
      realSubs[realIdx] = realSubs[realIdx + 1];
      realSubs[realIdx + 1] = temp;
      updatedTree.subcategories[subKey] = allItem ? [allItem, ...realSubs] : realSubs;
    }

    persist(updatedTree);
  };

  const moveCategory = (parentGender, targetSlug, direction) => {
    const updatedTree = JSON.parse(JSON.stringify(tree));
    const cats = [...(updatedTree.categories[parentGender] || [])];
    const idx = cats.findIndex((c) => c.slug === targetSlug);
    if (idx < 0) return;

    if (direction === 'up' && idx > 0) {
      const temp = cats[idx];
      cats[idx] = cats[idx - 1];
      cats[idx - 1] = temp;
      updatedTree.categories[parentGender] = cats;
      persist(updatedTree);
    } else if (direction === 'down' && idx < cats.length - 1) {
      const temp = cats[idx];
      cats[idx] = cats[idx + 1];
      cats[idx + 1] = temp;
      updatedTree.categories[parentGender] = cats;
      persist(updatedTree);
    }
  };

  const deleteItem = (type, parentGender, parentCat, targetSlug) => {
    if (!window.confirm('هل أنت تأكد من رغبتك في حذف هذا القسم؟')) return;

    const updatedTree = JSON.parse(JSON.stringify(tree));

    if (type === 'gender') {
      updatedTree.genders = (updatedTree.genders || []).filter((g) => g.slug !== targetSlug);
      delete updatedTree.categories[targetSlug];
    } else if (type === 'category') {
      updatedTree.categories[parentGender] = (updatedTree.categories[parentGender] || []).filter(
        (c) => c.slug !== targetSlug
      );
      delete updatedTree.subcategories[`${parentGender}/${targetSlug}`];
    } else if (type === 'sub') {
      const subKey = `${parentGender}/${parentCat}`;
      updatedTree.subcategories[subKey] = (updatedTree.subcategories[subKey] || []).filter(
        (s) => s.slug !== targetSlug
      );
    }

    persist(updatedTree);
  };

  const resetToDefault = () => {
    if (window.confirm('إعادة شجرة الأقسام إلى الوضع الافتراضي الأصلي للمتجر؟')) {
      const defaultTree = {
        genders: INITIAL_GENDERS,
        categories: INITIAL_CATEGORIES,
        subcategories: INITIAL_SUBCATEGORIES,
      };
      persist(defaultTree);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-tree-head">
        <div>
          <h3>إدارة شجرة الأقسام وترتيب الأقسام الفرعية والصور</h3>
          <p className="admin-note">
            يمكنك رفع صور الغلاف، والتحكم بترتيب ظهور الأقسام الفرعية (صعود/نزول/الأول/الأخير) لتظهر للزبون بالترتيب الذي تحدده فوراً.
          </p>
        </div>
        <div className="admin-tree-head__actions">
          <button
            className="admin-btn admin-btn--primary"
            onClick={() =>
              setEditingItem({ type: 'gender', isNew: true, item: { title: '', slug: '', latin: '' } })
            }
          >
            + قسم رئيسي جديد
          </button>
          <button className="admin-btn admin-btn--ghost" onClick={resetToDefault} disabled={busy}>
            إعادة الضبط
          </button>
        </div>
      </div>

      {msg && <p className="admin-note admin-note--ok" style={{ marginBlock: '1rem' }}>{msg}</p>}

      <div className="admin-tree">
        {(tree.genders || []).map((gender) => (
          <div className="admin-tree-node admin-tree-node--gender" key={gender.slug}>
            <header className="admin-tree-node__head">
              <div className="admin-tree-node__info">
                {gender.cover && (
                  <img src={gender.cover} alt="" className="admin-tree-node__thumb" />
                )}
                <span className="admin-tree-badge">قسم رئيسي</span>
                <strong>{gender.title}</strong>
                <span className="admin-dim">({gender.latin})</span>
                <span className="admin-count">{countProducts(gender.slug)} منتج</span>
              </div>
              <div className="admin-tree-node__actions">
                <button
                  className="admin-btn admin-btn--sm"
                  onClick={() =>
                    setEditingItem({
                      type: 'category',
                      parentGender: gender.slug,
                      isNew: true,
                      item: { title: '', slug: '', latin: '' },
                    })
                  }
                >
                  + فئة جديدة
                </button>

                <button
                  className="admin-btn admin-btn--sm"
                  onClick={() =>
                    setEditingItem({ type: 'gender', isNew: false, item: gender })
                  }
                >
                  تعديل والصورة
                </button>

                <button
                  className="admin-btn admin-btn--sm admin-btn--danger"
                  onClick={() => deleteItem('gender', null, null, gender.slug)}
                >
                  حذف
                </button>
              </div>
            </header>

            <div className="admin-tree-node__body">
              {(tree.categories[gender.slug] || []).map((cat, cIdx, cArr) => (
                <div className="admin-tree-node admin-tree-node--category" key={cat.slug}>
                  <header className="admin-tree-node__head">
                    <div className="admin-tree-node__info">
                      {cat.cover && (
                        <img src={cat.cover} alt="" className="admin-tree-node__thumb" />
                      )}
                      <span className="admin-tree-badge admin-tree-badge--cat">فئة</span>
                      <strong>{cat.title}</strong>
                      <span className="admin-dim">({cat.latin})</span>
                      <span className="admin-count">{countProducts(gender.slug, cat.slug)}</span>
                    </div>
                    <div className="admin-tree-node__actions">
                      <button
                        className="admin-icon-btn"
                        onClick={() => moveCategory(gender.slug, cat.slug, 'up')}
                        disabled={cIdx === 0}
                        title="تحريك الفئة للأعلى"
                      >
                        ▲
                      </button>
                      <button
                        className="admin-icon-btn"
                        onClick={() => moveCategory(gender.slug, cat.slug, 'down')}
                        disabled={cIdx === cArr.length - 1}
                        title="تحريك الفئة للأسفل"
                      >
                        ▼
                      </button>
                      <button
                        className="admin-btn admin-btn--sm"
                        onClick={() =>
                          setEditingItem({
                            type: 'sub',
                            parentGender: gender.slug,
                            parentCat: cat.slug,
                            isNew: true,
                            item: { title: '', slug: '', latin: '' },
                          })
                        }
                      >
                        + قسم فرعي
                      </button>

                      <button
                        className="admin-btn admin-btn--sm"
                        onClick={() =>
                          setEditingItem({
                            type: 'category',
                            parentGender: gender.slug,
                            isNew: false,
                            item: cat,
                          })
                        }
                      >
                        تعديل والصورة
                      </button>

                      <button
                        className="admin-btn admin-btn--sm admin-btn--danger"
                        onClick={() => deleteItem('category', gender.slug, null, cat.slug)}
                      >
                        حذف
                      </button>
                    </div>
                  </header>

                  <div className="admin-tree-node__subs">
                    {(() => {
                      const subsList = (tree.subcategories[`${gender.slug}/${cat.slug}`] || []).filter(
                        (s) => s.slug !== 'all'
                      );
                      return subsList.map((sub, sIdx) => {
                        const isFirst = sIdx === 0;
                        const isLast = sIdx === subsList.length - 1;
                        return (
                          <div className="admin-tree-sub" key={sub.slug}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                              <span className="admin-rank-pill" title="ترتيب الظهور للزبون">#{sIdx + 1}</span>
                              {sub.cover && (
                                <img src={sub.cover} alt="" className="admin-tree-node__thumb admin-tree-node__thumb--sm" />
                              )}
                              <span className="admin-tree-sub__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <strong>{sub.title}</strong> <small>({sub.latin})</small>
                              </span>
                            </div>
                            <span className="admin-count" style={{ marginInline: '0.3rem' }} title="عدد المنتجات">{countProducts(gender.slug, cat.slug, sub.slug)}</span>
                            <div className="admin-tree-sub__actions">
                              <button
                                className="admin-icon-btn"
                                onClick={() => moveSubcategory(gender.slug, cat.slug, sub.slug, 'top')}
                                disabled={isFirst}
                                title="اجعل هذا القسم في البداية (الأول 🔝)"
                              >
                                🔝
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() => moveSubcategory(gender.slug, cat.slug, sub.slug, 'up')}
                                disabled={isFirst}
                                title="صعود خطوة للأعلى (▲)"
                              >
                                ▲
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() => moveSubcategory(gender.slug, cat.slug, sub.slug, 'down')}
                                disabled={isLast}
                                title="نزول خطوة للأسفل (▼)"
                              >
                                ▼
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() => moveSubcategory(gender.slug, cat.slug, sub.slug, 'bottom')}
                                disabled={isLast}
                                title="نقل للنهاية (الأخير 🔚)"
                              >
                                🔚
                              </button>
                              <button
                                className="admin-icon-btn"
                                onClick={() =>
                                  setEditingItem({
                                    type: 'sub',
                                    parentGender: gender.slug,
                                    parentCat: cat.slug,
                                    isNew: false,
                                    item: sub,
                                  })
                                }
                                title="تعديل والصورة ✏️"
                              >
                                ✏️
                              </button>
                              <button
                                className="admin-icon-btn admin-icon-btn--danger"
                                onClick={() => deleteItem('sub', gender.slug, cat.slug, sub.slug)}
                                title="حذف 🗑️"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingItem && (
        <TreeModal
          editingItem={editingItem}
          onSave={saveItem}
          onCancel={() => setEditingItem(null)}
        />
      )}
    </div>
  );
}

function TreeModal({ editingItem, onSave, onCancel }) {
  const { type, isNew, item } = editingItem;
  const [title, setTitle] = useState(item.title || '');
  const [latin, setLatin] = useState(item.latin || '');
  const [slug, setSlug] = useState(item.slug || '');
  const [tagline, setTagline] = useState(item.tagline || item.blurb || '');
  const [cover, setCover] = useState(item.cover || '');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const onTitleChange = (v) => {
    setTitle(v);
    if (!latin || isNew) {
      setLatin(translateText(v));
    }
    if (isNew) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `s-${Date.now()}`);
    }
  };

  const handleImageFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const url = await uploadImage(file, 'categories');
      setCover(url);
    } catch (error) {
      setUploadError(error?.message || 'تعذر رفع الصورة. تحقق من الاتصال وحاول مجددًا.');
    } finally {
      setUploading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!title) return;
    onSave({
      title,
      latin: latin || translateText(title),
      slug: slug || `s-${Date.now()}`,
      tagline,
      blurb: tagline,
      cover,
    });
  };

  const getModalTitle = () => {
    const action = isNew ? 'إضافة' : 'تعديل';
    if (type === 'gender') return `${action} قسم رئيسي وصورة الغلاف`;
    if (type === 'category') return `${action} فئة جديدة وصورة الغلاف`;
    return `${action} قسم فرعي والصورة`;
  };

  return (
    <div className="admin-modal" onClick={onCancel}>
      <form className="admin-modal__panel admin-modal__panel--sm" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <header className="admin-modal__head">
          <h2>{getModalTitle()}</h2>
          <button type="button" className="admin-icon" onClick={onCancel}>✕</button>
        </header>

        <div className="admin-modal__body">
          <label className="admin-field">
            <span>الاسم بالعربية *</span>
            <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="مثال: عطور، أحذية..." required />
          </label>

          <label className="admin-field">
            <span>الاسم بالإنجليزية (تلقائي ✨)</span>
            <input value={latin} onChange={(e) => setLatin(e.target.value)} placeholder="Perfumes, Shoes..." dir="ltr" />
          </label>

          <label className="admin-field">
            <span>المعرّف (Slug) في الرابط</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="perfumes" dir="ltr" />
          </label>

          {/* Section Image / Cover Upload */}
          <div className="admin-field admin-field--highlight">
            <span>صورة القسم (مع الضغط التلقائي للسرعة 🖼️)</span>
            <input type="file" accept="image/*" onChange={handleImageFile} disabled={uploading} />
            {uploading && <small style={{ color: 'var(--a-ok)' }}>جارٍ ضغط ورفع صورة القسم…</small>}
            {uploadError && <small style={{ color: 'var(--a-danger)' }}>{uploadError}</small>}
            {cover && (
              <div className="admin-category-preview">
                <img src={cover} alt="غلاف القسم" />
                <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={() => setCover('')}>
                  حذف الصورة
                </button>
              </div>
            )}
          </div>

          {type !== 'sub' && (
            <label className="admin-field">
              <span>الوصف التوضيحي (اختياري)</span>
              <textarea rows={2} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="وصف قصير للقسم..." />
            </label>
          )}
        </div>

        <footer className="admin-modal__foot">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={onCancel}>إلغاء</button>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={uploading}>
            {uploading ? 'جارٍ رفع الصورة…' : 'حفظ التغيرات'}
          </button>
        </footer>
      </form>
    </div>
  );
}
