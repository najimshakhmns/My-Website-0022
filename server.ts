import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';
import {
  clearAuthCookie,
  extractBearerOrCookie,
  hashOtp,
  hashPassword,
  setAuthCookie,
  signToken,
  verifyOtp,
  verifyPassword,
  verifyToken,
  type AuthedRequest,
} from './server/auth.ts';
import {
  getDb,
  logAdminAction,
  sanitizeAdmin,
  sanitizeCustomer,
  saveDb,
} from './server/store.ts';
import type {
  AppNotification,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
} from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);
const CUSTOMER_COOKIE = 'mns_customer_token';
const ADMIN_COOKIE = 'mns_admin_token';

const otpCooldownMap = new Map<string, number>();

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('880') && digits.length === 13) return `0${digits.slice(3)}`;
  return digits;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Order Placed',
    confirmed: 'Order Confirmed',
    processing: 'Processing',
    ready_to_ship: 'Ready to Ship',
    shipped: 'Shipped',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

function pushNotification(params: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>) {
  const db = getDb();
  db.notifications.unshift({
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    isRead: false,
    createdAt: nowIso(),
    ...params,
  });
  if (db.notifications.length > 1000) {
    db.notifications = db.notifications.slice(0, 1000);
  }
}

function getAuthenticatedCustomer(req: AuthedRequest) {
  const token = extractBearerOrCookie(req, CUSTOMER_COOKIE);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'customer') return null;
  const db = getDb();
  const user = db.users.find((u) => u.id === payload.sub);
  if (!user || user.tokenVersion !== payload.tokenVersion || user.status === 'suspended') {
    return null;
  }
  return user;
}

function requireCustomer(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedCustomer(req);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  req.customerId = user.id;
  next();
}

