import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Star, Truck } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT, formatDateTimeBD } from '../lib/bangladesh.ts';
import { resolveMediaUrl } from '../lib/media.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import type { ProductReview } from '../types.ts';

export const ProductDetailPage: React.FC<{ slug: string }> = ({ slug }) => {
  const { products, language, navigate, addToCart, wishlist, toggleWishlist, user, notify } =
    useStore();

  const product = products.find((p) => p.slug === slug) || products[0];

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!product) return;
    setActiveImageIdx(0);
    setSelectedSize(product.sizes[0] || 'M');
    setSelectedColor(product.colors[0] || 'Default');
    setQty(1);
    apiRequest<{ reviews: ProductReview[] }>(`/api/products/${product.id}/reviews`, {
      authMode: 'none',
    })
      .then((res) => setReviews(res.reviews))
      .catch(() => {});
  }, [product?.id]);

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <p className="text-neutral-600">Product not found.</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="mt-4 px-6 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  const hasDiscount = product.salePrice > 0 && product.salePrice < product.regularPrice;
  const activePrice = hasDiscount ? product.salePrice : product.regularPrice;
  const discountPct = hasDiscount
    ? Math.round(((product.regularPrice - product.salePrice) / product.regularPrice) * 100)
    : 0;
  const isWishlisted = wishlist.includes(product.id);

  const related = products
    .filter((p) => p.id !== product.id && (p.categoryId === product.categoryId || p.isFeatured))
    .slice(0, 3);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await apiRequest<{ review: ProductReview }>(
        `/api/products/${product.id}/reviews`,
        {
          method: 'POST',
          body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
        }
      );
      setReviews((prev) => [res.review, ...prev]);
      setReviewComment('');
      notify('Review published', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        type="button"
        onClick={() => navigate('/shop')}
        className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-neutral-600 hover:text-[#111111] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Catalog</span>
      </button>

      {/* Main Contiguous Split Layout */}
      <div className="grid lg:grid-cols-12 gap-10 items-start">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-7 space-y-3 lg:sticky lg:top-24">
          <div className="aspect-[4/3] bg-[#F5F5F3] overflow-hidden border border-neutral-200 group">
            <img
              src={resolveMediaUrl(product.images[activeImageIdx] || product.images[0])}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[4/3] bg-[#F5F5F3] overflow-hidden border ${
                    activeImageIdx === idx ? 'border-[#111111] ring-1 ring-[#111111]' : 'border-neutral-200'
                  }`}
                >
                  <img
                    src={resolveMediaUrl(img)}
                    alt={`${product.name} view ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border-b border-neutral-200 pb-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-neutral-500">
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.sku}</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#111111] mt-2 leading-tight">
              {language === 'bn' ? product.nameBn : product.name}
            </h1>

            <div className="mt-3 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 font-mono tabular-nums">
                <Star className="w-4 h-4 text-[#D4AF37]" fill="#D4AF37" />
                <span className="font-semibold">{product.rating.toFixed(1)}</span>
                <span className="text-neutral-500">({reviews.length} reviews)</span>
              </div>
              <span className="text-neutral-300">|</span>
              <span className={product.stock > 0 ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </span>
            </div>

            <div className="mt-4 flex items-baseline gap-3 font-mono tabular-nums">
              <span className="text-2xl sm:text-3xl font-semibold text-[#111111]">
                {formatBDT(activePrice)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-neutral-400 line-through">
                    {formatBDT(product.regularPrice)}
                  </span>
                  <span className="text-xs font-semibold text-[#B8860B]">
                    Save {discountPct}%
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm sm:text-base text-neutral-700 leading-relaxed">
            {language === 'bn' ? product.descriptionBn : product.description}
          </p>

          {/* Size Selection */}
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#111111] mb-2">
              Select Size
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={`min-w-[44px] px-3.5 py-2 text-xs font-medium border transition-colors ${
                    selectedSize === s
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'border-neutral-300 text-neutral-800 hover:border-[#111111]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[#111111] mb-2">
              Select Color: <span className="font-normal text-neutral-600">{selectedColor}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`px-3.5 py-2 text-xs font-medium border transition-colors ${
                    selectedColor === c
                      ? 'bg-[#111111] text-white border-[#111111]'
                      : 'border-neutral-300 text-neutral-800 hover:border-[#111111]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Action CTAs */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-neutral-300">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-3 hover:bg-neutral-100"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-mono tabular-nums">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  className="p-3 hover:bg-neutral-100"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => addToCart(product, selectedSize, selectedColor, qty, true)}
                className="flex-1 py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#D4AF37] hover:text-[#111111] transition-colors flex items-center justify-center gap-2 disabled:bg-neutral-400"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{product.stock > 0 ? 'Add to Bag' : 'Out of Stock'}</span>
              </button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle wishlist"
                className={`p-3.5 border transition-colors ${
                  isWishlisted
                    ? 'bg-[#111111] text-[#D4AF37] border-[#111111]'
                    : 'border-neutral-300 text-[#111111] hover:border-[#111111]'
                }`}
              >
                <Heart className="w-4 h-4" fill={isWishlisted ? '#D4AF37' : 'none'} />
              </button>
            </div>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={() => {
                addToCart(product, selectedSize, selectedColor, qty, false);
                navigate('/checkout');
              }}
              className="w-full py-3.5 bg-[#D4AF37] text-[#111111] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#111111] hover:text-white transition-colors disabled:bg-neutral-300"
            >
              Buy Now — Express Checkout
            </button>
          </div>

          {/* Fabric & Shipping Assurances */}
          <div className="border-t border-neutral-200 pt-5 space-y-3 text-xs text-neutral-600">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
              <span>{product.fabricAndCare}</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Truck className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" />
              <span>
                Nationwide Bangladesh courier delivery (bKash, Nagad, Rocket & Cash on Delivery supported).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="mt-16 pt-12 border-t border-neutral-200 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111111]">
            Client Reviews
          </h2>
          <p className="text-sm text-neutral-600">
            Verified impressions from clients across Dhaka, Chattogram, Gaibandha, and nationwide.
          </p>

          <form onSubmit={handleSubmitReview} className="border border-neutral-200 p-5 space-y-4 bg-[#F9F8F6]">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#111111]">
              Write a Review
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-0.5"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className="w-5 h-5 text-[#D4AF37]"
                    fill={star <= reviewRating ? '#D4AF37' : 'none'}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              required
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={
                user
                  ? 'Share your thoughts on fit, fabric, and tailoring...'
                  : 'Sign in to leave a review...'
              }
              className="w-full border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-[#111111]"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
            >
              {user ? (submittingReview ? 'Submitting...' : 'Submit Review') : 'Sign In to Review'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 divide-y divide-neutral-200">
          {reviews.length === 0 ? (
            <p className="text-sm text-neutral-500 py-4">No reviews yet. Be the first to review this piece.</p>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="py-5 first:pt-0 space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-[#111111]">
                    {rev.userName}
                    {rev.verifiedPurchase && (
                      <span className="ml-2 text-xs font-normal text-emerald-700">
                        · Verified Purchase
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">
                    {formatDateTimeBD(rev.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 text-[#D4AF37]" fill="#D4AF37" />
                  ))}
                </div>
                <p className="text-sm text-neutral-700 leading-relaxed">{rev.comment}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-neutral-200">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#111111] mb-8">
            Complete the Look
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
