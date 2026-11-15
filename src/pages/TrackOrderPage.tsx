import React, { useEffect, useState } from 'react';
import { Check, Package, Search, Truck } from 'lucide-react';
import { apiRequest } from '../lib/api.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ORDER_STAGES, formatBDT, formatDateTimeBD } from '../lib/bangladesh.ts';
import type { Order } from '../types.ts';

export const TrackOrderPage: React.FC = () => {
  const { route, language, staticMode, notify } = useStore();
  const params = new URLSearchParams(route.split('?')[1] || '');

  const [orderId, setOrderId] = useState(params.get('orderId') || '');
  const [mobile, setMobile] = useState(params.get('mobile') || '');
  const [loading, setLoading] = useState(false);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const performLookup = async (idToLookup: string, phoneToLookup: string) => {
    if (!idToLookup.trim() || !phoneToLookup.trim()) return;
    if (staticMode) {
      const msg =
        'Order tracking requires the live MNS backend server. For assistance with an active order, please call or WhatsApp 01341422732.';
      setTrackedOrder(null);
      setErrorMsg(msg);
      notify(msg, 'info');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await apiRequest<{ order: Order }>('/api/orders/track', {
        method: 'POST',
        authMode: 'none',
        body: JSON.stringify({ orderId: idToLookup, mobile: phoneToLookup }),
      });
      setTrackedOrder(res.order);
    } catch (err: any) {
      setTrackedOrder(null);
      setErrorMsg(err.message);
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const oId = params.get('orderId');
    const ph = params.get('mobile');
    if (oId && ph) {
      setOrderId(oId);
      setMobile(ph);
      performLookup(oId, ph);
    }
  }, [route]);

  const currentStageIndex = trackedOrder
    ? ORDER_STAGES.findIndex((s) => s.key === trackedOrder.orderStatus)
    : -1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center max-w-xl mx-auto space-y-3 mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Verified Shipment Tracking
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[#111111]">
          Track Your MNS Order
        </h1>
        <p className="text-sm text-neutral-600">
          Enter your unique Order ID and registered Bangladesh mobile number to inspect real-time dispatch milestones.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          performLookup(orderId, mobile);
        }}
        className="border border-neutral-200 bg-[#FAF9F6] p-6 grid sm:grid-cols-[1fr_1fr_auto] gap-4 items-end"
      >
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
            Order ID
          </label>
          <input
            type="text"
            required
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            placeholder="MNS-2026-1001"
            className="w-full border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-mono uppercase outline-none focus:border-[#111111]"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider text-neutral-600 mb-1.5">
            Registered Mobile Number
          </label>
          <input
            type="tel"
            required
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-mono outline-none focus:border-[#111111]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 h-[42px] bg-[#111111] text-white text-xs font-semibold uppercase tracking-widest hover:bg-[#D4AF37] hover:text-[#111111] transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          <Search className="w-4 h-4" />
          <span>{loading ? 'Checking...' : 'Track Order'}</span>
        </button>
      </form>

      {errorMsg && (
        <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      {trackedOrder && (
        <div className="mt-8 border border-neutral-200 bg-white p-6 sm:p-8 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-neutral-200">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-500">Order Reference</div>
              <div className="font-mono text-2xl font-semibold text-[#111111]">
                {trackedOrder.id}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Placed on {formatDateTimeBD(trackedOrder.createdAt)} · Destination: {trackedOrder.upazila}, {trackedOrder.district}
              </div>
            </div>

            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-neutral-500">Current Status</div>
              <div className="text-lg font-semibold text-[#111111] capitalize mt-0.5">
                {trackedOrder.orderStatus.replace(/_/g, ' ')}
              </div>
              <div className="font-mono text-sm text-neutral-600 tabular-nums">
                {formatBDT(trackedOrder.totalAmount)} · {trackedOrder.paymentMethod.toUpperCase()}
              </div>
            </div>
          </div>

          {/* 7-Stage Tracking Timeline */}
          {trackedOrder.orderStatus === 'cancelled' ? (
            <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-900">
              This order was cancelled. Please contact 01341422732 if you require assistance.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
              {ORDER_STAGES.map((stage, idx) => {
                const completed = currentStageIndex >= idx;
                const isCurrent = currentStageIndex === idx;
                return (
                  <div
                    key={stage.key}
                    className={`p-3 border text-center flex flex-col items-center gap-2 ${
                      isCurrent
                        ? 'border-[#D4AF37] bg-[#FAF7EE]'
                        : completed
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-400'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono ${
                        completed && !isCurrent
                          ? 'bg-[#D4AF37] text-[#111111]'
                          : isCurrent
                          ? 'bg-[#111111] text-white'
                          : 'bg-neutral-200 text-neutral-500'
                      }`}
                    >
                      {completed ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                    </div>
                    <div className="text-[11px] font-medium leading-tight">
                      {language === 'bn' ? stage.labelBn : stage.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed Status Log */}
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-500 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              <span>Dispatch & Verification Log</span>
            </h2>
            <div className="divide-y divide-neutral-100 border border-neutral-200">
              {[...trackedOrder.trackingHistory].reverse().map((entry, idx) => (
                <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                  <div>
                    <div className="font-semibold text-[#111111]">{entry.label}</div>
                    <div className="text-neutral-600 text-xs mt-0.5">{entry.note}</div>
                  </div>
                  <div className="text-xs font-mono text-neutral-500 shrink-0">
                    {formatDateTimeBD(entry.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Items Ordered */}
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-widest font-semibold text-neutral-500 flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>Items in Parcel</span>
            </h2>
            <div className="divide-y divide-neutral-100 border border-neutral-200">
              {trackedOrder.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-[#111111]">{item.productName}</span>
                    <span className="text-xs text-neutral-500 ml-2">
                      Qty {item.quantity} · {item.size} · {item.color}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums">{formatBDT(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
