const PROFILE_KEY = 'iraqstore_customer_profile_v1';
const ORDERS_KEY = 'iraqstore_customer_orders_v1';
const MAX_ORDERS = 20;

const canStore = () => typeof window !== 'undefined' && Boolean(window.localStorage);

export function readCustomerProfile() {
  if (!canStore()) return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomerProfile(form) {
  if (!canStore() || !form) return;
  const profile = {
    name: (form.name || '').trim(),
    phone: (form.phone || '').trim(),
    governorate: form.governorate || '',
    city: (form.city || '').trim(),
    address: (form.address || '').trim(),
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {}
}

export function rememberCustomerOrder(order) {
  if (!canStore() || !order?.orderNo) return;
  try {
    const current = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    const next = [
      {
        orderNo: order.orderNo,
        total: order.total,
        itemCount: order.itemCount,
        createdAt: order.createdAt || Date.now(),
        status: order.status || 'new',
      },
      ...current.filter((item) => item?.orderNo !== order.orderNo),
    ].slice(0, MAX_ORDERS);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  } catch {}
}
