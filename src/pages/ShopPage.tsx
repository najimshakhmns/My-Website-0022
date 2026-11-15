import React, { useMemo, useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/bangladesh.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export const ShopPage: React.FC = () => {
  const { route, categories, products, language } = useStore();
  const params = new URLSearchParams(route.split('?')[1] || '');
  const initialCat = params.get('cat') || 'all';
  const initialQ = params.get('q') || '';

  const [selectedCat, setSelectedCat] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [selectedSize, setSelectedSize] = useState('all');
  const [selectedColor, setSelectedColor] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [maxPrice, setMaxPrice] = useState(12000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(route.split('?')[1] || '');
    setSelectedCat(p.get('cat') || 'all');
    setSearchQuery(p.get('q') || '');
  }, [route]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.sizes.forEach((s) => set.add(s)));
    return Array.from(set);
  }, [products]);

  const allColors = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.colors.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [products]);

  const allBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = products.filter((p) => {
      if (selectedCat !== 'all' && p.categorySlug !== selectedCat) return false;
      if (selectedSize !== 'all' && !p.sizes.includes(selectedSize)) return false;
      if (selectedColor !== 'all' && !p.colors.includes(selectedColor)) return false;
      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;
      if (inStockOnly && p.stock <= 0) return false;
      const price = p.salePrice > 0 && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice;
      if (price > maxPrice) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.nameBn.toLowerCase().includes(q) &&
        !p.description.toLowerCase().includes(q) &&
        !p.brand.toLowerCase().includes(q) &&
        !p.categorySlug.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    const getPrice = (p: (typeof products)[0]) =>
      p.salePrice > 0 && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice;

    if (sortBy === 'price-asc') return [...list].sort((a, b) => getPrice(a) - getPrice(b));
    if (sortBy === 'price-desc') return [...list].sort((a, b) => getPrice(b) - getPrice(a));
    if (sortBy === 'rating') return [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [
    products,
    selectedCat,
    searchQuery,
    selectedSize,
    selectedColor,
    selectedBrand,
    inStockOnly,
    maxPrice,
    sortBy,
  ]);

  const resetFilters = () => {
    setSelectedCat('all');
    setSearchQuery('');
    setSelectedSize('all');
    setSelectedColor('all');
    setSelectedBrand('all');
    setMaxPrice(12000);
    setInStockOnly(false);
  };

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs uppercase tracking-widest font-semibold text-[#111111] mb-3">
          Categories
        </h3>
        <div className="space-y-1.5 text-sm">
          <button
            type="button"
            onClick={() => setSelectedCat('all')}
            className={`block w-full text-left py-1 ${
              selectedCat === 'all' ? 'font-semibold text-[#111111] underline' : 'text-neutral-600 hover:text-[#111111]'
            }`}
          >
            All Collections
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCat(c.slug)}
              className={`block w-full text-left py-1 ${
                selectedCat === c.slug
                  ? 'font-semibold text-[#111111] underline'
                  : 'text-neutral-600 hover:text-[#111111]'
              }`}
            >
              {language === 'bn' ? c.nameBn : c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-neutral-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs uppercase tracking-widest font-semibold text-[#111111]">
            Max Price
          </h3>
          <span className="font-mono text-xs font-semibold tabular-nums">{formatBDT(maxPrice)}</span>
        </div>
        <input
          type="range"
          min={1000}
          max={12000}
          step={250}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#111111]"
        />
      </div>

      <div className="pt-5 border-t border-neutral-200">
        <h3 className="text-xs uppercase tracking-widest font-semibold text-[#111111] mb-2.5">
          Size
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedSize('all')}
            className={`px-2.5 py-1 text-xs border ${
              selectedSize === 'all' ? 'bg-[#111111] text-white border-[#111111]' : 'border-neutral-300'
            }`}
          >
            All
          </button>
          {allSizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelectedSize(s)}
              className={`px-2.5 py-1 text-xs border ${
                selectedSize === s ? 'bg-[#111111] text-white border-[#111111]' : 'border-neutral-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-5 border-t border-neutral-200">
        <h3 className="text-xs uppercase tracking-widest font-semibold text-[#111111] mb-2">
          Color
        </h3>
        <select
          value={selectedColor}
          onChange={(e) => setSelectedColor(e.target.value)}
          className="w-full border border-neutral-300 px-3 py-2 text-sm bg-white"
        >
          <option value="all">All Colors</option>
          {allColors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-5 border-t border-neutral-200">
        <h3 className="text-xs uppercase tracking-widest font-semibold text-[#111111] mb-2">
          Line / Brand
        </h3>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full border border-neutral-300 px-3 py-2 text-sm bg-white"
        >
          <option value="all">All Lines</option>
          {allBrands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-5 border-t border-neutral-200 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="accent-[#111111]"
          />
          <span>In Stock Only</span>
        </label>
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs underline text-neutral-500 hover:text-[#111111]"
        >
          Reset
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">MNS Catalog</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#111111] mt-1">
            {selectedCat === 'all'
              ? 'All Collections'
              : categories.find((c) => c.slug === selectedCat)?.name || 'Collection'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by keyword..."
            className="border border-neutral-300 px-3 py-2 text-sm w-48 sm:w-56 outline-none focus:border-[#111111]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="border border-neutral-300 px-3 py-2 text-sm bg-white outline-none focus:border-[#111111]"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
          </select>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden px-3 py-2 border border-neutral-300 text-sm inline-flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-[240px_1fr] gap-10">
        <aside className="hidden lg:block">{FilterPanel}</aside>

        <div>
          <div className="text-xs text-neutral-500 mb-5 font-mono tabular-nums">
            Showing {filteredProducts.length} pieces
          </div>

          {filteredProducts.length === 0 ? (
            <div className="border border-neutral-200 p-12 text-center space-y-3">
              <p className="text-base font-medium text-[#111111]">
                No pieces match your active filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2 bg-[#111111] text-white text-xs uppercase tracking-wider"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 lg:hidden flex justify-end">
          <div className="bg-white w-80 max-w-[85vw] h-full p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200 mb-5">
              <h2 className="font-serif text-xl font-semibold">Filters</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            {FilterPanel}
          </div>
        </div>
      )}
    </div>
  );
};
