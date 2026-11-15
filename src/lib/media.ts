import heroCampaignImg from '../assets/images/hero_mns_campaign_1794728198108.jpg';
import productPanjabiImg from '../assets/images/product_panjabi_royal_1794728198029.jpg';
import productMensImg from '../assets/images/product_mens_tailored_1794728198452.jpg';
import productWomensImg from '../assets/images/product_womens_silk_1794728201033.jpg';
import productKidsImg from '../assets/images/product_kids_linen_1794728199328.jpg';
import productShoesImg from '../assets/images/product_leather_shoes_1794728200116.jpg';
import productAccessoriesImg from '../assets/images/product_luxury_accessories_1794728201231.jpg';

const MEDIA_MAP: Record<string, string> = {
  'media:hero': heroCampaignImg,
  'media:panjabi': productPanjabiImg,
  'media:mens': productMensImg,
  'media:womens': productWomensImg,
  'media:kids': productKidsImg,
  'media:shoes': productShoesImg,
  'media:accessories': productAccessoriesImg,
};

export function resolveMediaUrl(keyOrUrl: string | undefined): string {
  if (!keyOrUrl) return productMensImg;
  if (MEDIA_MAP[keyOrUrl]) return MEDIA_MAP[keyOrUrl];
  return keyOrUrl;
}

export const MEDIA_PRESETS = [
  { key: 'media:hero', label: 'Campaign Hero', url: heroCampaignImg },
  { key: 'media:panjabi', label: 'Royal Panjabi', url: productPanjabiImg },
  { key: 'media:mens', label: 'Tailored Menswear', url: productMensImg },
  { key: 'media:womens', label: 'Womenswear Silk', url: productWomensImg },
  { key: 'media:kids', label: 'Kids Linen', url: productKidsImg },
  { key: 'media:shoes', label: 'Leather Footwear', url: productShoesImg },
  { key: 'media:accessories', label: 'Luxury Accessories', url: productAccessoriesImg },
];
