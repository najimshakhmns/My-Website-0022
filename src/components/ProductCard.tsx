import React from 'react';
import { Eye, Heart, ShoppingBag, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/bangladesh.ts';
import { resolveMediaUrl } from '../lib/media.ts';
import type { Product } from '../types.ts';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { language, navigate, addToCart, wishlist, toggleWishlist, setQuickViewProduct } = useStore();
  const isWishlisted = wishlist.includes(product.id);
  const hasDiscount = product.salePrice > 0 && product.salePrice < product.regularPrice;
  const activePrice = hasDiscount ? product.salePrice : product.regularPrice;
  const discountPct = hasDiscount
    ? Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100)
    : 0;

  const displayName = language === 'bn' ? product.nameBn : product.name;
  const primaryImg = resolveMediaUrl(product.images[0]);

  return (
    <article className="group flex flex-col bg-white border border-neutral-200 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* 4:3 Uniform Aspect Ratio Imagery Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F5F5F3]">
        <button
          type="button"
          onClick={() => navigate(`/product/${product.slug}`)}
          className="block w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          aria-label={`View ${displayName}`}
        >
          <img
            src={primaryImg}
            alt={displayName}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </button>

        {/* Top-right functional icon affordances */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`w-9 h-9 flex items-center justify-center border transition-colors ${
              isWishlisted
                ? 'bg-[#111111] text-[#D4AF37] border-[#111111]'
                : 'bg-white/95 text-[#111111] border-neutral-200 hover:border-[#111111]'
            }`}
          >
            <Heart className="w-4 h-4" fill={isWishlisted ? '#D4AF37' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            aria-label="Quick view"
            className="w-9 h-9 flex items-center justify-center bg-white/95 text-[#111111] border border-neutral-200 hover:border-[#111111] transition-colors"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Bar on Hover */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200">
          <button
            type="button"
            disabled={product.stock <= 0}
            onClick={() => addToCart(product, product.sizes[0], product.colors[0], 1, true)}
            className="w-full py-2.5 px-4 bg-[#111111] text-white text-xs font-medium tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#D4AF37] hover:text-[#111111] transition-colors disabled:bg-neutral-400 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>
              {product.stock > 0
                ? language === 'bn'
                  ? 'ব্যাগে যোগ করুন'
                  : 'Add to Bag'
                : language === 'bn'
                ? 'স্টক শেষ'
                : 'Sold Out'}
            </span>
          </button>
        </div>
      </div>

      {/* Unboxed Clean Metadata & Pricing */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 uppercase tracking-wider">
            <span>{product.brand}</span>
            <span aria-hidden="true">·</span>
            <span>{product.stock > 0 ? 'In Stock' : 'Out of Stock'}</span>
            {hasDiscount && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#B8860B] font-semibold">-{discountPct}%</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate(`/product/${product.slug}`)}
            className="mt-1 text-left font-medium text-[15px] leading-snug text-[#111111] hover:text-[#9A7B2C] transition-colors line-clamp-2"
          >
            {displayName}
          </button>
        </div>

        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2 font-mono tabular-nums">
            <span className="text-[15px] font-semibold text-[#111111]">
              {formatBDT(activePrice)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-neutral-400 line-through">
                {formatBDT(product.regularPrice)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-600 tabular-nums">
            <Star className="w-3.5 h-3.5 text-[#D4AF37]" fill="#D4AF37" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </article>
  );
};
