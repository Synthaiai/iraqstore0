import { useState } from 'react';
import { DEFAULT_DELIVERY_FEES, GOVERNORATES, getDeliveryFees, setDeliveryFees } from '../data/iraq';
import { formatPrice } from '../data/products';
import { parseSmartPrice } from '../utils/smartPrice';
import { saveSetting } from '../data/remote';


export default function DeliveryFeesPanel() {
  const [fees, setFees] = useState(() => getDeliveryFees());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [flatFeeInput, setFlatFeeInput] = useState('5000');

  const updateGovFee = (gov, val) => {
    setFees((prev) => ({ ...prev, [gov]: val }));
  };

  const handleBlurGov = (gov) => {
    const val = fees[gov];
    if (val !== undefined && val !== '') {
      const parsed = parseSmartPrice(val);
      setFees((prev) => ({ ...prev, [gov]: parsed }));
    }
  };

  const applyDefaultPreset = () => {
    setFees({ ...DEFAULT_DELIVERY_FEES });
    setMsg('تم التبديل للأسعار الافتراضية (بغداد 3,000 - المحافظات 5,000)');
  };

  const applyFreeShipping = () => {
    const freeMap = GOVERNORATES.reduce((acc, g) => {
      acc[g] = 0;
      return acc;
    }, {});
    setFees(freeMap);
    setMsg('تم تحديد التوصيل المجاني لجميع المحافظات 🎁');
  };

  const applyFlatFee = () => {
    const parsed = parseSmartPrice(flatFeeInput);
    const flatMap = GOVERNORATES.reduce((acc, g) => {
      acc[g] = parsed;
      return acc;
    }, {});
    setFees(flatMap);
    setMsg(`تم تعيين سعر توصيل موحد ${formatPrice(parsed)} لجميع المحافظات.`);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');

    // Ensure all fees are parsed numbers
    const cleanFees = {};
    GOVERNORATES.forEach((g) => {
      cleanFees[g] = parseSmartPrice(fees[g] ?? 5000);
    });

    try {
      await saveSetting('deliveryFees', cleanFees);
      setDeliveryFees(cleanFees);
      setFees(cleanFees);
      setMsg('تم حفظ وتحديث أسعار التوصيل لجميع المحافظات بنجاح! 🟢');
    } catch (e) {
      console.error('Delivery fees sync failed:', e);
      setMsg(`لم يتم حفظ أسعار التوصيل: ${e?.message || 'تحقق من الاتصال وحاول مجددًا.'}`);
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="admin-panel">
      <div className="admin-tree-head">
        <div>
          <h3>🚚 إدارة أسعار التوصيل لجميع المحافظات العراقية</h3>
          <p className="admin-note">
            يمكنك تحديد سعر التوصيل الخاص بكل محافظة على حدة. تظهر هذه الأسعار تلقائياً للزبون عند إتمام الطلب.
          </p>
        </div>
        <div className="admin-tree-head__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={applyDefaultPreset}>
            الوضع الافتراضي
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={applyFreeShipping}>
            توصيل مجاني 🎁
          </button>
        </div>
      </div>

      {/* Quick Flat Fee Toolbar */}
      <div className="admin-card" style={{ marginBottom: '1.5rem' }}>
        <h3>⚡ تحديد مبلغ موحد لجميع المحافظات</h3>
        <div className="admin-color-custom">
          <input
            type="text"
            inputMode="decimal"
            value={flatFeeInput}
            onChange={(e) => setFlatFeeInput(e.target.value)}
            placeholder="مثال: 4 أو 5000"
            style={{ width: '180px' }}
          />
          <button type="button" className="admin-btn admin-btn--primary admin-btn--sm" onClick={applyFlatFee}>
            تطبيق على كل المحافظات
          </button>
        </div>
      </div>

      {msg && <p className="admin-note admin-note--ok" style={{ marginBottom: '1.5rem' }}>{msg}</p>}

      {/* Governorates Fees Grid */}
      <form onSubmit={save}>
        <div className="admin-delivery-grid">
          {GOVERNORATES.map((gov) => {
            const rawVal = fees[gov] ?? '';
            const parsedVal = parseSmartPrice(rawVal);
            return (
              <div className="admin-delivery-card" key={gov}>
                <div className="admin-delivery-card__head">
                  <span className="admin-delivery-icon">📍</span>
                  <strong>{gov}</strong>
                </div>

                <div className="admin-field" style={{ marginTop: '0.5rem' }}>
                  <span>سعر التوصيل (د.ع)</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rawVal}
                    onChange={(e) => updateGovFee(gov, e.target.value)}
                    onBlur={() => handleBlurGov(gov)}
                    placeholder="مثال: 3 أو 5000"
                    dir="ltr"
                    required
                  />
                  {rawVal !== '' && (
                    <small className="admin-smart-price-badge">
                      {parsedVal === 0 ? 'توصيل مجاني (0 د.ع)' : `✨ ${formatPrice(parsedVal)}`}
                    </small>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy} style={{ minWidth: '180px' }}>
            {busy ? 'جارٍ الحفظ…' : 'حفظ أسعار التوصيل 💾'}
          </button>
        </div>
      </form>
    </div>
  );
}
