import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getProduct } from '../data/products';
import { rt } from '../i18n/strings';

const StoreContext = createContext(null);

const KEY_CART = 'iraqstore.cart.v1';
const KEY_FAVS = 'iraqstore.favs.v1';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
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
      if (existing) {
        return state.map((l) =>
          l.key === key ? { ...l, qty: Math.min(l.qty + qty, 99), rawProduct: product || l.rawProduct } : l
        );
      }
      return [...state, { key, productId, size, color, qty, rawProduct: product }];
    }
    case 'setQty':
      return state
        .map((l) => (l.key === action.key ? { ...l, qty: action.qty } : l))
        .filter((l) => l.qty > 0);
    case 'remove':
      return state.filter((l) => l.key !== action.key);
    case 'clear':
      return [];
    default:
      return state;
  }
}

export function StoreProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, null, () => load(KEY_CART, []));
  const [favorites, setFavorites] = useState(() => load(KEY_FAVS, []));
  const [cartOpen, setCartOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  // Persist cart/favorites, but never let a full-quota localStorage crash the
  // app — the cart still lives in React state for this session.
  useEffect(() => {
    try {
      localStorage.setItem(KEY_CART, JSON.stringify(cart));
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
      if (!product || !product.id) return;

      const safeSize = size || (product.sizes && product.sizes[0]) || 'مقاس واحد';
      let safeColor = 'أساسي';
      if (color) {
        safeColor = typeof color === 'object' ? color.name || 'أساسي' : color;
      } else if (product.colors && product.colors.length) {
        safeColor = typeof product.colors[0] === 'object' ? product.colors[0].name || 'أساسي' : product.colors[0];
      }

      dispatch({
        type: 'add',
        productId: product.id,
        size: safeSize,
        color: safeColor,
        qty,
        product,
      });
      if (!silent) toast(rt('addedToCart'));
    },
    [toast]
  );

  const toggleFavorite = useCallback(
    (product) => {
      setFavorites((prev) => {
        const on = prev.includes(product.id);
        toast(on ? rt('removedFromFav') : rt('addedToFav'));
        return on ? prev.filter((id) => id !== product.id) : [...prev, product.id];
      });
    },
    [toast]
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
    [cart]
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
      setQty: (key, qty) => dispatch({ type: 'setQty', key, qty }),
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
    [detailedCart, cartCount, subtotal, addToCart, cartOpen, favorites, toggleFavorite, toasts, toast]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}
