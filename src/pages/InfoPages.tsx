import React, { useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { resolveMediaUrl } from '../lib/media.ts';

export const AboutPage: React.FC = () => {
  const { websiteSettings, navigate } = useStore();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="grid lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#9A7B2C] font-semibold">
            Our Heritage & Vision
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#111111] leading-tight">
            {websiteSettings?.companyName || 'MNS Fashion Brand'}
          </h1>
          <p className="text-lg font-serif italic text-neutral-600">
            “{websiteSettings?.tagline || 'Your Style, Your Identity.'}”
          </p>
          <p className="text-base text-neutral-700 leading-relaxed">
            {websiteSettings?.aboutUsContent}
          </p>
          <div className="pt-4 border-t border-neutral-200 grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">Founder & Owner</div>
              <div className="font-semibold text-[#111111] mt-1">
                {websiteSettings?.founderName || 'MD: Najim Shakh'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">Headquarters</div>
              <div className="font-semibold text-[#111111] mt-1">
                {websiteSettings?.businessAddress || 'Palashbari, Gaibandha, Bangladesh'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-7 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
          >
            Explore Collections
          </button>
        </div>

        <div className="aspect-[4/3] bg-[#F5F5F3] border border-neutral-200 overflow-hidden">
          <img
            src={resolveMediaUrl('media:womens')}
            alt="MNS Fashion Craftsmanship"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { websiteSettings, notify } = useStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    notify('Message received. Our Palashbari concierge team will reach out shortly.', 'success');
    setName('');
    setPhone('');
    setMessage('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Client Concierge</p>
        <h1 className="font-serif text-4xl font-semibold text-[#111111] mt-1">Contact Us</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="space-y-6 bg-[#111111] text-white p-8">
          <h2 className="font-serif text-2xl font-semibold text-[#D4AF37]">
            {websiteSettings?.companyName || 'MNS Fashion Brand'}
          </h2>
          <p className="text-sm text-neutral-300 leading-relaxed">
            For bespoke sizing inquiries, bulk festival orders, or order verification support, reach our studio directly.
          </p>
          <div className="space-y-4 text-sm pt-2">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
              <span>{websiteSettings?.businessAddress || 'Palashbari, Gaibandha, Bangladesh'}</span>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
              <span className="font-mono">{websiteSettings?.contactNumber || '01341422732'}</span>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#D4AF37] shrink-0 mt-1" />
              <span>{websiteSettings?.email || 'najimshakh6166@gmail.com'}</span>
            </div>
          </div>
          <div className="pt-4 border-t border-neutral-800 text-xs text-neutral-400">
            Operating Hours: Saturday – Thursday, 10:00 AM – 8:00 PM (Asia/Dhaka)
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border border-neutral-200 p-8 space-y-4 bg-white">
          <h3 className="font-serif text-2xl font-semibold text-[#111111]">Send an Inquiry</h3>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#111111]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
              Message / Order ID
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
};

export const PolicyPage: React.FC<{ type: 'shipping' | 'privacy' }> = ({ type }) => {
  const { websiteSettings } = useStore();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 space-y-8">
      <h1 className="font-serif text-4xl font-semibold text-[#111111]">
        {type === 'shipping' ? 'Shipping & Return Policy' : 'Privacy Policy & Terms'}
      </h1>
      <div className="space-y-6 text-sm text-neutral-700 leading-relaxed">
        {type === 'shipping' ? (
          <>
            <section className="border-t border-neutral-200 pt-5">
              <h2 className="font-serif text-2xl font-semibold text-[#111111] mb-2">
                Shipping & Dispatch
              </h2>
              <p>{websiteSettings?.policies.shipping}</p>
            </section>
            <section className="border-t border-neutral-200 pt-5">
              <h2 className="font-serif text-2xl font-semibold text-[#111111] mb-2">
                Exchanges & Returns
              </h2>
              <p>{websiteSettings?.policies.returns}</p>
            </section>
          </>
        ) : (
          <>
            <section className="border-t border-neutral-200 pt-5">
              <h2 className="font-serif text-2xl font-semibold text-[#111111] mb-2">
                Privacy Policy
              </h2>
              <p>{websiteSettings?.policies.privacy}</p>
            </section>
            <section className="border-t border-neutral-200 pt-5">
              <h2 className="font-serif text-2xl font-semibold text-[#111111] mb-2">
                Terms & Conditions
              </h2>
              <p>{websiteSettings?.policies.terms}</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
