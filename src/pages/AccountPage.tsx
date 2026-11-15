import React, { useEffect, useState } from 'react';
import {
  Bell,
  Camera,
  CheckCheck,
  Heart,
  LogOut,
  MapPin,
  Package,
  Plus,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { BANGLADESH_DISTRICTS, formatBDT, formatDateTimeBD } from '../lib/bangladesh.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { InvoiceModal } from '../components/InvoiceModal.tsx';
import type { AppNotification, Order, SavedAddress } from '../types.ts';

export const AccountPage: React.FC = () => {
  const {
    route,
    user,
    products,
    wishlist,
    websiteSettings,
    navigate,
    refreshMe,
    logoutCustomer,
    addToCart,
    notify,
  } = useStore();

  const urlTab = new URLSearchParams(route.split('?')[1] || '').get('tab');
  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'wishlist' | 'notifications'>(
    (urlTab as any) || 'profile'
  );

  // Profile State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState('Dhaka');
  const [upazila, setUpazila] = useState('Dhanmondi');
  const [address, setAddress] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);

  // Add New Address State
  const [newAddrLabel, setNewAddrLabel] = useState('');
  const [newAddrStreet, setNewAddrStreet] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (urlTab && ['profile', 'orders', 'wishlist', 'notifications'].includes(urlTab)) {
      setActiveTab(urlTab as any);
    }
  }, [urlTab]);

  const resetProfileForm = () => {
    if (!user) return;
    setFullName(user.fullName);
    setEmail(user.email);
    setMobile(user.mobile);
    setDistrict(user.district || 'Dhaka');
    setUpazila(user.upazila || 'Dhanmondi');
    setAddress(user.address || '');
    setProfilePhoto(user.profilePhoto || '');
    setSavedAddresses(user.savedAddresses || []);
  };

  useEffect(() => {
    resetProfileForm();
  }, [user]);

  const loadOrdersAndNotifications = async () => {
    if (!user) return;
    try {
      const [ordRes, notifRes] = await Promise.all([
        apiRequest<{ orders: Order[] }>('/api/customer/orders'),
        apiRequest<{ notifications: AppNotification[] }>('/api/customer/notifications'),
      ]);
      setOrders(ordRes.orders);
      setNotifications(notifRes.notifications);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadOrdersAndNotifications();
  }, [user, activeTab]);

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold">Client Account Required</h1>
        <p className="text-sm text-neutral-600">
          Please sign in to manage your profile, track orders, and view notifications.
        </p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="px-7 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 400 * 1024) {
      notify('Please choose an image under 400KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setProfilePhoto(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiRequest('/api/customer/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          email,
          mobile,
          district,
          upazila,
          address,
          profilePhoto,
          savedAddresses,
        }),
      });
      await refreshMe();
      notify('Profile changes saved successfully.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSavedAddress = () => {
    if (!newAddrLabel.trim() || !newAddrStreet.trim()) return;
    setSavedAddresses((prev) => [
      ...prev,
      {
        id: `addr-${Date.now()}`,
        label: newAddrLabel.trim(),
        fullName,
        mobile,
        district,
        upazila,
        address: newAddrStreet.trim(),
        isDefault: prev.length === 0,
      },
    ]);
    setNewAddrLabel('');
    setNewAddrStreet('');
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await apiRequest(`/api/customer/orders/${orderId}/cancel`, { method: 'POST' });
      notify(`Order ${orderId} cancelled`, 'info');
      await loadOrdersAndNotifications();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleReorder = (order: Order) => {
    let added = 0;
    for (const item of order.items) {
      const prod = products.find((p) => p.id === item.productId && p.stock > 0);
      if (prod) {
        addToCart(prod, item.size, item.color, item.quantity, false);
        added++;
      }
    }
    if (added > 0) {
      notify('Items added back to your bag', 'success');
      navigate('/checkout');
    } else {
      notify('Items from this order are currently out of stock', 'error');
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'processing') {
      return ['confirmed', 'processing', 'ready_to_ship', 'out_for_delivery'].includes(o.orderStatus);
    }
    return o.orderStatus === orderFilter;
  });

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));
  const upazilas = BANGLADESH_DISTRICTS[district] || ['Sadar'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#111111] text-[#D4AF37] flex items-center justify-center font-serif text-2xl font-semibold overflow-hidden border border-neutral-200 shrink-0">
            {user.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              user.fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold text-[#111111]">{user.fullName}</h1>
            <p className="text-xs text-neutral-500 font-mono">
              {user.email} · {user.mobile}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logoutCustomer}
          className="px-4 py-2 border border-neutral-300 text-xs font-medium uppercase tracking-wider hover:border-[#111111] inline-flex items-center gap-2 self-start"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-[230px_1fr] gap-10 items-start">
        {/* Account Navigation */}
        <aside className="border border-neutral-200 divide-y divide-neutral-200 bg-white">
          {[
            { id: 'profile', label: 'Profile & Addresses', icon: UserIcon },
            { id: 'orders', label: `Order History (${orders.length})`, icon: Package },
            { id: 'wishlist', label: `Wishlist (${wishlistedProducts.length})`, icon: Heart },
            {
              id: 'notifications',
              label: `Notifications (${notifications.filter((n) => !n.isRead).length})`,
              icon: Bell,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full px-4 py-3.5 text-left text-sm flex items-center gap-3 transition-colors ${
                  active
                    ? 'bg-[#111111] text-white font-medium'
                    : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Tab Viewport */}
        <div>
          {/* 1. PROFILE TAB */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="border border-neutral-200 bg-white p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
                <div>
                  <h2 className="font-serif text-2xl font-semibold text-[#111111]">
                    Personal Information
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Update your contact details, profile photo, and default shipping address.
                  </p>
                </div>

                <label className="cursor-pointer px-4 py-2 border border-neutral-300 text-xs font-medium inline-flex items-center gap-2 hover:border-[#111111] self-start">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Change Photo</span>
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
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
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#111111]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                    District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      const d = e.target.value;
                      setDistrict(d);
                      setUpazila((BANGLADESH_DISTRICTS[d] || ['Sadar'])[0]);
                    }}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:border-[#111111]"
                  >
                    {Object.keys(BANGLADESH_DISTRICTS).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                    Upazila / Area
                  </label>
                  <select
                    value={upazila}
                    onChange={(e) => setUpazila(e.target.value)}
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:border-[#111111]"
                  >
                    {upazilas.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                    Primary Delivery Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House, Road, Village / Area"
                    className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
                  />
                </div>
              </div>

              {/* Saved Address Book */}
              <div className="pt-5 border-t border-neutral-200 space-y-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-[#111111] flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Saved Address Book</span>
                </div>
                {savedAddresses.map((sa) => (
                  <div
                    key={sa.id}
                    className="flex items-center justify-between gap-4 border border-neutral-200 px-4 py-3 text-sm"
                  >
                    <div>
                      <span className="font-semibold">{sa.label}: </span>
                      <span className="text-neutral-600">
                        {sa.address}, {sa.upazila}, {sa.district}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSavedAddresses((prev) => prev.filter((x) => x.id !== sa.id))
                      }
                      className="text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="grid sm:grid-cols-[140px_1fr_auto] gap-2 pt-1">
                  <input
                    type="text"
                    value={newAddrLabel}
                    onChange={(e) => setNewAddrLabel(e.target.value)}
                    placeholder="Label (Home/Office)"
                    className="border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-[#111111]"
                  />
                  <input
                    type="text"
                    value={newAddrStreet}
                    onChange={(e) => setNewAddrStreet(e.target.value)}
                    placeholder="Street / Landmark (uses selected District & Upazila)"
                    className="border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-[#111111]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSavedAddress}
                    className="px-3 py-2 border border-[#111111] text-xs font-medium inline-flex items-center gap-1 hover:bg-[#111111] hover:text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-6 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={resetProfileForm}
                  className="px-6 py-3 border border-neutral-300 text-xs font-medium uppercase tracking-wider hover:border-[#111111]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* 2. ORDER HISTORY TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F5F5F5] border border-neutral-200">
                {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setOrderFilter(f)}
                    className={`px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                      orderFilter === f ? 'bg-[#111111] text-white' : 'text-neutral-600 hover:text-[#111111]'
                    }`}
                  >
                    {f === 'all' ? 'All Orders' : f}
                  </button>
                ))}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="border border-neutral-200 bg-white p-10 text-center space-y-3">
                  <p className="text-sm text-neutral-600">No orders found in this category.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="px-5 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider"
                  >
                    Shop Collection
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <div key={order.id} className="border border-neutral-200 bg-white p-5 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
                        <div>
                          <div className="font-mono text-base font-semibold text-[#111111]">
                            {order.id}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {formatDateTimeBD(order.createdAt)} · {order.paymentMethod.toUpperCase()} ({order.paymentStatus.replace(/_/g, ' ')})
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-wider font-semibold text-[#9A7B2C]">
                            {order.orderStatus.replace(/_/g, ' ')}
                          </div>
                          <div className="font-mono text-base font-semibold tabular-nums">
                            {formatBDT(order.totalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span>
                              {item.productName}{' '}
                              <span className="text-xs text-neutral-500">
                                × {item.quantity} ({item.size}, {item.color})
                              </span>
                            </span>
                            <span className="font-mono tabular-nums">{formatBDT(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/track?orderId=${encodeURIComponent(order.id)}&mobile=${encodeURIComponent(
                                order.mobile
                              )}`
                            )
                          }
                          className="px-3.5 py-1.5 bg-[#111111] text-white text-xs font-medium"
                        >
                          Track Order
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceOrder(order)}
                          className="px-3.5 py-1.5 border border-neutral-300 text-xs font-medium hover:border-[#111111]"
                        >
                          Invoice
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(order)}
                          className="px-3.5 py-1.5 border border-neutral-300 text-xs font-medium hover:border-[#111111]"
                        >
                          Reorder
                        </button>
                        {['pending', 'confirmed'].includes(order.orderStatus) && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order.id)}
                            className="px-3.5 py-1.5 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-50"
                          >
                            Cancel Order
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate('/contact')}
                          className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-[#111111] ml-auto"
                        >
                          Contact Support
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. WISHLIST TAB */}
          {activeTab === 'wishlist' && (
            <div>
              {wishlistedProducts.length === 0 ? (
                <div className="border border-neutral-200 bg-white p-10 text-center space-y-3">
                  <p className="text-sm text-neutral-600">Your wishlist is empty.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/shop')}
                    className="px-5 py-2.5 bg-[#111111] text-white text-xs uppercase tracking-wider"
                  >
                    Explore Pieces
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistedProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="border border-neutral-200 bg-white">
              <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                <h2 className="font-serif text-2xl font-semibold text-[#111111]">
                  Notification Center
                </h2>
                <button
                  type="button"
                  onClick={async () => {
                    await apiRequest('/api/customer/notifications/read-all', { method: 'POST' });
                    await loadOrdersAndNotifications();
                    await refreshMe();
                  }}
                  className="text-xs font-medium text-neutral-700 hover:text-[#111111] inline-flex items-center gap-1.5"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Mark All as Read</span>
                </button>
              </div>

              {notifications.length === 0 ? (
                <div className="p-10 text-center text-sm text-neutral-500">
                  No notifications yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={async () => {
                        if (!n.isRead) {
                          await apiRequest(`/api/customer/notifications/${n.id}/read`, {
                            method: 'POST',
                          });
                          loadOrdersAndNotifications();
                          refreshMe();
                        }
                      }}
                      className={`p-5 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                        n.isRead ? 'bg-white' : 'bg-[#FAF7EE]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#111111]">{n.title}</span>
                          {!n.isRead && (
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9A7B2C]">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-neutral-600">{n.message}</p>
                        <div className="text-xs font-mono text-neutral-400">
                          {formatDateTimeBD(n.createdAt)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await apiRequest(`/api/customer/notifications/${n.id}`, {
                            method: 'DELETE',
                          });
                          loadOrdersAndNotifications();
                          refreshMe();
                        }}
                        aria-label="Delete notification"
                        className="text-neutral-400 hover:text-red-600 p-1 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <InvoiceModal
        order={invoiceOrder}
        settings={websiteSettings}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
};
