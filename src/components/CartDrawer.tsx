import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/bangladesh.ts';
import { resolveMediaUrl } from '../lib/media.ts';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    products,
    websiteSettings,
    cartDrawerOpen,
    setCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    navigate,
  } = useStore();

  if (!cartDrawerOpen) return null;

  const resolvedItems = cart
    .map((item, idx) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const unitPrice =
        product.salePrice > 0 && product.salePrice < product.regularPrice
          ? product.salePrice
          : product.regularPrice;
      return { item, idx, product, unitPrice, lineTotal: unitPrice * item.quantity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = resolvedItems.reduce((s, r) => s + r.lineTotal, 0);
  const freeThreshold = websiteSettings?.deliveryCharges.freeShippingThreshold ?? 5000;
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  return (
    <div className="fixed inset-0 z-[85] bg-black/50 flex justify-end no-print">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl">
        <div className="px-6 py-5 border-b border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#111111]" />
            <h2 className="font-serif text-xl font-semibold text-[#111111]">
              Shopping Bag ({resolvedItems.reduce((s, r) => s + r.item.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close bag"
            className="p-1.5 text-neutral-500 hover:text-[#111111]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Delivery Progress */}
        <div className="px-6 py-3 bg-[#F7F6F3] border-b border-neutral-200 text-xs text-neutral-700">
          {remainingForFree === 0 && subtotal > 0 ? (
            <span className="font-medium text-[#111111]">
              Complimentary nationwide delivery unlocked.
            </span>
          ) : (
            <span>
              Add <strong className="font-mono">{formatBDT(remainingForFree)}</strong> more for free delivery across Bangladesh.
            </span>
          )}
          <div className="mt-1.5 h-1 w-full bg-neutral-200 overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-300"
              style={{ width: `${Math.min(100, (subtotal / Math.max(1, freeThreshold)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-neutral-100">
          {resolvedItems.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="text-sm text-neutral-500">Your shopping bag is currently empty.</p>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/shop');
                }}
                className="px-6 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider font-medium"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            resolvedItems.map(({ item, idx, product, unitPrice, lineTotal }) => (
              <div key={`${item.productId}-${item.size}-${item.color}`} className="py-4 flex gap-4">
                <img
                  src={resolveMediaUrl(product.images[0])}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 object-cover bg-neutral-100 shrink-0"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCartDrawerOpen(false);
                          navigate(`/product/${product.slug}`);
                        }}
                        className="text-sm font-medium text-[#111111] text-left hover:underline line-clamp-1"
                      >
                        {product.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(idx)}
                        aria-label="Remove item"
                        className="text-neutral-400 hover:text-red-600 p-0.5 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      Size: {item.size} · Color: {item.color}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div className="inline-flex items-center border border-neutral-300">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(idx, item.quantity - 1)}
                        aria-label="Decrease quantity"
                        className="p-1.5 hover:bg-neutral-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-mono tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(idx, Math.min(product.stock, item.quantity + 1))
                        }
                        aria-label="Increase quantity"
                        className="p-1.5 hover:bg-neutral-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-[#111111]">
                      {formatBDT(lineTotal)}
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
                    {formatBDT(unitPrice)} each
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totals */}
        {resolvedItems.length > 0 && (
          <div className="px-6 py-5 border-t border-neutral-200 bg-white space-y-4">
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatBDT(subtotal)}</span>
            </div>
            <p className="text-xs text-neutral-500">
              Delivery charges and promo codes calculated at checkout.
            </p>
            <button
              type="button"
              onClick={() => {
                setCartDrawerOpen(false);
                navigate('/checkout');
              }}
              className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
