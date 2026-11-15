import React, { useState } from 'react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { BrandLogo } from './BrandLogo.tsx';

export const Footer: React.FC = () => {
  const { websiteSettings, categories, navigate, notify } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/newsletter', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ email }),
      });
      notify(res.message, 'success');
      setEmail('');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#111111] text-neutral-300 border-t border-neutral-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <BrandLogo variant="light" companyName={websiteSettings?.companyName || 'MNS FASHION BRAND'} />
            <p className="text-sm text-neutral-400 leading-relaxed">
              {websiteSettings?.footerDescription ||
                'Modern Bangladeshi luxury fashion house crafting tailored menswear, handloom womenswear, kidswear, footwear, and accessories.'}
            </p>
            <div className="text-xs text-neutral-400 space-y-1 pt-2 border-t border-neutral-800">
              <div>
                Founder: <span className="text-white">{websiteSettings?.founderName || 'MD: Najim Shakh'}</span>
              </div>
              <div>{websiteSettings?.businessAddress || 'Palashbari, Gaibandha, Bangladesh'}</div>
              <div className="font-mono text-[#D4AF37]">
                {websiteSettings?.contactNumber || '01341422732'} · {websiteSettings?.email || 'najimshakh6166@gmail.com'}
              </div>
            </div>
          </div>

          {/* Collections */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Collections
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/shop?cat=${cat.slug}`)}
                    className="hover:text-[#D4AF37] transition-colors text-left"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Client Service & Policies */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Client Service
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button type="button" onClick={() => navigate('/track')} className="hover:text-[#D4AF37]">
                  Track Your Order
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/about')} className="hover:text-[#D4AF37]">
                  About MNS Fashion
                </button>
              </li>
              <li>
                <button type="button" onClick={() => navigate('/contact')} className="hover:text-[#D4AF37]">
                  Contact & Flagship Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/policy/shipping')}
                  className="hover:text-[#D4AF37]"
                >
                  Shipping & Returns
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => navigate('/policy/privacy')}
                  className="hover:text-[#D4AF37]"
                >
                  Privacy & Terms
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter & Payments */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white">
              Private Client Dispatch
            </h3>
            <p className="text-sm text-neutral-400">
              Receive seasonal collection previews and private invitations.
            </p>
            {websiteSettings?.newsletterEnabled !== false && (
              <form onSubmit={handleSubscribe} className="flex">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-[#181818] border border-neutral-700 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#D4AF37] text-[#111111] text-xs font-semibold uppercase tracking-wider shrink-0 hover:bg-white transition-colors"
                >
                  {submitting ? '...' : 'Join'}
                </button>
              </form>
            )}
            <div className="pt-2 text-xs text-neutral-400">
              <div className="uppercase tracking-wider text-neutral-500 mb-1.5">Bangladesh Payments</div>
              <div className="flex flex-wrap items-center gap-2 text-neutral-300">
                <span>bKash</span>
                <span aria-hidden="true">·</span>
                <span>Nagad</span>
                <span aria-hidden="true">·</span>
                <span>Rocket</span>
                <span aria-hidden="true">·</span>
                <span>Cash on Delivery</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            © {new Date().getFullYear()} {websiteSettings?.companyName || 'MNS Fashion Brand'}. All rights reserved.
          </div>
          <div className="flex items-center gap-5">
            <a
              href={websiteSettings?.socialLinks.facebook || '#'}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Facebook
            </a>
            <a
              href={websiteSettings?.socialLinks.instagram || '#'}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white"
            >
              Instagram
            </a>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-neutral-400 hover:text-[#D4AF37] transition-colors"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
