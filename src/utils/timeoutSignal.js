/**
 * `AbortSignal.timeout` is Safari 16 / iOS 16 and newer. On older iPhones it is
 * simply undefined, so calling it throws and takes the whole request with it -
 * which broke the catalogue, orders and product saves outright rather than just
 * losing the deadline.
 *
 * This returns an equivalent signal everywhere, falling back to an
 * AbortController driven by a timer.
 */
export function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  if (typeof AbortController === 'undefined') return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('TimeoutError', 'TimeoutError')), ms);
  // Never keep a Node/test process alive just for a pending deadline.
  if (typeof timer === 'object' && typeof timer.unref === 'function') timer.unref();
  return controller.signal;
}
