import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getProduct } from '../data/products';
import { rt } from '../i18n/strings';

import { useLiveData } from './LiveDataContext';

const StoreContext = createContext(null);

const KEY_CART = 'iraqstore.cart.v1';
const KEY_FAVS = 'iraqstore.favs.v1';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : fallback;
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/** A cart line is identified by product + chosen size + chosen colour. */
const lineKey = (id, size, color) => `${id}|${size}|${color}`;

function cartReducer(state, action) {
  switch (action.type) {
    case 'add': {
      const { productId, size, color, qty, product } = action;
      const key = lineKey(productId, size, color);
      const existing = state.find((l) => l.key === key);
      const prod = product || getProduct(productId);
      const otherQty = state.filter((l) => String(l.productId) === String(productId) && l.key !== key).reduce((sum, l) => sum + l.qty, 0);
      const maxStock = Math.min(10, Math.max(0, (prod?.stockQuantity !== undefined ? Number(prod.stockQuantity) : 15) - otherQty));

      if (maxStock <= 0) return state; // Cannot add sold out items

      if (existing) {
        return state.map((l) =>
          l.key === key
            ? { ...l, qty: Math.min(l.qty + qty, maxStock), rawProduct: product || l.rawProduct }
            : l
        );
      }
      return [...state, { key, productId, size, color, qty: Math.min(qty, maxStock), rawProduct: product }];
    }
    case 'setQty': {
      return state
        .map((l) => (l.key === action.key ? { ...l, qty: action.qty } : l))
        .filter((l) => l.qty > 0);
    }
    case 'remove':
      return state.filter((l) => l.key !== action.key);
    case 'clear':
      return [];
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const { version } = useLiveData();
  const [cart, dispatch] = useReducer(cartReducer, null, () => load(KEY_CART, []).filter((line) => line && line.productId && Number.isInteger(line.qty) && line.qty > 0).map((line) => ({ ...line, qty: Math.min(line.qty, 10) })));
  const [favorites, setFavorites] = useState(() => load(KEY_FAVS, []).filter((id) => typeof id === 'string' || typeof id === 'number').map(String));
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  // Persist cart/favorites, but never let a full-quota localStorage crash the
  // app — the cart still lives in React state for this session.
  useEffect(() => {
    try {
      localStorage.setItem(KEY_CART, JSON.stringify(cart.map((line) => {
        const p = getProduct(line.productId) || line.rawProduct;
        const photo = p?.images?.[0] || p?.image;
        return { ...line, rawProduct: p ? { id: p.id, name: p.name, nameEn: p.nameEn, price: p.price, stockQuantity: p.stockQuantity, sizes: p.sizes, sizesEn: p.sizesEn, colors: p.colors, image: photo?.startsWith('data:') ? undefined : photo } : undefined };
      })));
    } catch (e) {
      console.warn('Cart not persisted (storage full):', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY_FAVS, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Favorites not persisted (storage full):', e);
    }
  }, [favorites]);

  const toast = useCallback((message) => {
    toastId.current += 1;
    const id = toastId.current;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const addToCart = useCallback(
    (product, { size, color, qty = 1, silent = false } = {}) => {
      if (!product || !product.id) return false;

      qty = Math.max(1, Math.floor(Number(qty) || 1));
      const liveProd = getProduct(product.id) || product;
      let maxStock = liveProd.stockQuantity !== undefined ? Number(liveProd.stockQuantity) : 15;

      if (maxStock <= 0) {
        toast('عذراً، هذا المنتج نفد من المخزون حالياً ❌');
        return false;
      }

      const safeSize = size || (liveProd.sizes && liveProd.sizes[0]) || 'مقاس واحد';
      let safeColor = 'أساسي';
      if (color) {
        safeColor = typeof color === 'object' ? color.name || 'أساسي' : color;
      } else if (liveProd.colors && liveProd.colors.length) {
        safeColor = typeof liveProd.colors[0] === 'object' ? liveProd.colors[0].name || 'أساسي' : liveProd.colors[0];
      }

      const key = lineKey(liveProd.id, safeSize, safeColor);
      const existing = cart.find((l) => l.key === key);
      const existingQty = existing ? existing.qty : 0;
      const otherQty = cart.filter((l) => String(l.productId) === String(liveProd.id) && l.key !== key).reduce((sum, l) => sum + l.qty, 0);
      maxStock = Math.min(10, Math.max(0, maxStock - otherQty));

      if (existingQty + qty > maxStock) {
        toast(`الكمية القصوى المتاحة في المخزن هي ${maxStock} فقط ⚠️`);
        if (existingQty < maxStock) {
          dispatch({
            type: 'add', productId: liveProd.id, size: safeSize, color: safeColor,
            qty: maxStock - existingQty, product: liveProd,
          });
          if (!silent) toast(rt('addedToCart'));
          return true;
        }
        return false;
      }

      dispatch({
        type: 'add',
        productId: liveProd.id,
        size: safeSize,
        color: safeColor,
        qty,
        product: liveProd,
      });
      if (!silent) toast(rt('addedToCart'));
      return true;
    },
    [cart, toast]
  );

  const setQty = useCallback(
    (key, targetQty) => {
      const line = cart.find((l) => l.key === key);
      if (!line) return;
      const liveProd = getProduct(line.productId) || line.product || line.rawProduct;
      const otherQty = cart.filter((l) => String(l.productId) === String(line.productId) && l.key !== key).reduce((sum, l) => sum + l.qty, 0);
      const maxStock = Math.min(10, Math.max(0, (liveProd?.stockQuantity !== undefined ? Number(liveProd.stockQuantity) : 15) - otherQty));

      if (targetQty > line.qty && targetQty > maxStock) {
        toast(`لا يمكن زيادة الكمية، أقصى حد متوفر هو ${maxStock} قطع ⚠️`);
        return;
      }
      if (!Number.isFinite(Number(targetQty))) return;
      const safeQty = Math.max(0, Math.min(Math.floor(Number(targetQty)), maxStock));
      dispatch({ type: 'setQty', key, qty: safeQty });
    },
    [cart, toast]
  );

  const toggleFavorite = useCallback(
    (product) => {
      const on = favorites.includes(String(product.id));
      toast(on ? rt('removedFromFav') : rt('addedToFav'));
      setFavorites((prev) => prev.includes(String(product.id)) ? prev.filter((id) => id !== String(product.id)) : [...prev, String(product.id)]);
    },
    [toast, favorites]
  );

  /** Cart lines joined with their product records, plus the money totals. */
  const detailedCart = useMemo(
    () =>
      cart
        .map((line) => {
          const prod = getProduct(line.productId) || line.rawProduct;
          return { ...line, product: prod };
        })
        .filter((line) => line.product),
    [cart, version]
  );

  const subtotal = useMemo(
    () => detailedCart.reduce((sum, l) => sum + l.product.price * l.qty, 0),
    [detailedCart]
  );

  const cartCount = useMemo(() => cart.reduce((n, l) => n + l.qty, 0), [cart]);

  const value = useMemo(
    () => ({
      cart: detailedCart,
      cartCount,
      subtotal,
      total: subtotal,
      addToCart,
      setQty,
      removeLine: (key) => dispatch({ type: 'remove', key }),
      clearCart: () => dispatch({ type: 'clear' }),
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      favorites,
      isFavorite: (id) => favorites.includes(id),
      toggleFavorite,
      toasts,
      toast,
    }),
    [detailedCart, cartCount, subtotal, addToCart, setQty, cartOpen, favorites, toggleFavorite, toasts, toast]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
