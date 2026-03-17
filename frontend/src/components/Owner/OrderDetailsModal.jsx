import { useState, useEffect } from 'react';
import { X, Copy, Printer, CheckCircle2, Clock, Truck, Package, CreditCard } from 'lucide-react';
import { ownerAPI } from '../../services/api';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);

const statusColors = {
  Pending: { bg: '#FEF3C7', color: '#CA8A04' },
  Processing: { bg: '#DBEAFE', color: '#2563EB' },
  Shipped: { bg: '#F3E8FF', color: '#7C3AED' },
  Delivered: { bg: '#DCFCE7', color: '#16A34A' },
  Cancelled: { bg: '#FEE2E2', color: '#DC2626' },
};

const timelineSteps = [
  { key: 'Pending', label: 'Order Placed', icon: Package },
  { key: 'Processing', label: 'Processing', icon: Clock },
  { key: 'Shipped', label: 'Shipped', icon: Truck },
  { key: 'Delivered', label: 'Delivered', icon: CheckCircle2 },
];

const statusRank = { Pending: 0, Processing: 1, Shipped: 2, Delivered: 3, Cancelled: -1 };

export default function OrderDetailsModal({ isOpen, onClose, order, onStatusUpdate }) {
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    ownerAPI.getOrderStatuses?.()
      .then(res => setStatuses(res.data?.results || res.data || []))
      .catch(() => { });
  }, []);

  if (!isOpen || !order) return null;

  const st = statusColors[order.status] || statusColors.Pending;
  const currentRank = statusRank[order.status] ?? -1;

  const copyTracking = () => {
    if (order.tracking_number) navigator.clipboard.writeText(order.tracking_number);
  };

  const handleStatusChange = (statusName) => {
    // Find matching OrderStatus ID from fetched statuses
    const found = statuses.find(s => s.name === statusName);
    if (found) {
      onStatusUpdate(order.id, { order_status: found.id });
    } else {
      // Fallback: try creating or use name-based approach
      onStatusUpdate(order.id, { order_status: statusName });
    }
  };

  const items = order.details || [];

  return (
    <div className="odm-overlay" onClick={onClose}>
      <div className="odm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="odm-header">
          <div>
            <h2 className="odm-title">Order #{order.id}</h2>
            <span className="odm-date">{new Date(order.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="odm-header-right">
            <span className="odm-status-badge" style={{ background: st.bg, color: st.color }}>{order.status}</span>
            <button className="odm-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <div className="odm-body">
          {/* Timeline */}
          <div className="odm-section">
            <h3 className="odm-section-title">Order Timeline</h3>
            <div className="odm-timeline">
              {timelineSteps.map((step, i) => {
                const rank = statusRank[step.key];
                const done = currentRank >= rank && currentRank !== -1;
                const current = currentRank === rank;
                const Icon = step.icon;
                return (
                  <div key={step.key} className={`odm-tl-step ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                    <div className="odm-tl-icon"><Icon size={16} /></div>
                    <span className="odm-tl-label">{step.label}</span>
                    {i < timelineSteps.length - 1 && <div className={`odm-tl-line ${done && !current ? 'done' : ''}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Items */}
          {items.length > 0 && (
            <div className="odm-section">
              <h3 className="odm-section-title">Order Items ({items.length})</h3>
              <div className="odm-items-table-wrap">
                <table className="odm-items-table">
                  <thead>
                    <tr>
                      <th style={{ width: 48 }}></th>
                      <th>Product</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Unit Price</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '0.4rem 0.5rem' }}>
                          <div className="odm-item-img-wrap">
                            {(item.product_image || item.product_detail?.image_url || item.image) ? (
                              <img
                                src={item.product_image || item.product_detail?.image_url || item.image}
                                alt={item.product_name || ''}
                                className="odm-item-img"
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <Package size={20} color="#cbd5e1" />
                            )}
                          </div>
                        </td>
                        <td className="odm-item-name">{item.product_name || `Product #${item.product}`}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right' }}>{fmt(item.unit_price)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(item.total_price || item.unit_price * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Info */}
          <div className="odm-section">
            <h3 className="odm-section-title">Customer Information</h3>
            <div className="odm-info-grid">
              <div><span className="odm-info-label">Name</span><span className="odm-info-value">{order.user_name}</span></div>
              <div><span className="odm-info-label">Email</span><span className="odm-info-value">{order.user_email}</span></div>
              <div><span className="odm-info-label">Phone</span><span className="odm-info-value">{order.user_phone || 'N/A'}</span></div>
              <div><span className="odm-info-label">Shipping Address</span><span className="odm-info-value">{order.shipping_address || 'N/A'}</span></div>
            </div>
          </div>

          {/* Payment + Delivery */}
          <div className="odm-two-col">
            <div className="odm-section">
              <h3 className="odm-section-title">Payment</h3>
              <div className="odm-info-grid">
                <div><span className="odm-info-label">Method</span><span className="odm-info-value"><CreditCard size={14} style={{ marginRight: 4 }} />{order.payment_method}</span></div>
                <div><span className="odm-info-label">Status</span><span className="odm-info-value" style={{ color: order.payment_status === 'Completed' ? '#16a34a' : order.payment_status === 'Refunded' ? '#dc2626' : '#ca8a04' }}>{order.payment_status}</span></div>
              </div>
            </div>
            <div className="odm-section">
              <h3 className="odm-section-title">Delivery</h3>
              <div className="odm-info-grid">
                <div>
                  <span className="odm-info-label">Tracking</span>
                  <span className="odm-info-value">
                    {order.tracking_number ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <code style={{ fontSize: '0.78rem', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{order.tracking_number}</code>
                        <button onClick={copyTracking} className="odm-copy-btn"><Copy size={13} /></button>
                      </span>
                    ) : 'Not yet assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="odm-section">
            <h3 className="odm-section-title">Order Summary</h3>
            <div className="odm-summary">
              <div className="odm-sum-row"><span>Subtotal ({order.items_count} items)</span><span>{fmt(order.total_amount || order.grand_total)}</span></div>
              <div className="odm-sum-total"><span>Grand Total</span><span>{fmt(order.grand_total)}</span></div>
            </div>
          </div>

          {/* Invoice Stamp (visible only on print) */}
          <div className="invoice-stamp" style={{ display: 'none' }}>
            ELECTRONEST STORE<br />
            {order.status === 'Delivered' ? '✓ DELIVERED' : order.status === 'Shipped' ? '📦 SHIPPED' : '📋 ' + (order.status || '').toUpperCase()}<br />
            <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>

          {/* Quick Action Buttons */}
          {order.status === 'Pending' && (
            <div className="odm-section">
              <h3 className="odm-section-title">Action Required</h3>
              <div className="odm-action-row">
                <button className="odm-action-btn odm-action-process" onClick={() => handleStatusChange('Processing')}>
                  <Clock size={15} /> Accept &amp; Process Order
                </button>
                <button className="odm-action-btn odm-action-cancel" onClick={() => handleStatusChange('Cancelled')}>
                  <X size={15} /> Cancel Order
                </button>
              </div>
            </div>
          )}
          {order.status === 'Processing' && (
            <div className="odm-section">
              <h3 className="odm-section-title">Action Required</h3>
              <div className="odm-action-row">
                <button className="odm-action-btn odm-action-ship" onClick={() => handleStatusChange('Shipped')}>
                  <Truck size={15} /> Mark as Shipped
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="odm-footer">
          <button className="odm-btn odm-btn-print" onClick={() => window.print()}><Printer size={15} /> Print Invoice</button>
          <button className="odm-btn odm-btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .odm-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
  .odm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 720px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
  .odm-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
  .odm-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; }
  .odm-date { font-size: 0.78rem; color: #9ca3af; }
  .odm-header-right { display: flex; align-items: center; gap: 0.75rem; }
  .odm-status-badge { padding: 0.3rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
  .odm-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 6px; }
  .odm-close:hover { color: #ef4444; }
  .odm-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }
  .odm-section { margin-bottom: 1.25rem; }
  .odm-section-title { font-size: 0.82rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem; }

  /* Timeline */
  .odm-timeline { display: flex; align-items: center; gap: 0; padding: 0.5rem 0; }
  .odm-tl-step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1; }
  .odm-tl-icon { width: 36px; height: 36px; border-radius: 50%; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; border: 2px solid #e5e7eb; z-index: 1; }
  .odm-tl-step.done .odm-tl-icon { background: #F0FDF4; color: #16a34a; border-color: #16a34a; }
  .odm-tl-step.current .odm-tl-icon { background: #FFF7ED; color: #F97316; border-color: #F97316; }
  .odm-tl-label { font-size: 0.7rem; margin-top: 4px; color: #9ca3af; font-weight: 500; text-align: center; }
  .odm-tl-step.done .odm-tl-label { color: #16a34a; }
  .odm-tl-step.current .odm-tl-label { color: #F97316; font-weight: 700; }
  .odm-tl-line { position: absolute; top: 18px; left: 50%; width: 100%; height: 2px; background: #e5e7eb; z-index: 0; }
  .odm-tl-line.done { background: #16a34a; }

  /* Order Items Table */
  .odm-items-table-wrap { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; }
  .odm-items-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .odm-items-table th { padding: 0.5rem 0.75rem; background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; text-align: left; }
  .odm-items-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f3f4f6; color: #374151; }
  .odm-items-table tbody tr:last-child td { border-bottom: none; }
  .odm-items-table tbody tr:hover { background: #FFF7ED; }
  .odm-item-img-wrap { width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .odm-item-img { width: 40px; height: 40px; object-fit: cover; }
  .odm-item-name { font-weight: 600; color: #1e293b; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .odm-action-row { display: flex; gap: 0.6rem; flex-wrap: wrap; }
  .odm-action-btn { display: inline-flex; align-items: center; gap: 8px; padding: 0.6rem 1.25rem; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit; border: none; transition: all 0.15s; }
  .odm-action-process { background: #dbeafe; color: #1d4ed8; border: 1.5px solid #bfdbfe; }
  .odm-action-process:hover { background: #bfdbfe; transform: translateY(-1px); }
  .odm-action-ship { background: #f3e8ff; color: #6d28d9; border: 1.5px solid #ddd6fe; }
  .odm-action-ship:hover { background: #ddd6fe; transform: translateY(-1px); }
  .odm-action-cancel { background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca; }
  .odm-action-cancel:hover { background: #fecaca; transform: translateY(-1px); }

  /* Info Grid */
  .odm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .odm-info-label { display: block; font-size: 0.72rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
  .odm-info-value { display: flex; align-items: center; font-size: 0.85rem; color: #1e293b; font-weight: 500; margin-top: 1px; }
  .odm-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  @media (max-width: 540px) { .odm-info-grid, .odm-two-col { grid-template-columns: 1fr; } }

  .odm-copy-btn { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 2px; }
  .odm-copy-btn:hover { color: #F97316; }

  /* Summary */
  .odm-summary { background: #f9fafb; border-radius: 10px; padding: 1rem; }
  .odm-sum-row { display: flex; justify-content: space-between; padding: 0.3rem 0; font-size: 0.85rem; color: #4b5563; }
  .odm-sum-row.discount { color: #16a34a; }
  .odm-sum-total { display: flex; justify-content: space-between; padding: 0.6rem 0 0; margin-top: 0.4rem; border-top: 2px solid #e5e7eb; font-size: 1.05rem; font-weight: 800; color: #1e293b; }

  /* Status Actions */
  .odm-status-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
  .odm-status-action-btn { padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .odm-status-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }

  /* Footer */
  .odm-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; }
  .odm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; border: none; transition: all 0.15s; }
  .odm-btn-print { background: #f3f4f6; color: #4b5563; }
  .odm-btn-print:hover { background: #e5e7eb; }
  .odm-btn-close { background: #F97316; color: #fff; }
  .odm-btn-close:hover { background: #ea580c; }

  /* ── Single-page Print Styles ── */
  @media print {
    @page { size: A4 portrait; margin: 8mm 10mm; }
    body * { visibility: hidden !important; }
    .odm-overlay, .odm-overlay * { visibility: visible !important; }
    .odm-overlay {
      position: fixed !important; inset: 0 !important;
      background: white !important; backdrop-filter: none !important;
      padding: 0 !important; display: block !important;
    }
    .odm-modal {
      position: static !important; max-height: none !important; max-width: 100% !important;
      width: 100% !important; box-shadow: none !important; border: none !important;
      border-radius: 0 !important; overflow: visible !important; display: block !important;
    }
    .odm-body { overflow: visible !important; padding: 0.5rem 0.75rem !important; }
    /* Hide non-essential sections */
    .odm-timeline, .odm-action-row, .odm-footer,
    .odm-close, .odm-copy-btn,
    [class*="odm-action"] { display: none !important; }
    /* Compact header */
    .odm-header { padding: 0.6rem 0.75rem !important; border-bottom: 2px solid #1e293b !important; }
    .odm-title { font-size: 1rem !important; }
    /* Compact sections */
    .odm-section { margin-bottom: 0.6rem !important; page-break-inside: avoid; }
    .odm-section-title { margin-bottom: 0.3rem !important; font-size: 0.7rem !important; }
    /* Compact table */
    .odm-items-table th, .odm-items-table td { padding: 0.3rem 0.5rem !important; font-size: 0.75rem !important; }
    .odm-item-img-wrap { display: none !important; }
    .odm-item-name { max-width: none !important; white-space: normal !important; font-size: 0.75rem !important; }
    /* Compact info grid */
    .odm-info-label { font-size: 0.65rem !important; }
    .odm-info-value { font-size: 0.75rem !important; }
    .odm-summary { padding: 0.5rem !important; }
    .odm-sum-row, .odm-sum-total { font-size: 0.78rem !important; padding: 0.15rem 0 !important; }
    /* Invoice stamp visible */
    .invoice-stamp {
      visibility: visible !important; display: block !important;
      text-align: center; margin-top: 12px; padding: 8px;
      border: 2.5px solid #7C3AED; border-radius: 10px;
      color: #7C3AED; font-weight: 800; font-size: 0.8rem;
      transform: rotate(-3deg); opacity: 0.75;
      width: fit-content; margin-left: auto; margin-right: auto;
    }
    /* ElectroNest print header */
    .odm-header::before {
      content: "ElectroNest — Shipping Invoice";
      display: block; font-size: 0.65rem; color: #9ca3af;
      font-weight: 500; margin-bottom: 2px;
    }
  }
`;
