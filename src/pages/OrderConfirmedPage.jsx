import { Link, Navigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { Check, Truck } from '../components/Icons';

export default function OrderConfirmedPage() {
  const { state } = useLocation();

  // Reached without placing an order (refresh, direct link) — send home.
  if (!state?.orderNo) return <Navigate to="/" replace />;

  return (
    <section className="shell section confirm">
      <div className="confirm__badge">
        <Check />
      </div>

      <h1 className="confirm__title">تمّ استلام طلبك</h1>
      <p className="confirm__lead">
        شكرًا {state.name}. سنتصل بك على {state.phone} لتأكيد الطلب وموعد التوصيل.
      </p>

      <div className="confirm__card">
        <div className="confirm__row">
          <span>رقم الطلب</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
            {state.orderNo}
          </strong>
        </div>
        <div className="confirm__row">
          <span>عدد القطع</span>
          <strong>{state.itemCount}</strong>
        </div>
        <div className="confirm__row">
          <span>المحافظة</span>
          <strong>{state.governorate}</strong>
        </div>
        <div className="confirm__row">
          <span>المجموع الفرعي</span>
          <strong>{formatPrice(state.subtotal)}</strong>
        </div>
        <div className="confirm__row">
          <span>رسوم التوصيل</span>
          <strong>{formatPrice(state.fee)}</strong>
        </div>
        <div className="confirm__row confirm__row--total">
          <span>الإجمالي (يُدفع للمندوب)</span>
          <strong>{formatPrice(state.total)}</strong>
        </div>
      </div>

      <div className="confirm__note">
        <Truck />
        <span>الدفع عند الاستلام — جهّز المبلغ نقدًا عند وصول المندوب.</span>
      </div>

      <div className="confirm__actions">
        <Link to="/" className="btn btn--burgundy">
          العودة إلى المتجر
        </Link>
        <Link to="/g/men" className="btn btn--ghost">
          تسوّق المزيد
        </Link>
      </div>
    </section>
  );
}
