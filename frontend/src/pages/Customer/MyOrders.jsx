import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp, XCircle, MapPin, Phone, Mail, CreditCard, Truck, ShoppingBag, Printer, Star, X, Clock, CheckCircle, Box, Home } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { HeaderSkeleton, CardGridSkeleton } from '../../components/Common/SkeletonLoader';

/* ── Customer Print Invoice Modal ── */
function PrintInvoiceModal({ order, onClose }) {
  if (!order) return null;
  const fmt = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p);
  const fmtDate = (d) => new Date(d).toLocaleDateString('en-NP', { year: 'numeric', month: 'long', day: 'numeric' });
  const items = order.details || [];
  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} className="cust-inv-overlay">
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 680, maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.25)' }} className="cust-inv-modal" id="customer-invoice-print">

        {/* Screen-only toolbar */}
        <div className="cust-inv-toolbar no-print" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px', borderBottom:'1px solid #e2e8f0' }}>
          <span style={{ fontWeight:700, fontSize:15, color:'#1e293b' }}>Invoice Preview</span>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => window.print()} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 18px', background:'#F97316', color:'#fff', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }}>
              <Printer size={15}/> Print
            </button>
            <button onClick={onClose} style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:36, height:36, background:'#f1f5f9', border:'none', borderRadius:8, cursor:'pointer', color:'#64748b' }}>
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* Invoice body */}
        <div style={{ padding:'32px 40px' }} className="cust-inv-body">
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, paddingBottom:20, borderBottom:'2px solid #f1f5f9' }}>
            <div>
              <div style={{ fontSize:24, fontWeight:900, color:'#F97316', letterSpacing:'-0.5px' }}>ElectroNest</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>electronics &amp; gadgets marketplace</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.08em' }}>Tax Invoice</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#1e293b', marginTop:4 }}>#{order.order_number}</div>
              <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{fmtDate(order.order_date || order.created_at)}</div>
              <div style={{ marginTop:8, display:'inline-block', padding:'4px 14px', background:'#dcfce7', color:'#15803d', borderRadius:20, fontSize:11, fontWeight:700 }}>✓ DELIVERED</div>
            </div>
          </div>

          {/* Customer & Delivery Info */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Billed To</div>
              {order.user_name && <div style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>{order.user_name}</div>}
              {order.user_phone && <div style={{ fontSize:12, color:'#64748b', marginTop:3 }}>📞 {order.user_phone}</div>}
              {order.user_email && <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>✉ {order.user_email}</div>}
            </div>
            <div style={{ background:'#f8fafc', borderRadius:10, padding:'14px 16px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Shipping Address</div>
              <div style={{ fontSize:13, color:'#1e293b', lineHeight:1.55 }}>{order.shipping_address || '—'}</div>
              {order.payment_method && order.payment_method !== 'N/A' && <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>💳 {order.payment_method}</div>}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20 }}>
            <thead>
              <tr style={{ background:'#1e293b' }}>
                <th style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'0.06em', borderRadius:'8px 0 0 0' }}>Product</th>
                <th style={{ padding:'10px 14px', textAlign:'center', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'0.06em' }}>Qty</th>
                <th style={{ padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'0.06em' }}>Unit Price</th>
                <th style={{ padding:'10px 14px', textAlign:'right', fontSize:11, fontWeight:700, color:'#fff', textTransform:'uppercase', letterSpacing:'0.06em', borderRadius:'0 8px 0 0' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom:'1px solid #f1f5f9' }}>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#1e293b', fontWeight:600 }}>
                    {item.product_name || `Product #${item.product}`}
                    {(item.product_detail?.owner_name || item.owner_name) && (
                      <div style={{ fontSize:11, color:'#94a3b8', fontWeight:400, marginTop:2 }}>
                        Sold by: {item.product_detail?.owner_name || item.owner_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'12px 14px', textAlign:'center', fontSize:13, color:'#475569' }}>{item.quantity}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontSize:13, color:'#475569' }}>{fmt(item.unit_price)}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontSize:14, fontWeight:700, color:'#1e293b' }}>{fmt(item.unit_price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:28 }}>
            <div style={{ minWidth:280 }}>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13, color:'#64748b', borderBottom:'1px solid #f1f5f9' }}>
                <span>Subtotal ({items.length} items)</span><span>{fmt(subtotal)}</span>
              </div>
              {(() => {
                const shipping = Number(order.shipping_cost ?? 0);
                return (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize:13, color:'#64748b', borderBottom:'1px solid #f1f5f9' }}>
                      <span>Delivery</span>
                      <span style={{ color: shipping === 0 ? '#16a34a' : '#374151', fontWeight: 600 }}>
                        {shipping === 0 ? 'Free' : fmt(shipping)}
                      </span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', fontSize:17, fontWeight:800, color:'#1e293b' }}>
                      <span>Grand Total</span>
                      <span style={{ color:'#F97316' }}>{fmt(order.grand_total ?? (subtotal + shipping))}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div style={{ borderTop:'2px dashed #e2e8f0', paddingTop:18, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:11, color:'#94a3b8' }}>
              <div>Thank you for shopping with ElectroNest!</div>
              <div style={{ marginTop:2 }}>This is a computer-generated invoice. No signature required.</div>
            </div>
            <div style={{ textAlign:'right', fontSize:11, color:'#94a3b8' }}>
              {order.tracking_number && <div>Tracking: <strong style={{ color:'#475569' }}>{order.tracking_number}</strong></div>}
              <div>Generated: {new Date().toLocaleDateString('en-NP')}</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .cust-inv-overlay, .cust-inv-overlay * { visibility: visible !important; }
          .cust-inv-overlay { position: fixed !important; inset: 0 !important; background: white !important; padding: 0 !important; align-items: flex-start !important; }
          .cust-inv-modal { max-height: none !important; box-shadow: none !important; border-radius: 0 !important; overflow: visible !important; }
          .cust-inv-toolbar, .no-print { display: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}

const formatPrice = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p);
const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const STATUS_COLORS = {
  Pending:    { bg: '#fef9c3', color: '#a16207', border: '#fde68a' },
  Processing: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  Shipped:    { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  Delivered:  { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  Cancelled:  { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' },
};

const STATUS_STEPS = ['Pending', 'Processing', 'Shipped', 'Delivered'];

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [printOrder, setPrintOrder] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (location.state?.orderId) {
      setExpandedId(location.state.orderId);
    }
  }, [location.state, orders]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.getMyOrders();
      const data = res.data?.results || res.data || [];
      setOrders(data);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await customerAPI.cancelOrder(id);
      await loadOrders();
    } catch {
      setError('Failed to cancel order.');
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusName = (order) =>
    order.status_name || order.status || order.order_status_name ||
    (typeof order.order_status === 'object' ? order.order_status?.name : null) || 'Pending';
  const getStepIndex = (statusName) => STATUS_STEPS.indexOf(statusName);

  const FILTER_OPTIONS = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'All') return orders;
    return orders.filter(o => getStatusName(o) === statusFilter);
  }, [orders, statusFilter]);

  const filterCounts = useMemo(() => {
    const c = { All: orders.length };
    FILTER_OPTIONS.slice(1).forEach(f => { c[f] = orders.filter(o => getStatusName(o) === f).length; });
    return c;
  }, [orders]);

  if (loading) return (
    <section style={s.page}>
      <div style={s.container}>
        <HeaderSkeleton titleWidth={170} subtitleWidth={120} showAction={false} />
        <CardGridSkeleton cards={3} columns="1fr" minHeight={190} />
      </div>
    </section>
  );

  return (
    <>
    <section style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}><Package size={24} style={{ color: '#F97316' }} /> My Orders</h1>

        {/* Filter Tabs */}
        <div style={s.filterBar}>
          {FILTER_OPTIONS.map(f => (
            <button
              key={f}
              style={{ ...s.filterBtn, ...(statusFilter === f ? s.filterBtnActive : {}) }}
              onClick={() => setStatusFilter(f)}
            >
              {f}
              <span style={{ ...s.filterCount, ...(statusFilter === f ? s.filterCountActive : {}) }}>{filterCounts[f] || 0}</span>
            </button>
          ))}
        </div>

        {error && <div style={s.errBox}>{error}</div>}

        {filteredOrders.length === 0 ? (
          <div style={s.empty}>
            <Package size={40} style={{ color: '#cbd5e1' }} />
            <p style={{ color: '#94a3b8', marginTop: 12 }}>You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div style={s.list}>
            {filteredOrders.map(order => {
              const statusName = getStatusName(order);
              const statusStyle = STATUS_COLORS[statusName] || STATUS_COLORS.Pending;
              const isExpanded = expandedId === order.id;
              const stepIndex = getStepIndex(statusName);
              const canCancel = statusName === 'Pending' || statusName === 'Processing';

              return (
                <div key={order.id} style={s.card}>
                  {/* Header Row */}
                  <div style={s.cardHeader} onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* Product image strip */}
                      {order.details && order.details.length > 0 && (
                        <div style={{ display: 'flex', position: 'relative' }}>
                          {order.details.slice(0, 3).map((item, i) => (
                            <img
                              key={i}
                              src={item.product_image || item.product_detail?.image_url || ''}
                              alt=""
                              style={{
                                width: 44, height: 44, borderRadius: 10, objectFit: 'cover',
                                border: '2px solid #fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                marginLeft: i > 0 ? -14 : 0, position: 'relative', zIndex: 3 - i,
                                background: '#f1f5f9'
                              }}
                              onError={(e) => { e.target.src = ''; e.target.style.background = '#f1f5f9'; }}
                            />
                          ))}
                          {order.details.length > 3 && (
                            <div style={{
                              width: 44, height: 44, borderRadius: 10, background: '#f1f5f9',
                              border: '2px solid #fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#64748b',
                              marginLeft: -14, zIndex: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                            }}>+{order.details.length - 3}</div>
                          )}
                        </div>
                      )}
                      <div>
                        <div style={s.orderNum}>Order #{order.order_number}</div>
                        <div style={s.orderDate}>{formatDate(order.order_date || order.created_at)} · {order.details?.length || 0} item{(order.details?.length || 0) !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    <div style={s.headerRight}>
                      <span style={{ ...s.badge, background: statusStyle.bg, color: statusStyle.color, border: `1px solid ${statusStyle.border}` }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.color, display: 'inline-block', marginRight: 4 }} />
                        {statusName}
                      </span>
                      <span style={s.total}>{formatPrice(order.grand_total ?? ((parseFloat(order.total_amount) || 0) + (parseFloat(order.shipping_cost) || 0)))}</span>
                      {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={s.details}>
                      {/* Order Info Grid */}
                      <div style={s.infoGrid}>
                        {order.user_phone && (
                          <div style={s.infoItem}>
                            <Phone size={14} color="#64748b" />
                            <span style={s.infoLabel}>Phone:</span>
                            <span style={s.infoValue}>{order.user_phone}</span>
                          </div>
                        )}
                        {order.shipping_address && (
                          <div style={s.infoItem}>
                            <MapPin size={14} color="#64748b" />
                            <span style={s.infoLabel}>Address:</span>
                            <span style={s.infoValue}>{order.shipping_address}</span>
                          </div>
                        )}
                        {order.payment_method && order.payment_method !== 'N/A' && (
                          <div style={s.infoItem}>
                            <CreditCard size={14} color="#64748b" />
                            <span style={s.infoLabel}>Payment:</span>
                            <span style={s.infoValue}>{order.payment_method}</span>
                          </div>
                        )}
                      </div>

                      {/* Live Order Tracking Stepper */}
                      {statusName !== 'Cancelled' && (() => {
                        const STEP_ICONS = [Clock, Box, Truck, CheckCircle];
                        const STEP_LABELS = ['Order Placed', 'Processing', 'Shipped', 'Delivered'];
                        const STEP_DESCS = [
                          `Placed on ${formatDate(order.order_date || order.created_at)}`,
                          'Your order is being prepared',
                          order.tracking_number ? `Tracking: ${order.tracking_number}` : 'On its way to you',
                          order.estimated_delivery_date ? `Est. ${formatDate(order.estimated_delivery_date)}` : 'Package delivered'
                        ];
                        return (
                          <div style={{ padding: '28px 24px 16px', background: stepIndex >= 3 ? 'linear-gradient(135deg, #f0fdf4 0%, #fff 100%)' : 'linear-gradient(135deg, #fff7ed 0%, #fff 100%)', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
                              {/* Progress line behind steps */}
                              <div style={{ position: 'absolute', top: 22, left: 'calc(12.5% + 6px)', right: 'calc(12.5% + 6px)', height: 3, background: '#e2e8f0', borderRadius: 2, zIndex: 0 }} />
                              <div style={{
                                position: 'absolute', top: 22, left: 'calc(12.5% + 6px)', height: 3, borderRadius: 2, zIndex: 1,
                                background: stepIndex >= 3
                                  ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                                  : 'linear-gradient(90deg, #F97316, #fb923c)',
                                width: stepIndex >= 3 ? 'calc(75% - 12px)' : stepIndex >= 2 ? 'calc(50% - 6px)' : stepIndex >= 1 ? '25%' : '0%',
                                transition: 'width 0.6s ease',
                                boxShadow: stepIndex >= 3 ? '0 0 8px rgba(22,163,74,0.3)' : '0 0 8px rgba(249, 115, 22, 0.3)'
                              }} />

                              {STEP_LABELS.map((label, i) => {
                                const Icon = STEP_ICONS[i];
                                const isCompleted = i < stepIndex;
                                const isCurrent = i === stepIndex;
                                const isUpcoming = i > stepIndex;
                                return (
                                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '25%', position: 'relative', zIndex: 2 }}>
                                    <div style={{
                                      width: isCurrent ? 48 : 40,
                                      height: isCurrent ? 48 : 40,
                                      borderRadius: '50%',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      background: isCompleted
                                        ? (stepIndex >= 3 ? '#16a34a' : '#F97316')
                                        : isCurrent
                                          ? '#fff'
                                          : '#f1f5f9',
                                      border: isCurrent
                                        ? `3px solid ${stepIndex >= 3 ? '#16a34a' : '#F97316'}`
                                        : isCompleted
                                          ? `3px solid ${stepIndex >= 3 ? '#16a34a' : '#F97316'}`
                                          : '2px solid #e2e8f0',
                                      boxShadow: isCurrent
                                        ? `0 0 0 6px ${stepIndex >= 3 ? 'rgba(22,163,74,0.15)' : 'rgba(249,115,22,0.15)'}, 0 4px 12px ${stepIndex >= 3 ? 'rgba(22,163,74,0.2)' : 'rgba(249,115,22,0.2)'}`
                                        : isCompleted ? `0 2px 6px ${stepIndex >= 3 ? 'rgba(22,163,74,0.15)' : 'rgba(249,115,22,0.15)'}` : 'none',
                                      transition: 'all 0.4s ease',
                                      animation: isCurrent ? 'pulse-orange 2s infinite' : 'none',
                                    }}>
                                      <Icon size={isCurrent ? 22 : 18} color={isCompleted ? '#fff' : isCurrent ? (stepIndex >= 3 ? '#16a34a' : '#F97316') : '#cbd5e1'} strokeWidth={isCompleted ? 2.5 : 2} />
                                    </div>
                                    <span style={{
                                      fontSize: 12, fontWeight: isCurrent ? 700 : isCompleted ? 600 : 500,
                                      color: isCurrent ? (stepIndex >= 3 ? '#16a34a' : '#F97316') : isCompleted ? '#1e293b' : '#94a3b8',
                                      marginTop: 8, textAlign: 'center',
                                    }}>{label}</span>
                                    <span style={{
                                      fontSize: 10, color: isCurrent ? (stepIndex >= 3 ? '#15803d' : '#ea580c') : '#94a3b8',
                                      marginTop: 2, textAlign: 'center', maxWidth: 120,
                                      lineHeight: 1.3, fontWeight: isCurrent ? 500 : 400,
                                    }}>{STEP_DESCS[i]}</span>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Estimated delivery info */}
                            {order.estimated_delivery_date && statusName !== 'Delivered' && (
                              <div style={{
                                marginTop: 16, padding: '8px 14px', background: '#eff6ff', borderRadius: 8,
                                border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', gap: 8,
                                fontSize: 12, color: '#1d4ed8', fontWeight: 500,
                              }}>
                                <Truck size={14} />
                                Estimated delivery by <strong>{formatDate(order.estimated_delivery_date)}</strong>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Order Items — grouped by store */}
                      {order.details && order.details.length > 0 && (() => {
                        const itemsByStore = {};
                        order.details.forEach(item => {
                          const store = item.product_detail?.owner_name || item.owner_name || 'Store';
                          if (!itemsByStore[store]) itemsByStore[store] = [];
                          itemsByStore[store].push(item);
                        });
                        const storeEntries = Object.entries(itemsByStore);
                        return (
                          <div style={s.itemsList}>
                            {storeEntries.map(([storeName, storeItems], si) => (
                              <div key={storeName}>
                                <div style={s.storeHeader}>
                                  <ShoppingBag size={13} color="#F97316" />
                                  <span style={{ fontWeight: 700 }}>{storeName}</span>
                                  <span style={s.storeBadge}>{storeItems.length} item{storeItems.length !== 1 ? 's' : ''}</span>
                                </div>
                                {storeItems.map(item => (
                                  <div key={item.id} style={s.itemRow}>
                                    <div style={s.itemImgWrap}>
                                      <img
                                        src={item.product_image || item.product_detail?.image_url || item.image || ''}
                                        alt={item.product_name || ''}
                                        style={s.itemImg}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
                                        }}
                                      />
                                      <span style={{ display: 'none', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                                        <Package size={24} color="#cbd5e1" />
                                      </span>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={s.itemName}>{item.product_name || item.product?.name || `Product #${item.product}`}</div>
                                      <div style={s.itemMeta}>Qty: {item.quantity} &times; {formatPrice(item.unit_price)}</div>
                                    </div>
                                    <div style={s.itemTotal}>{formatPrice(item.quantity * item.unit_price)}</div>
                                  </div>
                                ))}
                                {si < storeEntries.length - 1 && <div style={{ height: 8, background: '#f8fafc', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9' }} />}
                              </div>
                            ))}
                            <div style={s.itemsFooter}>
                              <span style={s.itemsFooterLabel}>Order Total</span>
                              <span style={s.itemsFooterValue}>{formatPrice(order.grand_total ?? ((parseFloat(order.total_amount) || 0) + (parseFloat(order.shipping_cost) || 0)))}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Tracking & Cancel & Print & Review */}
                      <div style={s.detailFooter}>
                        {order.tracking_number && (
                          <div style={s.tracking}>Tracking: <strong>{order.tracking_number}</strong></div>
                        )}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          {statusName === 'Delivered' && (
                            <button style={s.printBtn} onClick={() => setPrintOrder(order)}>
                              <Printer size={14} /> Print Invoice
                            </button>
                          )}
                          {statusName === 'Delivered' && (
                            <button style={s.reviewBtn} onClick={() => navigate('/reviews', { state: { fromOrderId: order.id, order } })}>
                              <Star size={14} /> Write Reviews
                            </button>
                          )}
                          {canCancel && (
                            <button style={s.cancelBtn} onClick={() => handleCancel(order.id)} disabled={cancellingId === order.id}>
                              <XCircle size={14} /> {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse-orange {
          0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
          100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }
      `}</style>
    </section>
    {printOrder && <PrintInvoiceModal order={printOrder} onClose={() => setPrintOrder(null)} />}
    </>
  )
}

const s = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg,#fff7ed 0%,#fff 35%)', padding: '40px 24px 64px', overflowX: 'hidden' },
  container: { maxWidth: 900, margin: '0 auto', width: '100%' },
  title:     { fontSize: '2rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  filterBar: { display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' },
  filterBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 600, color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' },
  filterBtnActive: { background: '#FFF7ED', borderColor: '#F97316', color: '#F97316' },
  filterCount: { background: '#f1f5f9', color: '#94a3b8', fontSize: 11, padding: '1px 7px', borderRadius: 10, minWidth: 20, textAlign: 'center' },
  filterCountActive: { background: '#FFEDD5', color: '#F97316' },
  errBox:    { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 },
  center:    { minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner:   { width: 36, height: 36, border: '4px solid #e2e8f0', borderTop: '4px solid #F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  empty:     { textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  list:      { display: 'flex', flexDirection: 'column', gap: 20 },
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', transition: 'box-shadow 0.2s' },
  cardHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', cursor: 'pointer', transition: 'background 0.15s', borderBottom: '1px solid transparent' },
  orderNum:  { fontSize: 16, fontWeight: 700, color: '#1e293b' },
  orderDate: { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 14 },
  badge:     { padding: '5px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' },
  total:     { fontSize: 16, fontWeight: 700, color: '#16a34a' },
  details:   { borderTop: '1px solid #f1f5f9', padding: '0' },
  // Status tracker
  tracker:     { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '32px 24px 12px', flexWrap: 'wrap' },
  trackerStep: { display: 'flex', alignItems: 'center', gap: 6 },
  trackerDot:  { width: 12, height: 12, borderRadius: '50%', flexShrink: 0, transition: 'all 0.3s ease' },
  trackerLabel:{ fontSize: 12 },
  trackerLine: { width: 40, height: 3, flexShrink: 0, borderRadius: 2, transition: 'background 0.3s ease' },
  // Info grid
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, margin: '24px', padding: '20px', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' },
  infoItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  infoLabel: { fontWeight: 600, color: '#64748b' },
  infoValue: { color: '#1e293b', flex: 1 },
  // Items
  itemsList: { borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' },
  itemsHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '14px 24px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', fontSize: 13, fontWeight: 700, color: '#1e293b' },
  storeHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', background: '#fff7ed', borderBottom: '1px solid #fed7aa', fontSize: 12, color: '#92400e' },
  storeBadge:  { marginLeft: 'auto', background: '#fed7aa', color: '#c2410c', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700 },
  itemRow:   { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 24px', borderBottom: '1px solid #f1f5f9', background: '#fff' },
  itemImgWrap: { width: 64, height: 64, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  itemImg:   { width: '100%', height: '100%', objectFit: 'cover' },
  itemName:  { fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 4 },
  itemMeta:  { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: 700, color: '#1e293b' },
  itemsFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', background: '#f8fafc' },
  itemsFooterLabel: { fontSize: 14, fontWeight: 700, color: '#64748b' },
  itemsFooterValue: { fontSize: 18, fontWeight: 800, color: '#16a34a' },
  // Footer
  detailFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '20px 24px' },
  tracking:     { fontSize: 13, color: '#64748b' },
  cancelBtn:    { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  printBtn:     { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  reviewBtn:    { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#FFF7ED', color: '#F97316', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
