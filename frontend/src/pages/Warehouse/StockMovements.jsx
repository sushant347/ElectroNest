import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw, AlertCircle, Truck, Search, X, Package, User, CheckCircle2, Printer, BarChart2, ShoppingBag, Store, Filter, PieChart, CalendarDays } from 'lucide-react';
import { warehouseAPI } from '../../services/api';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
const relTime = (d) => {
  if (!d) return '';
  const ms = Date.now() - new Date(d).getTime();
  if (ms < 60000) return 'Just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
};

const TABS = [
  { key: 'purchase_orders', label: 'Purchase Orders', desc: 'Orders from customer purchases' },
  { key: 'shipped_orders',  label: 'Customer Orders',  desc: 'Stock deducted via customer orders' },
  { key: 'product_updates', label: 'Product Updates',  desc: 'Recently added/updated products' },
];

const ORDER_STATUS_COLORS = {
  'Pending':    { color: '#D97706', bg: '#FEF3C7' },
  'Processing': { color: '#2563EB', bg: '#DBEAFE' },
  'Shipped':    { color: '#7C3AED', bg: '#EDE9FE' },
  'Delivered':  { color: '#16A34A', bg: '#DCFCE7' },
};

const PIE_COLORS = ['#F97316', '#7C3AED', '#16A34A', '#2563EB', '#DB2777', '#0891B2', '#D97706', '#6366F1', '#059669', '#DC2626'];

