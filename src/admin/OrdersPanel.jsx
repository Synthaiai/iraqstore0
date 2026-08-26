import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPrice } from '../data/products';
import { deleteOrder, updateOrderStatus } from '../data/remote';

const STATUS_LABELS = {
  new: { label: 'طلب جديد 🆕', badge: 'admin-status--new' },
  processing: { label: 'قيد التجهيز 📦', badge: 'admin-status--processing' },
  shipped: { label: 'تم الشحن 🚚', badge: 'admin-status--shipped' },
  completed: { label: 'مكتمل ✅', badge: 'admin-status--completed' },
  cancelled: { label: 'ملغى ❌', badge: 'admin-status--cancelled' },
};

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.6);
  } catch (_) {}
}

export default function OrdersPanel({ orders }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const seenIdsRef = useRef(new Set((orders || []).map((o) => o.id || o.orderNo)));
  const initializedRef = useRef(false);
  const alertTimerRef = useRef(null);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      (orders || []).forEach((o) => {
        const id = o.id || o.orderNo;
        if (id) seenIdsRef.current.add(id);
      });
      return;
    }

    const newArrivals = (orders || []).filter((o) => {
      const id = o.id || o.orderNo;
      return id && !seenIdsRef.current.has(id);
    });

    if (newArrivals.length > 0) {
      newArrivals.forEach((o) => {
        const id = o.id || o.orderNo;
        if (id) seenIdsRef.current.add(id);
      });
      playNewOrderSound();
      const newest = newArrivals[0];
      setNewOrderAlert(newest);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      alertTimerRef.current = setTimeout(() => setNewOrderAlert(null), 5000);
    }
  }, [orders]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders.filter((o) => {
      const matchQ =
        !s ||
        (o.orderNo && o.orderNo.toLowerCase().includes(s)) ||
        (o.name && o.name.toLowerCase().includes(s)) ||
        (o.phone && o.phone.toLowerCase().includes(s)) ||
        (o.governorate && o.governorate.toLowerCase().includes(s)) ||
        (o.city && o.city.toLowerCase().includes(s));
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [orders, q, statusFilter]);

  const counts = useMemo(() => {
    const res = { total: orders.length, new: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 };
    orders.forEach((o) => {
      const st = o.status || 'new';
      if (res[st] !== undefined) res[st]++;
    });
    return res;
  }, [orders]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'completed' || newStatus === 'cancelled') {
      await deleteOrder(orderId);
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNo === orderId)) {
        setSelectedOrder(null);
      }
    } else {
      await updateOrderStatus(orderId, newStatus);
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNo === orderId)) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
      await deleteOrder(orderId);
      if (selectedOrder && selectedOrder.id === orderId) setSelectedOrder(null);
    }
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ar-IQ', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const cleanPhone = (p) => {
    const digits = String(p || '').replace(/\D/g, '');
    if (digits.startsWith('07')) return '964' + digits.slice(1);
    if (digits.startsWith('7')) return '964' + digits;
    return digits;
  };

  return (
    <div className="admin-panel">
      {newOrderAlert && (
        <div
          className="admin-note admin-note--ok"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            color: '#15803d',
            fontWeight: '600',
          }}
        >
          <span>🔔 وصل طلب جديد الآن: #{newOrderAlert.orderNo || newOrderAlert.id} من {newOrderAlert.name} ({formatPrice(newOrderAlert.total, 'ar')})</span>
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            style={{ padding: '0.2rem 0.6rem' }}
            onClick={() => setNewOrderAlert(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick KPI stats row for orders */}
      <div className="admin-orders-stats">
        <button
          className={`admin-stat-chip ${statusFilter === '' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('')}
        >
          <span>كل الطلبات</span>
          <strong>{counts.total}</strong>
        </button>
        <button
          className={`admin-stat-chip admin-stat-chip--new ${statusFilter === 'new' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('new')}
        >
          <span>طلبات جديدة</span>
          <strong>{counts.new}</strong>
        </button>
        <button
          className={`admin-stat-chip admin-stat-chip--processing ${statusFilter === 'processing' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('processing')}
        >
          <span>قيد التجهيز</span>
          <strong>{counts.processing}</strong>
        </button>
        <button
          className={`admin-stat-chip admin-stat-chip--shipped ${statusFilter === 'shipped' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('shipped')}
        >
          <span>قيد التوصيل</span>
          <strong>{counts.shipped}</strong>
        </button>
        <button
          className={`admin-stat-chip admin-stat-chip--completed ${statusFilter === 'completed' ? 'is-active' : ''}`}
          onClick={() => setStatusFilter('completed')}
        >
          <span>مكتملة</span>
          <strong>{counts.completed}</strong>
        </button>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar" style={{ marginTop: '1.25rem' }}>
        <input
          className="admin-search"
          placeholder="ابحث باسم الزبون، رقم الهاتف، رقم الطلب، أو المحافظة..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">جميع الحالات</option>
          <option value="new">طلبات جديدة 🆕</option>
          <option value="processing">قيد التجهيز 📦</option>
          <option value="shipped">تم الشحن / قيد التوصيل 🚚</option>
          <option value="completed">مكتملة ✅</option>
          <option value="cancelled">ملغاة ❌</option>
        </select>
        <span className="admin-count">{filtered.length} طلب</span>
      </div>

      {/* Orders List */}
      {filtered.length === 0 ? (
        <div className="admin-empty">
          <p>لا توجد طلبات مطابقة للبحث أو الفلتر الحالي.</p>
        </div>
      ) : (
        <div className="admin-orders-table">
          {filtered.map((order) => {
            const st = STATUS_LABELS[order.status || 'new'] || STATUS_LABELS.new;
            const items = order.cart || [];
            return (
              <div className="admin-order-card" key={order.id || order.orderNo}>
                <div className="admin-order-card__head">
                  <div>
                    <span className="admin-order-no">#{order.orderNo || order.id}</span>
                    <span className="admin-order-time">{formatTime(order.createdAt)}</span>
                  </div>
                  <span className={`admin-order-badge ${st.badge}`}>{st.label}</span>
                </div>

                <div className="admin-order-card__body">
                  <div className="admin-order-customer">
                    <strong>{order.name}</strong>
                    <span dir="ltr">{order.phone}</span>
                    <small>📍 {order.governorate} — {order.city}</small>
                  </div>

                  <div className="admin-order-items-preview">
                    <span>{order.itemCount || items.length || 1} منتجات مطلوبة:</span>
                    <div className="admin-order-thumbs">
                      {items.slice(0, 4).map((item, i) => (
                        <img
                          key={i}
                          src={item.product?.images?.[0] || item.product?.image || item.image || '/logo.png'}
                          alt=""
                          className="admin-order-thumb"
                          title={`${item.product?.name || item.name || 'منتج'} (${item.size || ''} / ${item.color || ''}) × ${item.qty}`}
                        />
                      ))}
                      {items.length > 4 && (
                        <span className="admin-order-thumb-more">+{items.length - 4}</span>
                      )}
                    </div>
                  </div>

                  <div className="admin-order-price">
                    <strong>{formatPrice(order.total || order.subtotal)}</strong>
                    <small>{order.paymentLabel || 'الدفع عند الاستلام'}</small>
                  </div>
                </div>

                <div className="admin-order-card__foot">
                  <select
                    className="admin-status-select"
                    value={order.status || 'new'}
                    onChange={(e) => handleStatusChange(order.id || order.orderNo, e.target.value)}
                  >
                    <option value="new">🆕 جديد</option>
                    <option value="processing">📦 قيد التجهيز</option>
                    <option value="shipped">🚚 تم الشحن</option>
                    <option value="completed">✅ مكتمل</option>
                    <option value="cancelled">❌ ملغى</option>
                  </select>

                  <div className="admin-order-btns">
                    <a
                      href={`tel:${order.phone}`}
                      className="admin-btn admin-btn--sm admin-btn--ghost"
                      title="اتصال مباشر بالزبون"
                    >
                      📞 اتصال
                    </a>
                    <a
                      href={`https://wa.me/${cleanPhone(order.phone)}?text=${encodeURIComponent(`مرحباً ${order.name}، بخصوص طلبك رقم #${order.orderNo || order.id} من متجر عراق ستور`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="admin-btn admin-btn--sm admin-btn--ghost"
                      style={{ color: '#25D366' }}
                      title="مراسلة الزبون على الواتساب"
                    >
                      💬 واتساب
                    </a>
                    <button
                      className="admin-btn admin-btn--sm"
                      onClick={() => setSelectedOrder(order)}
                    >
                      التفاصيل 👁️
                    </button>
                    <button
                      className="admin-btn admin-btn--sm admin-btn--ghost"
                      onClick={() => setPrintOrder(order)}
                    >
                      وصل الشحن 🖨️
                    </button>
                    <button
                      className="admin-btn admin-btn--sm admin-btn--danger"
                      onClick={() => handleDelete(order.id || order.orderNo)}
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onPrint={() => setPrintOrder(selectedOrder)}
        />
      )}

      {/* Printable Invoice Modal */}
      {printOrder && (
        <PrintInvoiceModal order={printOrder} onClose={() => setPrintOrder(null)} />
      )}
    </div>
  );
}

function OrderDetailsModal({ order, onClose, onStatusChange, onPrint }) {
  const cleanPhone = (p) => {
    const digits = String(p || '').replace(/\D/g, '');
    if (digits.startsWith('07')) return '964' + digits.slice(1);
    if (digits.startsWith('7')) return '964' + digits;
    return digits;
  };

  return (
    <div className="admin-modal" onClick={onClose}>
      <div className="admin-modal__panel admin-modal__panel--lg" onClick={(e) => e.stopPropagation()}>
        <header className="admin-modal__head">
          <div>
            <h2>تفاصيل الطلب #{order.orderNo || order.id}</h2>
            <span className="admin-modal__sub">تاريخ الطلب: {new Date(order.createdAt).toLocaleString('ar-IQ')}</span>
          </div>
          <button className="admin-icon" onClick={onClose}>✕</button>
        </header>

        <div className="admin-modal__body">
          {/* Customer info & Delivery details */}
          <div className="admin-grid2">
            <div className="admin-card" style={{ margin: 0 }}>
              <h3>👤 معلومات الزبون</h3>
              <p style={{ margin: 0 }}><b>الاسم:</b> {order.name}</p>
              <p style={{ margin: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <b>رقم الهاتف:</b> <span dir="ltr">{order.phone}</span>
                <a href={`tel:${order.phone}`} className="admin-btn admin-btn--sm admin-btn--ghost" style={{ padding: '2px 8px', fontSize: '0.8rem' }}>📞 اتصال</a>
                <a href={`https://wa.me/${cleanPhone(order.phone)}?text=${encodeURIComponent(`مرحباً ${order.name}، معك متجر عراق ستور بخصوص طلبك رقم #${order.orderNo || order.id}`)}`} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn--sm admin-btn--ghost" style={{ padding: '2px 8px', fontSize: '0.8rem', color: '#25D366' }}>💬 واتساب</a>
              </p>
              <p style={{ margin: 0 }}><b>المحافظة:</b> {order.governorate}</p>
              <p style={{ margin: '0.4rem 0' }}><b>المنطقة / المدينة:</b> {order.city}</p>
              <p style={{ margin: 0 }}><b>العنوان التفصيلي:</b> {order.address}</p>
              {order.notes && <p style={{ margin: '0.4rem 0', color: 'var(--a-accent-2)' }}><b>ملاحظات الزبون:</b> {order.notes}</p>}
            </div>

            <div className="admin-card" style={{ margin: 0 }}>
              <h3>🚚 تفاصيل الشحن والحالة</h3>
              <label className="admin-field" style={{ marginBottom: '1rem' }}>
                <span>تغيير حالة الطلب</span>
                <select
                  value={order.status || 'new'}
                  onChange={(e) => onStatusChange(order.id || order.orderNo, e.target.value)}
                >
                  <option value="new">جديد 🆕</option>
                  <option value="processing">قيد التجهيز 📦</option>
                  <option value="shipped">تم الشحن / قيد التوصيل 🚚</option>
                  <option value="completed">مكتمل ✅</option>
                  <option value="cancelled">ملغى ❌</option>
                </select>
              </label>

              <p style={{ margin: 0 }}><b>أجرة التوصيل:</b> {formatPrice(order.fee || 0)}</p>
              <p style={{ margin: '0.4rem 0' }}><b>مجموع المنتجات:</b> {formatPrice(order.subtotal || 0)}</p>
              <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--a-ok)' }}><b>الإجمالي الكلي:</b> {formatPrice(order.total || order.subtotal)}</p>
            </div>
          </div>

          {/* Ordered Products Table */}
          <div className="admin-field">
            <span>المنتجات المطلوبة ({order.cart?.length || 0})</span>
            <div className="admin-specs-list">
              {order.cart?.map((item, idx) => (
                <div className="admin-row" key={idx} style={{ gridTemplateColumns: '48px 1fr auto auto' }}>
                  <img
                    src={item.product?.images?.[0] || item.product?.image || '/logo.png'}
                    alt=""
                    className="admin-row__img"
                  />
                  <div className="admin-row__main">
                    <strong>{item.product?.name || item.name}</strong>
                    <span>اللون: {item.color} | القياس: {item.size}</span>
                  </div>
                  <span>الكمية: {item.qty}</span>
                  <strong>{formatPrice((item.product?.price || item.price) * item.qty)}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <footer className="admin-modal__foot">
          <button className="admin-btn admin-btn--ghost" onClick={onPrint}>
            🖨️ طباعة وصل الشحن
          </button>
          <button className="admin-btn admin-btn--primary" onClick={onClose}>
            إغلاق
          </button>
        </footer>
      </div>
    </div>
  );
}

function PrintInvoiceModal({ order, onClose }) {
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="admin-modal" onClick={onClose}>
      <div
        className="admin-modal__panel admin-modal__panel--lg admin-printable-area"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="admin-modal__head no-print">
          <h2>وصل توصيل طلبية #{order.orderNo || order.id}</h2>
          <div>
            <button className="admin-btn admin-btn--primary" onClick={triggerPrint}>
              طباعة الآن 🖨️
            </button>
            <button className="admin-icon" onClick={onClose} style={{ marginInlineStart: 8 }}>✕</button>
          </div>
        </header>

        <div className="admin-invoice-paper">
          {/* Invoice Header */}
          <div className="invoice-header">
            <div className="invoice-brand">
              <img src="/logo.png" alt="شعار المتجر" width="48" height="48" />
              <div>
                <h2>عراق ستور | IRAQ STORE</h2>
                <p>متجر الأزياء العراقي — وصل توصيل طلبية</p>
              </div>
            </div>
            <div className="invoice-no">
              <h3>رقم الطلب: #{order.orderNo || order.id}</h3>
              <p>التاريخ: {new Date(order.createdAt).toLocaleDateString('ar-IQ')}</p>
            </div>
          </div>

          {/* Invoice Customer Info Box */}
          <div className="invoice-box-grid">
            <div className="invoice-box">
              <h4>تفاصيل المستلم والوجهة:</h4>
              <p><b>اسم الزبون:</b> {order.name}</p>
              <p><b>رقم الهاتف:</b> <span dir="ltr">{order.phone}</span></p>
              <p><b>المحافظة:</b> {order.governorate}</p>
              <p><b>المنطقة / العنوان:</b> {order.city} — {order.address}</p>
            </div>

            <div className="invoice-box">
              <h4>معلومات الشحن والمعالجة:</h4>
              <p><b>طريقة الدفع:</b> الدفع عند الاستلام (COD)</p>
              <p><b>حالة الطلب:</b> {STATUS_LABELS[order.status || 'new']?.label}</p>
              {order.notes && <p><b>ملاحظات:</b> {order.notes}</p>}
            </div>
          </div>

          {/* Products Table */}
          <table className="invoice-table">
            <thead>
              <tr>
                <th>#</th>
                <th>اسم المنتج والتفاصيل</th>
                <th>المقاس / اللون</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {order.cart?.map((item, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{item.product?.name || item.name}</td>
                  <td>{item.size} / {item.color}</td>
                  <td>{item.qty}</td>
                  <td>{formatPrice(item.product?.price || item.price)}</td>
                  <td>{formatPrice((item.product?.price || item.price) * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="invoice-totals">
            <div className="invoice-total-row">
              <span>المجموع الجزئي للمنتجات:</span>
              <strong>{formatPrice(order.subtotal || 0)}</strong>
            </div>
            <div className="invoice-total-row">
              <span>أجرة التوصيل ({order.governorate}):</span>
              <strong>{formatPrice(order.fee || 0)}</strong>
            </div>
            <div className="invoice-total-row invoice-total-row--grand">
              <span>المبلغ المطلوب من الزبون عند الاستلام:</span>
              <strong>{formatPrice(order.total || order.subtotal)}</strong>
            </div>
          </div>

          {/* Footer note */}
          <div className="invoice-footer">
            <p>شكراً لتسوقكم من <b>عراق ستور</b>. يرجى التأكد من المنتجات والمبلغ عند الاستلام.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
