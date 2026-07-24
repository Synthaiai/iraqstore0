import { useStore } from '../store/StoreContext';
import { Check } from './Icons';

export default function Toasts() {
  const { toasts } = useStore();

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <Check className="toast__icon" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
