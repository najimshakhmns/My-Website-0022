import React, { useState } from 'react';
import { Bell, Check, Edit2, Plus, Send, Shield, Trash2, Upload } from 'lucide-react';
import { apiRequest } from '../../lib/api.ts';
import { formatBDT, formatDateTimeBD } from '../../lib/bangladesh.ts';
import { MEDIA_PRESETS, resolveMediaUrl } from '../../lib/media.ts';
import type {
  AdminActivityLog,
  AppNotification,
  Category,
  CustomerUser,
  PaymentRecord,
  PaymentSettings,
  Product,
  WebsiteSettings,
} from '../../types.ts';

/* ============================================================================
 * 1. PRODUCTS & CATEGORIES MANAGEMENT
 * ========================================================================== */
export const AdminProductsView: React.FC<{
  products: Product[];
  categories: Category[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ products, categories, onRefresh, notify }) => {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatNameBn, setNewCatNameBn] = useState('');
  const [saving, setSaving] = useState(false);

  const openNewProduct = () => {
    setEditing({
      name: '',
      nameBn: '',
      sku: `MNS-${Date.now().toString().slice(-4)}`,
      categoryId: categories[0]?.id || '',
      brand: 'MNS Atelier',
      description: '',
      fabricAndCare: '100% Combed Cotton · Dry clean recommended.',
      regularPrice: 3500,
      salePrice: 2950,
      stock: 20,
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Obsidian Black'],
      images: ['media:mens'],
      isFeatured: true,
      isBestSeller: false,
      isNewArrival: true,
      isVisible: true,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    if (file.size > 900 * 1024) {
      notify('Image must be under 900KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditing({ ...editing, images: [reader.result] });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await apiRequest(`/api/admin/products/${editing.id}`, {
          method: 'PUT',
          authMode: 'admin',
          body: JSON.stringify(editing),
        });
        notify('Product updated', 'success');
      } else {
        await apiRequest('/api/admin/products', {
          method: 'POST',
          authMode: 'admin',
          body: JSON.stringify(editing),
        });
        notify('Product added to catalog', 'success');
      }
      setEditing(null);
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE', authMode: 'admin' });
      notify('Product removed', 'info');
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await apiRequest('/api/admin/categories', {
        method: 'POST',
        authMode: 'admin',
        body: JSON.stringify({ name: newCatName, nameBn: newCatNameBn || newCatName }),
      });
      setNewCatName('');
      setNewCatNameBn('');
      notify('Category created', 'success');
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#111111]">
            Products & Categories ({products.length})
          </h2>
          <p className="text-xs text-neutral-500">
            Updates reflect immediately on the public storefront.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewProduct}
          className="px-4 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-[#D4AF37] hover:text-[#111111]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Quick Category Creator */}
      <form
        onSubmit={handleAddCategory}
        className="border border-neutral-200 bg-white p-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1">
            New Category (English)
          </label>
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="e.g. Blazers & Coats"
            className="w-full border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-[#111111]"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-[11px] uppercase tracking-wider text-neutral-500 mb-1">
            Category Name (Bangla)
          </label>
          <input
            type="text"
            value={newCatNameBn}
            onChange={(e) => setNewCatNameBn(e.target.value)}
            placeholder="e.g. ব্লেজার ও কোট"
            className="w-full border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-[#111111]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 border border-[#111111] text-xs font-semibold uppercase tracking-wider hover:bg-[#111111] hover:text-white"
        >
          Create Category
        </button>
      </form>

      {/* Product Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white w-full max-w-2xl border border-neutral-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="font-serif text-2xl font-semibold">
                {editing.id ? 'Edit Product' : 'Create New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-xs uppercase tracking-wider text-neutral-500 hover:text-[#111111]"
              >
                Close
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Product Name (EN) *</label>
                <input
                  type="text"
                  required
                  value={editing.name || ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Product Name (BN)</label>
                <input
                  type="text"
                  value={editing.nameBn || ''}
                  onChange={(e) => setEditing({ ...editing, nameBn: e.target.value })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Category *</label>
                <select
                  value={editing.categoryId || ''}
                  onChange={(e) => setEditing({ ...editing, categoryId: e.target.value })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">SKU</label>
                <input
                  type="text"
                  value={editing.sku || ''}
                  onChange={(e) => setEditing({ ...editing, sku: e.target.value })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Regular Price (৳) *</label>
                <input
                  type="number"
                  required
                  value={editing.regularPrice ?? 0}
                  onChange={(e) => setEditing({ ...editing, regularPrice: Number(e.target.value) })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Sale Price (৳)</label>
                <input
                  type="number"
                  value={editing.salePrice ?? 0}
                  onChange={(e) => setEditing({ ...editing, salePrice: Number(e.target.value) })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Stock Quantity *</label>
                <input
                  type="number"
                  required
                  value={editing.stock ?? 0}
                  onChange={(e) => setEditing({ ...editing, stock: Number(e.target.value) })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Brand / Line</label>
                <input
                  type="text"
                  value={editing.brand || ''}
                  onChange={(e) => setEditing({ ...editing, brand: e.target.value })}
                  className="w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Sizes (comma separated)</label>
                <input
                  type="text"
                  value={(editing.sizes || []).join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sizes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-600 mb-1">Colors (comma separated)</label>
                <input
                  type="text"
                  value={(editing.colors || []).join(', ')}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      colors: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-full border border-neutral-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-600 mb-1">Description</label>
              <textarea
                rows={3}
                value={editing.description || ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full border border-neutral-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Image Selection / Upload */}
            <div className="space-y-2 border-t border-neutral-200 pt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
                  Product Image
                </label>
                <label className="cursor-pointer px-3 py-1.5 border border-neutral-300 text-xs inline-flex items-center gap-1.5 hover:border-[#111111]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {MEDIA_PRESETS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setEditing({ ...editing, images: [m.key] })}
                    className={`p-1 border ${
                      editing.images?.[0] === m.key ? 'border-[#111111] ring-1 ring-[#111111]' : 'border-neutral-200'
                    }`}
                  >
                    <img src={m.url} alt={m.label} className="w-12 h-9 object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-5 pt-2 text-xs">
              {[
                { key: 'isVisible', label: 'Visible on Storefront' },
                { key: 'isFeatured', label: 'Featured' },
                { key: 'isBestSeller', label: 'Best Seller' },
                { key: 'isNewArrival', label: 'New Arrival' },
              ].map((flag) => (
                <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean((editing as any)[flag.key])}
                    onChange={(e) => setEditing({ ...editing, [flag.key]: e.target.checked })}
                    className="accent-[#111111]"
                  />
                  <span>{flag.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2 border border-neutral-300 text-xs font-medium uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider"
              >
                {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Table */}
      <div className="border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
              <th className="p-3.5 text-left font-medium">Product</th>
              <th className="p-3.5 text-left font-medium">SKU</th>
              <th className="p-3.5 text-right font-medium">Price</th>
              <th className="p-3.5 text-right font-medium">Stock</th>
              <th className="p-3.5 text-left font-medium">Status</th>
              <th className="p-3.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="p-3.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveMediaUrl(p.images[0])}
                      alt={p.name}
                      className="w-12 h-9 object-cover bg-neutral-100 shrink-0"
                    />
                    <div>
                      <div className="font-medium text-[#111111]">{p.name}</div>
                      <div className="text-xs text-neutral-500">{p.categorySlug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3.5 font-mono text-xs text-neutral-600">{p.sku}</td>
                <td className="p-3.5 text-right font-mono tabular-nums">
                  {formatBDT(p.salePrice > 0 && p.salePrice < p.regularPrice ? p.salePrice : p.regularPrice)}
                </td>
                <td
                  className={`p-3.5 text-right font-mono tabular-nums font-medium ${
                    p.stock <= 5 ? 'text-red-600' : 'text-[#111111]'
                  }`}
                >
                  {p.stock}
                </td>
                <td className="p-3.5 text-xs">
                  {p.isVisible ? 'Visible' : 'Hidden'}
                  {p.isFeatured ? ' · Featured' : ''}
                </td>
                <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setEditing(p)}
                    className="p-1.5 border border-neutral-300 hover:border-[#111111]"
                    aria-label="Edit product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 border border-red-200 text-red-600 hover:bg-red-50"
                    aria-label="Delete product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. CUSTOMERS MANAGEMENT (No password hashes exposed!)
 * ========================================================================== */
export const AdminCustomersView: React.FC<{
  customers: (CustomerUser & { orderCount: number; totalSpent: number })[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ customers, onRefresh, notify }) => {
  const [search, setSearch] = useState('');

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.mobile.includes(q)
    );
  });

  const toggleStatus = async (c: CustomerUser) => {
    const next = c.status === 'active' ? 'suspended' : 'active';
    try {
      await apiRequest(`/api/admin/customers/${c.id}`, {
        method: 'PUT',
        authMode: 'admin',
        body: JSON.stringify({ status: next }),
      });
      notify(`Customer ${c.fullName} set to ${next}`, 'info');
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#111111]">
            Registered Customers ({customers.length})
          </h2>
          <p className="text-xs text-neutral-500">
            Customer passwords are cryptographically hashed and strictly inaccessible.
          </p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, mobile..."
          className="border border-neutral-300 bg-white px-3.5 py-2 text-sm w-64 outline-none focus:border-[#111111]"
        />
      </div>

      <div className="border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
              <th className="p-3.5 text-left font-medium">Customer</th>
              <th className="p-3.5 text-left font-medium">Contact</th>
              <th className="p-3.5 text-left font-medium">Location</th>
              <th className="p-3.5 text-right font-medium">Orders</th>
              <th className="p-3.5 text-right font-medium">Total Spent</th>
              <th className="p-3.5 text-left font-medium">Account Status</th>
              <th className="p-3.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-neutral-500">
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50">
                  <td className="p-3.5 font-medium text-[#111111]">{c.fullName}</td>
                  <td className="p-3.5 text-xs">
                    <div>{c.email}</div>
                    <div className="font-mono text-neutral-500">{c.mobile}</div>
                  </td>
                  <td className="p-3.5 text-xs text-neutral-600">
                    {c.upazila}, {c.district}
                  </td>
                  <td className="p-3.5 text-right font-mono tabular-nums">{c.orderCount}</td>
                  <td className="p-3.5 text-right font-mono tabular-nums font-medium">
                    {formatBDT(c.totalSpent)}
                  </td>
                  <td className="p-3.5 text-xs font-medium capitalize">
                    <span className={c.status === 'active' ? 'text-emerald-700' : 'text-red-600'}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => toggleStatus(c)}
                      className="px-3 py-1 border border-neutral-300 text-xs hover:border-[#111111]"
                    >
                      {c.status === 'active' ? 'Suspend' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. PAYMENT SETTINGS & TRANSACTIONS
 * ========================================================================== */
export const AdminPaymentsView: React.FC<{
  paymentSettings: PaymentSettings;
  payments: PaymentRecord[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ paymentSettings, payments, onRefresh, notify }) => {
  const [form, setForm] = useState<PaymentSettings>(paymentSettings);
  const [bkashAppKey, setBkashAppKey] = useState('');
  const [bkashAppSecret, setBkashAppSecret] = useState('');
  const [nagadPublicKey, setNagadPublicKey] = useState('');
  const [rocketApiKey, setRocketApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/admin/payment-settings', {
        method: 'PUT',
        authMode: 'admin',
        body: JSON.stringify({
          ...form,
          credentials: {
            bkashAppKey: bkashAppKey || undefined,
            bkashAppSecret: bkashAppSecret || undefined,
            nagadPublicKey: nagadPublicKey || undefined,
            rocketApiKey: rocketApiKey || undefined,
          },
        }),
      });
      setBkashAppKey('');
      setBkashAppSecret('');
      setNagadPublicKey('');
      setRocketApiKey('');
      notify('Payment settings saved securely.', 'success');
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="border border-neutral-200 bg-white p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#111111]">
              Bangladesh Payment Gateway Configuration
            </h2>
            <p className="text-xs text-neutral-500">
              Merchant credentials are stored strictly server-side and never exposed to storefront clients.
            </p>
          </div>

          <select
            value={form.mode}
            onChange={(e) => setForm({ ...form, mode: e.target.value as 'demo' | 'live' })}
            className="border border-neutral-300 px-3 py-2 text-xs font-semibold uppercase bg-white"
          >
            <option value="demo">Mode: Sandbox Demo</option>
            <option value="live">Mode: Live Merchant API</option>
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {(['bkash', 'nagad', 'rocket'] as const).map((method) => (
            <div key={method} className="border border-neutral-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold uppercase text-sm">{method}</span>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[method].enabled}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [method]: { ...form[method], enabled: e.target.checked },
                      })
                    }
                    className="accent-[#111111]"
                  />
                  <span>Enabled</span>
                </label>
              </div>
              <div>
                <label className="block text-[11px] uppercase text-neutral-500 mb-1">
                  Merchant Number
                </label>
                <input
                  type="text"
                  value={form[method].merchantNumber}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [method]: { ...form[method], merchantNumber: e.target.value },
                    })
                  }
                  className="w-full border border-neutral-300 px-3 py-2 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase text-neutral-500 mb-1">
                  Instructions Shown to Customer
                </label>
                <textarea
                  rows={2}
                  value={form[method].instructions}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [method]: { ...form[method], instructions: e.target.value },
                    })
                  }
                  className="w-full border border-neutral-300 px-3 py-2 text-xs"
                />
              </div>
            </div>
          ))}

          {/* Cash on Delivery */}
          <div className="border border-neutral-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold uppercase text-sm">Cash on Delivery</span>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.cod.enabled}
                  onChange={(e) =>
                    setForm({ ...form, cod: { ...form.cod, enabled: e.target.checked } })
                  }
                  className="accent-[#111111]"
                />
                <span>Enabled</span>
              </label>
            </div>
            <div>
              <label className="block text-[11px] uppercase text-neutral-500 mb-1">
                Max COD Order Limit (৳)
              </label>
              <input
                type="number"
                value={form.cod.maxOrderAmount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cod: { ...form.cod, maxOrderAmount: Number(e.target.value) },
                  })
                }
                className="w-full border border-neutral-300 px-3 py-2 text-xs font-mono"
              />
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.cod.insideDhakaOnly}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cod: { ...form.cod, insideDhakaOnly: e.target.checked },
                  })
                }
                className="accent-[#111111]"
              />
              <span>Restrict COD to Dhaka District Only</span>
            </label>
          </div>
        </div>

        {/* Write-only Merchant API Credentials */}
        <div className="border-t border-neutral-200 pt-5 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold text-neutral-600">
            <Shield className="w-4 h-4" />
            <span>Merchant API Credentials (Write-Only, Server-Encrypted)</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="password"
              value={bkashAppKey}
              onChange={(e) => setBkashAppKey(e.target.value)}
              placeholder={paymentSettings.bkash.hasApiCredentials ? 'bKash Key (Configured)' : 'bKash App Key'}
              className="border border-neutral-300 px-3 py-2 text-xs"
            />
            <input
              type="password"
              value={bkashAppSecret}
              onChange={(e) => setBkashAppSecret(e.target.value)}
              placeholder="bKash App Secret"
              className="border border-neutral-300 px-3 py-2 text-xs"
            />
            <input
              type="password"
              value={nagadPublicKey}
              onChange={(e) => setNagadPublicKey(e.target.value)}
              placeholder={paymentSettings.nagad.hasApiCredentials ? 'Nagad Key (Configured)' : 'Nagad Merchant Key'}
              className="border border-neutral-300 px-3 py-2 text-xs"
            />
            <input
              type="password"
              value={rocketApiKey}
              onChange={(e) => setRocketApiKey(e.target.value)}
              placeholder={paymentSettings.rocket.hasApiCredentials ? 'Rocket Key (Configured)' : 'Rocket API Key'}
              className="border border-neutral-300 px-3 py-2 text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111]"
        >
          {saving ? 'Saving...' : 'Save Payment Settings'}
        </button>
      </form>

      {/* Transaction History Table */}
      <div className="border border-neutral-200 bg-white">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="font-serif text-xl font-semibold">Payment Transactions Ledger</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                <th className="p-3.5 text-left font-medium">Payment ID</th>
                <th className="p-3.5 text-left font-medium">Order</th>
                <th className="p-3.5 text-left font-medium">Method</th>
                <th className="p-3.5 text-left font-medium">TrxID / Sender</th>
                <th className="p-3.5 text-right font-medium">Amount</th>
                <th className="p-3.5 text-left font-medium">Status</th>
                <th className="p-3.5 text-right font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-500">
                    No online payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3.5 font-mono text-xs">{p.id}</td>
                    <td className="p-3.5 font-mono text-xs font-semibold">{p.orderId}</td>
                    <td className="p-3.5 uppercase text-xs font-semibold">{p.method}</td>
                    <td className="p-3.5 font-mono text-xs">
                      {p.transactionId || '—'} {p.senderNumber ? `(${p.senderNumber})` : ''}
                    </td>
                    <td className="p-3.5 text-right font-mono tabular-nums font-medium">
                      {formatBDT(p.amount)}
                    </td>
                    <td className="p-3.5 text-xs capitalize">{p.status.replace(/_/g, ' ')}</td>
                    <td className="p-3.5 text-right font-mono text-xs text-neutral-500">
                      {formatDateTimeBD(p.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. WEBSITE SETTINGS (Fully Dynamic Storefront Editor)
 * ========================================================================== */
export const AdminWebsiteSettingsView: React.FC<{
  settings: WebsiteSettings;
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ settings, onRefresh, notify }) => {
  const [form, setForm] = useState<WebsiteSettings>(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/admin/settings', {
        method: 'PUT',
        authMode: 'admin',
        body: JSON.stringify({ websiteSettings: form }),
      });
      notify('Website settings updated live.', 'success');
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="border border-neutral-200 bg-white p-6 space-y-6">
      <div className="border-b border-neutral-200 pb-4">
        <h2 className="font-serif text-2xl font-semibold text-[#111111]">
          Website Branding, Content & Delivery Charges
        </h2>
        <p className="text-xs text-neutral-500">
          All changes update the public MNS Fashion Brand storefront dynamically.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Company Name</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Tagline</label>
          <input
            type="text"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Founder Name</label>
          <input
            type="text"
            value={form.founderName}
            onChange={(e) => setForm({ ...form, founderName: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Contact Number</label>
          <input
            type="text"
            value={form.contactNumber}
            onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Business Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1">Business Address</label>
          <input
            type="text"
            value={form.businessAddress}
            onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-600 mb-1">Top Announcement Bar (EN)</label>
          <input
            type="text"
            value={form.announcementBar}
            onChange={(e) => setForm({ ...form, announcementBar: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-600 mb-1">Hero Headline</label>
          <input
            type="text"
            value={form.heroHeadline}
            onChange={(e) => setForm({ ...form, heroHeadline: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-600 mb-1">Hero Description</label>
          <textarea
            rows={2}
            value={form.heroDescription}
            onChange={(e) => setForm({ ...form, heroDescription: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-neutral-600 mb-1">About Us Content</label>
          <textarea
            rows={3}
            value={form.aboutUsContent}
            onChange={(e) => setForm({ ...form, aboutUsContent: e.target.value })}
            className="w-full border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Delivery Charges */}
      <div className="border-t border-neutral-200 pt-5">
        <h3 className="text-xs uppercase tracking-wider font-semibold text-neutral-600 mb-3">
          Bangladesh Delivery Charges (৳)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Gaibandha Local</label>
            <input
              type="number"
              value={form.deliveryCharges.gaibandhaLocal}
              onChange={(e) =>
                setForm({
                  ...form,
                  deliveryCharges: {
                    ...form.deliveryCharges,
                    gaibandhaLocal: Number(e.target.value),
                  },
                })
              }
              className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Inside Dhaka</label>
            <input
              type="number"
              value={form.deliveryCharges.insideDhaka}
              onChange={(e) =>
                setForm({
                  ...form,
                  deliveryCharges: {
                    ...form.deliveryCharges,
                    insideDhaka: Number(e.target.value),
                  },
                })
              }
              className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Outside Dhaka</label>
            <input
              type="number"
              value={form.deliveryCharges.outsideDhaka}
              onChange={(e) =>
                setForm({
                  ...form,
                  deliveryCharges: {
                    ...form.deliveryCharges,
                    outsideDhaka: Number(e.target.value),
                  },
                })
              }
              className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 mb-1">Free Shipping Min</label>
            <input
              type="number"
              value={form.deliveryCharges.freeShippingThreshold}
              onChange={(e) =>
                setForm({
                  ...form,
                  deliveryCharges: {
                    ...form.deliveryCharges,
                    freeShippingThreshold: Number(e.target.value),
                  },
                })
              }
              className="w-full border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111]"
      >
        {saving ? 'Saving...' : 'Publish Website Settings'}
      </button>
    </form>
  );
};

/* ============================================================================
 * 5. NOTIFICATIONS, ANNOUNCEMENTS & AUDIT LOGS
 * ========================================================================== */
export const AdminNotificationsAndLogsView: React.FC<{
  notifications: AppNotification[];
  auditLogs: AdminActivityLog[];
  onRefresh: () => Promise<void>;
  notify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}> = ({ notifications, auditLogs, onRefresh, notify }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await apiRequest('/api/admin/notifications/announce', {
        method: 'POST',
        authMode: 'admin',
        body: JSON.stringify({ title, message }),
      });
      setTitle('');
      setMessage('');
      notify('Announcement dispatched to all customer accounts.', 'success');
      await onRefresh();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Broadcast Announcement */}
      <form onSubmit={handleBroadcast} className="border border-neutral-200 bg-white p-6 space-y-4">
        <h2 className="font-serif text-2xl font-semibold text-[#111111]">
          Send Customer Announcement
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Announcement Title (e.g. Eid Heritage Collection Live)"
            className="border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
          />
          <input
            type="text"
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message body for customers..."
            className="border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="px-5 py-2.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-[#D4AF37] hover:text-[#111111]"
        >
          <Send className="w-3.5 h-3.5" />
          <span>{sending ? 'Sending...' : 'Broadcast Announcement'}</span>
        </button>
      </form>

      {/* Admin Alerts */}
      <div className="border border-neutral-200 bg-white">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <h3 className="font-serif text-xl font-semibold">Admin System Alerts</h3>
        </div>
        <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-sm text-neutral-500 text-center">No admin alerts yet.</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 flex items-center justify-between gap-4 ${
                  n.isRead ? 'bg-white' : 'bg-[#FAF7EE]'
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[#111111]">{n.title}</div>
                  <div className="text-xs text-neutral-600">{n.message}</div>
                  <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                    {formatDateTimeBD(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiRequest(`/api/admin/notifications/${n.id}/read`, {
                        method: 'POST',
                        authMode: 'admin',
                      });
                      await onRefresh();
                    }}
                    className="p-1.5 border border-neutral-300 text-xs hover:border-[#111111]"
                    title="Mark read"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Admin Activity Audit Log */}
      <div className="border border-neutral-200 bg-white">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="font-serif text-xl font-semibold">Admin Activity Audit Log</h3>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 uppercase tracking-wider text-neutral-500">
                <th className="p-3 text-left font-medium">Timestamp</th>
                <th className="p-3 text-left font-medium">Admin</th>
                <th className="p-3 text-left font-medium">Action</th>
                <th className="p-3 text-left font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="p-3 font-mono text-neutral-500 whitespace-nowrap">
                    {formatDateTimeBD(log.timestamp)}
                  </td>
                  <td className="p-3 font-medium">{log.adminEmail}</td>
                  <td className="p-3 font-mono text-[#9A7B2C]">{log.action}</td>
                  <td className="p-3 text-neutral-700">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
