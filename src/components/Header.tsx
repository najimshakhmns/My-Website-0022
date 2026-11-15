import React, { useMemo, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Heart,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT } from '../lib/bangladesh.ts';
import { resolveMediaUrl } from '../lib/media.ts';
import { BrandLogo } from './BrandLogo.tsx';

export const Header: React.FC = () => {
  const {
    route,
    navigate,
    language,
    setLanguage,
    websiteSettings,
    categories,
    products,
    user,
    cart,
    wishlist,
    unreadCount,
    setCartDrawerOpen,
  } = useStore();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.nameBn.toLowerCase().includes(q) ||
          p.categorySlug.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [products, searchQuery]);

  const navItems = [
    { label: language === 'bn' ? 'হোম' : 'Home', path: '/' },
    { label: language === 'bn' ? 'পুরুষ' : 'Men', path: '/shop?cat=mens-fashion' },
    { label: language === 'bn' ? 'নারী' : 'Women', path: '/shop?cat=womens-fashion' },
    { label: language === 'bn' ? 'শিশু' : 'Kids', path: '/shop?cat=kids-fashion' },
    { label: language === 'bn' ? 'ট্র্যাক অর্ডার' : 'Track Order', path: '/track' },
  ];

  const announcement =
    language === 'bn'
      ? websiteSettings?.announcementBarBn || 'এমএনএস ফ্যাশন ব্র্যান্ডে স্বাগতম – আপনার স্টাইল আবিষ্কার করুন।'
      : websiteSettings?.announcementBar || 'Welcome to MNS Fashion Brand – Discover Your Style.';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200 no-print">
      {/* Slim Top Announcement Bar (<= 34px) */}
      {!bannerDismissed && (
        <div className="bg-[#111111] text-white h-8 px-4 flex items-center justify-between text-[11px] sm:text-xs tracking-wide">
          <div className="w-5 hidden sm:block" />
          <p className="truncate text-center font-medium">{announcement}</p>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Dismiss announcement"
            className="text-neutral-400 hover:text-white p-1 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main 3-Zone Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Mobile Hamburger + Brand Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open navigation menu"
            className="lg:hidden p-2 -ml-2 text-[#111111] hover:text-[#9A7B2C]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
          >
            <BrandLogo companyName={websiteSettings?.companyName || 'MNS FASHION BRAND'} />
          </button>
        </div>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-neutral-700">
          {navItems.map((item) => {
            const active = route === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                  active
                    ? 'border-[#D4AF37] text-[#111111] font-semibold'
                    : 'border-transparent hover:text-[#111111] hover:border-neutral-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* Collections Dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setCollectionsOpen(true)}
            onMouseLeave={() => setCollectionsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setCollectionsOpen((v) => !v)}
              className="whitespace-nowrap shrink-0 py-1 inline-flex items-center gap-1 border-b-2 border-transparent hover:text-[#111111]"
            >
              <span>{language === 'bn' ? 'কালেকশন' : 'Collections'}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {collectionsOpen && (
              <div className="absolute left-0 top-full pt-2 w-64 z-50">
                <div className="bg-white border border-neutral-200 shadow-xl p-3 grid gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionsOpen(false);
                      navigate('/shop');
                    }}
                    className="text-left px-3 py-2 text-xs uppercase tracking-wider font-semibold text-[#111111] hover:bg-neutral-100"
                  >
                    {language === 'bn' ? 'সকল পণ্য দেখুন' : 'All Collections'}
                  </button>
                  <div className="h-px bg-neutral-100 my-1" />
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setCollectionsOpen(false);
                        navigate(`/shop?cat=${cat.slug}`);
                      }}
                      className="text-left px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-[#111111] flex items-center justify-between"
                    >
                      <span>{language === 'bn' ? cat.nameBn : cat.name}</span>
                    </button>
                  ))}
                  <div className="h-px bg-neutral-100 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionsOpen(false);
                      navigate('/about');
                    }}
                    className="text-left px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                  >
                    {language === 'bn' ? 'আমাদের সম্পর্কে' : 'About MNS'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCollectionsOpen(false);
                      navigate('/contact');
                    }}
                    className="text-left px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                  >
                    {language === 'bn' ? 'যোগাযোগ' : 'Contact'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Functional Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
            className="px-2 py-1 text-xs font-medium border border-neutral-300 hover:border-[#111111] transition-colors whitespace-nowrap shrink-0"
            title="Switch Language"
          >
            {language === 'en' ? 'বাংলা' : 'EN'}
          </button>

          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label="Search products"
            className="p-2 text-[#111111] hover:text-[#9A7B2C] transition-colors"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            type="button"
            onClick={() => navigate(user ? '/account?tab=wishlist' : '/shop')}
            aria-label="Wishlist"
            className="relative p-2 text-[#111111] hover:text-[#9A7B2C] transition-colors hidden sm:inline-flex"
          >
            <Heart className="w-5 h-5" />
            {wishlist.length > 0 && (
              <span className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 bg-[#111111] text-white text-[10px] font-mono flex items-center justify-center">
                {wishlist.length}
              </span>
            )}
          </button>

          {user && (
            <button
              type="button"
              onClick={() => navigate('/account?tab=notifications')}
              aria-label="Notifications"
              className="relative p-2 text-[#111111] hover:text-[#9A7B2C] transition-colors hidden sm:inline-flex"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 bg-[#D4AF37] text-[#111111] font-bold text-[10px] font-mono flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate(user ? '/account' : '/login')}
            className="p-2 text-[#111111] hover:text-[#9A7B2C] transition-colors inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
            aria-label="Account"
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden md:inline max-w-[96px] truncate">
              {user ? user.fullName.split(' ')[0] : language === 'bn' ? 'লগইন' : 'Sign In'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            aria-label="Open shopping bag"
            className="relative px-3 py-2 bg-[#111111] text-white hover:bg-[#D4AF37] hover:text-[#111111] transition-colors inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="font-mono tabular-nums">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Search Overlay with Instant Suggestions */}
      {searchOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 sm:px-6 lg:px-8 py-4 shadow-lg">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearchOpen(false);
                navigate(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
              }}
              className="flex items-center gap-3 border-b border-[#111111] pb-2"
            >
              <Search className="w-5 h-5 text-neutral-500 shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  language === 'bn'
                    ? 'পাঞ্জাবি, শার্ট, জুতা বা এক্সেসরিজ খুঁজুন...'
                    : 'Search Panjabi, silk ensembles, shirts, shoes...'
                }
                className="w-full text-sm sm:text-base outline-none bg-transparent text-[#111111]"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#111111] text-white text-xs uppercase tracking-wider whitespace-nowrap shrink-0"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-1 text-neutral-500 hover:text-[#111111]"
              >
                <X className="w-5 h-5" />
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-3 divide-y divide-neutral-100">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery('');
                      navigate(`/product/${p.slug}`);
                    }}
                    className="w-full py-2.5 flex items-center justify-between gap-4 text-left hover:bg-neutral-50 px-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveMediaUrl(p.images[0])}
                        alt={p.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-9 object-cover bg-neutral-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#111111] truncate">{p.name}</div>
                        <div className="text-xs text-neutral-500">{p.brand}</div>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums shrink-0">
                      {formatBDT(p.salePrice > 0 && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 lg:hidden">
          <div className="bg-white w-80 max-w-[85vw] h-full p-6 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-5 border-b border-neutral-200">
                <BrandLogo companyName={websiteSettings?.companyName || 'MNS FASHION'} />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-5 flex flex-col gap-1">
                {[
                  { label: language === 'bn' ? 'হোম' : 'Home', path: '/' },
                  { label: language === 'bn' ? 'সকল কালেকশন' : 'Shop All', path: '/shop' },
                  { label: language === 'bn' ? 'পুরুষ' : 'Men', path: '/shop?cat=mens-fashion' },
                  { label: language === 'bn' ? 'নারী' : 'Women', path: '/shop?cat=womens-fashion' },
                  { label: language === 'bn' ? 'শিশু' : 'Kids', path: '/shop?cat=kids-fashion' },
                  { label: language === 'bn' ? 'পাঞ্জাবি' : 'Panjabi', path: '/shop?cat=panjabi' },
                  { label: language === 'bn' ? 'অর্ডার ট্র্যাক' : 'Track Order', path: '/track' },
                  { label: language === 'bn' ? 'আমাদের সম্পর্কে' : 'About Us', path: '/about' },
                  { label: language === 'bn' ? 'যোগাযোগ' : 'Contact', path: '/contact' },
                ].map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(link.path);
                    }}
                    className="text-left py-2.5 px-2 text-base font-medium text-[#111111] border-b border-neutral-100 hover:text-[#9A7B2C]"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate(user ? '/account' : '/login');
                }}
                className="w-full py-3 bg-[#111111] text-white text-xs uppercase tracking-wider font-medium"
              >
                {user ? 'My Account' : 'Sign In / Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
