import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CreditCard,
  Download,
  Globe,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { apiRequest, getAdminToken, setAdminToken } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatBDT, formatDateTimeBD } from '../lib/bangladesh.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { InvoiceModal } from '../components/InvoiceModal.tsx';
import {
  AdminCustomersView,
  AdminNotificationsAndLogsView,
  AdminPaymentsView,
  AdminProductsView,
  AdminWebsiteSettingsView,
} from './admin/AdminSubViews.tsx';
import type {
  AdminActivityLog,
  AdminUser,
  AppNotification,
  Category,
  CustomerUser,
  Order,
  OrderStatus,
  PaymentRecord,
  PaymentSettings,
  PaymentStatus,
  Product,
  WebsiteSettings,
} from '../types.ts';

interface DashboardPayload {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    pendingOrders: number;
    processingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  };
  lowStockProducts: Product[];
  recentOrders: Order[];
  dailySales: { date: string; revenue: number; orders: number }[];
  bestSellingProducts: { name: string; sold: number; revenue: number }[];
  unreadNotifications: number;
}

export const AdminPage: React.FC = () => {
  const { navigate, notify, refreshBootstrap, websiteSettings } = useStore();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [requiresSetupKey, setRequiresSetupKey] = useState(false);
  const [admin, setAdmin] = useState<AdminUser | null>(null);

  // Auth form state
  const [authName, setAuthName] = useState('MD: Najim Shakh');
  const [authEmail, setAuthEmail] = useState('najimshakh6166@gmail.com');
  const [authPassword, setAuthPassword] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Admin workspace state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'products' | 'customers' | 'payments' | 'settings' | 'notifications'
  >('overview');
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<
    (CustomerUser & { orderCount: number; totalSpent: number })[]
  >([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [adminSettings, setAdminSettings] = useState<WebsiteSettings | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminActivityLog[]>([]);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  const loadAllAdminData = async () => {
    try {
      const [dashRes, ordRes, prodRes, custRes, payRes, setRes, notifRes] = await Promise.all([
        apiRequest<DashboardPayload>('/api/admin/dashboard', { authMode: 'admin' }),
        apiRequest<{ orders: Order[] }>('/api/admin/orders', { authMode: 'admin' }),
        apiRequest<{ products: Product[]; categories: Category[] }>('/api/admin/products', {
          authMode: 'admin',
        }),
        apiRequest<{ customers: any[] }>('/api/admin/customers', { authMode: 'admin' }),
        apiRequest<{ paymentSettings: PaymentSettings; payments: PaymentRecord[] }>(
          '/api/admin/payment-settings',
          { authMode: 'admin' }
        ),
        apiRequest<{ websiteSettings: WebsiteSettings }>('/api/admin/settings', {
          authMode: 'admin',
        }),
        apiRequest<{ notifications: AppNotification[]; auditLogs: AdminActivityLog[] }>(
          '/api/admin/notifications',
          { authMode: 'admin' }
        ),
      ]);
      setDashboard(dashRes);
      setOrders(ordRes.orders);
      setProducts(prodRes.products);
      setCategories(prodRes.categories);
      setCustomers(custRes.customers);
      setPaymentSettings(payRes.paymentSettings);
      setPayments(payRes.payments);
      setAdminSettings(setRes.websiteSettings);
      setNotifications(notifRes.notifications);
      setAuditLogs(notifRes.auditLogs);
      await refreshBootstrap();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  useEffect(() => {
    (async () => {
      setCheckingAuth(true);
      try {
        const status = await apiRequest<{ hasAdmin: boolean; requiresSetupKey: boolean }>(
          '/api/admin/auth/status',
          { authMode: 'none' }
        );
        setHasAdmin(status.hasAdmin);
        setRequiresSetupKey(status.requiresSetupKey);

        if (status.hasAdmin && getAdminToken()) {
          const me = await apiRequest<{ admin: AdminUser }>('/api/admin/auth/me', {
            authMode: 'admin',
          });
          setAdmin(me.admin);
          await loadAllAdminData();
        }
      } catch {
        setAdminToken(null);
        setAdmin(null);
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, []);

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; admin: AdminUser }>('/api/admin/auth/setup', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({
          fullName: authName,
          email: authEmail,
          password: authPassword,
          setupKey,
        }),
      });
      setAdminToken(res.token);
      setAdmin(res.admin);
      setHasAdmin(true);
      notify('Super Admin initialized securely.', 'success');
      await loadAllAdminData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const res = await apiRequest<{ token: string; admin: AdminUser }>('/api/admin/auth/login', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      setAdminToken(res.token);
      setAdmin(res.admin);
      notify('Signed in to MNS Admin Console', 'success');
      await loadAllAdminData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    await apiRequest('/api/admin/auth/logout', { method: 'POST', authMode: 'admin' }).catch(() => {});
    setAdminToken(null);
    setAdmin(null);
    notify('Signed out of Admin Console', 'info');
  };

  const exportOrdersCsv = () => {
    const header = [
      'Order ID',
      'Date',
      'Customer',
      'Mobile',
      'District',
      'Total BDT',
      'Payment Method',
      'Payment Status',
      'Order Status',
      'TrxID',
    ];
    const rows = orders.map((o) =>
      [
        o.id,
        o.createdAt,
        `"${o.customerName}"`,
        o.mobile,
        o.district,
        o.totalAmount,
        o.paymentMethod,
        o.paymentStatus,
        o.orderStatus,
        o.transactionId || '',
      ].join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mns-orders-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F5F5]">
        <div className="text-sm text-neutral-600">Loading Admin Console...</div>
      </div>
    );
  }

  // AUTH GATE (Initial Setup OR Admin Login — never public registration!)
  if (!admin) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white p-8 space-y-6 border border-neutral-800 shadow-2xl">
          <div className="space-y-2 border-b border-neutral-200 pb-4">
            <BrandLogo size="lg" companyName={websiteSettings?.companyName || 'MNS FASHION BRAND'} />
            <h1 className="font-serif text-3xl font-semibold text-[#111111] pt-2">
              {hasAdmin ? 'Administrator Sign In' : 'Initial Super Admin Setup'}
            </h1>
            <p className="text-xs text-neutral-500">
              {hasAdmin
                ? 'Restricted executive portal. Customer credentials are not accepted here.'
                : 'One-time secure initialization for the store owner. Once created, this setup route locks permanently.'}
            </p>
          </div>

          <form
            onSubmit={hasAdmin ? handleAdminLogin : handleInitialSetup}
            className="space-y-4"
          >
            {!hasAdmin && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1">
                  Administrator Full Name
                </label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1">
                {hasAdmin ? 'Password' : 'Create Strong Password (min 8 chars)'}
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
            </div>

            {!hasAdmin && requiresSetupKey && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1">
                  Server Setup Key
                </label>
                <input
                  type="password"
                  required
                  value={setupKey}
                  onChange={(e) => setSetupKey(e.target.value)}
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
            >
              {authSubmitting
                ? 'Authenticating...'
                : hasAdmin
                ? 'Sign In to Admin Panel'
                : 'Initialize Super Admin'}
            </button>
          </form>

          <div className="pt-2 border-t border-neutral-200 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-neutral-500 hover:text-[#111111] underline"
            >
              Return to Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  const maxDailyRev = Math.max(1000, ...(dashboard?.dailySales.map((d) => d.revenue) || [1000]));

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    if (orderStatusFilter !== 'all' && o.orderStatus !== orderStatusFilter) return false;
    if (!q) return true;
    return (
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.mobile.includes(q)
    );
  });

  const navItems = [
    { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingBag },
    { id: 'products', label: `Products (${products.length})`, icon: Package },
    { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
    { id: 'payments', label: 'Payments & Gateways', icon: CreditCard },
    { id: 'settings', label: 'Website Settings', icon: Globe },
    {
      id: 'notifications',
      label: `Alerts & Audit (${dashboard?.unreadNotifications || 0})`,
      icon: Bell,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#111111] text-neutral-300 flex flex-col justify-between shrink-0 no-print">
        <div>
          <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
            <BrandLogo variant="light" companyName="MNS ADMIN" />
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full px-3.5 py-2.5 text-left text-xs font-medium flex items-center gap-3 transition-colors ${
                    active
                      ? 'bg-[#D4AF37] text-[#111111] font-semibold'
                      : 'text-neutral-300 hover:bg-[#1E1E1E] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-800 space-y-3 text-xs">
          <div>
            <div className="text-white font-medium truncate">{admin.fullName}</div>
            <div className="text-neutral-500 truncate">{admin.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-2 border border-neutral-700 text-neutral-300 hover:text-white text-center"
            >
              Storefront
            </button>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="p-2 border border-neutral-700 text-neutral-300 hover:text-white"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="text-xs uppercase tracking-wider text-neutral-500">
            MNS Fashion Brand / Admin /{' '}
            <span className="text-[#111111] font-semibold capitalize">{activeTab}</span>
          </div>
          <button
            type="button"
            onClick={exportOrdersCsv}
            className="px-4 py-2 border border-neutral-300 text-xs font-medium inline-flex items-center gap-1.5 hover:border-[#111111]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Sales CSV</span>
          </button>
        </header>

        <main className="p-6 max-w-7xl w-full mx-auto space-y-8">
          {/* 1. OVERVIEW DASHBOARD */}
          {activeTab === 'overview' && dashboard && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Revenue', val: formatBDT(dashboard.stats.totalRevenue), accent: true },
                  { label: 'Total Orders', val: String(dashboard.stats.totalOrders) },
                  { label: 'Customers', val: String(dashboard.stats.totalCustomers) },
                  { label: 'Products', val: String(dashboard.stats.totalProducts) },
                  { label: 'Pending Orders', val: String(dashboard.stats.pendingOrders) },
                  { label: 'Processing / In Transit', val: String(dashboard.stats.processingOrders) },
                  { label: 'Delivered Orders', val: String(dashboard.stats.deliveredOrders) },
                  { label: 'Cancelled Orders', val: String(dashboard.stats.cancelledOrders) },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`border p-4 bg-white ${
                      kpi.accent ? 'border-[#D4AF37]' : 'border-neutral-200'
                    }`}
                  >
                    <div className="text-xs uppercase tracking-wider text-neutral-500">
                      {kpi.label}
                    </div>
                    <div className="font-mono text-2xl font-semibold text-[#111111] mt-1 tabular-nums">
                      {kpi.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 border border-neutral-200 bg-white p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#9A7B2C]" />
                      <h2 className="font-serif text-xl font-semibold text-[#111111]">
                        7-Day Sales Revenue Overview
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-neutral-500">BDT (৳)</span>
                  </div>

                  <div className="h-56 flex items-end gap-3 pt-6 border-b border-neutral-200 pb-2">
                    {dashboard.dailySales.map((d) => {
                      const heightPct = Math.max(4, Math.round((d.revenue / maxDailyRev) * 100));
                      return (
                        <div key={d.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                          <div className="text-[10px] font-mono text-neutral-500 tabular-nums">
                            {d.revenue > 0 ? formatBDT(d.revenue) : '৳0'}
                          </div>
                          <div
                            className="w-full max-w-[44px] bg-[#111111] hover:bg-[#D4AF37] transition-colors"
                            style={{ height: `${heightPct}%` }}
                            title={`${d.date}: ${formatBDT(d.revenue)} (${d.orders} orders)`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[11px] font-mono text-neutral-500">
                    {dashboard.dailySales.map((d) => (
                      <span key={d.date} className="flex-1 text-center">
                        {d.date}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Best Sellers & Low Stock */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="border border-neutral-200 bg-white p-5 space-y-3">
                    <h3 className="font-serif text-lg font-semibold text-[#111111]">
                      Best Selling Products
                    </h3>
                    {dashboard.bestSellingProducts.length === 0 ? (
                      <p className="text-xs text-neutral-500">
                        Sales metrics populate as orders are placed.
                      </p>
                    ) : (
                      <div className="space-y-2.5 text-xs">
                        {dashboard.bestSellingProducts.map((bp, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <span className="truncate font-medium text-[#111111]">{bp.name}</span>
                            <span className="font-mono text-neutral-600 tabular-nums shrink-0">
                              {bp.sold} sold · {formatBDT(bp.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-neutral-200 bg-white p-5 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      <h3 className="font-serif text-lg font-semibold text-[#111111]">
                        Low Stock Alerts (≤ 5)
                      </h3>
                    </div>
                    {dashboard.lowStockProducts.length === 0 ? (
                      <p className="text-xs text-neutral-500">All SKUs have healthy inventory.</p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {dashboard.lowStockProducts.map((lp) => (
                          <div key={lp.id} className="flex items-center justify-between">
                            <span className="truncate">{lp.name}</span>
                            <span className="font-mono font-semibold text-red-600 tabular-nums">
                              {lp.stock} left
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="border border-neutral-200 bg-white">
                <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
                  <h3 className="font-serif text-xl font-semibold">Recent Orders</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs underline text-neutral-600 hover:text-[#111111]"
                  >
                    Manage All Orders
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                        <th className="p-3.5 text-left font-medium">Order ID</th>
                        <th className="p-3.5 text-left font-medium">Customer</th>
                        <th className="p-3.5 text-left font-medium">Payment</th>
                        <th className="p-3.5 text-left font-medium">Order Status</th>
                        <th className="p-3.5 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {dashboard.recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-neutral-500">
                            No orders placed yet.
                          </td>
                        </tr>
                      ) : (
                        dashboard.recentOrders.map((o) => (
                          <tr key={o.id}>
                            <td className="p-3.5 font-mono text-xs font-semibold">{o.id}</td>
                            <td className="p-3.5 text-xs">
                              <div>{o.customerName}</div>
                              <div className="text-neutral-500">{o.district}</div>
                            </td>
                            <td className="p-3.5 text-xs uppercase">
                              {o.paymentMethod} ({o.paymentStatus.replace(/_/g, ' ')})
                            </td>
                            <td className="p-3.5 text-xs capitalize">
                              {o.orderStatus.replace(/_/g, ' ')}
                            </td>
                            <td className="p-3.5 text-right font-mono font-medium tabular-nums">
                              {formatBDT(o.totalAmount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-serif text-2xl font-semibold text-[#111111]">
                  Order Management ({filteredOrders.length})
                </h2>
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order ID, name, mobile..."
                    className="border border-neutral-300 bg-white px-3.5 py-2 text-sm w-60 outline-none focus:border-[#111111]"
                  />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="border border-neutral-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="all">All Statuses</option>
                    {[
                      'pending',
                      'confirmed',
                      'processing',
                      'ready_to_ship',
                      'shipped',
                      'out_for_delivery',
                      'delivered',
                      'cancelled',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border border-neutral-200 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                      <th className="p-3.5 text-left font-medium">Order / Date</th>
                      <th className="p-3.5 text-left font-medium">Customer & Address</th>
                      <th className="p-3.5 text-left font-medium">Payment Status</th>
                      <th className="p-3.5 text-left font-medium">Order Stage</th>
                      <th className="p-3.5 text-right font-medium">Total</th>
                      <th className="p-3.5 text-right font-medium">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-neutral-500">
                          No orders match your filter.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-neutral-50">
                          <td className="p-3.5">
                            <div className="font-mono text-xs font-semibold text-[#111111]">
                              {o.id}
                            </div>
                            <div className="text-[11px] text-neutral-500">
                              {formatDateTimeBD(o.createdAt)}
                            </div>
                          </td>
                          <td className="p-3.5 text-xs">
                            <div className="font-medium text-[#111111]">
                              {o.customerName} · {o.mobile}
                            </div>
                            <div className="text-neutral-500">
                              {o.address}, {o.upazila}, {o.district}
                            </div>
                            {o.transactionId && (
                              <div className="font-mono text-[#9A7B2C] mt-0.5">
                                {o.paymentMethod.toUpperCase()} TrxID: {o.transactionId}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <select
                              value={o.paymentStatus}
                              onChange={async (e) => {
                                await apiRequest(`/api/admin/orders/${o.id}/payment-status`, {
                                  method: 'PUT',
                                  authMode: 'admin',
                                  body: JSON.stringify({
                                    paymentStatus: e.target.value as PaymentStatus,
                                  }),
                                });
                                notify(`Payment status updated for ${o.id}`, 'success');
                                await loadAllAdminData();
                              }}
                              className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs capitalize"
                            >
                              <option value="unpaid">Unpaid</option>
                              <option value="pending_verification">Pending Verification</option>
                              <option value="paid">Paid (Verified)</option>
                              <option value="failed">Failed</option>
                              <option value="refunded">Refunded</option>
                            </select>
                          </td>
                          <td className="p-3.5">
                            <select
                              value={o.orderStatus}
                              onChange={async (e) => {
                                await apiRequest(`/api/admin/orders/${o.id}/status`, {
                                  method: 'PUT',
                                  authMode: 'admin',
                                  body: JSON.stringify({
                                    orderStatus: e.target.value as OrderStatus,
                                  }),
                                });
                                notify(`Order ${o.id} updated`, 'success');
                                await loadAllAdminData();
                              }}
                              className="border border-neutral-300 bg-white px-2.5 py-1.5 text-xs capitalize"
                            >
                              <option value="pending">Order Placed</option>
                              <option value="confirmed">Order Confirmed</option>
                              <option value="processing">Processing</option>
                              <option value="ready_to_ship">Ready to Ship</option>
                              <option value="shipped">Shipped</option>
                              <option value="out_for_delivery">Out for Delivery</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold tabular-nums">
                            {formatBDT(o.totalAmount)}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => setInvoiceOrder(o)}
                              className="px-3 py-1.5 border border-neutral-300 text-xs hover:border-[#111111]"
                            >
                              Invoice
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 3. PRODUCTS */}
          {activeTab === 'products' && (
            <AdminProductsView
              products={products}
              categories={categories}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}

          {/* 4. CUSTOMERS */}
          {activeTab === 'customers' && (
            <AdminCustomersView
              customers={customers}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}

          {/* 5. PAYMENTS */}
          {activeTab === 'payments' && paymentSettings && (
            <AdminPaymentsView
              paymentSettings={paymentSettings}
              payments={payments}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}

          {/* 6. WEBSITE SETTINGS */}
          {activeTab === 'settings' && adminSettings && (
            <AdminWebsiteSettingsView
              settings={adminSettings}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}

          {/* 7. NOTIFICATIONS & AUDIT LOGS */}
          {activeTab === 'notifications' && (
            <AdminNotificationsAndLogsView
              notifications={notifications}
              auditLogs={auditLogs}
              onRefresh={loadAllAdminData}
              notify={notify}
            />
          )}
        </main>
      </div>

      <InvoiceModal
        order={invoiceOrder}
        settings={websiteSettings}
        onClose={() => setInvoiceOrder(null)}
      />
    </div>
  );
};
