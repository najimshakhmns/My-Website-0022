import React from 'react';
import { Download, Printer, X } from 'lucide-react';
import { formatBDT, formatDateTimeBD } from '../lib/bangladesh.ts';
import type { Order, WebsiteSettings } from '../types.ts';
import { BrandLogo } from './BrandLogo.tsx';

interface InvoiceModalProps {
  order: Order | null;
  settings: WebsiteSettings | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, settings, onClose }) => {
  if (!order) return null;

  const handleDownloadHtml = () => {
    const rows = order.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:10px;border-bottom:1px solid #e5e5e5;">${i.productName} (${i.size}, ${i.color})</td>
            <td style="padding:10px;border-bottom:1px solid #e5e5e5;text-align:center;">${i.quantity}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatBDT(i.unitPrice)}</td>
            <td style="padding:10px;border-bottom:1px solid #e5e5e5;text-align:right;">${formatBDT(i.subtotal)}</td>
          </tr>`
      )
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${order.id}</title></head>
      <body style="font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111;">
        <div style="display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:16px;">
          <div>
            <h1 style="margin:0;letter-spacing:3px;">${settings?.companyName || 'MNS FASHION BRAND'}</h1>
            <p style="margin:4px 0;color:#666;font-size:13px;">${settings?.businessAddress || 'Palashbari, Gaibandha, Bangladesh'} · ${settings?.contactNumber || '01341422732'}</p>
          </div>
          <div style="text-align:right;">
            <strong style="font-size:18px;">INVOICE</strong>
            <div style="font-family:monospace;margin-top:4px;">${order.id}</div>
            <div style="font-size:12px;color:#666;">${formatDateTimeBD(order.createdAt)}</div>
          </div>
        </div>
        <div style="margin:24px 0;font-size:14px;">
          <strong>Billed & Shipped To:</strong><br/>
          ${order.customerName} · ${order.mobile}<br/>
          ${order.address}, ${order.upazila}, ${order.district}<br/>
          Email: ${order.email}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#f5f5f5;text-align:left;">
              <th style="padding:10px;">Item</th>
              <th style="padding:10px;text-align:center;">Qty</th>
              <th style="padding:10px;text-align:right;">Unit Price</th>
              <th style="padding:10px;text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;text-align:right;font-size:14px;line-height:1.8;">
          <div>Subtotal: <strong>${formatBDT(order.subtotal)}</strong></div>
          <div>Delivery Charge: <strong>${formatBDT(order.deliveryCharge)}</strong></div>
          ${order.discount > 0 ? `<div>Discount (${order.couponCode || ''}): <strong>-${formatBDT(order.discount)}</strong></div>` : ''}
          <div style="font-size:18px;border-top:1px solid #111;padding-top:8px;margin-top:8px;">
            Total Amount: <strong>${formatBDT(order.totalAmount)}</strong>
          </div>
          <div style="font-size:12px;color:#555;">Payment: ${order.paymentMethod.toUpperCase()} (${order.paymentStatus.replace(/_/g, ' ')}) ${order.transactionId ? `· TrxID: ${order.transactionId}` : ''}</div>
        </div>
      </body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${order.id}-invoice.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl border border-neutral-200 shadow-2xl p-6 sm:p-8 relative">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4 mb-6 no-print">
          <h3 className="font-serif text-2xl font-semibold text-[#111111]">Official Tax & Order Invoice</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="px-3 py-1.5 text-xs font-medium border border-neutral-300 hover:border-[#111111] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium bg-[#111111] text-white hover:bg-[#D4AF37] hover:text-[#111111] flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close invoice"
              className="p-1.5 text-neutral-500 hover:text-[#111111]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <BrandLogo companyName={settings?.companyName || 'MNS FASHION BRAND'} />
            <p className="text-xs text-neutral-500 mt-2">
              {settings?.businessAddress || 'Palashbari, Gaibandha, Bangladesh'}
            </p>
            <p className="text-xs text-neutral-500">
              Tel: {settings?.contactNumber || '01341422732'} · {settings?.email || 'najimshakh6166@gmail.com'}
            </p>
          </div>
          <div className="sm:text-right">
            <div className="text-xs uppercase tracking-widest text-neutral-500">Order Reference</div>
            <div className="font-mono text-lg font-semibold text-[#111111] tabular-nums">{order.id}</div>
            <div className="text-xs text-neutral-500 mt-1">{formatDateTimeBD(order.createdAt)}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 py-5 border-b border-neutral-200 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Customer & Shipping</div>
            <div className="font-semibold text-[#111111]">{order.customerName}</div>
            <div className="text-neutral-600">{order.mobile}</div>
            <div className="text-neutral-600">{order.email}</div>
            <div className="text-neutral-600 mt-1">
              {order.address}, {order.upazila}, {order.district}
            </div>
          </div>
          <div className="sm:text-right">
            <div className="text-xs uppercase tracking-wider text-neutral-500 mb-1">Payment Summary</div>
            <div className="font-semibold uppercase text-[#111111]">{order.paymentMethod}</div>
            <div className="text-neutral-600 capitalize">
              Payment Status: {order.paymentStatus.replace(/_/g, ' ')}
            </div>
            <div className="text-neutral-600 capitalize">
              Order Status: {order.orderStatus.replace(/_/g, ' ')}
            </div>
            {order.transactionId && (
              <div className="font-mono text-xs text-neutral-700 mt-1">TrxID: {order.transactionId}</div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 text-left font-medium">Item</th>
                <th className="py-2 text-center font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Unit</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {order.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3">
                    <div className="font-medium text-[#111111]">{item.productName}</div>
                    <div className="text-xs text-neutral-500">
                      Size: {item.size} · Color: {item.color}
                    </div>
                  </td>
                  <td className="py-3 text-center font-mono tabular-nums">{item.quantity}</td>
                  <td className="py-3 text-right font-mono tabular-nums">{formatBDT(item.unitPrice)}</td>
                  <td className="py-3 text-right font-mono font-medium tabular-nums">
                    {formatBDT(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border-t border-neutral-200 pt-4 flex flex-col items-end gap-1.5 text-sm">
          <div className="flex justify-between w-full max-w-xs">
            <span className="text-neutral-600">Subtotal</span>
            <span className="font-mono tabular-nums">{formatBDT(order.subtotal)}</span>
          </div>
          <div className="flex justify-between w-full max-w-xs">
            <span className="text-neutral-600">Delivery Charge</span>
            <span className="font-mono tabular-nums">{formatBDT(order.deliveryCharge)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between w-full max-w-xs text-emerald-700">
              <span>Discount ({order.couponCode})</span>
              <span className="font-mono tabular-nums">-{formatBDT(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between w-full max-w-xs pt-2 mt-1 border-t border-neutral-200 text-base font-semibold text-[#111111]">
            <span>Total Paid / Due</span>
            <span className="font-mono tabular-nums">{formatBDT(order.totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
