import { useMemo } from 'react';
import { formatPrice } from '../data/products';

export default function AnalyticsPanel({ products, orders }) {
  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || Number(o.subtotal) || 0), 0);
    const completedOrders = orders.filter((o) => o.status === 'completed').length;
    const newOrders = orders.filter((o) => !o.status || o.status === 'new').length;
    
    const activeProducts = products.filter((p) => p.status !== 'draft').length;
    const lowStockProducts = products.filter((p) => (p.stockQuantity !== undefined && p.stockQuantity <= 3));

    // Category distribution
    const catMap = {};
    products.forEach((p) => {
      const g = p.gender === 'men' ? 'رجالي' : 'نسائي';
      const key = `${g} / ${p.category || 'عام'}`;
      catMap[key] = (catMap[key] || 0) + 1;
    });

    const categoriesList = Object.entries(catMap).map(([name, count]) => ({
      name,
      count,
      percent: Math.round((count / (products.length || 1)) * 100),
    }));

    return {
      totalSales,
      completedOrders,
      newOrders,
      totalOrders: orders.length,
      totalProducts: products.length,
      activeProducts,
      lowStockProducts,
      categoriesList,
    };
  }, [products, orders]);

  return (
    <div className="admin-panel">
      {/* Top Overview KPI Cards */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card admin-kpi-card--accent">
          <div className="admin-kpi-card__head">
            <span>💰 إجمالي مبيعات المتجر</span>
            <span className="admin-kpi-icon">📈</span>
          </div>
          <strong className="admin-kpi-val">{formatPrice(stats.totalSales)}</strong>
          <small className="admin-dim">من واقع {stats.completedOrders} طلب مكتمل و {stats.totalOrders} إجمالي الطلبات</small>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__head">
            <span>🛒 الطلبات الجديدة</span>
            <span className="admin-kpi-icon">🆕</span>
          </div>
          <strong className="admin-kpi-val">{stats.newOrders}</strong>
          <small className="admin-dim">طلبات بانتظار التجهيز والشحن</small>
        </div>

        <div className="admin-kpi-card">
          <div className="admin-kpi-card__head">
            <span>📦 الكتالوج والمنتجات</span>
            <span className="admin-kpi-icon">👕</span>
          </div>
          <strong className="admin-kpi-val">{stats.totalProducts} منتج</strong>
          <small className="admin-dim">{stats.activeProducts} منتج نشط بالمعرض</small>
        </div>

        <div className="admin-kpi-card admin-kpi-card--warning">
          <div className="admin-kpi-card__head">
            <span>⚠️ تنبيهات المخزون</span>
            <span className="admin-kpi-icon">⚡</span>
          </div>
          <strong className="admin-kpi-val">{stats.lowStockProducts.length}</strong>
          <small className="admin-dim">منتجات مخزونها منخفض (أقل من 3 قطع)</small>
        </div>
      </div>

      {/* Analytics Main Layout Grid */}
      <div className="admin-grid2" style={{ marginTop: '1.5rem' }}>
        {/* Left: Category Distribution */}
        <div className="admin-card" style={{ margin: 0 }}>
          <h3>📊 توزيع المنتجات حسب الأقسام</h3>
          <div className="admin-cat-progress-list">
            {stats.categoriesList.map((cat) => (
              <div className="admin-cat-progress-item" key={cat.name}>
                <div className="admin-flex-between">
                  <strong>{cat.name}</strong>
                  <span>{cat.count} منتج ({cat.percent}%)</span>
                </div>
                <div className="admin-progress-bar">
                  <div className="admin-progress-fill" style={{ width: `${cat.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Low Stock Alert Table */}
        <div className="admin-card" style={{ margin: 0 }}>
          <h3>⚠️ تنبيهات انخفاض المخزون</h3>
          {stats.lowStockProducts.length === 0 ? (
            <p className="admin-note admin-note--ok" style={{ marginTop: '0.8rem' }}>
              جميع المنتجات متوفرة بمخزون جيد وسليم! 👍
            </p>
          ) : (
            <div className="admin-specs-list" style={{ marginTop: '0.8rem' }}>
              {stats.lowStockProducts.slice(0, 6).map((p) => (
                <div className="admin-row" key={p.id} style={{ gridTemplateColumns: '40px 1fr auto' }}>
                  <img src={p.images?.[0] || p.image} alt="" className="admin-row__img" style={{ width: 40, height: 40 }} />
                  <div className="admin-row__main">
                    <strong>{p.name}</strong>
                    <span>{p.category} / {p.sub}</span>
                  </div>
                  <span className="admin-tag admin-tag--accent" style={{ background: '#f59e0b' }}>
                    المتبقي: {p.stockQuantity ?? 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