function requireAdmin(req: AuthedRequest, res: express.Response, next: express.NextFunction) {
  const token = extractBearerOrCookie(req, ADMIN_COOKIE);
  if (!token) {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  const payload = verifyToken(token);
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Invalid or expired admin session.' });
  }
  const db = getDb();
  const admin = db.admins.find((a) => a.id === payload.sub);
  if (!admin || admin.tokenVersion !== payload.tokenVersion) {
    return res.status(401).json({ error: 'Admin session invalidated.' });
  }
  req.adminId = admin.id;
  req.adminRole = admin.role;
  next();
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // =========================================================
  // STOREFRONT BOOTSTRAP & PUBLIC ROUTES
  // =========================================================
  app.get('/api/storefront/bootstrap', (_req, res) => {
    const db = getDb();
    res.json({
      websiteSettings: db.websiteSettings,
      categories: db.categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
      products: db.products.filter((p) => p.isVisible),
      paymentSettings: db.paymentSettings,
    });
  });

  app.get('/api/products/:id/reviews', (req, res) => {
    const db = getDb();
    const reviews = db.reviews
      .filter((r) => r.productId === req.params.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ reviews });
  });

  app.post('/api/newsletter', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const db = getDb();
    if (!db.newsletterSubscribers.some((s) => s.email === email)) {
      db.newsletterSubscribers.push({
        id: `sub-${crypto.randomUUID().slice(0, 8)}`,
        email,
        createdAt: nowIso(),
      });
      saveDb();
    }
    res.json({ ok: true, message: 'Thank you for subscribing to MNS Fashion Brand.' });
  });

  app.post('/api/orders/track', (req, res) => {
    const orderId = String(req.body?.orderId || '').trim().toUpperCase();
    const phone = normalizePhone(String(req.body?.mobile || ''));
    if (!orderId || !phone) {
      return res.status(400).json({ error: 'Order ID and registered mobile number are required.' });
    }
    const db = getDb();
    const order = db.orders.find(
      (o) => o.id.toUpperCase() === orderId && normalizePhone(o.mobile) === phone
    );
    if (!order) {
      return res.status(404).json({
        error: 'No verified order found matching this Order ID and mobile number.',
      });
    }
    res.json({
      order: {
        id: order.id,
        orderStatus: order.orderStatus,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        district: order.district,
        upazila: order.upazila,
        customerName: order.customerName,
        items: order.items,
        trackingHistory: order.trackingHistory,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  });

  // =========================================================
  // CUSTOMER AUTH & PASSWORD RESET
  // =========================================================
  app.post('/api/auth/register', (req, res) => {
    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const mobile = normalizePhone(String(req.body?.mobile || ''));
    const password = String(req.body?.password || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (fullName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!/^01[3-9]\d{8}$/.test(mobile)) {
      return res.status(400).json({ error: 'Please provide a valid 11-digit Bangladesh mobile number (01XXXXXXXXX).' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and Confirm Password do not match.' });
    }

    const db = getDb();
    const duplicate = db.users.find(
      (u) => u.email === email || normalizePhone(u.mobile) === mobile
    );
    if (duplicate) {
      return res.status(409).json({ error: 'An account with this email or mobile number already exists.' });
    }

    const ts = nowIso();
    const newUser = {
      id: `usr-${crypto.randomUUID().slice(0, 10)}`,
      fullName,
      email,
      mobile,
      passwordHash: hashPassword(password),
      role: 'customer' as const,
      status: 'active' as const,
      profilePhoto: '',
      district: 'Dhaka',
      upazila: 'Dhanmondi',
      address: '',
      savedAddresses: [],
      emailVerified: true,
      tokenVersion: 1,
      createdAt: ts,
      updatedAt: ts,
    };

    db.users.push(newUser);
    pushNotification({
      userId: newUser.id,
      audience: 'customer',
      type: 'new_collection',
      title: 'Welcome to MNS Fashion Brand',
      message: `Hello ${fullName}, your account is active. Explore our Heritage & Atelier Edit 2026.`,
    });
    saveDb();

    const ttlMs = 7 * 24 * 60 * 60 * 1000;
    const token = signToken(
      { sub: newUser.id, role: 'customer', tokenVersion: newUser.tokenVersion },
      ttlMs
    );
    setAuthCookie(res, CUSTOMER_COOKIE, token, ttlMs);
    res.status(201).json({ token, user: sanitizeCustomer(newUser) });
  });

  app.post('/api/auth/login', (req, res) => {
    const identifier = String(req.body?.identifier || '').trim();
    const password = String(req.body?.password || '');
    const rememberMe = Boolean(req.body?.rememberMe);

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email/mobile and password are required.' });
    }

    const db = getDb();
    const normalizedId = identifier.includes('@')
      ? identifier.toLowerCase()
      : normalizePhone(identifier);

    const user = db.users.find((u) =>
      identifier.includes('@')
        ? u.email === normalizedId
        : normalizePhone(u.mobile) === normalizedId
    );

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials. Please check and try again.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({
        error: 'Your account has been suspended. Please contact support at 01341422732.',
      });
    }

    const ttlMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const token = signToken(
      { sub: user.id, role: 'customer', tokenVersion: user.tokenVersion },
      ttlMs
    );
    setAuthCookie(res, CUSTOMER_COOKIE, token, ttlMs);
    res.json({
      token,
      user: sanitizeCustomer(user),
      cart: db.carts[user.id] || [],
      wishlist: db.wishlists[user.id] || [],
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearAuthCookie(res, CUSTOMER_COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res) => {
    const user = getAuthenticatedCustomer(req);
    if (!user) {
      return res.json({ user: null, cart: [], wishlist: [] });
    }
    const db = getDb();
    const unreadCount = db.notifications.filter(
      (n) =>
        n.audience === 'customer' &&
        (n.userId === user.id || n.userId === 'all_customers') &&
        !n.isRead
    ).length;
    res.json({
      user: sanitizeCustomer(user),
      cart: db.carts[user.id] || [],
      wishlist: db.wishlists[user.id] || [],
      unreadCount,
    });
  });

  // Forgot Password & OTP Flow (zero user-enumeration!)
  app.post('/api/auth/forgot-password', (req, res) => {
    const rawId = String(req.body?.identifier || '').trim();
    if (!rawId) {
      return res.status(400).json({ error: 'Please enter your registered email or mobile number.' });
    }
    const key = rawId.toLowerCase();
    const lastSent = otpCooldownMap.get(key) || 0;
    const elapsed = Date.now() - lastSent;
    if (elapsed < 45000) {
      const waitSec = Math.ceil((45000 - elapsed) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSec}s before requesting another verification code.`,
      });
    }
    otpCooldownMap.set(key, Date.now());

    const db = getDb();
    const normalized = rawId.includes('@') ? rawId.toLowerCase() : normalizePhone(rawId);
    const user = db.users.find((u) =>
      rawId.includes('@') ? u.email === normalized : normalizePhone(u.mobile) === normalized
    );

    const otp = String(crypto.randomInt(100000, 999999));
    db.passwordResets.push({
      id: `rst-${crypto.randomUUID().slice(0, 8)}`,
      identifier: normalized,
      userId: user ? user.id : null,
      otpHash: hashOtp(otp),
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      used: false,
      createdAt: nowIso(),
    });
    if (db.passwordResets.length > 200) {
      db.passwordResets = db.passwordResets.slice(-200);
    }
    saveDb();

    // Always return uniform response to prevent user enumeration.
    // In sandbox mode without external SMS/SMTP, surface sandboxCode uniformly for all requests.
    res.json({
      ok: true,
      message:
        'If an account matches this email or mobile number, a 6-digit verification code has been dispatched (valid for 10 minutes).',
      sandboxDeliveryCode: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const rawId = String(req.body?.identifier || '').trim();
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    const confirmPassword = String(req.body?.confirmPassword || '');

    if (!rawId || !otp || !newPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const db = getDb();
    const normalized = rawId.includes('@') ? rawId.toLowerCase() : normalizePhone(rawId);
    const resetRecord = [...db.passwordResets]
      .reverse()
      .find((r) => r.identifier === normalized && !r.used);

    if (!resetRecord || resetRecord.expiresAt < Date.now() || resetRecord.attempts >= 5) {
      return res.status(400).json({ error: 'Verification code is invalid or has expired.' });
    }

    resetRecord.attempts += 1;
    if (!verifyOtp(otp, resetRecord.otpHash) || !resetRecord.userId) {
      saveDb();
      return res.status(400).json({ error: 'Verification code is invalid or has expired.' });
    }

    const user = db.users.find((u) => u.id === resetRecord.userId);
    if (!user) {
      return res.status(400).json({ error: 'Verification code is invalid or has expired.' });
    }

    resetRecord.used = true;
    user.passwordHash = hashPassword(newPassword);
    user.tokenVersion += 1; // Invalidate all previous sessions
    user.updatedAt = nowIso();

    pushNotification({
      userId: user.id,
      audience: 'customer',
      type: 'security_alert',
      title: 'Password Updated',
      message:
        'Your MNS Fashion Brand password was recently reset and all prior sessions were signed out.',
    });
    saveDb();
    clearAuthCookie(res, CUSTOMER_COOKIE);

    res.json({ ok: true, message: 'Password updated successfully. Please sign in with your new password.' });
  });

  // =========================================================
  // CUSTOMER PROFILE, CART, WISHLIST, REVIEWS, NOTIFICATIONS
  // =========================================================
  app.put('/api/customer/profile', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.customerId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const fullName = String(req.body?.fullName ?? user.fullName).trim();
    const email = String(req.body?.email ?? user.email).trim().toLowerCase();
    const mobile = normalizePhone(String(req.body?.mobile ?? user.mobile));

    if (fullName.length < 2) {
      return res.status(400).json({ error: 'Full name must be at least 2 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }
    if (!/^01[3-9]\d{8}$/.test(mobile)) {
      return res.status(400).json({ error: 'Invalid Bangladesh mobile number (01XXXXXXXXX).' });
    }

    const conflict = db.users.find(
      (u) => u.id !== user.id && (u.email === email || normalizePhone(u.mobile) === mobile)
    );
    if (conflict) {
      return res.status(409).json({ error: 'Email or mobile number already in use by another account.' });
    }

    user.fullName = fullName;
    user.email = email;
    user.mobile = mobile;
    if (typeof req.body?.profilePhoto === 'string') {
      user.profilePhoto = req.body.profilePhoto.slice(0, 600000);
    }
    if (typeof req.body?.district === 'string') user.district = req.body.district.trim();
    if (typeof req.body?.upazila === 'string') user.upazila = req.body.upazila.trim();
    if (typeof req.body?.address === 'string') user.address = req.body.address.trim();
    if (Array.isArray(req.body?.savedAddresses)) {
      user.savedAddresses = req.body.savedAddresses.slice(0, 10);
    }
    user.updatedAt = nowIso();
    saveDb();

    res.json({ user: sanitizeCustomer(user) });
  });

  app.put('/api/customer/cart', requireCustomer, (req: AuthedRequest, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const db = getDb();
    db.carts[req.customerId!] = items.filter(
      (i: any) => i && typeof i.productId === 'string' && Number(i.quantity) > 0
    );
    saveDb();
    res.json({ cart: db.carts[req.customerId!] });
  });

  app.post('/api/customer/wishlist/toggle', requireCustomer, (req: AuthedRequest, res) => {
    const productId = String(req.body?.productId || '');
    const db = getDb();
    const list = db.wishlists[req.customerId!] || [];
    const idx = list.indexOf(productId);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(productId);
    }
    db.wishlists[req.customerId!] = list;
    saveDb();
    res.json({ wishlist: list });
  });

  app.post('/api/products/:id/reviews', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const user = db.users.find((u) => u.id === req.customerId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const rating = Math.min(5, Math.max(1, Number(req.body?.rating || 5)));
    const comment = String(req.body?.comment || '').trim();
    if (comment.length < 4) {
      return res.status(400).json({ error: 'Please write a short review (at least 4 characters).' });
    }

    const verifiedPurchase = db.orders.some(
      (o) =>
        o.userId === user.id &&
        o.orderStatus !== 'cancelled' &&
        o.items.some((i) => i.productId === product.id)
    );

    const review = {
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      productId: product.id,
      userId: user.id,
      userName: `${user.fullName}${user.district ? ` (${user.district})` : ''}`,
      rating,
      comment,
      verifiedPurchase,
      createdAt: nowIso(),
    };
    db.reviews.unshift(review);

    const productReviews = db.reviews.filter((r) => r.productId === product.id);
    const avg =
      productReviews.reduce((acc, r) => acc + r.rating, 0) / Math.max(1, productReviews.length);
    product.rating = Number(avg.toFixed(1));
    product.reviewCount = productReviews.length;
    saveDb();

    res.status(201).json({ review, rating: product.rating, reviewCount: product.reviewCount });
  });

  app.get('/api/customer/orders', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    const orders = db.orders
      .filter((o) => o.userId === req.customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ orders });
  });

  app.post('/api/customer/orders/:id/cancel', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    const order = db.orders.find(
      (o) => o.id === req.params.id && o.userId === req.customerId
    );
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (!['pending', 'confirmed'].includes(order.orderStatus)) {
      return res.status(400).json({
        error: 'Only pending or newly confirmed orders can be cancelled by the customer.',
      });
    }

    order.orderStatus = 'cancelled';
    order.updatedAt = nowIso();
    order.trackingHistory.push({
      status: 'cancelled',
      label: 'Cancelled',
      note: 'Order cancelled by customer.',
      timestamp: nowIso(),
      updatedBy: 'Customer',
    });

    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) prod.stock += item.quantity;
    }

    pushNotification({
      userId: req.customerId!,
      audience: 'customer',
      type: 'order_cancelled',
      title: `Order ${order.id} Cancelled`,
      message: `Your order ${order.id} has been cancelled as requested.`,
      orderId: order.id,
    });
    pushNotification({
      userId: 'admin',
      audience: 'admin',
      type: 'order_cancelled',
      title: `Customer Cancelled ${order.id}`,
      message: `${order.customerName} cancelled order ${order.id}.`,
      orderId: order.id,
    });
    saveDb();
    res.json({ order });
  });

  app.get('/api/customer/notifications', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    const notifications = db.notifications
      .filter(
        (n) =>
          n.audience === 'customer' &&
          (n.userId === req.customerId || n.userId === 'all_customers')
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ notifications });
  });

  app.post('/api/customer/notifications/read-all', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    for (const n of db.notifications) {
      if (
        n.audience === 'customer' &&
        (n.userId === req.customerId || n.userId === 'all_customers')
      ) {
        n.isRead = true;
      }
    }
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/customer/notifications/:id/read', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find(
      (n) =>
        n.id === req.params.id &&
        n.audience === 'customer' &&
        (n.userId === req.customerId || n.userId === 'all_customers')
    );
    if (notif) {
      notif.isRead = true;
      saveDb();
    }
    res.json({ ok: true });
  });

  app.delete('/api/customer/notifications/:id', requireCustomer, (req: AuthedRequest, res) => {
    const db = getDb();
    db.notifications = db.notifications.filter(
      (n) => !(n.id === req.params.id && n.userId === req.customerId)
    );
    saveDb();
    res.json({ ok: true });
  });

  // =========================================================
  // CHECKOUT & BANGLADESH PAYMENT GATEWAY ARCHITECTURE
  // =========================================================
  app.post('/api/orders', (req: AuthedRequest, res) => {
    const customer = getAuthenticatedCustomer(req);
    const db = getDb();

    const customerName = String(req.body?.customerName || '').trim();
    const mobile = normalizePhone(String(req.body?.mobile || ''));
    const email = String(req.body?.email || '').trim().toLowerCase();
    const district = String(req.body?.district || '').trim();
    const upazila = String(req.body?.upazila || '').trim();
    const address = String(req.body?.address || '').trim();
    const paymentMethod = String(req.body?.paymentMethod || 'cod') as PaymentMethod;
    const couponCode = String(req.body?.couponCode || '').trim().toUpperCase();
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];

    if (customerName.length < 2) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (!/^01[3-9]\d{8}$/.test(mobile)) {
      return res.status(400).json({ error: 'Valid Bangladesh mobile number (01XXXXXXXXX) is required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!district || !upazila || address.length < 5) {
      return res.status(400).json({ error: 'Complete delivery district, upazila, and street address are required.' });
    }
    if (!['bkash', 'nagad', 'rocket', 'cod'].includes(paymentMethod)) {
      return res.status(400).json({ error: 'Unsupported payment method.' });
    }
    if (rawItems.length === 0) {
      return res.status(400).json({ error: 'Your shopping bag is empty.' });
    }

    // Check payment method enabled
    if (paymentMethod === 'cod' && !db.paymentSettings.cod.enabled) {
      return res.status(400).json({ error: 'Cash on Delivery is currently disabled.' });
    }
    if (paymentMethod !== 'cod' && !db.paymentSettings[paymentMethod].enabled) {
      return res.status(400).json({ error: `${paymentMethod.toUpperCase()} payment is currently disabled.` });
    }

    const orderItems: OrderItem[] = [];
    let subtotal = 0;

    for (const raw of rawItems) {
      const prod = db.products.find((p) => p.id === raw.productId && p.isVisible);
      const qty = Math.max(1, Math.floor(Number(raw.quantity || 1)));
      if (!prod) {
        return res.status(400).json({ error: 'One or more products in your bag are no longer available.' });
      }
      if (prod.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock for ${prod.name}. Only ${prod.stock} left.`,
        });
      }
      const unitPrice = prod.salePrice > 0 && prod.salePrice < prod.regularPrice ? prod.salePrice : prod.regularPrice;
      const lineSub = unitPrice * qty;
      subtotal += lineSub;
      orderItems.push({
        productId: prod.id,
        productName: prod.name,
        productImage: prod.images[0] || 'media:mens',
        quantity: qty,
        size: String(raw.size || prod.sizes[0] || 'M'),
        color: String(raw.color || prod.colors[0] || 'Default'),
        unitPrice,
        subtotal: lineSub,
      });
    }

    let discount = 0;
    let appliedCoupon: string | null = null;
    if (couponCode === 'MNS10') {
      discount = Math.round(subtotal * 0.1);
      appliedCoupon = 'MNS10';
    } else if (couponCode === 'NAWAB500' && subtotal >= 3000) {
      discount = 500;
      appliedCoupon = 'NAWAB500';
    }

    const charges = db.websiteSettings.deliveryCharges;
    let deliveryCharge = charges.outsideDhaka;
    if (subtotal >= charges.freeShippingThreshold) {
      deliveryCharge = 0;
    } else if (district.toLowerCase() === 'gaibandha') {
      deliveryCharge = charges.gaibandhaLocal;
    } else if (district.toLowerCase() === 'dhaka') {
      deliveryCharge = charges.insideDhaka;
    }

    const totalAmount = Math.max(0, subtotal - discount + deliveryCharge);

    if (
      paymentMethod === 'cod' &&
      db.paymentSettings.cod.maxOrderAmount > 0 &&
      totalAmount > db.paymentSettings.cod.maxOrderAmount
    ) {
      return res.status(400).json({
        error: `Cash on Delivery is available up to ৳${db.paymentSettings.cod.maxOrderAmount.toLocaleString()}. Please use bKash, Nagad, or Rocket.`,
      });
    }

    if (
      paymentMethod === 'cod' &&
      db.paymentSettings.cod.insideDhakaOnly &&
      district.toLowerCase() !== 'dhaka'
    ) {
      return res.status(400).json({
        error: 'Cash on Delivery is currently restricted to Dhaka district.',
      });
    }

    // Deduct stock & emit low-stock notifications
    for (const item of orderItems) {
      const prod = db.products.find((p) => p.id === item.productId)!;
      prod.stock -= item.quantity;
      if (prod.stock <= 5) {
        pushNotification({
          userId: 'admin',
          audience: 'admin',
          type: 'low_stock',
          title: `Low Stock Alert: ${prod.name}`,
          message: `Only ${prod.stock} units remaining for SKU ${prod.sku}.`,
        });
      }
    }

    const orderId = `MNS-2026-${db.orderSequence++}`;
    const ts = nowIso();
    const newOrder: Order = {
      id: orderId,
      userId: customer ? customer.id : null,
      customerName,
      mobile,
      email,
      district,
      upazila,
      address,
      items: orderItems,
      subtotal,
      deliveryCharge,
      discount,
      couponCode: appliedCoupon,
      totalAmount,
      paymentMethod,
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      transactionId: null,
      trackingHistory: [
        {
          status: 'pending',
          label: 'Order Placed',
          note:
            paymentMethod === 'cod'
              ? 'Order placed with Cash on Delivery.'
              : `Order placed. Awaiting ${paymentMethod.toUpperCase()} transaction submission.`,
          timestamp: ts,
          updatedBy: 'System',
        },
      ],
      createdAt: ts,
      updatedAt: ts,
    };

    db.orders.unshift(newOrder);
    if (customer) {
      db.carts[customer.id] = [];
    }

    pushNotification({
      userId: 'admin',
      audience: 'admin',
      type: 'new_order',
      title: `New Order ${orderId}`,
      message: `${customerName} (${district}) placed an order for ৳${totalAmount.toLocaleString()} via ${paymentMethod.toUpperCase()}.`,
      orderId,
    });

    if (customer) {
      pushNotification({
        userId: customer.id,
        audience: 'customer',
        type: 'order_confirmed',
        title: `Order ${orderId} Received`,
        message: `Thank you for ordering from MNS Fashion Brand. Total: ৳${totalAmount.toLocaleString()}.`,
        orderId,
      });
    }

    saveDb();
    res.status(201).json({ order: newOrder });
  });

  app.post('/api/payments/initiate', (req: AuthedRequest, res) => {
    const orderId = String(req.body?.orderId || '').trim();
    const method = String(req.body?.method || '') as PaymentMethod;
    const db = getDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    if (method !== 'bkash' && method !== 'nagad' && method !== 'rocket') {
      return res.status(400).json({ error: 'Invalid online payment method.' });
    }
    const config = db.paymentSettings[method];
    if (!config.enabled) {
      return res.status(400).json({ error: `${method.toUpperCase()} is currently disabled.` });
    }

    const paymentId = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    db.payments.unshift({
      id: paymentId,
      orderId: order.id,
      userId: order.userId,
      method,
      amount: order.totalAmount,
      transactionId: '',
      senderNumber: '',
      gatewayMode: db.paymentSettings.mode,
      status: 'initiated',
      note: 'Payment session initiated on backend.',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    saveDb();

    res.json({
      paymentSession: {
        paymentId,
        orderId: order.id,
        method,
        amount: order.totalAmount,
        mode: db.paymentSettings.mode,
        merchantNumber: config.merchantNumber,
        accountType: config.accountType,
        instructions: config.instructions,
      },
    });
  });

  app.post('/api/payments/verify', (req, res) => {
    const paymentId = String(req.body?.paymentId || '').trim();
    const orderId = String(req.body?.orderId || '').trim();
    const transactionId = String(req.body?.transactionId || '').trim().toUpperCase();
    const senderNumber = normalizePhone(String(req.body?.senderNumber || ''));

    if (!transactionId || transactionId.length < 6 || !/^[A-Z0-9_-]{6,32}$/.test(transactionId)) {
      return res.status(400).json({
        error: 'Please enter a valid Transaction ID (6–32 alphanumeric characters).',
      });
    }
    if (!/^01[3-9]\d{8}$/.test(senderNumber)) {
      return res.status(400).json({
        error: 'Please enter the valid 11-digit sender mobile number used for payment.',
      });
    }

    const db = getDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Duplicate transaction ID protection
    const duplicate = db.payments.find(
      (p) =>
        p.transactionId &&
        p.transactionId.toUpperCase() === transactionId &&
        p.status !== 'failed'
    );
    if (duplicate) {
      return res.status(409).json({
        error: 'Duplicate Transaction ID detected. This reference has already been submitted.',
      });
    }

    const payment = db.payments.find((p) => p.id === paymentId && p.orderId === order.id);
    if (!payment) {
      return res.status(404).json({ error: 'Payment session not found.' });
    }

    // Never simulate fake real-money completion; mark pending_verification for merchant confirmation
    // unless live merchant API verification succeeds.
    payment.transactionId = transactionId;
    payment.senderNumber = senderNumber;
    payment.status = 'pending_verification';
    payment.note =
      db.paymentSettings.mode === 'demo'
        ? 'Submitted in Sandbox Demo Mode — awaiting admin payment verification.'
        : 'Submitted to gateway — awaiting merchant verification.';
    payment.updatedAt = nowIso();

    order.transactionId = transactionId;
    order.paymentStatus = 'pending_verification';
    order.updatedAt = nowIso();
    order.trackingHistory.push({
      status: order.orderStatus,
      label: 'Payment Submitted',
      note: `${order.paymentMethod.toUpperCase()} TrxID ${transactionId} submitted for verification.`,
      timestamp: nowIso(),
      updatedBy: 'Payment Gateway',
    });

    pushNotification({
      userId: 'admin',
      audience: 'admin',
      type: 'payment_successful',
      title: `Payment Verification Needed: ${order.id}`,
      message: `${order.paymentMethod.toUpperCase()} TrxID ${transactionId} from ${senderNumber} for ৳${order.totalAmount.toLocaleString()}.`,
      orderId: order.id,
    });

    if (order.userId) {
      pushNotification({
        userId: order.userId,
        audience: 'customer',
        type: 'order_processing',
        title: `Payment Reference Received (${order.id})`,
        message: `TrxID ${transactionId} received. Our team is verifying your ${order.paymentMethod.toUpperCase()} transfer.`,
        orderId: order.id,
      });
    }

    saveDb();
    res.json({ order, payment });
  });

  // =========================================================
  // ADMIN AUTH & SECURE INITIAL SETUP
  // =========================================================
  app.get('/api/admin/auth/status', (_req, res) => {
    const db = getDb();
    res.json({
      hasAdmin: db.admins.length > 0,
      requiresSetupKey: Boolean(process.env.ADMIN_SETUP_KEY && process.env.ADMIN_SETUP_KEY.trim()),
    });
  });

  app.post('/api/admin/auth/setup', (req, res) => {
    const db = getDb();
    if (db.admins.length > 0) {
      return res.status(403).json({
        error: 'Initial admin setup is permanently locked. Public admin registration is disabled.',
      });
    }

    const requiredKey = process.env.ADMIN_SETUP_KEY?.trim();
    if (requiredKey && String(req.body?.setupKey || '').trim() !== requiredKey) {
      return res.status(403).json({ error: 'Invalid admin setup passphrase.' });
    }

    const fullName = String(req.body?.fullName || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({
        error: 'Full name, valid email, and password (min 8 chars) are required.',
      });
    }

    const ts = nowIso();
    const admin = {
      id: `adm-${crypto.randomUUID().slice(0, 8)}`,
      fullName,
      email,
      passwordHash: hashPassword(password),
      role: 'super_admin' as const,
      permissions: ['all'],
      lastLoginAt: ts,
      tokenVersion: 1,
      createdAt: ts,
    };

    db.admins.push(admin);
    logAdminAction(admin, 'ADMIN_INITIAL_SETUP', 'admin', admin.id, `Initialized Super Admin ${email}`);
    saveDb();

    const ttlMs = 12 * 60 * 60 * 1000;
    const token = signToken(
      { sub: admin.id, role: 'admin', adminRole: admin.role, tokenVersion: admin.tokenVersion },
      ttlMs
    );
    setAuthCookie(res, ADMIN_COOKIE, token, ttlMs);
    res.status(201).json({ token, admin: sanitizeAdmin(admin) });
  });

  app.post('/api/admin/auth/login', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const db = getDb();
    const admin = db.admins.find((a) => a.email === email);
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    admin.lastLoginAt = nowIso();
    logAdminAction(admin, 'ADMIN_LOGIN', 'admin', admin.id, `Signed in to admin console`);
    saveDb();

    const ttlMs = 12 * 60 * 60 * 1000;
    const token = signToken(
      { sub: admin.id, role: 'admin', adminRole: admin.role, tokenVersion: admin.tokenVersion },
      ttlMs
    );
    setAuthCookie(res, ADMIN_COOKIE, token, ttlMs);
    res.json({ token, admin: sanitizeAdmin(admin) });
  });

  app.post('/api/admin/auth/logout', (_req, res) => {
    clearAuthCookie(res, ADMIN_COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/admin/auth/me', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId);
    if (!admin) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ admin: sanitizeAdmin(admin) });
  });

  // =========================================================
  // ADMIN DASHBOARD, ORDERS, PRODUCTS, CUSTOMERS, SETTINGS
  // =========================================================
  app.get('/api/admin/dashboard', requireAdmin, (_req, res) => {
    const db = getDb();
    const validOrders = db.orders.filter((o) => o.orderStatus !== 'cancelled');
    const totalRevenue = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const pendingOrders = db.orders.filter((o) => o.orderStatus === 'pending').length;
    const processingOrders = db.orders.filter((o) =>
      ['confirmed', 'processing', 'ready_to_ship', 'shipped', 'out_for_delivery'].includes(
        o.orderStatus
      )
    ).length;
    const deliveredOrders = db.orders.filter((o) => o.orderStatus === 'delivered').length;
    const cancelledOrders = db.orders.filter((o) => o.orderStatus === 'cancelled').length;
    const lowStockProducts = db.products.filter((p) => p.stock <= 5);

    // Build 7-day sales trend
    const dailySales: { date: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOrders = validOrders.filter((o) => o.createdAt.slice(0, 10) === dayKey);
      dailySales.push({
        date: label,
        revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
        orders: dayOrders.length,
      });
    }

    // Best selling products
    const salesMap = new Map<string, { name: string; sold: number; revenue: number }>();
    for (const o of validOrders) {
      for (const item of o.items) {
        const cur = salesMap.get(item.productId) || { name: item.productName, sold: 0, revenue: 0 };
        cur.sold += item.quantity;
        cur.revenue += item.subtotal;
        salesMap.set(item.productId, cur);
      }
    }
    const bestSellingProducts = [...salesMap.values()]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5);

    res.json({
      stats: {
        totalRevenue,
        totalOrders: db.orders.length,
        totalCustomers: db.users.length,
        totalProducts: db.products.length,
        pendingOrders,
        processingOrders,
        deliveredOrders,
        cancelledOrders,
      },
      lowStockProducts,
      recentOrders: db.orders.slice(0, 8),
      dailySales,
      bestSellingProducts,
      unreadNotifications: db.notifications.filter((n) => n.audience === 'admin' && !n.isRead).length,
    });
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    const db = getDb();
    res.json({ orders: db.orders });
  });

  app.put('/api/admin/orders/:id/status', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const newStatus = String(req.body?.orderStatus || '') as OrderStatus;
    const note = String(req.body?.note || '').trim();
    const validStatuses: OrderStatus[] = [
      'pending',
      'confirmed',
      'processing',
      'ready_to_ship',
      'shipped',
      'out_for_delivery',
      'delivered',
      'cancelled',
    ];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const prevStatus = order.orderStatus;
    order.orderStatus = newStatus;
    order.updatedAt = nowIso();
    order.trackingHistory.push({
      status: newStatus,
      label: getOrderStatusLabel(newStatus),
      note: note || `Order status updated to ${getOrderStatusLabel(newStatus)}.`,
      timestamp: nowIso(),
      updatedBy: admin.fullName,
    });

    if (newStatus === 'cancelled' && prevStatus !== 'cancelled') {
      for (const item of order.items) {
        const prod = db.products.find((p) => p.id === item.productId);
        if (prod) prod.stock += item.quantity;
      }
    }

    if (order.userId) {
      const notifMap: Partial<Record<OrderStatus, AppNotification['type']>> = {
        confirmed: 'order_confirmed',
        processing: 'order_processing',
        shipped: 'order_shipped',
        out_for_delivery: 'out_for_delivery',
        delivered: 'order_delivered',
        cancelled: 'order_cancelled',
      };
      pushNotification({
        userId: order.userId,
        audience: 'customer',
        type: notifMap[newStatus] || 'order_processing',
        title: `Order ${order.id}: ${getOrderStatusLabel(newStatus)}`,
        message: note || `Your order status is now ${getOrderStatusLabel(newStatus)}.`,
        orderId: order.id,
      });
    }

    logAdminAction(
      admin,
      'UPDATE_ORDER_STATUS',
      'order',
      order.id,
      `Changed order status from ${prevStatus} to ${newStatus}`
    );
    saveDb();
    res.json({ order });
  });

  app.put('/api/admin/orders/:id/payment-status', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const order = db.orders.find((o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const paymentStatus = String(req.body?.paymentStatus || '') as PaymentStatus;
    if (!['unpaid', 'pending_verification', 'paid', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status.' });
    }

    order.paymentStatus = paymentStatus;
    order.updatedAt = nowIso();

    const payment = db.payments.find((p) => p.orderId === order.id);
    if (payment) {
      payment.status =
        paymentStatus === 'paid'
          ? 'verified'
          : paymentStatus === 'failed'
          ? 'failed'
          : paymentStatus === 'refunded'
          ? 'refunded'
          : 'pending_verification';
      payment.updatedAt = nowIso();
    }

    if (order.userId && (paymentStatus === 'paid' || paymentStatus === 'failed')) {
      pushNotification({
        userId: order.userId,
        audience: 'customer',
        type: paymentStatus === 'paid' ? 'payment_successful' : 'payment_failed',
        title:
          paymentStatus === 'paid'
            ? `Payment Verified (${order.id})`
            : `Payment Issue (${order.id})`,
        message:
          paymentStatus === 'paid'
            ? `Your payment of ৳${order.totalAmount.toLocaleString()} has been verified.`
            : `We could not verify your payment for order ${order.id}. Please contact 01341422732.`,
        orderId: order.id,
      });
    }

    logAdminAction(
      admin,
      'UPDATE_PAYMENT_STATUS',
      'order',
      order.id,
      `Set payment status to ${paymentStatus}`
    );
    saveDb();
    res.json({ order });
  });

  // Products CRUD
  app.get('/api/admin/products', requireAdmin, (_req, res) => {
    const db = getDb();
    res.json({ products: db.products, categories: db.categories });
  });

  app.post('/api/admin/products', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const body = req.body || {};
    const name = String(body.name || '').trim();
    const categoryId = String(body.categoryId || '');
    const cat = db.categories.find((c) => c.id === categoryId);

    if (!name || !cat) {
      return res.status(400).json({ error: 'Product name and valid category are required.' });
    }

    const regularPrice = Math.max(0, Number(body.regularPrice || 0));
    const salePrice = Math.max(0, Number(body.salePrice || regularPrice));
    const slug =
      String(body.slug || name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
      '-' +
      crypto.randomBytes(2).toString('hex');

    const ts = nowIso();
    const product: Product = {
      id: `prod-${crypto.randomUUID().slice(0, 8)}`,
      name,
      nameBn: String(body.nameBn || name).trim(),
      slug,
      sku: String(body.sku || `MNS-${Date.now().toString().slice(-5)}`).trim().toUpperCase(),
      categoryId: cat.id,
      categorySlug: cat.slug,
      brand: String(body.brand || 'MNS Atelier').trim(),
      description: String(body.description || '').trim(),
      descriptionBn: String(body.descriptionBn || body.description || '').trim(),
      fabricAndCare: String(body.fabricAndCare || 'Premium tailored fabric · Gentle care.').trim(),
      regularPrice,
      salePrice,
      stock: Math.max(0, Math.floor(Number(body.stock || 0))),
      sizes: Array.isArray(body.sizes) && body.sizes.length ? body.sizes : ['M', 'L', 'XL'],
      colors: Array.isArray(body.colors) && body.colors.length ? body.colors : ['Obsidian Black'],
      images:
        Array.isArray(body.images) && body.images.length
          ? body.images
          : [cat.image || 'media:mens'],
      isFeatured: Boolean(body.isFeatured),
      isBestSeller: Boolean(body.isBestSeller),
      isNewArrival: Boolean(body.isNewArrival ?? true),
      isVisible: body.isVisible !== false,
      rating: 5.0,
      reviewCount: 0,
      createdAt: ts,
      updatedAt: ts,
    };

    db.products.unshift(product);
    logAdminAction(admin, 'CREATE_PRODUCT', 'product', product.id, `Created product ${product.name}`);
    saveDb();
    res.status(201).json({ product });
  });

  app.put('/api/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const product = db.products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    const body = req.body || {};
    if (body.categoryId) {
      const cat = db.categories.find((c) => c.id === body.categoryId);
      if (cat) {
        product.categoryId = cat.id;
        product.categorySlug = cat.slug;
      }
    }
    if (typeof body.name === 'string') product.name = body.name.trim();
    if (typeof body.nameBn === 'string') product.nameBn = body.nameBn.trim();
    if (typeof body.sku === 'string') product.sku = body.sku.trim().toUpperCase();
    if (typeof body.brand === 'string') product.brand = body.brand.trim();
    if (typeof body.description === 'string') product.description = body.description.trim();
    if (typeof body.descriptionBn === 'string') product.descriptionBn = body.descriptionBn.trim();
    if (typeof body.fabricAndCare === 'string') product.fabricAndCare = body.fabricAndCare.trim();
    if (body.regularPrice !== undefined) product.regularPrice = Math.max(0, Number(body.regularPrice));
    if (body.salePrice !== undefined) product.salePrice = Math.max(0, Number(body.salePrice));
    if (body.stock !== undefined) product.stock = Math.max(0, Math.floor(Number(body.stock)));
    if (Array.isArray(body.sizes)) product.sizes = body.sizes;
    if (Array.isArray(body.colors)) product.colors = body.colors;
    if (Array.isArray(body.images) && body.images.length > 0) product.images = body.images;
    if (body.isFeatured !== undefined) product.isFeatured = Boolean(body.isFeatured);
    if (body.isBestSeller !== undefined) product.isBestSeller = Boolean(body.isBestSeller);
    if (body.isNewArrival !== undefined) product.isNewArrival = Boolean(body.isNewArrival);
    if (body.isVisible !== undefined) product.isVisible = Boolean(body.isVisible);
    product.updatedAt = nowIso();

    logAdminAction(admin, 'UPDATE_PRODUCT', 'product', product.id, `Updated product ${product.name}`);
    saveDb();
    res.json({ product });
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const prod = db.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found.' });
    db.products = db.products.filter((p) => p.id !== req.params.id);
    logAdminAction(admin, 'DELETE_PRODUCT', 'product', prod.id, `Deleted product ${prod.name}`);
    saveDb();
    res.json({ ok: true });
  });

  // Categories CRUD
  app.post('/api/admin/categories', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Category name is required.' });
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const cat = {
      id: `cat-${crypto.randomUUID().slice(0, 6)}`,
      name,
      nameBn: String(req.body?.nameBn || name).trim(),
      slug: db.categories.some((c) => c.slug === slug) ? `${slug}-${Date.now().toString().slice(-3)}` : slug,
      description: String(req.body?.description || '').trim(),
      image: String(req.body?.image || 'media:mens'),
      displayOrder: db.categories.length + 1,
      isActive: true,
    };
    db.categories.push(cat);
    logAdminAction(admin, 'CREATE_CATEGORY', 'category', cat.id, `Created category ${cat.name}`);
    saveDb();
    res.status(201).json({ category: cat });
  });

  // Customers management (never expose passwordHash!)
  app.get('/api/admin/customers', requireAdmin, (_req, res) => {
    const db = getDb();
    const customers = db.users.map((u) => {
      const orders = db.orders.filter((o) => o.userId === u.id);
      return {
        ...sanitizeCustomer(u),
        orderCount: orders.length,
        totalSpent: orders
          .filter((o) => o.orderStatus !== 'cancelled')
          .reduce((s, o) => s + o.totalAmount, 0),
      };
    });
    res.json({ customers });
  });

  app.put('/api/admin/customers/:id', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Customer not found.' });

    if (typeof req.body?.fullName === 'string') user.fullName = req.body.fullName.trim();
    if (typeof req.body?.district === 'string') user.district = req.body.district.trim();
    if (typeof req.body?.upazila === 'string') user.upazila = req.body.upazila.trim();
    if (typeof req.body?.address === 'string') user.address = req.body.address.trim();
    if (req.body?.status === 'active' || req.body?.status === 'suspended') {
      user.status = req.body.status;
      if (user.status === 'suspended') {
        user.tokenVersion += 1;
      }
    }
    user.updatedAt = nowIso();

    logAdminAction(
      admin,
      'UPDATE_CUSTOMER',
      'user',
      user.id,
      `Updated customer ${user.email} (status: ${user.status})`
    );
    saveDb();
    res.json({ customer: sanitizeCustomer(user) });
  });

  // Website Settings
  app.get('/api/admin/settings', requireAdmin, (_req, res) => {
    const db = getDb();
    res.json({ websiteSettings: db.websiteSettings });
  });

  app.put('/api/admin/settings', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const incoming = req.body?.websiteSettings || req.body || {};

    db.websiteSettings = {
      ...db.websiteSettings,
      ...incoming,
      socialLinks: {
        ...db.websiteSettings.socialLinks,
        ...(incoming.socialLinks || {}),
      },
      colors: {
        ...db.websiteSettings.colors,
        ...(incoming.colors || {}),
      },
      deliveryCharges: {
        ...db.websiteSettings.deliveryCharges,
        ...(incoming.deliveryCharges || {}),
      },
      policies: {
        ...db.websiteSettings.policies,
        ...(incoming.policies || {}),
      },
    };

    logAdminAction(admin, 'UPDATE_WEBSITE_SETTINGS', 'settings', 'website', 'Updated website branding & configuration');
    saveDb();
    res.json({ websiteSettings: db.websiteSettings });
  });

  // Payment Settings & Transactions
  app.get('/api/admin/payment-settings', requireAdmin, (_req, res) => {
    const db = getDb();
    res.json({
      paymentSettings: db.paymentSettings,
      payments: db.payments,
    });
  });

  app.put('/api/admin/payment-settings', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const body = req.body || {};

    if (body.mode === 'demo' || body.mode === 'live') {
      db.paymentSettings.mode = body.mode;
    }

    for (const method of ['bkash', 'nagad', 'rocket'] as const) {
      if (body[method]) {
        db.paymentSettings[method] = {
          ...db.paymentSettings[method],
          enabled: Boolean(body[method].enabled),
          merchantNumber: String(body[method].merchantNumber || db.paymentSettings[method].merchantNumber),
          accountType: String(body[method].accountType || db.paymentSettings[method].accountType),
          instructions: String(body[method].instructions || db.paymentSettings[method].instructions),
        };
      }
    }

    if (body.cod) {
      db.paymentSettings.cod = {
        ...db.paymentSettings.cod,
        enabled: Boolean(body.cod.enabled),
        instructions: String(body.cod.instructions || db.paymentSettings.cod.instructions),
        maxOrderAmount: Math.max(0, Number(body.cod.maxOrderAmount ?? db.paymentSettings.cod.maxOrderAmount)),
        insideDhakaOnly: Boolean(body.cod.insideDhakaOnly),
      };
    }

    // Store optional gateway secrets strictly server-side (never returned in API responses)
    if (body.credentials) {
      if (body.credentials.bkashAppKey) {
        db.paymentSecrets.bkashAppKey = String(body.credentials.bkashAppKey);
        db.paymentSettings.bkash.hasApiCredentials = true;
      }
      if (body.credentials.bkashAppSecret) {
        db.paymentSecrets.bkashAppSecret = String(body.credentials.bkashAppSecret);
      }
      if (body.credentials.nagadPublicKey) {
        db.paymentSecrets.nagadPublicKey = String(body.credentials.nagadPublicKey);
        db.paymentSettings.nagad.hasApiCredentials = true;
      }
      if (body.credentials.rocketApiKey) {
        db.paymentSecrets.rocketApiKey = String(body.credentials.rocketApiKey);
        db.paymentSettings.rocket.hasApiCredentials = true;
      }
    }

    logAdminAction(admin, 'UPDATE_PAYMENT_SETTINGS', 'settings', 'payments', `Updated payment gateway configuration (${db.paymentSettings.mode} mode)`);
    saveDb();
    res.json({ paymentSettings: db.paymentSettings });
  });

  // Admin Notifications, Broadcast Announcements & Audit Logs
  app.get('/api/admin/notifications', requireAdmin, (_req, res) => {
    const db = getDb();
    res.json({
      notifications: db.notifications.filter((n) => n.audience === 'admin'),
      auditLogs: db.adminActivityLogs,
    });
  });

  app.post('/api/admin/notifications/announce', requireAdmin, (req: AuthedRequest, res) => {
    const db = getDb();
    const admin = db.admins.find((a) => a.id === req.adminId)!;
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!title || !message) {
      return res.status(400).json({ error: 'Announcement title and message are required.' });
    }
    pushNotification({
      userId: 'all_customers',
      audience: 'customer',
      type: 'announcement',
      title,
      message,
    });
    logAdminAction(admin, 'SEND_ANNOUNCEMENT', 'notification', 'all_customers', `Broadcast: ${title}`);
    saveDb();
    res.json({ ok: true });
  });

  app.post('/api/admin/notifications/:id/read', requireAdmin, (req, res) => {
    const db = getDb();
    const notif = db.notifications.find((n) => n.id === req.params.id && n.audience === 'admin');
    if (notif) {
      notif.isRead = true;
      saveDb();
    }
    res.json({ ok: true });
  });

  // =========================================================
  // VITE / STATIC SERVING
  // =========================================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MNS Fashion Brand server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
