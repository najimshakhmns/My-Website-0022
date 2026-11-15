import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, ShieldAlert, Smartphone, Truck } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { BANGLADESH_DISTRICTS, formatBDT } from '../lib/bangladesh.ts';
import { resolveMediaUrl } from '../lib/media.ts';
import { InvoiceModal } from '../components/InvoiceModal.tsx';
import type { Order, PaymentMethod } from '../types.ts';

interface PaymentSession {
  paymentId: string;
  orderId: string;
  method: PaymentMethod;
  amount: number;
  mode: 'demo' | 'live';
  merchantNumber: string;
  accountType: string;
  instructions: string;
}

export const CheckoutPage: React.FC = () => {
  const {
    cart,
    products,
    user,
    staticMode,
    websiteSettings,
    paymentSettings,
    clearCart,
    navigate,
    notify,
    refreshBootstrap,
  } = useStore();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [email, setEmail] = useState(user?.email || '');
  const [district, setDistrict] = useState(user?.district || 'Gaibandha');
  const [upazila, setUpazila] = useState(user?.upazila || 'Palashbari');
  const [address, setAddress] = useState(user?.address || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('bkash');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [senderNumber, setSenderNumber] = useState(user?.mobile || '');
  const [transactionId, setTransactionId] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (user) {
      if (!fullName) setFullName(user.fullName);
      if (!mobile) setMobile(user.mobile);
      if (!senderNumber) setSenderNumber(user.mobile);
      if (!email) setEmail(user.email);
      if (user.district) setDistrict(user.district);
      if (user.upazila) setUpazila(user.upazila);
      if (user.address && !address) setAddress(user.address);
    }
  }, [user]);

  const upazilas = BANGLADESH_DISTRICTS[district] || ['Sadar'];
  useEffect(() => {
    if (!upazilas.includes(upazila)) {
      setUpazila(upazilas[0] || '');
    }
  }, [district]);

  const resolvedItems = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const unitPrice =
        product.salePrice > 0 && product.salePrice < product.regularPrice
          ? product.salePrice
          : product.regularPrice;
      return { item, product, unitPrice, lineTotal: unitPrice * item.quantity };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const subtotal = resolvedItems.reduce((s, r) => s + r.lineTotal, 0);

  let discount = 0;
  if (appliedCoupon === 'MNS10') discount = Math.round(subtotal * 0.1);
  else if (appliedCoupon === 'NAWAB500' && subtotal >= 3000) discount = 500;

  const charges = websiteSettings?.deliveryCharges || {
    gaibandhaLocal: 50,
    insideDhaka: 80,
    outsideDhaka: 130,
    freeShippingThreshold: 5000,
  };
  const deliveryCharge =
    subtotal >= charges.freeShippingThreshold
      ? 0
      : district === 'Gaibandha'
      ? charges.gaibandhaLocal
      : district === 'Dhaka'
      ? charges.insideDhaka
      : charges.outsideDhaka;

  const totalAmount = Math.max(0, subtotal - discount + deliveryCharge);

  const handleApplyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (code === 'MNS10') {
      setAppliedCoupon('MNS10');
      notify('10% promo code MNS10 applied', 'success');
    } else if (code === 'NAWAB500' && subtotal >= 3000) {
      setAppliedCoupon('NAWAB500');
      notify('৳500 discount code NAWAB500 applied', 'success');
    } else {
      notify('Invalid code or minimum order requirement not met (Try MNS10 or NAWAB500)', 'error');
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvedItems.length === 0) return;
    if (staticMode) {
      notify(
        'Static catalog mode: live order creation & payment verification require the backend server. Contact 01341422732 on WhatsApp to confirm your order.',
        'info'
      );
      return;
    }
    setSubmitting(true);
    try {
      const orderRes = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: fullName,
          mobile,
          email,
          district,
          upazila,
          address,
          paymentMethod,
          couponCode: appliedCoupon,
          items: cart,
        }),
      });

      const order = orderRes.order;
      clearCart();
      await refreshBootstrap();

      if (paymentMethod === 'cod') {
        setCreatedOrder(order);
        notify(`Order ${order.id} confirmed!`, 'success');
      } else {
        const payRes = await apiRequest<{ paymentSession: PaymentSession }>(
          '/api/payments/initiate',
          {
            method: 'POST',
            body: JSON.stringify({ orderId: order.id, method: paymentMethod }),
          }
        );
        setCreatedOrder(order);
        setPaymentSession(payRes.paymentSession);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdOrder || !paymentSession) return;
    setVerifyingPayment(true);
    try {
      const res = await apiRequest<{ order: Order }>('/api/payments/verify', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: paymentSession.paymentId,
          orderId: createdOrder.id,
          transactionId,
          senderNumber,
        }),
      });
      setCreatedOrder(res.order);
      setPaymentSession(null);
      notify('Transaction reference submitted for merchant verification.', 'success');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setVerifyingPayment(false);
    }
  };

  // Step 2: Online Payment Verification Screen (bKash / Nagad / Rocket)
  if (createdOrder && paymentSession) {
    const brandMap = {
      bkash: { name: 'bKash', bg: '#E2136E', text: '#FFFFFF' },
      nagad: { name: 'Nagad', bg: '#F6921E', text: '#111111' },
      rocket: { name: 'Rocket', bg: '#8C3494', text: '#FFFFFF' },
      cod: { name: 'COD', bg: '#111111', text: '#FFFFFF' },
    }[paymentSession.method];

    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div
            className="px-6 py-5 flex items-center justify-between"
            style={{ backgroundColor: brandMap.bg, color: brandMap.text }}
          >
            <div>
              <div className="text-xs uppercase tracking-widest opacity-90">
                {paymentSession.mode === 'demo' ? 'Sandbox Demo Payment Gateway' : 'Merchant Payment'}
              </div>
              <h1 className="font-serif text-2xl font-semibold mt-0.5">
                Complete {brandMap.name} Payment
              </h1>
            </div>
            <Smartphone className="w-7 h-7 opacity-90" />
          </div>

          <div className="p-6 space-y-5">
            {paymentSession.mode === 'demo' && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Demo Sandbox Mode Active:</strong> Live merchant API keys are not configured. Submit a sample Transaction ID (e.g. <span className="font-mono">TRX987654</span>) below to test backend verification and duplicate-TrxID protection.
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 bg-[#F7F6F3] p-4 border border-neutral-200 text-sm">
              <div>
                <div className="text-xs text-neutral-500">Order Reference</div>
                <div className="font-mono font-semibold text-[#111111]">{createdOrder.id}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">Exact Payable Amount</div>
                <div className="font-mono text-lg font-bold text-[#111111] tabular-nums">
                  {formatBDT(paymentSession.amount)}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Merchant Number</div>
                <div className="font-mono font-semibold text-[#111111]">
                  {paymentSession.merchantNumber}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-500">Account Type</div>
                <div className="font-medium text-[#111111]">{paymentSession.accountType}</div>
              </div>
            </div>

            <div className="text-sm text-neutral-700 leading-relaxed border-b border-neutral-200 pb-4">
              <strong className="block text-xs uppercase tracking-wider text-neutral-500 mb-1">
                Instructions
              </strong>
              {paymentSession.instructions}
            </div>

            <form onSubmit={handleVerifyPayment} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Your {brandMap.name} Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-neutral-700 mb-1.5">
                  Transaction ID (TrxID)
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                  placeholder="e.g. 9A7B6C5D4E"
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono uppercase outline-none focus:border-[#111111]"
                />
              </div>
              <button
                type="submit"
                disabled={verifyingPayment}
                className="w-full py-3.5 bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{verifyingPayment ? 'Verifying on Server...' : 'Submit Payment Reference'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Order Confirmation Screen
  if (createdOrder && !paymentSession) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-14">
        <div className="border border-neutral-200 bg-white p-8 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-700 shrink-0 mt-1" />
            <div>
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Order Confirmation
              </p>
              <h1 className="font-serif text-3xl font-semibold text-[#111111] mt-1">
                Thank you, {createdOrder.customerName}
              </h1>
              <p className="text-sm text-neutral-600 mt-1">
                Your order has been registered with MNS Fashion Brand. Save your Order ID to track delivery status anytime.
              </p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 bg-[#F7F6F3] p-4 border border-neutral-200 text-sm">
            <div>
              <div className="text-xs text-neutral-500">Order ID</div>
              <div className="font-mono font-semibold text-[#111111]">{createdOrder.id}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Payment Method</div>
              <div className="font-semibold uppercase text-[#111111]">
                {createdOrder.paymentMethod} ({createdOrder.paymentStatus.replace(/_/g, ' ')})
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Total Amount</div>
              <div className="font-mono font-semibold text-[#111111] tabular-nums">
                {formatBDT(createdOrder.totalAmount)}
              </div>
            </div>
          </div>

          <div className="divide-y divide-neutral-100 border-t border-b border-neutral-200">
            {createdOrder.items.map((item, i) => (
              <div key={i} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-[#111111]">{item.productName}</span>
                  <span className="text-neutral-500 text-xs ml-2">
                    × {item.quantity} ({item.size}, {item.color})
                  </span>
                </div>
                <span className="font-mono tabular-nums">{formatBDT(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setInvoiceOrder(createdOrder)}
              className="px-5 py-3 border border-[#111111] text-xs font-semibold uppercase tracking-wider hover:bg-[#111111] hover:text-white transition-colors"
            >
              View / Print Invoice
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/track?orderId=${encodeURIComponent(createdOrder.id)}&mobile=${encodeURIComponent(
                    createdOrder.mobile
                  )}`
                )
              }
              className="px-5 py-3 bg-[#111111] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#D4AF37] hover:text-[#111111] transition-colors"
            >
              Track Order Live
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="px-5 py-3 text-xs uppercase tracking-wider text-neutral-600 hover:text-[#111111]"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        <InvoiceModal
          order={invoiceOrder}
          settings={websiteSettings}
          onClose={() => setInvoiceOrder(null)}
        />
      </div>
    );
  }

  // Step 1: Checkout Form
  if (resolvedItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-serif text-3xl font-semibold">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-neutral-600">
          Add garments or accessories to proceed to checkout.
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-6 py-3 bg-[#111111] text-white text-xs uppercase tracking-widest font-semibold"
        >
          Browse Collection
        </button>
      </div>
    );
  }

  const paymentOptions: {
    id: PaymentMethod;
    name: string;
    subtitle: string;
    accent: string;
    enabled: boolean;
  }[] = [
    {
      id: 'bkash',
      name: 'bKash',
      subtitle: 'Instant Merchant Payment',
      accent: '#E2136E',
      enabled: paymentSettings?.bkash.enabled ?? true,
    },
    {
      id: 'nagad',
      name: 'Nagad',
      subtitle: 'Nagad Digital Wallet',
      accent: '#F6921E',
      enabled: paymentSettings?.nagad.enabled ?? true,
    },
    {
      id: 'rocket',
      name: 'Rocket',
      subtitle: 'Dutch-Bangla Mobile Banking',
      accent: '#8C3494',
      enabled: paymentSettings?.rocket.enabled ?? true,
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      subtitle: 'Pay upon parcel arrival',
      accent: '#111111',
      enabled: paymentSettings?.cod.enabled ?? true,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="pb-6 border-b border-neutral-200 mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Secure Checkout</p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#111111] mt-1">
          Delivery & Bangladesh Payment
        </h1>
      </div>

      {staticMode && (
        <div className="mb-8 border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-800" />
          <div>
            <strong className="font-semibold">Static Storefront Hosting:</strong> Online order persistence and server-side bKash/Nagad/Rocket verification require running the full-stack Express server. You can review your complete order total below or confirm directly via WhatsApp at{' '}
            <span className="font-mono font-semibold">01341422732</span>.
          </div>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid lg:grid-cols-12 gap-10 items-start">
        {/* Left: Shipping & Payment Selection */}
        <div className="lg:col-span-7 space-y-8">
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-semibold text-[#111111]">
              1. Customer & Delivery Information
            </h2>

            {user?.savedAddresses && user.savedAddresses.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {user.savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setFullName(addr.fullName);
                      setMobile(addr.mobile);
                      setDistrict(addr.district);
                      setUpazila(addr.upazila);
                      setAddress(addr.address);
                    }}
                    className="px-3 py-1.5 text-xs border border-neutral-300 hover:border-[#111111]"
                  >
                    Use Saved: {addr.label} ({addr.district})
                  </button>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. MD: Tariqul Islam"
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#111111]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                  District *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
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
                  Upazila / Thana *
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
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
                Full Delivery Address *
              </label>
              <textarea
                rows={2}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, Road, Bazar / Area Landmark"
                className="w-full border border-neutral-300 px-3.5 py-2.5 text-sm outline-none focus:border-[#111111]"
              />
            </div>
          </section>

          <section className="space-y-4 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold text-[#111111]">
                2. Payment Method
              </h2>
              {paymentSettings?.mode === 'demo' && (
                <span className="text-xs text-amber-800 font-medium">Sandbox Demo Mode</span>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {paymentOptions
                .filter((opt) => opt.enabled)
                .map((opt) => {
                  const selected = paymentMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`p-4 border text-left transition-all flex items-center justify-between gap-3 ${
                        selected
                          ? 'border-[#111111] ring-1 ring-[#111111] bg-[#FAF9F6]'
                          : 'border-neutral-200 hover:border-neutral-400 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 shrink-0"
                            style={{ backgroundColor: opt.accent }}
                          />
                          <span className="font-semibold text-sm text-[#111111]">{opt.name}</span>
                        </div>
                        <div className="text-xs text-neutral-500 mt-1">{opt.subtitle}</div>
                      </div>
                      <span
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selected ? 'border-[#111111]' : 'border-neutral-300'
                        }`}
                      >
                        {selected && <span className="w-2 h-2 rounded-full bg-[#111111]" />}
                      </span>
                    </button>
                  );
                })}
            </div>
          </section>
        </div>

        {/* Right: Order Summary */}
        <aside className="lg:col-span-5 border border-neutral-200 bg-[#FAF9F6] p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-serif text-2xl font-semibold text-[#111111]">Order Summary</h2>

          <div className="divide-y divide-neutral-200 max-h-72 overflow-y-auto">
            {resolvedItems.map(({ item, product, lineTotal }, idx) => (
              <div key={idx} className="py-3 flex items-center gap-3">
                <img
                  src={resolveMediaUrl(product.images[0])}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 object-cover bg-neutral-100 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[#111111] truncate">{product.name}</div>
                  <div className="text-xs text-neutral-500">
                    Qty {item.quantity} · {item.size} · {item.color}
                  </div>
                </div>
                <div className="font-mono text-sm font-medium tabular-nums shrink-0">
                  {formatBDT(lineTotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Promo code (e.g. MNS10)"
              className="flex-1 border border-neutral-300 bg-white px-3 py-2 text-xs uppercase font-mono outline-none focus:border-[#111111]"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              className="px-4 py-2 border border-[#111111] text-xs font-semibold uppercase tracking-wider hover:bg-[#111111] hover:text-white transition-colors"
            >
              Apply
            </button>
          </div>

          <div className="space-y-2 text-sm border-t border-neutral-200 pt-4">
            <div className="flex justify-between">
              <span className="text-neutral-600">Subtotal</span>
              <span className="font-mono tabular-nums">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery ({district})</span>
              </span>
              <span className="font-mono tabular-nums">
                {deliveryCharge === 0 ? 'FREE' : formatBDT(deliveryCharge)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({appliedCoupon})</span>
                <span className="font-mono tabular-nums">-{formatBDT(discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-neutral-300 text-base font-semibold text-[#111111]">
              <span>Final Total</span>
              <span className="font-mono text-lg tabular-nums">{formatBDT(totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-[#111111] text-white text-xs font-semibold uppercase tracking-[0.18em] hover:bg-[#D4AF37] hover:text-[#111111] transition-colors disabled:opacity-60"
          >
            {submitting
              ? 'Processing Order...'
              : paymentMethod === 'cod'
              ? `Place COD Order (${formatBDT(totalAmount)})`
              : `Continue to ${paymentMethod.toUpperCase()} (${formatBDT(totalAmount)})`}
          </button>
        </aside>
      </form>
    </div>
  );
};
