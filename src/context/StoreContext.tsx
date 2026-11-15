import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiRequest, getCustomerToken, setCustomerToken } from '../lib/api.ts';
import {
  STATIC_CATEGORIES,
  STATIC_PAYMENT_SETTINGS,
  STATIC_PRODUCTS,
  STATIC_WEBSITE_SETTINGS,
} from '../lib/staticSeed.ts';
import type {
  CartItem,
  Category,
  CustomerUser,
  Language,
  PaymentSettings,
  Product,
  WebsiteSettings,
} from '../types.ts';

interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface StoreContextValue {
  route: string;
  navigate: (path: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  loading: boolean;
  staticMode: boolean;
  websiteSettings: WebsiteSettings | null;
  categories: Category[];
  products: Product[];
  paymentSettings: PaymentSettings | null;
  user: CustomerUser | null;
  cart: CartItem[];
  wishlist: string[];
  unreadCount: number;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (p: Product | null) => void;
  addToCart: (product: Product, size?: string, color?: string, qty?: number, openDrawer?: boolean) => void;
  updateCartQuantity: (index: number, qty: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  refreshBootstrap: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setSessionUser: (user: CustomerUser | null, token?: string | null, remember?: boolean) => void;
  logoutCustomer: () => Promise<void>;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const GUEST_CART_KEY = 'mns_guest_cart';
const GUEST_WISHLIST_KEY = 'mns_guest_wishlist';

function isStaticHosting(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  );
}

function readCurrentRoute(): string {
  if (typeof window === 'undefined') return '/';
  if (window.location.hash.startsWith('#/')) {
    return window.location.hash.slice(1);
  }
  if (isStaticHosting()) {
    return '/';
  }
  return window.location.pathname + window.location.search;
}

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [route, setRoute] = useState<string>(() => readCurrentRoute());
  const [staticMode, setStaticMode] = useState<boolean>(() => isStaticHosting());
  const [language, setLanguage] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [websiteSettings, setWebsiteSettings] = useState<WebsiteSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      if (staticMode || isStaticHosting()) {
        window.location.hash = `#${path}`;
      } else if (window.location.pathname + window.location.search !== path) {
        window.history.pushState({}, '', path);
      }
      setRoute(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [staticMode]
  );

  useEffect(() => {
    const onRouteChange = () => {
      setRoute(readCurrentRoute());
    };
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  const refreshBootstrap = useCallback(async () => {
    try {
      const data = await apiRequest<{
        websiteSettings: WebsiteSettings;
        categories: Category[];
        products: Product[];
        paymentSettings: PaymentSettings;
      }>('/api/storefront/bootstrap', { authMode: 'none' });
      setWebsiteSettings(data.websiteSettings);
      setCategories(data.categories);
      setProducts(data.products);
      setPaymentSettings(data.paymentSettings);
      setStaticMode(false);
      if (data.websiteSettings?.companyName) {
        document.title = `${data.websiteSettings.companyName} — ${data.websiteSettings.tagline}`;
      }
    } catch {
      // Fallback for static hosts (e.g. GitHub Pages) without Express backend
      setStaticMode(true);
      setWebsiteSettings(STATIC_WEBSITE_SETTINGS);
      setCategories(STATIC_CATEGORIES);
      setProducts(STATIC_PRODUCTS);
      setPaymentSettings(STATIC_PAYMENT_SETTINGS);
      document.title = `${STATIC_WEBSITE_SETTINGS.companyName} — ${STATIC_WEBSITE_SETTINGS.tagline}`;
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!getCustomerToken()) {
      setUser(null);
      setUnreadCount(0);
      return;
    }
    try {
      const data = await apiRequest<{
        user: CustomerUser | null;
        cart: CartItem[];
        wishlist: string[];
        unreadCount?: number;
      }>('/api/auth/me', { authMode: 'customer' });
      if (data.user) {
        setUser(data.user);
        setCart(data.cart || []);
        setWishlist(data.wishlist || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setUser(null);
        setCustomerToken(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([refreshBootstrap(), refreshMe()]);
      setLoading(false);
    })();
  }, [refreshBootstrap, refreshMe]);

  const syncCartToServer = useCallback(
    async (nextCart: CartItem[]) => {
      if (user) {
        try {
          await apiRequest('/api/customer/cart', {
            method: 'PUT',
            body: JSON.stringify({ items: nextCart }),
          });
        } catch {
          // ignore silent sync error
        }
      } else {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(nextCart));
      }
    },
    [user]
  );

  const addToCart = useCallback(
    (product: Product, size?: string, color?: string, qty = 1, openDrawer = true) => {
      const chosenSize = size || product.sizes[0] || 'M';
      const chosenColor = color || product.colors[0] || 'Default';
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.productId === product.id && i.size === chosenSize && i.color === chosenColor
        );
        const next = [...prev];
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantity: Math.min(product.stock, next[idx].quantity + qty),
          };
        } else {
          next.push({
            productId: product.id,
            quantity: Math.min(product.stock, Math.max(1, qty)),
            size: chosenSize,
            color: chosenColor,
          });
        }
        syncCartToServer(next);
        return next;
      });
      notify(`${product.name} added to bag`, 'success');
      if (openDrawer) setCartDrawerOpen(true);
    },
    [notify, syncCartToServer]
  );

  const updateCartQuantity = useCallback(
    (index: number, qty: number) => {
      setCart((prev) => {
        const next = [...prev];
        if (qty <= 0) {
          next.splice(index, 1);
        } else if (next[index]) {
          next[index] = { ...next[index], quantity: qty };
        }
        syncCartToServer(next);
        return next;
      });
    },
    [syncCartToServer]
  );

  const removeFromCart = useCallback(
    (index: number) => {
      setCart((prev) => {
        const next = [...prev];
        next.splice(index, 1);
        syncCartToServer(next);
        return next;
      });
    },
    [syncCartToServer]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    syncCartToServer([]);
  }, [syncCartToServer]);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (user) {
        try {
          const data = await apiRequest<{ wishlist: string[] }>('/api/customer/wishlist/toggle', {
            method: 'POST',
            body: JSON.stringify({ productId }),
          });
          setWishlist(data.wishlist);
          notify(
            data.wishlist.includes(productId) ? 'Saved to wishlist' : 'Removed from wishlist',
            'info'
          );
        } catch (err: any) {
          notify(err.message, 'error');
        }
      } else {
        setWishlist((prev) => {
          const exists = prev.includes(productId);
          const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
          localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(next));
          notify(exists ? 'Removed from wishlist' : 'Saved to wishlist', 'info');
          return next;
        });
      }
    },
    [notify, user]
  );

  const setSessionUser = useCallback(
    (nextUser: CustomerUser | null, token?: string | null, remember = true) => {
      if (token !== undefined) setCustomerToken(token, remember);
      setUser(nextUser);
    },
    []
  );

  const logoutCustomer = useCallback(async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setCustomerToken(null);
    setUser(null);
    setUnreadCount(0);
    notify('Signed out successfully', 'info');
    navigate('/');
  }, [navigate, notify]);

  return (
    <StoreContext.Provider
      value={{
        route,
        navigate,
        language,
        setLanguage,
        loading,
        staticMode,
        websiteSettings,
        categories,
        products,
        paymentSettings,
        user,
        cart,
        wishlist,
        unreadCount,
        cartDrawerOpen,
        setCartDrawerOpen,
        quickViewProduct,
        setQuickViewProduct,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleWishlist,
        refreshBootstrap,
        refreshMe,
        setSessionUser,
        logoutCustomer,
        notify,
      }}
    >
      {children}

      {/* Minimalist Luxury Toast Stack */}
      <div
        className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 text-sm font-medium border shadow-lg transition-all duration-200 flex items-center justify-between gap-3 ${
              toast.type === 'error'
                ? 'bg-[#181818] text-white border-red-500/60'
                : toast.type === 'success'
                ? 'bg-[#111111] text-white border-[#D4AF37]'
                : 'bg-white text-[#111111] border-neutral-300'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== toast.id))}
              className="text-xs opacity-70 hover:opacity-100 shrink-0"
            >
              Close
            </button>
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
};

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
