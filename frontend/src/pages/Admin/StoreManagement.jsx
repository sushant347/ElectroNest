import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Store, Search, RefreshCw, AlertCircle, TrendingUp,
  Package, ShoppingBag, DollarSign, ChevronDown,
  ChevronUp, Eye, Award, ArrowUpRight, X
} from 'lucide-react';
import {
  BarChart, Bar, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, Line
} from 'recharts';
import { SkeletonBlock, TableSkeleton } from '../../components/Common/SkeletonLoader';

// Bulletproof chart wrapper — measures its own pixel width, bypasses ResizeObserver issues
function ChartWrapper({ height, children }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    // Measure immediately
    setWidth(Math.floor(ref.current.getBoundingClientRect().width) || 300);
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) setWidth(w);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ width: '100%', height }}>
      {width > 0 && children(width)}
    </div>
  );
}
import { adminAPI } from '../../services/api';

const fmt = (n) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
const parsePeriodDate = (str) => {
  if (!str) return 'N/A';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

const PERIODS = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '1Y', value: 365 },
];

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="sm-stat-card">
      <div className="sm-stat-icon" style={{ background: `${color}18` }}>
        <Icon size={18} color={color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="sm-stat-label">{label}</div>
        <div className="sm-stat-val">{value}</div>
        {sub && <div className="sm-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

const COLORS = ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#0891B2', '#D97706', '#DB2777'];

export default function StoreManagement() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(30);
  const [selectedStore, setSelectedStore] = useState(null);
  const [platformTrend, setPlatformTrend] = useState([]);
  const [storeTrend, setStoreTrend] = useState([]);
  const [storeTopProds, setStoreTopProds] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [sortBy, setSortBy] = useState('revenue');
  const [sortDir, setSortDir] = useState('desc');
  const [overview, setOverview] = useState({ total_revenue: 0, total_orders: 0 });

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, revenueRes, topProdsRes, overviewRes] = await Promise.all([
        adminAPI.getUsers({ role: 'owner', page_size: 200 }),
        adminAPI.getRevenueTrend({ days: period }),
        adminAPI.getTopProducts({ page_size: 50, days: period }),
        adminAPI.getSalesOverview({ days: period }),
      ]);

      const owners = usersRes.data?.results || usersRes.data || [];
      const revTrend = Array.isArray(revenueRes.data) ? revenueRes.data : [];
      const allProds = Array.isArray(topProdsRes.data)
        ? topProdsRes.data
        : (topProdsRes.data?.results || []);
      setOverview(overviewRes.data || {});

      // Build store map from owners
      const storeMap = {};
      owners.forEach(o => {
        const name = `${o.first_name || ''} ${o.last_name || ''}`.trim() || o.username || o.email;
        storeMap[name.toLowerCase()] = {
          id: o.id,
          name,
          email: o.email,
          phone: o.phone || '—',
          joinedAt: o.date_joined,
          is_active: o.is_active,
          revenue: 0,
          orders: 0,
          products: 0,
          topProduct: null,
        };
      });

      // Aggregate from top products (now includes owner_name + days filter)
      allProds.forEach(p => {
        const ownerKey = (p.owner_name || '').toLowerCase().trim();
        if (ownerKey && storeMap[ownerKey]) {
          storeMap[ownerKey].products += 1;
          storeMap[ownerKey].revenue += parseFloat(p.total_revenue || 0);
          storeMap[ownerKey].orders += parseInt(p.total_quantity_sold || 0);
          if (!storeMap[ownerKey].topProduct || parseInt(p.total_quantity_sold || 0) > storeMap[ownerKey].topProduct.sold) {
            storeMap[ownerKey].topProduct = {
              name: p.name,
              sold: parseInt(p.total_quantity_sold || 0),
              revenue: parseFloat(p.total_revenue || 0),
            };
          }
        }
      });

      // Platform revenue trend
      const trend = revTrend.map(d => ({
        date: parsePeriodDate(d.period || d.date),
        Revenue: parseFloat(d.revenue || 0),
        Orders: parseInt(d.orders || 0),
        Profit: parseFloat(d.profit || 0),
      }));
      setPlatformTrend(trend);
      setStores(Object.values(storeMap));
    } catch (e) {
      console.error(e);
      setError('Failed to load store data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const fetchStoreDetail = useCallback(async (store) => {
    setChartLoading(true);
    setStoreTrend([]);
    setStoreTopProds([]);
    try {
      const [revRes, prodsRes] = await Promise.all([
        adminAPI.getRevenueTrend({ days: period, owner_name: store.name }),
        adminAPI.getTopProducts({ owner_name: store.name, page_size: 10, days: period }),
      ]);
      const trend = Array.isArray(revRes.data) ? revRes.data : [];
      setStoreTrend(trend.map(d => ({
        date: parsePeriodDate(d.period || d.date),
        Revenue: parseFloat(d.revenue || 0),
        Orders: parseInt(d.orders || 0),
        Profit: parseFloat(d.profit || 0),
      })));
      const prods = Array.isArray(prodsRes.data) ? prodsRes.data : (prodsRes.data?.results || []);
      setStoreTopProds(prods);
    } catch (e) {
      console.error(e);
    } finally {
      setChartLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (selectedStore) fetchStoreDetail(selectedStore);
    else { setStoreTrend([]); setStoreTopProds([]); }
  }, [selectedStore, fetchStoreDetail]);

  const sortFn = (a, b) => {
    const v = sortDir === 'desc' ? -1 : 1;
    if (a[sortBy] < b[sortBy]) return v;
    if (a[sortBy] > b[sortBy]) return -v;
    return 0;
  };

  const filtered = stores
    .filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()))
    .sort(sortFn);

  const totalRev = stores.reduce((a, s) => a + s.revenue, 0);
  const totalOrders = stores.reduce((a, s) => a + s.orders, 0);
  const totalProds = stores.reduce((a, s) => a + s.products, 0);
  const activeStores = stores.filter(s => s.is_active).length;

  const displayTrend = selectedStore ? storeTrend : platformTrend;

  const SortBtn = ({ col, label }) => (
    <button
      onClick={() => { if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortBy(col); setSortDir('desc'); } }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, fontSize: '0.72rem', color: sortBy === col ? '#F97316' : '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', padding: 0 }}
    >
      {label}
      {sortBy === col ? (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null}
    </button>
  );

  return (
    <div className="sm-page">
      <style>{`
        .sm-page { padding: 24px 28px 48px; max-width: 1440px; margin: 0 auto; box-sizing: border-box; width: 100%; }
        .sm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
        .sm-table-detail { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }
        .sm-table-detail-single { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .sm-period-btns { display: flex; background: #f3f4f6; border-radius: 9px; padding: 3px; gap: 2px; flex-wrap: wrap; }
        .sm-chart-box { min-width: 0; width: 100%; max-width: 100%; box-sizing: border-box; position: relative; display: block; }
        .sm-tbl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
        .sm-tbl-scroll table { min-width: 480px; }
        .sm-detail-panel { min-width: 0; width: 100%; box-sizing: border-box; }

        /* Stat card */
        .sm-stat-card { background:#fff; border-radius:14px; padding:14px 16px; border:1px solid #e5e7eb; display:flex; gap:12px; align-items:flex-start; box-sizing:border-box; min-width:0; overflow:hidden; }
        .sm-stat-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .sm-stat-label { font-size:0.7rem; color:#6B7280; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px; }
        .sm-stat-val { font-size:1.35rem; font-weight:800; color:#111827; line-height:1.2; word-break:break-word; overflow-wrap:anywhere; }
        .sm-stat-sub { font-size:0.7rem; color:#9CA3AF; margin-top:3px; }

        @media (max-width: 900px) {
          .sm-stats-grid { grid-template-columns: repeat(2, 1fr); }
          .sm-table-detail { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .sm-page { padding: 12px 12px 28px; }
          .sm-stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .sm-stat-card { padding: 10px 12px; gap: 9px; }
          .sm-stat-icon { width:34px; height:34px; border-radius:9px; }
          .sm-stat-val { font-size: 1rem; }
          .sm-stat-label { font-size: 0.63rem; }
          .sm-stat-sub { font-size: 0.63rem; }
          .sm-header-row { flex-direction: column; align-items: flex-start !important; gap: 10px !important; }
          .sm-header-actions { width: 100%; }
          .sm-period-btns { flex: 1; }
        }
        @media (max-width: 400px) {
          .sm-page { padding: 8px 8px 24px; }
          .sm-stat-val { font-size: 0.88rem; }
          .sm-stats-grid { gap: 6px; }
        }
      `}</style>
      {/* Header */}
      <div className="sm-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Store size={24} color="#F97316" /> Store Management
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Monitor all stores, track performance, and analyze revenue trends
          </p>
        </div>
        <div className="sm-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="sm-period-btns">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: '5px 12px', borderRadius: 7,
                background: period === p.value ? '#fff' : 'transparent',
                color: period === p.value ? '#F97316' : '#6B7280',
                border: period === p.value ? '1px solid #e5e7eb' : '1px solid transparent',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                boxShadow: period === p.value ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}>{p.label}</button>
            ))}
          </div>
          <button onClick={fetchStores} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontWeight: 600, cursor: 'pointer', color: '#374151', fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.85rem', marginBottom: 16 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="sm-stats-grid">
        <StatCard icon={Store} label="Total Stores" value={fmtNum(stores.length)} sub={`${activeStores} active`} color="#F97316" />
        <StatCard icon={DollarSign} label="Platform Revenue" value={fmt(overview.total_revenue || 0)} sub={`Last ${period} days · all stores`} color="#16A34A" />
        <StatCard icon={ShoppingBag} label="Total Orders" value={fmtNum(overview.total_orders || 0)} sub={`Last ${period} days`} color="#2563EB" />
        <StatCard icon={Package} label="Products Listed" value={fmtNum(totalProds)} sub={`From top products (${period}d)`} color="#7C3AED" />
      </div>

      {/* Revenue Trend Chart */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px', marginBottom: 24, boxSizing: 'border-box', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>
              {selectedStore ? `${selectedStore.name} — Revenue Trend` : 'Platform Revenue Trend'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>
              {selectedStore ? 'Filtered to this store only' : 'All stores combined · Click a row to drill down'}
            </div>
          </div>
          {selectedStore && (
            <button onClick={() => setSelectedStore(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#6B7280', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}>
              <X size={12} /> Clear filter
            </button>
          )}
        </div>
        {chartLoading ? (
          <div style={{ height: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '0 8px' }}>
            <SkeletonBlock width="42%" height={14} />
            <SkeletonBlock width="100%" height={11} radius={6} />
            <SkeletonBlock width="92%" height={11} radius={6} />
            <SkeletonBlock width="76%" height={11} radius={6} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : displayTrend.length > 0 ? (
          <ChartWrapper height={220}>
            {(w) => (
              <ComposedChart width={w} height={220} data={displayTrend} margin={{ top: 5, right: 38, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={40} />
                <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 9, fill: '#2563EB' }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} width={30} />
                <Tooltip
                  formatter={(v, n) => [n === 'Orders' ? fmtNum(v) : fmt(v), n]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="ord" dataKey="Orders" fill="#2563EB" fillOpacity={0.3} stroke="#2563EB" strokeWidth={1} radius={[3, 3, 0, 0]} />
                <Line yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#F97316" strokeWidth={2.5} dot={false} />
                <Line yAxisId="rev" type="monotone" dataKey="Profit" stroke="#16A34A" strokeWidth={1.8} dot={false} strokeDasharray="4 2" />
              </ComposedChart>
            )}
          </ChartWrapper>
        ) : loading ? (
          <div style={{ height: 240, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, padding: '0 8px' }}>
            <SkeletonBlock width="38%" height={14} />
            <SkeletonBlock width="100%" height={11} radius={6} />
            <SkeletonBlock width="88%" height={11} radius={6} />
            <SkeletonBlock width="66%" height={11} radius={6} />
          </div>
        ) : (
          <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 8 }}>
            <TrendingUp size={28} color="#e5e7eb" />
            <div style={{ fontSize: '0.85rem' }}>No revenue data for this period</div>
          </div>
        )}
      </div>

      {/* Store Table + Detail Panel */}
      <div className={selectedStore ? 'sm-table-detail' : 'sm-table-detail-single'}>
        {/* Store Table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '7px 14px', flex: 1, minWidth: 180 }}>
              <Search size={14} color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search stores..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', color: '#1e293b', width: '100%' }}
              />
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6B7280', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {filtered.length} store{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 16 }}>
              <TableSkeleton rows={8} columns={7} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#9CA3AF', fontSize: '0.85rem' }}>
              <Store size={28} color="#e5e7eb" style={{ marginBottom: 8 }} />
              <div>No stores found</div>
            </div>
          ) : (
            <div className="sm-tbl-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}><SortBtn col="name" label="Store / Owner" /></th>
                    <th style={th}><SortBtn col="products" label="Products" /></th>
                    <th style={th}><SortBtn col="orders" label="Units Sold" /></th>
                    <th style={th}><SortBtn col="revenue" label="Revenue" /></th>
                    <th style={th}>Status</th>
                    <th style={th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((store, i) => {
                    const color = COLORS[i % COLORS.length];
                    const isSelected = selectedStore?.id === store.id;
                    return (
                      <tr
                        key={store.id || store.name}
                        style={{
                          background: isSelected ? '#FFF7ED' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                        onClick={() => setSelectedStore(isSelected ? null : store)}
                      >
                        <td style={td}>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600 }}>{i + 1}</span>
                        </td>
                        <td style={td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', color, flexShrink: 0 }}>
                              {store.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 5 }}>
                                {store.name}
                                {isSelected && <ArrowUpRight size={12} color="#F97316" />}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{store.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{ fontWeight: 600, color: '#374151' }}>{fmtNum(store.products)}</span>
                        </td>
                        <td style={td}>
                          <span style={{ fontWeight: 600, color: '#374151' }}>{fmtNum(store.orders)}</span>
                        </td>
                        <td style={td}>
                          <div>
                            <div style={{ fontWeight: 700, color: '#16A34A', fontSize: '0.88rem' }}>
                              {store.revenue > 0 ? fmt(store.revenue) : <span style={{ color: '#9CA3AF', fontWeight: 400, fontSize: '0.8rem' }}>—</span>}
                            </div>
                            {totalRev > 0 && store.revenue > 0 && (
                              <div style={{ width: '100%', background: '#f3f4f6', borderRadius: 4, height: 3, marginTop: 4, overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, (store.revenue / totalRev) * 100)}%`, background: color, height: '100%', borderRadius: 4 }} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={td}>
                          <span style={{
                            fontSize: '0.71rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                            background: store.is_active ? '#DCFCE7' : '#FEE2E2',
                            color: store.is_active ? '#16A34A' : '#DC2626',
                          }}>
                            {store.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={td}>
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedStore(isSelected ? null : store); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7,
                              border: `1px solid ${isSelected ? '#F97316' : '#e5e7eb'}`,
                              background: isSelected ? '#FFF7ED' : '#fff',
                              color: isSelected ? '#F97316' : '#374151',
                              fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                            }}
                          >
                            <Eye size={12} /> {isSelected ? 'Viewing' : 'View'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Store Detail Panel */}
        {selectedStore && (
          <div className="sm-detail-panel" style={{ background: '#fff', borderRadius: 14, border: '2px solid #F97316' }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#F97316' }}>
                  {selectedStore.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>{selectedStore.name}</div>
                  <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{selectedStore.email}</div>
                </div>
              </div>
              <button onClick={() => setSelectedStore(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              {[
                { label: 'Products', value: fmtNum(selectedStore.products), color: '#7C3AED' },
                { label: 'Units Sold', value: fmtNum(selectedStore.orders), color: '#2563EB' },
                { label: 'Revenue', value: selectedStore.revenue > 0 ? fmt(selectedStore.revenue) : '—', color: '#16A34A' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Status + Joined */}
            <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: selectedStore.is_active ? '#DCFCE7' : '#FEE2E2', color: selectedStore.is_active ? '#16A34A' : '#DC2626' }}>
                {selectedStore.is_active ? 'Active' : 'Inactive'}
              </span>
              {selectedStore.joinedAt && (
                <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                  Joined {new Date(selectedStore.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
              {selectedStore.phone && selectedStore.phone !== '—' && (
                <span style={{ fontSize: '0.72rem', color: '#6B7280' }}>{selectedStore.phone}</span>
              )}
            </div>

            {/* Best Seller */}
            {selectedStore.topProduct && (
              <div style={{ padding: '10px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#FFF7ED', borderRadius: 8, fontSize: '0.78rem' }}>
                  <Award size={13} color="#F97316" />
                  <span style={{ fontWeight: 600, color: '#92400E' }}>Best Seller:</span>
                  <span style={{ color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedStore.topProduct.name}</span>
                  <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{fmtNum(selectedStore.topProduct.sold)} sold</span>
                </div>
              </div>
            )}

            {/* Store Revenue Mini Chart */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 12 }}>
                Revenue Trend ({period}d)
              </div>
              {chartLoading ? (
                <div style={{ height: 140, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                  <SkeletonBlock width="60%" height={12} />
                  <SkeletonBlock width="100%" height={10} radius={6} />
                  <SkeletonBlock width="90%" height={10} radius={6} />
                </div>
              ) : storeTrend.length > 0 ? (
                <ChartWrapper height={140}>
                  {(w) => (
                    <ComposedChart width={w} height={140} data={storeTrend} margin={{ top: 5, right: 30, left: -8, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis yAxisId="rev" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                        tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={36} />
                      <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 8, fill: '#2563EB' }} tickLine={false} axisLine={false}
                        tickFormatter={v => String(v)} width={26} />
                      <Tooltip formatter={(v, n) => [n === 'Orders' ? fmtNum(v) : fmt(v), n]} contentStyle={{ borderRadius: 6, fontSize: 11 }} />
                      <Bar yAxisId="ord" dataKey="Orders" fill="#2563EB" fillOpacity={0.3} stroke="#2563EB" strokeWidth={1} radius={[3, 3, 0, 0]} />
                      <Line yAxisId="rev" type="monotone" dataKey="Revenue" stroke="#F97316" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  )}
                </ChartWrapper>
              ) : (
                <div style={{ height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', gap: 6 }}>
                  <TrendingUp size={22} color="#e5e7eb" />
                  <div style={{ fontSize: '0.78rem' }}>No trend data available</div>
                </div>
              )}
            </div>

            {/* Top Products */}
            {storeTopProds.length > 0 && (
              <div style={{ padding: '0 20px 16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>Top Products</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {storeTopProds.slice(0, 5).map((p, i) => (
                    <div key={p.product_id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#f9fafb', borderRadius: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, background: `${COLORS[i]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: COLORS[i], flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{p.brand} · {fmtNum(p.total_quantity_sold)} sold</div>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16A34A', flexShrink: 0 }}>{fmt(p.total_revenue)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Comparison Bar Chart */}
      {!loading && stores.length > 1 && stores.some(s => s.revenue > 0) && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px', marginTop: 24, boxSizing: 'border-box', width: '100%' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>Store Revenue Comparison</div>
          <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>Top 10 stores by revenue · Based on top product sales</div>
          <ChartWrapper height={200}>
            {(w) => {
              const top10 = [...stores].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
              return (
                <BarChart
                  width={w} height={200}
                  data={top10.map(s => ({ name: s.name.split(' ')[0], fullName: s.name, Revenue: s.revenue }))}
                  margin={{ top: 5, right: 8, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={38} />
                  <Tooltip
                    formatter={(v, n, props) => [fmt(v), props.payload.fullName]}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }}
                  />
                  <Bar dataKey="Revenue" radius={[6, 6, 0, 0]}>
                    {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              );
            }}
          </ChartWrapper>
        </div>
      )}
    </div>
  );
}

const th = {
  padding: '11px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600,
  color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em',
  borderBottom: '1px solid #e5e7eb', background: '#F9FAFB', whiteSpace: 'nowrap',
};
const td = {
  padding: '12px 16px', fontSize: '0.85rem', color: '#374151',
  borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle',
};
