import React from 'react';

export const OFFICIAL_LOGO_PATH = './assets/aistudio/image_be99a418.png';

interface BrandLogoProps {
  variant?: 'dark' | 'light';
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  companyName?: string;
  logoUrl?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  compact = false,
  size = 'md',
  companyName = 'MNS FASHION BRAND',
  logoUrl,
}) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-[#111111]';
  const imgSizeClass =
    size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSizeClass =
    size === 'lg' ? 'text-xl sm:text-2xl' : size === 'sm' ? 'text-base' : 'text-lg sm:text-xl';

  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap shrink-0 select-none">
      <img
        src={logoUrl || OFFICIAL_LOGO_PATH}
        alt={`${companyName} Logo`}
        referrerPolicy="no-referrer"
        className={`${imgSizeClass} rounded-full object-cover border border-[#D4AF37] bg-[#111111] shrink-0`}
      />
      {!compact && (
        <span
          className={`font-serif ${textSizeClass} font-semibold tracking-[0.14em] uppercase ${textColor}`}
        >
          {companyName}
        </span>
      )}
    </span>
  );
};
