import React, { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../context/StoreContext.tsx';
import { resolveMediaUrl } from '../lib/media.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export const HomePage: React.FC = () => {
  const { language, websiteSettings, categories, products, navigate } = useStore();
  const [collectionTab, setCollectionTab] = useState<'featured' | 'bestsellers' | 'new'>('featured');
  const [sliderOffset, setSliderOffset] = useState(0);

  const heroHeadline =
    language === 'bn'
      ? websiteSettings?.heroHeadlineBn || 'আপনার স্টাইল গড়ুন। নিজস্ব পরিচয় ধারণ করুন।'
      : websiteSettings?.heroHeadline || 'DEFINE YOUR STYLE. OWN YOUR IDENTITY.';

  const heroDescription =
    language === 'bn'
      ? websiteSettings?.heroDescriptionBn ||
        'আত্মবিশ্বাস, আরাম এবং স্বকীয়তার জন্য তৈরি আধুনিক ফ্যাশন কালেকশন আবিষ্কার করুন।'
      : websiteSettings?.heroDescription ||
        'Discover modern fashion collections designed for confidence, comfort and individuality.';

  const displayedProducts = products
    .filter((p) => {
      if (collectionTab === 'featured') return p.isFeatured;
      if (collectionTab === 'bestsellers') return p.isBestSeller;
      return p.isNewArrival;
    })
    .slice(0, 6);

  const visibleCats = categories.slice(sliderOffset, sliderOffset + 4);
  const canPrev = sliderOffset > 0;
  const canNext = sliderOffset + 4 < categories.length;

  return (
    <div className="bg-white">
      {/* 1. Editorial Campaign Hero */}
      <section className="relative bg-[#111111] text-white overflow-hidden">
        <div className="relative h-[540px] sm:h-[620px] lg:h-[680px] w-full">
          <img
            src={resolveMediaUrl(websiteSettings?.heroBannerImage || 'media:hero')}
            alt="MNS Fashion Brand Campaign"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

          <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16 lg:pb-20">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="max-w-2xl space-y-5"
            >
              <p className="text-xs sm:text-sm uppercase tracking-[0.22em] text-[#D4AF37] font-medium">
                {websiteSettings?.companyName || 'MNS Fashion Brand'} · Palashbari & Dhaka
              </p>
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.08] text-white">
                {heroHeadline}
              </h1>
              <p className="text-sm sm:text-base text-neutral-200 max-w-xl leading-relaxed">
                {heroDescription}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/shop')}
                  className="px-7 py-3.5 bg-[#D4AF37] text-[#111111] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-white transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0"
                >
                  <span>{language === 'bn' ? 'কেনাকাটা করুন' : 'SHOP NOW'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/shop?cat=panjabi')}
                  className="px-7 py-3.5 border border-white/60 text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-white hover:text-[#111111] transition-colors whitespace-nowrap shrink-0"
                >
                  {language === 'bn' ? 'কালেকশন দেখুন' : 'EXPLORE COLLECTION'}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Curated Collections Slider */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-b border-neutral-200">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Curated Categories
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#111111] mt-1">
              {websiteSettings?.promoBannerTitle || 'The Heritage & Atelier Edit 2026'}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setSliderOffset((o) => Math.max(0, o - 1))}
              aria-label="Previous categories"
              className="w-10 h-10 border border-neutral-300 flex items-center justify-center hover:border-[#111111] disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setSliderOffset((o) => Math.min(categories.length - 4, o + 1))}
              aria-label="Next categories"
              className="w-10 h-10 border border-neutral-300 flex items-center justify-center hover:border-[#111111] disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {visibleCats.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/shop?cat=${cat.slug}`)}
              className="group text-left border border-neutral-200 bg-white overflow-hidden hover:border-[#111111] transition-colors"
            >
              <div className="aspect-[4/3] bg-[#F5F5F3] overflow-hidden">
                <img
                  src={resolveMediaUrl(cat.image)}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-4 flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-medium text-base text-[#111111]">
                    {language === 'bn' ? cat.nameBn : cat.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{cat.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#111111] shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Featured Collection / Best Sellers / New Arrivals Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Tailored Selection
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#111111] mt-1">
              Signature Pieces
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-[#F5F5F5] border border-neutral-200 self-start sm:self-auto">
            {[
              { id: 'featured', label: language === 'bn' ? 'বিশেষ' : 'Featured' },
              { id: 'bestsellers', label: language === 'bn' ? 'বেস্টসেলার' : 'Best Sellers' },
              { id: 'new', label: language === 'bn' ? 'নতুন' : 'New Arrivals' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCollectionTab(tab.id as any)}
                className={`px-4 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  collectionTab === tab.id
                    ? 'bg-[#111111] text-white'
                    : 'text-neutral-600 hover:text-[#111111]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-8 py-3.5 border border-[#111111] text-[#111111] text-xs font-semibold uppercase tracking-[0.18em] hover:bg-[#111111] hover:text-white transition-colors"
          >
            View Complete Catalog ({products.length})
          </button>
        </div>
      </section>

      {/* 4. Craftsmanship & Brand Identity Story */}
      <section className="bg-[#181818] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#D4AF37]">
              Palashbari, Gaibandha · Bangladesh
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight">
              “{websiteSettings?.tagline || 'Your Style, Your Identity.'}”
            </h2>
            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
              {websiteSettings?.aboutUsContent}
            </p>
            <div className="pt-2 flex flex-wrap gap-8 border-t border-neutral-800 text-sm">
              <div>
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Founder & Owner</div>
                <div className="font-medium text-white mt-0.5">
                  {websiteSettings?.founderName || 'MD: Najim Shakh'}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Direct Concierge</div>
                <div className="font-mono text-[#D4AF37] mt-0.5">
                  {websiteSettings?.contactNumber || '01341422732'}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-400 uppercase tracking-wider">Delivery</div>
                <div className="font-medium text-white mt-0.5">64 Districts Nationwide</div>
              </div>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="px-6 py-3 bg-[#D4AF37] text-[#111111] text-xs font-semibold uppercase tracking-widest hover:bg-white transition-colors"
              >
                Read Our Story
              </button>
            </div>
          </div>

          <div className="aspect-[4/3] overflow-hidden border border-neutral-800">
            <img
              src={resolveMediaUrl('media:panjabi')}
              alt="MNS Tailoring Craftsmanship"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
