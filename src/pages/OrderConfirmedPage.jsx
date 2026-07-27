import { Link, Navigate, useLocation } from 'react-router-dom';
import { formatPrice } from '../data/products';
import { usePrefs } from '../store/PrefsContext';
import { Check, Truck } from '../components/Icons';

export default function OrderConfirmedPage() {
  const { state } = useLocation();
  const { t, lang } = usePrefs();

  // Reached without placing an order (refresh, direct link) — send home.
  if (!state?.orderNo) return <Navigate to="/" replace />;

  return (
    <section className="shell section confirm">
      <div className="confirm__badge">
        <Check />
      </div>

      <h1 className="confirm__title">{t('orderReceived')}</h1>
      <p className="confirm__lead">
        {t('thanks')} {state.name}. {t('willCall')} {state.phone} {t('toConfirm')}
      </p>

      <div className="confirm__card">
        <div className="confirm__row">
          <span>{t('orderNo')}</span>
          <strong style={{ fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em' }}>
            {state.orderNo}
          </strong>
        </div>
        <div className="confirm__row">
          <span>{t('itemCount')}</span>
          <strong>{state.itemCount}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('governorate')}</span>
          <strong>{state.governorate}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('subtotal')}</span>
          <strong>{formatPrice(state.subtotal, lang)}</strong>
        </div>
        <div className="confirm__row">
          <span>{t('deliveryFee')}</span>
          <strong>{formatPrice(state.fee, lang)}</strong>
        </div>
        <div className="confirm__row confirm__row--total">
          <span>{t('totalToPay')}</span>
          <strong>{formatPrice(state.total, lang)}</strong>
        </div>
      </div>

      <div className="confirm__note">
        <Truck />
        <span>{t('codNote')}</span>
      </div>

      <div className="confirm__actions">
        <Link to="/" className="btn btn--burgundy">
          {t('backToStore')}
        </Link>
        <Link to="/g/men" className="btn btn--ghost">
          {t('shopMore')}
        </Link>
      </div>
    </section>
  );
}
