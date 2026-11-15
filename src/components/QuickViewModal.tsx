import React, { useState, useEffect } from 'react';
import { ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/bangladesh.ts';
import { resolveMediaUrl } from '../lib/media.ts';

export const QuickViewModal: React.FC = () => {
  const { quickViewProduct, setQuickViewProduct, addToCart, navigate } = useStore();
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');

  useEffect(() => {
    if (quickViewProduct) {
      setSize(quickViewProduct.sizes[0] || 'M');
      setColor(quickViewProduct.colors[0] || 'Default');
    }
  }, [quickViewProduct]);

  if (!quickViewProduct) return null;

  const hasDiscount =
    quickViewProduct.salePrice > 0 &&
    quickViewProduct.salePrice < quickViewProduct.regularPrice;
  const price = hasDiscount ? quickViewProduct.salePrice : quickViewProduct.regularPrice;

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 no-print">
      <div className="bg-white w-full max-w-3xl grid md:grid-cols-2 border border-neutral-200 shadow-2xl relative overflow-hidden">
        <button
          type="button"
          onClick={() => setQuickViewProduct(null)}
          aria-label="Close quick view"
          className="absolute top-3 right-3 z-10 w-9 h-9 bg-white/95 border border-neutral-200 flex items-center justify-center hover:border-[#111111]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="aspect-[4/3] md:aspect-auto bg-[#F5F5F3]">
          <img
            src={resolveMediaUrl(quickViewProduct.images[0])}
            alt={quickViewProduct.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="p-6 sm:p-8 flex flex-col justify-between gap-5">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              {quickViewProduct.brand} · {quickViewProduct.sku}
            </div>
            <h3 className="font-serif text-2xl font-semibold text-[#111111] mt-1">
              {quickViewProduct.name}
            </h3>
            <div className="mt-3 flex items-baseline gap-3 font-mono tabular-nums">
              <span className="text-xl font-semibold text-[#111111]">{formatBDT(price)}</span>
              {hasDiscount && (
                <span className="text-sm text-neutral-400 line-through">
                  {formatBDT(quickViewProduct.regularPrice)}
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-neutral-600 leading-relaxed line-clamp-3">
              {quickViewProduct.description}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Size</div>
                <div className="flex flex-wrap gap-2">
                  {quickViewProduct.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                        size === s
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'border-neutral-300 text-neutral-700 hover:border-[#111111]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Color</div>
                <div className="flex flex-wrap gap-2">
                  {quickViewProduct.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                        color === c
                          ? 'bg-[#111111] text-white border-[#111111]'
                          : 'border-neutral-300 text-neutral-700 hover:border-[#111111]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={quickViewProduct.stock <= 0}
              onClick={() => {
                addToCart(quickViewProduct, size, color, 1, true);
                setQuickViewProduct(null);
              }}
              className="w-full py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors flex items-center justify-center gap-2 disabled:bg-neutral-400"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{quickViewProduct.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const slug = quickViewProduct.slug;
                setQuickViewProduct(null);
                navigate(`/product/${slug}`);
              }}
              className="w-full py-2.5 border border-neutral-300 text-xs font-medium uppercase tracking-wider hover:border-[#111111]"
            >
              View Full Product Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
