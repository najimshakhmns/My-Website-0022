export type Language = 'en' | 'bn';

export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'cod';

export type PaymentStatus =
  | 'unpaid'
  | 'pending_verification'
  | 'paid'
  | 'failed'
  | 'refunded';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  mobile: string;
  district: string;
  upazila: string;
  address: string;
  isDefault: boolean;
}

export interface CustomerUser {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  role: 'customer';
  status: 'active' | 'suspended';
  profilePhoto: string;
  district: string;
  upazila: string;
  address: string;
  savedAddresses: SavedAddress[];
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  role: 'super_admin' | 'manager' | 'editor';
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  description: string;
  image: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  nameBn: string;
  slug: string;
  sku: string;
  categoryId: string;
  categorySlug: string;
  brand: string;
  description: string;
  descriptionBn: string;
  fabricAndCare: string;
  regularPrice: number;
  salePrice: number;
  stock: number;
  sizes: string[];
  colors: string[];
  images: string[];
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  isVisible: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
  size: string;
  color: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  size: string;
  color: string;
  unitPrice: number;
  subtotal: number;
}

export interface TrackingEntry {
  status: OrderStatus;
  label: string;
  note: string;
  timestamp: string;
  updatedBy: string;
}

export interface Order {
  id: string;
  userId: string | null;
  customerName: string;
  mobile: string;
  email: string;
  district: string;
  upazila: string;
  address: string;
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  couponCode: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  transactionId: string | null;
  trackingHistory: TrackingEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  userId: string | null;
  method: PaymentMethod;
  amount: number;
  transactionId: string;
  senderNumber: string;
  gatewayMode: 'demo' | 'live';
  status: 'initiated' | 'pending_verification' | 'verified' | 'failed' | 'refunded';
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // specific user id, 'all_customers', or 'admin'
  audience: 'customer' | 'admin';
  type:
    | 'order_confirmed'
    | 'payment_successful'
    | 'payment_failed'
    | 'order_processing'
    | 'order_shipped'
    | 'out_for_delivery'
    | 'order_delivered'
    | 'order_cancelled'
    | 'new_collection'
    | 'announcement'
    | 'security_alert'
    | 'low_stock'
    | 'new_order';
  title: string;
  message: string;
  orderId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface PaymentMethodConfig {
  enabled: boolean;
  merchantNumber: string;
  accountType: string;
  instructions: string;
  hasApiCredentials: boolean;
}

export interface PaymentSettings {
  mode: 'demo' | 'live';
  bkash: PaymentMethodConfig;
  nagad: PaymentMethodConfig;
  rocket: PaymentMethodConfig;
  cod: {
    enabled: boolean;
    instructions: string;
    maxOrderAmount: number;
    insideDhakaOnly: boolean;
  };
}

export interface WebsiteSettings {
  companyName: string;
  tagline: string;
  founderName: string;
  contactNumber: string;
  email: string;
  businessAddress: string;
  logoText: string;
  faviconUrl: string;
  announcementBar: string;
  announcementBarBn: string;
  heroHeadline: string;
  heroHeadlineBn: string;
  heroDescription: string;
  heroDescriptionBn: string;
  heroBannerImage: string;
  promoBannerTitle: string;
  promoBannerSubtitle: string;
  aboutUsContent: string;
  footerDescription: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    youtube: string;
    whatsapp: string;
  };
  colors: {
    primaryBlack: string;
    luxuryGold: string;
    darkBg: string;
  };
  deliveryCharges: {
    gaibandhaLocal: number;
    insideDhaka: number;
    outsideDhaka: number;
    freeShippingThreshold: number;
  };
  policies: {
    shipping: string;
    returns: string;
    privacy: string;
    terms: string;
  };
  navigationMenu: { label: string; labelBn: string; target: string }[];
  newsletterEnabled: boolean;
}

export interface AdminActivityLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}
