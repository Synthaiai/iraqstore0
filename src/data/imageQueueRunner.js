import { keepQueueOnDisk, listQueued, markAttempt, removeQueued, subscribeQueue } from './imageQueue';

/**
 * Drains the photo outbox, for as long as it takes.
 *
 * One image at a time on purpose: these are the connections where two parallel
 * uploads simply make both of them slower, and a serial queue also means the
 * gallery is assembled in a predictable order.
 *
 * Nothing here ever gives up on a photo. A failure waits and comes round
 * again — the only way an image leaves the queue is by being stored. That is
 * what makes "the product gets added even on terrible internet" true rather
 * than merely likely.
 */

const statusListeners = new Set();
let status = { running: false, pending: 0, current: null, lastError: null };
let loopPromise = null;
let wakeUp = null;

function publish(patch) {
  status = { ...status, ...patch };
  statusListeners.forEach((cb) => cb(status));
}

export function subscribeUploadStatus(cb) {
  statusListeners.add(cb);
  cb(status);
  return () => statusListeners.delete(cb);
}

export function getUploadStatus() {
  return status;
}

/** Back off after repeated failures, but never past a minute. */
function waitFor(attempts) {
  const delay = Math.min(60_000, 2_000 * 2 ** Math.min(attempts, 5));
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, delay);
    // A retry should not have to wait out its backoff if the link returns.
    wakeUp = () => { clearTimeout(timer); wakeUp = null; resolve(); };
  });
}

async function drain() {
  for (;;) {
    const queued = await listQueued();
    publish({ pending: queued.length });
    if (!queued.length) {
      publish({ running: false, current: null, lastError: null });
      loopPromise = null;
      return;
    }

    // Oldest first, so a product's photos arrive in the order they were picked.
    const item = queued.sort((a, b) => (a.queuedAt - b.queuedAt) || (a.index - b.index))[0];
    publish({ running: true, current: { productId: item.productId, name: item.productName, attempts: item.attempts } });

    try {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('OFFLINE');
      const [{ uploadQueuedBlob }, { attachProductImage }] = await Promise.all([
        import('./upload'),
        import('./remote'),
      ]);
      const url = await uploadQueuedBlob(item.blob);
      await attachProductImage(item.productId, url, item.index);
      await removeQueued(item.key);
      publish({ lastError: null });
    } catch (error) {
      // A product deleted while its photos were still queued has nothing left
      // to attach them to; drop them rather than retrying forever.
      if (error?.code === 'PRODUCT_GONE') {
        await removeQueued(item.key);
        continue;
      }
      await markAttempt(item.key, error?.message || 'تعذّر الرفع');
      publish({ lastError: error?.message || 'تعذّر الرفع' });
      await waitFor(item.attempts || 0);
    }
  }
}

/** Start draining, or do nothing if it is already running. */
export function startImageQueue() {
  if (loopPromise) return loopPromise;
  loopPromise = drain().catch((error) => {
    console.error('Image queue stopped unexpectedly:', error);
    loopPromise = null;
    publish({ running: false });
  });
  return loopPromise;
}

/** Try again now rather than waiting out a backoff. */
export function nudgeImageQueue() {
  if (wakeUp) wakeUp();
  return startImageQueue();
}

let wired = false;

/**
 * Keep the queue moving for the whole session: when the admin returns to the
 * tab, when the device says it is back online, and whenever something new is
 * queued.
 */
export function watchImageQueue() {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  keepQueueOnDisk();
  window.addEventListener('online', nudgeImageQueue);
  window.addEventListener('focus', nudgeImageQueue);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') nudgeImageQueue();
  });
  subscribeQueue((count) => { if (count > 0) startImageQueue(); });
  startImageQueue();
}