/* ── SVG Donut Chart for Warehouse Commission (with hover tooltip) ── */
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}
function arcPath(cx, cy, outerR, innerR, startDeg, endDeg) {
  const safeEnd = endDeg - startDeg >= 359.99 ? startDeg + 359.99 : endDeg;
  const o1 = polarToCartesian(cx, cy, outerR, startDeg);
  const o2 = polarToCartesian(cx, cy, outerR, safeEnd);
  const i1 = polarToCartesian(cx, cy, innerR, safeEnd);
  const i2 = polarToCartesian(cx, cy, innerR, startDeg);
  const large = safeEnd - startDeg > 180 ? 1 : 0;
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i1.x} ${i1.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`,
    'Z',
  ].join(' ');
}

function CommissionPieChart({ data }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.commission, 0);
  if (total === 0) return null;

  const CX = 135, CY = 135, OR = 125, IR = 70;

  let cumDeg = 0;
  const segments = data.map((d, i) => {
    const startDeg = cumDeg;
    const sweep = (d.commission / total) * 360;
    cumDeg += sweep;
    return {
      ...d,
      startDeg,
      endDeg: cumDeg,
      pct: (d.commission / total) * 100,
      color: PIE_COLORS[i % PIE_COLORS.length],
      path: arcPath(CX, CY, OR, IR, startDeg, cumDeg),
      midDeg: startDeg + sweep / 2,
    };
  });

  const active = hovered !== null ? segments[hovered] : null;

  const handleMouseMove = (e, i) => {
    setHovered(i);
    setTooltip({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="comm-chart-wrap">
      <div className="comm-chart-header">
        <PieChart size={18} color="#F97316" />
        <span>Warehouse Commission by Store</span>
        <span className="comm-chart-sub">10% product price + shipping · Free shipping → 12% product price</span>
      </div>
      <div className="comm-chart-body">
        <div className="comm-svg-container" onMouseLeave={() => setHovered(null)}>
          <svg width={270} height={270} viewBox="0 0 270 270" style={{ display: 'block', overflow: 'visible' }}>
            {/* Drop shadow filter */}
            <defs>
              <filter id="seg-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000030" />
              </filter>
            </defs>

            {/* Segments */}
            {segments.map((s, i) => {
              const isActive = hovered === i;
              const midRad = ((s.midDeg - 90) * Math.PI) / 180;
              const offset = isActive ? 8 : 0;
              const tx = offset * Math.cos(midRad);
              const ty = offset * Math.sin(midRad);
              return (
                <path
                  key={i}
                  d={s.path}
                  fill={s.color}
                  transform={`translate(${tx}, ${ty})`}
                  filter={isActive ? 'url(#seg-shadow)' : undefined}
                  stroke="#fff"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={{ cursor: 'pointer', transition: 'transform 0.18s ease, filter 0.18s ease' }}
                  onMouseMove={e => handleMouseMove(e, i)}
                  onMouseEnter={e => handleMouseMove(e, i)}
                />
              );
            })}

            {/* Center hole text */}
            <circle cx={CX} cy={CY} r={IR - 2} fill="#fff" />
            {active ? (
              <>
                <text x={CX} y={CY - 14} textAnchor="middle" style={{ fontSize: 10, fill: active.color, fontWeight: 700, fontFamily: 'inherit' }}>
                  {active.store.length > 14 ? active.store.slice(0, 13) + '…' : active.store}
                </text>
                <text x={CX} y={CY + 2} textAnchor="middle" style={{ fontSize: 9, fill: '#6B7280', fontFamily: 'inherit' }}>
                  Commission
                </text>
                <text x={CX} y={CY + 17} textAnchor="middle" style={{ fontSize: 11, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                  {fmtNPR(active.commission)}
                </text>
                <text x={CX} y={CY + 31} textAnchor="middle" style={{ fontSize: 10, fill: active.color, fontWeight: 600, fontFamily: 'inherit' }}>
                  {active.pct.toFixed(1)}%
                </text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'inherit', fontWeight: 600 }}>
                  Total
                </text>
                <text x={CX} y={CY + 10} textAnchor="middle" style={{ fontSize: 11, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                  {fmtNPR(total)}
                </text>
              </>
            )}
          </svg>

          {/* Floating Tooltip — fixed so overflow:hidden parents don't clip it */}
          {active && (
            <div
              className="comm-tooltip"
              style={{
                position: 'fixed',
                left: tooltip.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400)
                  ? 'auto' : tooltip.x + 16,
                right: tooltip.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400)
                  ? (typeof window !== 'undefined' ? window.innerWidth - tooltip.x + 16 : 'auto') : 'auto',
                top: Math.min(tooltip.y - 10, typeof window !== 'undefined' ? window.innerHeight - 210 : tooltip.y),
                zIndex: 9999,
              }}
            >
              <div className="comm-tt-store" style={{ borderLeft: `3px solid ${active.color}` }}>
                {active.store}
              </div>
              <div className="comm-tt-row">
                <span>Total Commission</span>
                <strong style={{ color: active.color }}>{fmtNPR(active.commission)}</strong>
              </div>
              <div className="comm-tt-row">
                <span>Share of Total</span>
                <strong>{active.pct.toFixed(1)}%</strong>
              </div>
              <div className="comm-tt-divider" />
              {(active.commission - (active.free_shipping_commission || 0)) > 0 && (
                <div className="comm-tt-row">
                  <span className="comm-tt-tag-normal">10% + Shipping</span>
                  <strong>{fmtNPR(active.commission - (active.free_shipping_commission || 0))}</strong>
                </div>
              )}
              {(active.free_shipping_commission || 0) > 0 && (
                <div className="comm-tt-row">
                  <span className="comm-tt-tag-free">12% Free Ship</span>
                  <strong>{fmtNPR(active.free_shipping_commission)}</strong>
                </div>
              )}
              {active.orders > 0 && (
                <div className="comm-tt-row comm-tt-orders">
                  <span>Orders</span>
                  <strong>{active.orders}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="comm-legend">
          {segments.map((s, i) => (
            <div
              key={i}
              className={`comm-legend-item ${hovered === i ? 'active' : ''}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <div className="comm-legend-color" style={{ background: s.color, transform: hovered === i ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.15s' }} />
              <div className="comm-legend-info">
                <div className="comm-legend-store" style={{ color: hovered === i ? s.color : undefined }}>{s.store}</div>
                <div className="comm-legend-detail">
                  <span className="comm-legend-val">{fmtNPR(s.commission)}</span>
                  <span className="comm-legend-pct">({s.pct.toFixed(1)}%)</span>
                </div>
                <div className="comm-legend-breakdown">
                  {(s.free_shipping_commission || 0) > 0 && (
                    <span className="comm-tag comm-tag-free">12% free ship: {fmtNPR(s.free_shipping_commission)}</span>
                  )}
                  {(s.commission - (s.free_shipping_commission || 0)) > 0 && (
                    <span className="comm-tag comm-tag-normal">10% + shipping: {fmtNPR(s.commission - (s.free_shipping_commission || 0))}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="comm-chart-footer">
        Total commission collected: <strong>{fmtNPR(total)}</strong> across <strong>{data.length}</strong> store{data.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

/* ── Store Shipping Revenue Chart (CSS bars) ── */
function StoreShippingChart({ summary }) {
  const entries = Object.entries(summary || {}).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return null;
  const max = Math.max(...entries.map(([, v]) => v), 1);
  const COLORS = ['#F97316', '#7C3AED', '#16A34A', '#2563EB', '#DB2777', '#0891B2', '#D97706'];
  return (
    <div className="ssc-wrap">
      <div className="ssc-header">
        <BarChart2 size={18} color="#F97316" />
        <span>Shipping Revenue by Store</span>
        <span className="ssc-sub">Total shipping collected per store from recent customer orders</span>
      </div>
      <div className="ssc-chart">
        {entries.map(([store, total], i) => {
          const pct = Math.max(4, (total / max) * 100);
          return (
            <div key={store} className="ssc-row">
              <div className="ssc-label" title={store}>{store}</div>
              <div className="ssc-bar-track">
                <div className="ssc-bar" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                <span className="ssc-bar-val">{fmtNPR(total)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="ssc-footer">
        Total shipping received:&nbsp;<strong>{fmtNPR(entries.reduce((s, [, v]) => s + v, 0))}</strong>
        &nbsp;across&nbsp;<strong>{entries.length}</strong> store{entries.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

export default function StockMovements() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [movements, setMovements] = useState({ shipped_orders: [], enriched_purchase_orders: [], product_updates: [], store_shipping_summary: {}, store_commission: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('purchase_orders');
  const [poStoreFilter, setPoStoreFilter] = useState('all');
  const [poStatusFilter, setPoStatusFilter] = useState('all');
  const [coStatusFilter, setCoStatusFilter] = useState('all');
  const [coStoreFilter, setCoStoreFilter] = useState('all');
  const [coPage, setCoPage] = useState(1);
  const [viewOrder, setViewOrder] = useState(null);
  const [deliveringId, setDeliveringId] = useState(null);
  /** Customer orders only: passed to API as `days` (30 / 90 / 0 = lifetime). Changing this refetches movements from the DB. */
  const [coOrderDays, setCoOrderDays] = useState(90);
  const [coMovementsLoading, setCoMovementsLoading] = useState(false);
  const coOrderDaysRef = useRef(90);
  const coPeriodFilterBoot = useRef(false);

  const CO_PER_PAGE = 20;
  /** Store dropdown shows at most this many names (top by activity); "All Stores" still lists every store in the table. */
  const STORE_FILTER_LIMIT = 10;

  useEffect(() => {
    coOrderDaysRef.current = coOrderDays;
  }, [coOrderDays]);

  const fetchMovementsOnly = useCallback(async () => {
    const days = coOrderDaysRef.current;
    setCoMovementsLoading(true);
    setError('');
    setMovements((prev) => ({
      ...prev,
      shipped_orders: [],
      store_shipping_summary: {},
      store_commission: {},
    }));
    try {
      const movRes = await warehouseAPI.getStockMovements({ days });
      setMovements(movRes.data || {});
    } catch (err) {
      console.error('getStockMovements failed:', err?.response?.data || err?.message);
      setError('Failed to load customer orders for the selected period.');
    } finally {
      setCoMovementsLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const days = coOrderDaysRef.current;
      const [poRes, movRes] = await Promise.all([
        warehouseAPI.getPurchaseOrders(),
        warehouseAPI.getStockMovements({ days }).catch((err) => {
          console.error('getStockMovements failed:', err?.response?.data || err?.message);
          return { data: {} };
        }),
      ]);
      setPurchaseOrders(poRes.data?.results || poRes.data || []);
      setMovements(movRes.data || {});
    } catch (err) {
      console.error('Failed to fetch stock movements:', err);
      setError('Failed to load stock movements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!coPeriodFilterBoot.current) {
      coPeriodFilterBoot.current = true;
      return;
    }
    setCoPage(1);
    fetchMovementsOnly();
  }, [coOrderDays, fetchMovementsOnly]);

  const coPeriodEmptyLabel = useMemo(() => {
    if (coOrderDays === 0) return 'No customer orders in the full history';
    return `No customer orders in the last ${coOrderDays} days`;
  }, [coOrderDays]);

  const handleReceive = async (id) => {
    if (!confirm('Mark this purchase order as received?')) return;
    try {
      await warehouseAPI.receivePurchaseOrder(id);
      fetchData();
    } catch (err) {
      alert('Failed to receive PO: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleMarkDelivered = async (orderId) => {
    setDeliveringId(orderId);
    try {
      await warehouseAPI.markOrderDelivered(orderId);
      setViewOrder(null);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to mark as delivered');
    } finally {
      setDeliveringId(null);
    }
  };

  const handleViewOrder = async (order) => {
    setViewOrder(order);
    try {
      const res = await warehouseAPI.getOrderDetails(order.id);
      const fullData = res.data || {};
      const merged = { ...order, ...fullData };
      if (merged.details?.length) {
        const storeMap = {};
        (order.items || []).forEach(i => { storeMap[i.product_id] = i.store_name; });
        merged.details = merged.details.map(d => ({
          ...d,
          store_name: d.store_name
            || storeMap[d.product] || storeMap[d.product_id]
            || (d.product_detail?.owner_name || '').trim()
            || '—',
        }));
      } else if (order.items?.length) {
        merged.details = order.items.map(i => ({
          product_name: i.product_name,
          quantity: i.quantity,
          unit_price: i.unit_price || null,
          total_price: i.total_price || null,
          product: i.product_id,
          store_name: i.store_name,
        }));
      }
      setViewOrder(merged);
    } catch {
      // Keep the originally set order
    }
  };

  /* ── Enriched Purchase Orders from stock-movements endpoint ── */
  const enrichedPOs = useMemo(() => movements.enriched_purchase_orders || [], [movements]);

  const poUniqueStoreCount = useMemo(() => {
    const names = new Set();
    enrichedPOs.forEach(po => {
      (po.items || []).forEach(i => { if (i.product_owner) names.add(i.product_owner); });
    });
    return names.size;
  }, [enrichedPOs]);

  const poStoreNames = useMemo(() => {
    const counts = new Map();
    enrichedPOs.forEach(po => {
      const ownersInPo = new Set((po.items || []).map(i => i.product_owner).filter(Boolean));
      ownersInPo.forEach((owner) => {
        counts.set(owner, (counts.get(owner) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, STORE_FILTER_LIMIT)
      .map(([name]) => name);
  }, [enrichedPOs]);

  const filteredEnrichedPOs = useMemo(() => {
    let list = enrichedPOs;
    if (poStatusFilter !== 'all') list = list.filter(po => po.status_name === poStatusFilter);
    if (poStoreFilter !== 'all') {
      list = list.filter(po => (po.items || []).some(i => i.product_owner === poStoreFilter));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(po =>
        (po.customer_name || '').toLowerCase().includes(q) ||
        (po.customer_order_number || '').toLowerCase().includes(q) ||
        (po.store_name || '').toLowerCase().includes(q) ||
        (po.items || []).some(i => (i.product_name || '').toLowerCase().includes(q))
      );
    }
    return list;
  }, [enrichedPOs, poStatusFilter, poStoreFilter, search]);

  const commissionData = useMemo(() => {
    const sc = movements.store_commission || {};
    return Object.entries(sc)
      .map(([store, data]) => ({ store, ...data }))
      .sort((a, b) => b.commission - a.commission);
  }, [movements.store_commission]);

  const coUniqueStoreCount = useMemo(() => {
    return new Set((movements.shipped_orders || []).map(o => o.store_name).filter(Boolean)).size;
  }, [movements.shipped_orders]);

  const coStoreNames = useMemo(() => {
    const counts = new Map();
    (movements.shipped_orders || []).forEach((o) => {
      const s = o.store_name;
      if (!s) return;
      counts.set(s, (counts.get(s) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, STORE_FILTER_LIMIT)
      .map(([name]) => name);
  }, [movements.shipped_orders]);

  const filteredShipped = useMemo(() => {
    // Newest orders first (prefer placed date, then last update)
    const list = [...(movements.shipped_orders || [])].sort((a, b) => {
      const tA = new Date(a.order_date || a.date || 0).getTime();
      const tB = new Date(b.order_date || b.date || 0).getTime();
      return tB - tA;
    });
    const q = search.trim().toLowerCase();
    return list.filter(o => {
      if (coStatusFilter !== 'all' && o.status !== coStatusFilter) return false;
      if (coStoreFilter !== 'all' && (o.store_name || '') !== coStoreFilter) return false;
      if (q && !(o.order_number || '').toLowerCase().includes(q) && !(o.customer_name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [movements.shipped_orders, search, coStatusFilter, coStoreFilter]);

  const coTotalPages = Math.ceil(filteredShipped.length / CO_PER_PAGE);
  const pagedShipped = filteredShipped.slice((coPage - 1) * CO_PER_PAGE, coPage * CO_PER_PAGE);

  useEffect(() => {
    const max = Math.max(1, Math.ceil(filteredShipped.length / CO_PER_PAGE));
    if (coPage > max) setCoPage(max);
  }, [filteredShipped.length, coPage]);

  useEffect(() => {
    if (poStoreFilter !== 'all' && !poStoreNames.includes(poStoreFilter)) setPoStoreFilter('all');
  }, [poStoreNames, poStoreFilter]);

  useEffect(() => {
    if (coStoreFilter !== 'all' && !coStoreNames.includes(coStoreFilter)) setCoStoreFilter('all');
  }, [coStoreNames, coStoreFilter]);

  const filteredProducts = useMemo(() => {
    const list = movements.product_updates || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(p => (p.name || '').toLowerCase().includes(q) || (p.owner_name || '').toLowerCase().includes(q));
  }, [movements.product_updates, search]);

  const poStatusCounts = useMemo(() => ({
    all: enrichedPOs.length,
    Pending: enrichedPOs.filter(p => p.status_name === 'Pending').length,
    Delivered: enrichedPOs.filter(p => p.status_name === 'Delivered').length,
  }), [enrichedPOs]);

  return (
    <div className="sm-page">
      <div className="sm-header">
        <div>
          <h1 className="sm-title"><Truck size={24} /> Stock Movements</h1>
          <p className="sm-subtitle">Track all stock movements: incoming, outgoing, and product updates</p>
        </div>
        <button className="sm-refresh" onClick={fetchData}><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Main Tabs */}
      <div className="sm-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`sm-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => { setActiveTab(t.key); setSearch(''); setPoStoreFilter('all'); setPoStatusFilter('all'); setCoStatusFilter('all'); setCoStoreFilter('all'); setCoPage(1); }}
            title={t.desc}
          >
            {t.key === 'purchase_orders' && <ArrowDownLeft size={15} />}
            {t.key === 'shipped_orders' && <ArrowUpRight size={15} />}
            {t.key === 'product_updates' && <Package size={15} />}
            {t.label}
            <span className="sm-tab-count">
              {t.key === 'purchase_orders' ? enrichedPOs.length
                : t.key === 'shipped_orders' ? (movements.shipped_orders || []).length
                : (movements.product_updates || []).length}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="sm-toolbar">
        <div className="sm-search-wrap">
          <Search size={15} className="sm-search-icon" />
          <input className="sm-search-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="sm-search-clear" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        {activeTab === 'purchase_orders' && (
          <>
            <div className="sm-filter-tabs">
              {[{ key: 'all', label: 'All' }, { key: 'Pending', label: 'Pending' }, { key: 'Delivered', label: 'Received' }].map(f => (
                <button key={f.key} className={`sm-filter-tab ${poStatusFilter === f.key ? 'active' : ''}`} onClick={() => setPoStatusFilter(f.key)}>
                  {f.label} <span className="sm-filter-count">{poStatusCounts[f.key] ?? 0}</span>
                </button>
              ))}
            </div>
            {poUniqueStoreCount > 1 && (
              <div className="sm-store-filter">
                <Filter size={13} />
                <select
                  value={poStoreFilter}
                  onChange={e => setPoStoreFilter(e.target.value)}
                  className="sm-store-select"
                  title={`Up to ${STORE_FILTER_LIMIT} stores with the most purchase orders here. All Stores shows every store.`}
                >
                  <option value="all">All Stores</option>
                  {poStoreNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </>
        )}
        {activeTab === 'shipped_orders' && (
          <>
            <div className="sm-period-filter" title="Customer orders are loaded from the server for the range you pick">
              <CalendarDays size={14} className="sm-period-icon" />
              <span className="sm-period-label">Period</span>
              <select
                className="sm-period-select"
                value={coOrderDays}
                disabled={coMovementsLoading}
                onChange={(e) => setCoOrderDays(Number(e.target.value))}
              >
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={0}>Lifetime (all orders)</option>
              </select>
              {coMovementsLoading && <RefreshCw size={14} className="sm-period-loading spin" aria-hidden />}
            </div>
            <div className="sm-filter-tabs">
              {[
                { key: 'all', label: 'All' },
                { key: 'Pending', label: 'Pending' },
                { key: 'Processing', label: 'Processing' },
                { key: 'Shipped', label: 'Shipped' },
                { key: 'Delivered', label: 'Delivered' },
              ].map(f => (
                <button key={f.key} className={`sm-filter-tab ${coStatusFilter === f.key ? 'active' : ''}`} onClick={() => { setCoStatusFilter(f.key); setCoPage(1); }}>
                  {f.label} <span className="sm-filter-count">{f.key === 'all' ? (movements.shipped_orders || []).length : (movements.shipped_orders || []).filter(o => o.status === f.key).length}</span>
                </button>
              ))}
            </div>
            {coUniqueStoreCount > 1 && (
              <div className="sm-store-filter">
                <Filter size={13} />
                <select
                  value={coStoreFilter}
                  onChange={e => { setCoStoreFilter(e.target.value); setCoPage(1); }}
                  className="sm-store-select"
                  title={`Up to ${STORE_FILTER_LIMIT} stores with the most customer orders here. All Stores shows every store.`}
                >
                  <option value="all">All Stores</option>
                  {coStoreNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      {error && <div className="sm-error"><AlertCircle size={16} /> {error} <button onClick={fetchData} className="sm-retry">Retry</button></div>}

      {loading ? (
        activeTab === 'shipped_orders' ? (
          <div className="sm-table-wrap sm-shimmer-table-wrap">
            <table className="sm-table">
              <thead>
                <tr><th>#</th><th>Order</th><th>Customer</th><th>Status</th><th>Items</th><th>Amount</th><th>Store</th><th>Date</th><th>Action</th></tr>
              </thead>
              <tbody>
                {[...Array(10)].map((_, i) => (
                  <tr key={i} className="sm-shimmer-tr">
                    <td><div className="sm-shimmer-block" style={{ width: 22, height: 13 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 100, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 120, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 72, height: 22, borderRadius: 20 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 36, height: 13 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 72, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 88, height: 22, borderRadius: 20 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 56, height: 13 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 34, height: 34, borderRadius: 8 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sm-table-footer"><div className="sm-shimmer-block" style={{ width: 200, height: 12, display: 'inline-block' }} /></div>
          </div>
        ) : activeTab === 'product_updates' ? (
          <div className="sm-table-wrap sm-shimmer-table-wrap">
            <table className="sm-table">
              <thead>
                <tr><th>#</th><th>Product</th><th>Store Owner</th><th>Category</th><th>Current Stock</th><th>Reorder Level</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i} className="sm-shimmer-tr">
                    <td><div className="sm-shimmer-block" style={{ width: 20, height: 13 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: '55%', height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 90, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 70, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 36, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 28, height: 14 }} /></td>
                    <td><div className="sm-shimmer-block" style={{ width: 52, height: 13 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sm-shimmer-wrap">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="sm-shimmer-card">
                <div className="sm-shimmer-row">
                  <div className="sm-shimmer-block" style={{ width: '80px', height: '16px' }} />
                  <div className="sm-shimmer-block" style={{ width: '60px', height: '20px', borderRadius: '20px' }} />
                </div>
                <div className="sm-shimmer-row" style={{ marginTop: '10px' }}>
                  <div className="sm-shimmer-block" style={{ width: '120px', height: '14px' }} />
                  <div className="sm-shimmer-block" style={{ width: '90px', height: '14px' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {[...Array(2)].map((_, j) => (
                    <div key={j} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '8px' }}>
                      <div className="sm-shimmer-block" style={{ width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div className="sm-shimmer-block" style={{ width: '70%', height: '13px' }} />
                        <div className="sm-shimmer-block" style={{ width: '45%', height: '11px' }} />
                      </div>
                      <div className="sm-shimmer-block" style={{ width: '50px', height: '13px' }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <div className="sm-shimmer-block" style={{ width: '60px', height: '14px' }} />
                  <div className="sm-shimmer-block" style={{ width: '80px', height: '16px' }} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {/* ══════════════════════════════════════════════════════════════
              PURCHASE ORDERS TAB — Card Layout with Product Images
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'purchase_orders' && (
            filteredEnrichedPOs.length === 0 ? (
              <div className="sm-loading"><ShoppingBag size={40} color="#9CA3AF" /><p>No purchase orders found</p></div>
            ) : (
              <div className="po-cards-grid">
                {filteredEnrichedPOs.map(po => {
                  const displayStatus = po.customer_order_status || po.status_name || 'Pending';
                  const sc = ORDER_STATUS_COLORS[displayStatus] || { color: '#6B7280', bg: '#F3F4F6' };
                  return (
                    <div key={po.id} className="po-card">
                      {/* Header */}
                      <div className="po-card-header">
                        <div className="po-card-id-group">
                          <span className="po-card-id">PO #{po.id}</span>
                          {po.customer_order_number && (
                            <span className="po-card-order-id"><ShoppingBag size={11} /> {po.customer_order_number}</span>
                          )}
                        </div>
                        <span className="sm-status" style={{ color: sc.color, background: sc.bg }}>{displayStatus}</span>
                      </div>

                      {/* Info Block */}
                      <div className="po-card-info">
                        <div className="po-card-info-row">
                          <User size={14} color="#6B7280" />
                          <span className="po-card-label">Customer</span>
                          <span className="po-card-value">{po.customer_name || 'N/A'}</span>
                        </div>
                        <div className="po-card-info-row">
                          <Store size={14} color="#7C3AED" />
                          <span className="po-card-label">Store</span>
                          <span className="po-store-badge">{po.store_name || 'Unknown'}</span>
                        </div>
                      </div>

                      {/* Product Items */}
                      <div className="po-card-items">
                        {(po.items || []).map((item, idx) => (
                          <div key={idx} className="po-item-row">
                            <div className="po-item-img-wrap">
                              {item.product_image ? (
                                <img
                                  src={item.product_image}
                                  alt={item.product_name}
                                  className="po-item-img"
                                  onError={e => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }}
                                />
                              ) : null}
                              <span className="po-item-img-ph" style={{ display: item.product_image ? 'none' : 'flex' }}>
                                <Package size={18} color="#cbd5e1" />
                              </span>
                            </div>
                            <div className="po-item-details">
                              <div className="po-item-name">{item.product_name}</div>
                              <div className="po-item-meta">
                                <span className="po-item-owner">{item.product_owner || 'Unknown'}</span>
                                <span>Qty: {item.quantity}</span>
                              </div>
                            </div>
                            <div className="po-item-price">{fmtNPR(item.product_price * item.quantity)}</div>
                          </div>
                        ))}
                      </div>

                      {/* Footer */}
                      <div className="po-card-footer">
                        <div className="po-card-footer-row">
                          <span>Amount</span>
                          <span className="po-card-amount">{fmtNPR(po.order_total || po.total_amount)}</span>
                        </div>
                        <div className="po-card-footer-row">
                          <span>Shipping</span>
                          <span style={{ color: po.shipping_cost === 0 ? '#16a34a' : '#374151', fontWeight: 600, fontSize: '0.82rem' }}>
                            {po.shipping_cost === 0 ? 'Free' : fmtNPR(po.shipping_cost)}
                          </span>
                        </div>
                        <div className="po-card-footer-total">
                          <span>Grand Total</span>
                          <span>{fmtNPR((po.order_total || po.total_amount || 0) + (po.shipping_cost || 0))}</span>
                        </div>
                        <div className="po-card-date">{po.order_date ? fmtDate(po.order_date) : '-'} · {po.items_count} item{po.items_count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Commission Chart — on Purchase Orders tab */}
          {activeTab === 'purchase_orders' && !loading && commissionData.length > 0 && (
            <CommissionPieChart data={commissionData} />
          )}

          {/* ══════════════════════════════════════════════════════════════
              CUSTOMER ORDERS TAB
              ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'shipped_orders' && (
            coMovementsLoading && (movements.shipped_orders || []).length === 0 ? (
              <div className="sm-loading"><RefreshCw size={36} color="#F97316" className="spin" /><p>Loading orders for selected period…</p></div>
            ) : filteredShipped.length === 0 ? (
              <div className="sm-loading"><ArrowUpRight size={40} color="#9CA3AF" /><p>{coPeriodEmptyLabel}</p></div>
            ) : (
              <div className={`sm-table-wrap${coMovementsLoading ? ' sm-co-period-loading' : ''}`}>
                <table className="sm-table">
                  <thead><tr><th>#</th><th>Order</th><th>Customer</th><th>Status</th><th>Items</th><th>Amount</th><th>Store</th><th>Date</th></tr></thead>
                  <tbody>
                    {pagedShipped.map((o, idx) => {
                      const osc = ORDER_STATUS_COLORS[o.status] || { color: '#6B7280', bg: '#F3F4F6' };
                      const globalIdx = (coPage - 1) * CO_PER_PAGE + idx + 1;
                      return (
                        <tr key={o.id} className="sm-order-row" onClick={() => handleViewOrder(o)}>
                          <td style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>{globalIdx}</td>
                          <td><strong>{o.order_number}</strong></td>
                          <td><span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><User size={13} color="#9CA3AF" /> {o.customer_name}</span></td>
                          <td><span className="sm-status" style={{ color: osc.color, background: osc.bg }}>{o.status}</span></td>
                          <td>
                            <span title={o.items?.map(i => `${i.product_name} x${i.quantity}`).join(', ')}>
                              {o.items_count} item{o.items_count !== 1 ? 's' : ''}
                            </span>
                          </td>
                          <td>{fmtNPR(o.grand_total || ((o.total_amount || 0) + (o.shipping_cost || 0)))}</td>
                          <td>
                            {o.store_name
                              ? <span className="sm-store-badge" title={o.store_name}>{o.store_name}</span>
                              : <span style={{ color: '#9CA3AF' }}>—</span>}
                          </td>
                          <td><span title={fmtDate(o.date)}>{relTime(o.date)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="sm-table-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span>Showing {(coPage - 1) * CO_PER_PAGE + 1}–{Math.min(coPage * CO_PER_PAGE, filteredShipped.length)} of {filteredShipped.length} orders</span>
                  {coTotalPages > 1 && (
                    <div className="sm-co-pag">
                      <button className="sm-pag-btn" disabled={coPage === 1} onClick={() => setCoPage(p => p - 1)}>‹</button>
                      {(() => {
                        const pages = [];
                        if (coTotalPages <= 7) {
                          for (let i = 1; i <= coTotalPages; i++) pages.push(i);
                        } else if (coPage <= 3) {
                          for (let i = 1; i <= 5; i++) pages.push(i);
                          pages.push('...');
                          pages.push(coTotalPages);
                        } else if (coPage >= coTotalPages - 2) {
                          pages.push(1); pages.push('...');
                          for (let i = coTotalPages - 4; i <= coTotalPages; i++) pages.push(i);
                        } else {
                          pages.push(1); pages.push('...');
                          for (let i = coPage - 1; i <= coPage + 1; i++) pages.push(i);
                          pages.push('...'); pages.push(coTotalPages);
                        }
                        return pages.map((p, i) =>
                          p === '...' ? <span key={`e${i}`} className="sm-pag-ellipsis">…</span> :
                          <button key={p} className={`sm-pag-btn ${coPage === p ? 'active' : ''}`} onClick={() => setCoPage(p)}>{p}</button>
                        );
                      })()}
                      <button className="sm-pag-btn" disabled={coPage === coTotalPages} onClick={() => setCoPage(p => p + 1)}>›</button>
                    </div>
                  )}
                </div>
              </div>
            )
          )}


          {/* ══════════ PRODUCT UPDATES TAB ══════════ */}
          {activeTab === 'product_updates' && (
            filteredProducts.length === 0 ? (
              <div className="sm-loading"><Package size={40} color="#9CA3AF" /><p>No recent product updates</p></div>
            ) : (
              <div className="sm-table-wrap">
                <table className="sm-table">
                  <thead><tr><th>#</th><th>Product</th><th>Store Owner</th><th>Category</th><th>Current Stock</th><th>Reorder Level</th><th>Updated</th></tr></thead>
                  <tbody>
                    {filteredProducts.map((p, idx) => {
                      const low = p.stock <= p.reorder_level;
                      return (
                        <tr key={p.id}>
                          <td style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>{idx + 1}</td>
                          <td><strong>{p.name}</strong></td>
                          <td>{p.owner_name || '-'}</td>
                          <td>{p.category || '-'}</td>
                          <td>
                            <span style={{ color: low ? '#DC2626' : '#16A34A', fontWeight: 600 }}>{p.stock}</span>
                            {low && <span style={{ marginLeft: 6, fontSize: '0.68rem', color: '#DC2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>Low</span>}
                          </td>
                          <td>{p.reorder_level}</td>
                          <td><span title={fmtDate(p.date)}>{relTime(p.date)}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="sm-table-footer">{filteredProducts.length} product updates</div>
              </div>
            )
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          ORDER DETAIL MODAL (Customer Orders eye button)
          ══════════════════════════════════════════════════════════════ */}
      {viewOrder && (
        <div className="sm-modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-modal-header">
              <div>
                <h3 className="sm-modal-title">Order #{viewOrder.order_number || viewOrder.id}</h3>
                <span className="sm-modal-date">{fmtDate(viewOrder.date || viewOrder.order_date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="sm-status" style={{ color: (ORDER_STATUS_COLORS[viewOrder.status] || { color: '#6B7280' }).color, background: (ORDER_STATUS_COLORS[viewOrder.status] || { bg: '#F3F4F6' }).bg }}>{viewOrder.status}</span>
                <button className="sm-modal-close" onClick={() => setViewOrder(null)}>&times;</button>
              </div>
            </div>
            <div className="sm-modal-body">
              <div className="sm-modal-info">
                <div><strong>Customer:</strong> {viewOrder.customer_name || viewOrder.user_name || 'N/A'}</div>
                {viewOrder.user_email && <div><strong>Email:</strong> {viewOrder.user_email}</div>}
                {viewOrder.user_phone && <div><strong>Phone:</strong> {viewOrder.user_phone}</div>}
                {viewOrder.shipping_address && viewOrder.shipping_address !== 'N/A' && (
                  <div><strong>Address:</strong> {viewOrder.shipping_address}</div>
                )}
                {viewOrder.store_name && <div><strong>Store:</strong> {viewOrder.store_name}</div>}
                <div><strong>Payment:</strong> {viewOrder.payment_method || 'N/A'} · {viewOrder.payment_status || 'Pending'}</div>
              </div>

              {(() => {
                const lineItems = (viewOrder.details?.length ? viewOrder.details : null) || (viewOrder.items?.length ? viewOrder.items : null) || [];
                return lineItems.length > 0 ? (
                  <table className="sm-modal-table">
                    <thead><tr><th>Product</th><th>Store</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Unit Price</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
                    <tbody>
                      {lineItems.map((d, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{d.product_name || d.product_detail?.name || `#${d.product}`}</td>
                          <td><span style={{ fontSize: '0.72rem', color: '#7C3AED', background: '#EDE9FE', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{d.store_name || '—'}</span></td>
                          <td style={{ textAlign: 'center' }}>{d.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{d.unit_price ? fmtNPR(d.unit_price) : '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>
                            {d.total_price ? fmtNPR(d.total_price) : d.unit_price ? fmtNPR(d.unit_price * d.quantity) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '12px', color: '#9CA3AF', fontSize: '0.84rem', textAlign: 'center', background: '#f9fafb', borderRadius: 8 }}>No item details available</div>
                );
              })()}

              <div className="sm-modal-summary-block">
                <div className="sm-modal-sum-row">
                  <span>Items Subtotal</span>
                  <span>{fmtNPR((viewOrder.details || viewOrder.items || []).reduce((s, d) => s + (d.total_price || (d.unit_price || 0) * (d.quantity || 0)), 0))}</span>
                </div>
                <div className="sm-modal-sum-row">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Truck size={13} color="#6B7280" /> Shipping Cost
                  </span>
                  <span style={{ color: Number(viewOrder.shipping_cost) === 0 ? '#16a34a' : '#374151', fontWeight: 600 }}>
                    {viewOrder.shipping_cost !== undefined ? (Number(viewOrder.shipping_cost) === 0 ? 'Free' : fmtNPR(viewOrder.shipping_cost)) : '-'}
                  </span>
                </div>
                <div className="sm-modal-sum-total">
                  <span>Grand Total</span>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{fmtNPR((viewOrder.total_amount || 0) + (Number(viewOrder.shipping_cost) || 0))}</span>
                </div>
              </div>

              <div className="invoice-stamp" style={{ display: 'none' }}>
                ELECTRONEST WAREHOUSE<br />
                {viewOrder.status === 'Delivered' ? '✓ DELIVERED' : '📦 SHIPPED'}<br />
                <span style={{ fontSize: '0.7rem', fontWeight: 500 }}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="sm-modal-footer">
              <button className="sm-btn-print" onClick={() => window.print()}><Printer size={15} /> Print Invoice</button>
              {viewOrder.status === 'Shipped' && (
                <button className="sm-btn-deliver" onClick={() => handleMarkDelivered(viewOrder.id)} disabled={deliveringId === viewOrder.id}>
                  <CheckCircle2 size={15} />
                  {deliveringId === viewOrder.id ? 'Marking...' : 'Mark as Delivered'}
                </button>
              )}
              <button className="sm-btn-close-modal" onClick={() => setViewOrder(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sm-page { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
        .sm-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .sm-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 10px; }
        .sm-subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }
        .sm-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-weight: 600; cursor: pointer; color: #374151; font-size: 0.82rem; }
        .sm-refresh:hover { border-color: #F97316; color: #F97316; }

        .sm-tabs { display: flex; gap: 4px; margin-bottom: 16px; background: #F3F4F6; border-radius: 10px; padding: 4px; }
        .sm-tab { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; border: none; border-radius: 8px; background: transparent; font-size: 0.84rem; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .sm-tab:hover { color: #374151; }
        .sm-tab.active { background: #fff; color: #F97316; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .sm-tab-count { background: #E5E7EB; color: #6B7280; font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center; }
        .sm-tab.active .sm-tab-count { background: #FFEDD5; color: #F97316; }

        .sm-toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
        .sm-search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 380px; }
        .sm-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #9CA3AF; pointer-events: none; }
        .sm-search-input { width: 100%; padding: 9px 34px; border: 1px solid #e5e7eb; border-radius: 9px; font-size: 0.84rem; color: #374151; outline: none; background: #fff; box-sizing: border-box; font-family: inherit; }
        .sm-search-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
        .sm-search-clear { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9CA3AF; display: flex; align-items: center; padding: 2px; }
        .sm-search-clear:hover { color: #374151; }

        .sm-filter-tabs { display: flex; gap: 6px; }
        .sm-filter-tab { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-size: 0.8rem; font-weight: 600; color: #6B7280; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .sm-filter-tab:hover { border-color: #F97316; color: #F97316; }
        .sm-filter-tab.active { background: #FFF7ED; border-color: #F97316; color: #F97316; }
        .sm-filter-count { background: #f3f4f6; color: #6B7280; font-size: 0.68rem; padding: 1px 6px; border-radius: 10px; min-width: 18px; text-align: center; }
        .sm-filter-tab.active .sm-filter-count { background: #FFEDD5; color: #F97316; }

        .sm-store-filter { display: flex; align-items: center; gap: 6px; color: #6B7280; }
        .sm-store-select { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #374151; background: #fff; cursor: pointer; font-family: inherit; outline: none; }
        .sm-store-select:focus { border-color: #7C3AED; box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }

        .sm-period-filter { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sm-period-icon { color: #F97316; flex-shrink: 0; }
        .sm-period-label { font-size: 0.72rem; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }
        .sm-period-select { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #374151; background: #fff; cursor: pointer; font-family: inherit; outline: none; min-width: 168px; }
        .sm-period-select:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
        .sm-period-select:disabled { opacity: 0.65; cursor: wait; }
        .sm-period-loading { color: #F97316; flex-shrink: 0; }
        .sm-co-period-loading { opacity: 0.55; pointer-events: none; transition: opacity 0.2s ease; }

        .sm-error { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: #DC2626; font-size: 0.85rem; margin-bottom: 16px; }
        .sm-retry { margin-left: auto; padding: 4px 12px; background: #DC2626; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.78rem; }
        .sm-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #6B7280; gap: 12px; }
        .spin { animation: spinB 1s linear infinite; }
        @keyframes spinB { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        /* ── Shimmer Loading ── */
        @keyframes sm-shimmer-anim { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
        .sm-shimmer-block { background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%); background-size: 1200px 100%; animation: sm-shimmer-anim 1.4s infinite linear; border-radius: 6px; }
        .sm-shimmer-wrap { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
        .sm-shimmer-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px 18px; }
        .sm-shimmer-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
        .sm-shimmer-table-wrap { pointer-events: none; }
        .sm-shimmer-tr td { vertical-align: middle; }

        /* ── Pagination ── */
        .sm-co-pag { display: flex; align-items: center; gap: 4px; }
        .sm-pag-btn { display: inline-flex; align-items: center; justify-content: center; min-width: 32px; height: 32px; padding: 0 6px; border-radius: 7px; border: 1px solid #e5e7eb; background: #fff; color: #374151; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .sm-pag-btn:hover:not(:disabled) { border-color: #F97316; color: #F97316; background: #FFF7ED; }
        .sm-pag-btn.active { background: #F97316; color: #fff; border-color: #F97316; }
        .sm-pag-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .sm-pag-ellipsis { color: #9CA3AF; font-size: 0.82rem; padding: 0 3px; }

        /* ── Tables ── */
        .sm-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow-x: auto; }
        .sm-table { width: 100%; border-collapse: collapse; }
        .sm-table th { padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; }
        .sm-table td { padding: 12px 16px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .sm-table tr:last-child td { border-bottom: none; }
        .sm-table tr:hover td { background: #F9FAFB; }
        .sm-order-row { cursor: pointer; }
        .sm-order-row:hover td { background: #FFF7ED; }
        .sm-status { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .sm-table-footer { padding: 10px 16px; font-size: 0.75rem; color: #9CA3AF; border-top: 1px solid #f3f4f6; text-align: right; }
        .sm-store-badge { font-size: 0.72rem; font-weight: 600; color: #7C3AED; background: #EDE9FE; padding: 3px 9px; border-radius: 20px; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: middle; }

        /* ═══ PO Cards ═══ */
        .po-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
        .po-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; transition: box-shadow 0.2s, transform 0.15s; }
        .po-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .po-card-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #F9FAFB; border-bottom: 1px solid #f0f0f0; }
        .po-card-id-group { display: flex; flex-direction: column; gap: 3px; }
        .po-card-id { font-size: 0.88rem; font-weight: 700; color: #1e293b; }
        .po-card-order-id { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; color: #7C3AED; font-weight: 600; }
        .po-card-info { padding: 12px 18px; display: flex; flex-direction: column; gap: 6px; border-bottom: 1px solid #f3f4f6; }
        .po-card-info-row { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
        .po-card-label { color: #6B7280; font-weight: 600; min-width: 70px; }
        .po-card-value { color: #374151; }
        .po-store-badge { font-size: 0.72rem; font-weight: 700; color: #7C3AED; background: #EDE9FE; padding: 2px 10px; border-radius: 20px; }

        .po-card-items { padding: 10px 18px; display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; }
        .po-item-row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: #f9fafb; border-radius: 10px; border: 1px solid #f0f0f0; }
        .po-item-img-wrap { width: 48px; height: 48px; border-radius: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .po-item-img { width: 100%; height: 100%; object-fit: cover; }
        .po-item-img-ph { width: 100%; height: 100%; align-items: center; justify-content: center; background: #f1f5f9; }
        .po-item-details { flex: 1; min-width: 0; }
        .po-item-name { font-size: 0.84rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .po-item-meta { display: flex; gap: 8px; margin-top: 2px; font-size: 0.72rem; color: #6B7280; }
        .po-item-owner { color: #7C3AED; font-weight: 600; }
        .po-item-price { font-size: 0.84rem; font-weight: 700; color: #1e293b; white-space: nowrap; }

        .po-card-footer { padding: 12px 18px; background: #FAFBFC; border-top: 1px solid #f0f0f0; }
        .po-card-footer-row { display: flex; justify-content: space-between; font-size: 0.82rem; color: #4b5563; padding: 2px 0; }
        .po-card-amount { font-weight: 600; }
        .po-card-footer-total { display: flex; justify-content: space-between; font-size: 0.92rem; font-weight: 800; color: #1e293b; padding: 6px 0 2px; border-top: 1px solid #e5e7eb; margin-top: 4px; }
        .po-card-date { text-align: right; font-size: 0.72rem; color: #9CA3AF; margin-top: 4px; }

        /* ═══ Commission SVG Donut Chart ═══ */
        .comm-chart-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 24px; margin-top: 24px; }
        .comm-chart-header { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; font-size: 0.95rem; font-weight: 700; color: #1e293b; flex-wrap: wrap; }
        .comm-chart-sub { font-size: 0.72rem; font-weight: 400; color: #9CA3AF; }
        .comm-chart-body { display: flex; gap: 40px; align-items: center; flex-wrap: wrap; justify-content: center; }
        .comm-svg-container { position: relative; flex-shrink: 0; width: 270px; height: 270px; overflow: visible; }
        .comm-legend { flex: 1; display: flex; flex-direction: column; gap: 10px; min-width: 240px; }
        .comm-legend-item { display: flex; gap: 10px; align-items: flex-start; padding: 6px 8px; border-radius: 9px; border: 1px solid transparent; transition: background 0.15s, border-color 0.15s; }
        .comm-legend-item:hover, .comm-legend-item.active { background: #f8fafc; border-color: #e5e7eb; }
        .comm-legend-color { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; margin-top: 3px; }
        .comm-legend-info { flex: 1; }
        .comm-legend-store { font-size: 0.84rem; font-weight: 700; color: #1e293b; transition: color 0.15s; }
        .comm-legend-detail { display: flex; align-items: center; gap: 6px; margin-top: 1px; }
        .comm-legend-val { font-size: 0.82rem; font-weight: 600; color: #374151; }
        .comm-legend-pct { font-size: 0.72rem; color: #9CA3AF; }
        .comm-legend-breakdown { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 3px; }
        .comm-tag { font-size: 0.68rem; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
        .comm-tag-normal { background: #DBEAFE; color: #2563EB; }
        .comm-tag-free { background: #DCFCE7; color: #16A34A; }
        .comm-chart-footer { margin-top: 20px; padding-top: 14px; border-top: 1px solid #f3f4f6; font-size: 0.82rem; color: #6B7280; text-align: right; }

        /* Tooltip — uses position:fixed via inline style, so parent overflow:hidden won't clip it */
        .comm-tooltip { position: fixed; z-index: 9999; background: #1e293b; border-radius: 12px; padding: 12px 14px; min-width: 210px; pointer-events: none; box-shadow: 0 8px 30px rgba(0,0,0,0.22); color: #fff; font-size: 0.82rem; }
        .comm-tt-store { font-size: 0.9rem; font-weight: 800; color: #fff; padding-left: 8px; margin-bottom: 10px; }
        .comm-tt-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 3px 0; font-size: 0.8rem; color: #cbd5e1; }
        .comm-tt-row strong { color: #fff; font-weight: 700; white-space: nowrap; }
        .comm-tt-divider { height: 1px; background: #334155; margin: 6px 0; }
        .comm-tt-tag-normal { font-size: 0.72rem; background: #1d4ed8; color: #bfdbfe; padding: 1px 7px; border-radius: 8px; font-weight: 600; }
        .comm-tt-tag-free { font-size: 0.72rem; background: #15803d; color: #bbf7d0; padding: 1px 7px; border-radius: 8px; font-weight: 600; }
        .comm-tt-orders { margin-top: 4px; color: #94a3b8; }

        /* ── Shipping Bar Chart ── */
        .ssc-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; margin-top: 20px; }
        .ssc-header { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; font-size: 0.95rem; font-weight: 700; color: #1e293b; }
        .ssc-sub { font-size: 0.75rem; font-weight: 400; color: #9CA3AF; margin-left: 4px; }
        .ssc-chart { display: flex; flex-direction: column; gap: 12px; }
        .ssc-row { display: flex; align-items: center; gap: 12px; }
        .ssc-label { min-width: 130px; max-width: 160px; font-size: 0.82rem; font-weight: 600; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ssc-bar-track { flex: 1; background: #F3F4F6; border-radius: 6px; height: 28px; position: relative; display: flex; align-items: center; overflow: visible; }
        .ssc-bar { height: 100%; border-radius: 6px; transition: width 0.4s ease; min-width: 4px; }
        .ssc-bar-val { position: absolute; left: calc(100% + 8px); font-size: 0.78rem; font-weight: 700; color: #374151; white-space: nowrap; }
        .ssc-footer { margin-top: 16px; padding-top: 12px; border-top: 1px solid #f3f4f6; font-size: 0.82rem; color: #6B7280; text-align: right; }

        /* ── Modal ── */
        .sm-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
        .sm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 720px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .sm-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.1rem 1.4rem; border-bottom: 1px solid #e5e7eb; }
        .sm-modal-title { margin: 0; font-size: 1.05rem; font-weight: 700; color: #1e293b; }
        .sm-modal-date { font-size: 0.75rem; color: #9CA3AF; }
        .sm-modal-close { background: none; border: none; font-size: 1.4rem; color: #9CA3AF; cursor: pointer; line-height: 1; }
        .sm-modal-close:hover { color: #ef4444; }
        .sm-modal-body { padding: 1.1rem 1.4rem; overflow-y: auto; flex: 1; }
        .sm-modal-info { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; font-size: 0.84rem; color: #374151; padding: 12px 14px; background: #f9fafb; border-radius: 10px; border: 1px solid #e5e7eb; }
        .sm-modal-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 12px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
        .sm-modal-table th { padding: 8px 12px; background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; text-align: left; }
        .sm-modal-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .sm-modal-table tbody tr:last-child td { border-bottom: none; }
        .sm-modal-summary-block { border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb; margin-top: 2px; }
        .sm-modal-sum-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; font-size: 0.84rem; color: #4b5563; background: #f9fafb; border-bottom: 1px solid #f0f0f0; }
        .sm-modal-sum-total { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-size: 0.92rem; font-weight: 700; color: #1e293b; background: #fff; }
        .sm-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 1rem 1.4rem; border-top: 1px solid #e5e7eb; }
        .sm-btn-print { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #f3f4f6; color: #4b5563; border: none; font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
        .sm-btn-print:hover { background: #e5e7eb; }
        .sm-btn-deliver { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #7C3AED; color: #fff; border: none; font-weight: 700; font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .sm-btn-deliver:hover:not(:disabled) { background: #6D28D9; transform: translateY(-1px); }
        .sm-btn-deliver:disabled { opacity: 0.6; cursor: not-allowed; }
        .sm-btn-close-modal { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #F97316; color: #fff; border: none; font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; }
        .sm-btn-close-modal:hover { background: #ea580c; }

        /* ══════════════ RESPONSIVE ══════════════ */
        @media (max-width: 1200px) {
          .po-cards-grid { grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr)); }
        }
        @media (max-width: 900px) {
          .sm-page { padding: 1.25rem 1rem; }
          .ssc-label { min-width: 100px; max-width: 130px; }
        }
        @media (max-width: 768px) {
          .sm-page { padding: 1rem; }
          .comm-chart-body { flex-direction: column; align-items: center; gap: 20px; }
          .comm-legend { min-width: unset; width: 100%; }
          .ssc-label { min-width: 80px; max-width: 100px; font-size: 0.75rem; }
          .po-card-items { max-height: none; }
          .po-cards-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .sm-page { padding: 0.75rem; }
          .sm-header { flex-direction: column; gap: 0.5rem; align-items: stretch; }
          .sm-title { font-size: 1.15rem; }
          .sm-refresh { justify-content: center; }
          .sm-tabs { overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; gap: 2px; padding: 3px; }
          .sm-tabs::-webkit-scrollbar { display: none; }
          .sm-tab { flex-shrink: 0; padding: 8px 12px; font-size: 0.78rem; white-space: nowrap; }
          .sm-toolbar { flex-direction: column; gap: 10px; }
          .sm-search-wrap { max-width: 100%; min-width: unset; width: 100%; }
          .sm-filter-tabs { flex-wrap: wrap; gap: 6px; }
          .sm-store-filter { width: 100%; }
          .sm-store-select { width: 100%; box-sizing: border-box; }
          .comm-chart-wrap { padding: 14px 12px; }
          .comm-chart-header { font-size: 0.88rem; flex-wrap: wrap; }
          .comm-legend-breakdown { display: none; }
          .ssc-wrap { padding: 14px 12px; }
          .ssc-label { min-width: 65px; max-width: 80px; font-size: 0.7rem; }
          .ssc-bar-val { position: static; font-size: 0.68rem; margin-left: 4px; white-space: nowrap; }
          .ssc-bar-track { overflow: visible; }
          .po-card-header { padding: 10px 14px; }
          .po-card-info { padding: 10px 14px; }
          .po-card-items { padding: 8px 14px; }
          .po-card-footer { padding: 10px 14px; }
          .po-item-row { gap: 8px; }
          .po-item-img-wrap { width: 38px; height: 38px; }
          .sm-modal-overlay { padding: 0.75rem; align-items: flex-end; }
          .sm-modal { max-height: 92vh; border-radius: 18px 18px 0 0; }
          .sm-modal-header { padding: 1rem 1rem 0.85rem; }
          .sm-modal-body { padding: 0.95rem 1rem; }
          .sm-modal-footer { padding: 0.85rem 1rem 1rem; }
          .sm-modal-footer { flex-wrap: wrap; justify-content: stretch; }
          .sm-btn-print, .sm-btn-deliver, .sm-btn-close-modal { flex: 1; justify-content: center; }
        }

        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm; }
          body * { visibility: hidden !important; }
          .sm-modal-overlay, .sm-modal-overlay * { visibility: visible !important; }
          .sm-modal-overlay { position: fixed !important; inset: 0 !important; background: white !important; display: block !important; padding: 0 !important; backdrop-filter: none !important; z-index: 9999 !important; }
          .sm-modal { position: static !important; max-height: none !important; box-shadow: none !important; border-radius: 0 !important; width: 100% !important; max-width: 100% !important; }
          .sm-modal-footer { display: none !important; }
          .sm-modal-close { display: none !important; }
          .sm-modal-header { border-bottom: 2px solid #1e293b !important; padding-bottom: 6px !important; }
          .sm-modal-header::before { content: "ElectroNest — Stock Movement Receipt"; display: block; font-size: 1rem; font-weight: 800; color: #1e293b; margin-bottom: 2px; }
          .sm-modal-body { overflow: visible !important; padding: 8px 12px !important; }
          .sm-modal-info { padding: 8px 10px !important; margin-bottom: 8px !important; font-size: 0.78rem !important; }
          .sm-modal-table th, .sm-modal-table td { padding: 5px 8px !important; font-size: 0.76rem !important; }
          .sm-modal-summary-block { padding: 0 !important; }
          .sm-modal-sum-row, .sm-modal-sum-total { padding: 4px 8px !important; font-size: 0.78rem !important; }
        }
      `}</style>
    </div>
  );
}
