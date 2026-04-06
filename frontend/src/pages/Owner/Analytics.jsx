import { useState, useEffect, useCallback, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, AlertTriangle, Printer, Download, RefreshCw, AlertCircle, SlidersHorizontal, Eye, X } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import ComprehensiveForecastModal from '../../components/Owner/ComprehensiveForecastModal';
import { HeaderSkeleton, CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);
const fmtShort = (v) => { if (v >= 10000000) return `Rs.${(v / 10000000).toFixed(1)}Cr`; if (v >= 100000) return `Rs.${(v / 100000).toFixed(1)}L`; if (v >= 1000) return `Rs.${(v / 1000).toFixed(0)}K`; return `Rs.${v}`; };
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
const STATUS_COLORS_MAP = { Pending: '#F59E0B', Processing: '#3B82F6', Shipped: '#8B5CF6', Delivered: '#10B981', Cancelled: '#EF4444' };

/* ── SVG Donut helpers ── */
function _ptc(cx, cy, r, a) { const rad = ((a - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
function _arc(cx, cy, oR, iR, s, e) {
  const se = e - s >= 359.99 ? s + 359.99 : e;
  const o1 = _ptc(cx, cy, oR, s), o2 = _ptc(cx, cy, oR, se), i1 = _ptc(cx, cy, iR, se), i2 = _ptc(cx, cy, iR, s);
  const lg = se - s > 180 ? 1 : 0;
  return [`M ${o1.x} ${o1.y}`, `A ${oR} ${oR} 0 ${lg} 1 ${o2.x} ${o2.y}`, `L ${i1.x} ${i1.y}`, `A ${iR} ${iR} 0 ${lg} 0 ${i2.x} ${i2.y}`, 'Z'].join(' ');
}
function SvgDonut({ data, labelKey = 'name', valueKey = 'value', colorMap = null, fmtVal = null, id = 'sd' }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0);
  if (!data.length || total === 0) return <p className="an-no-data">No data available</p>;
  const CX = 110, CY = 110, OR = 100, IR = 56;
  let cumDeg = 0;
  const segments = data.map((d, i) => {
    const sv = Number(d[valueKey]) || 0;
    const startDeg = cumDeg;
    const sweep = (sv / total) * 360;
    cumDeg += sweep;
    const color = colorMap ? (colorMap[d[labelKey]] || COLORS[i % COLORS.length]) : COLORS[i % COLORS.length];
    return { label: d[labelKey], value: sv, startDeg, endDeg: cumDeg, pct: (sv / total) * 100, color, path: _arc(CX, CY, OR, IR, startDeg, cumDeg), midDeg: startDeg + sweep / 2 };
  });
  const active = hovered !== null ? segments[hovered] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', flexShrink: 0 }} onMouseLeave={() => setHovered(null)}>
        <svg width={220} height={220} viewBox="0 0 220 220" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000030" />
            </filter>
          </defs>
          {segments.map((s, i) => {
            const isActive = hovered === i;
            const midRad = ((s.midDeg - 90) * Math.PI) / 180;
            const offset = isActive ? 8 : 0;
            return (
              <path key={i} d={s.path} fill={s.color}
                transform={`translate(${offset * Math.cos(midRad)}, ${offset * Math.sin(midRad)})`}
                filter={isActive ? `url(#${id}-shadow)` : undefined}
                stroke="#fff" strokeWidth={isActive ? 2.5 : 1.5}
                style={{ cursor: 'pointer', transition: 'transform 0.18s ease' }}
                onMouseMove={e => { setHovered(i); setTooltip({ x: e.clientX, y: e.clientY }); }}
                onMouseEnter={e => { setHovered(i); setTooltip({ x: e.clientX, y: e.clientY }); }}
              />
            );
          })}
          <circle cx={CX} cy={CY} r={IR - 2} fill="#fff" />
          {active ? (
            <>
              <text x={CX} y={CY - 10} textAnchor="middle" style={{ fontSize: 9, fill: active.color, fontWeight: 700, fontFamily: 'inherit' }}>
                {active.label.length > 14 ? active.label.slice(0, 13) + '…' : active.label}
              </text>
              <text x={CX} y={CY + 8} textAnchor="middle" style={{ fontSize: 11, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                {fmtVal ? fmtVal(active.value) : active.value}
              </text>
              <text x={CX} y={CY + 24} textAnchor="middle" style={{ fontSize: 10, fill: active.color, fontWeight: 600, fontFamily: 'inherit' }}>
                {active.pct.toFixed(1)}%
              </text>
            </>
          ) : (
            <>
              <text x={CX} y={CY - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'inherit', fontWeight: 600 }}>
                {segments.length} {segments.length === 1 ? 'item' : 'items'}
              </text>
              <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: 11, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                {total}
              </text>
            </>
          )}
        </svg>
        {active && (
          <div style={{
            position: 'fixed',
            left: tooltip.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400) ? 'auto' : tooltip.x + 14,
            right: tooltip.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400) ? window.innerWidth - tooltip.x + 14 : 'auto',
            top: Math.min(tooltip.y - 10, typeof window !== 'undefined' ? window.innerHeight - 120 : tooltip.y),
            zIndex: 9999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 150, pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', borderLeft: `3px solid ${active.color}`, paddingLeft: 8, marginBottom: 8 }}>{active.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280', marginBottom: 3 }}>
              <span>{fmtVal ? 'Revenue' : 'Count'}</span><strong style={{ color: active.color }}>{fmtVal ? fmtVal(active.value) : active.value}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280' }}>
              <span>Share</span><strong>{active.pct.toFixed(1)}%</strong>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 120, maxHeight: 200, overflowY: 'auto' }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '3px 0' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0, transform: hovered === i ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.15s' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: hovered === i ? 700 : 600, color: hovered === i ? s.color : '#374151' }}>{s.label}</span>
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{fmtVal ? fmtVal(s.value) : s.value} ({s.pct.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Aggregate daily data into weekly buckets when there are too many data points */
function aggregateToWeekly(data) {
  if (!data || data.length <= 60) return data;
  const weeks = [];
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7);
    const revenue = chunk.reduce((s, d) => s + (d.revenue || 0), 0);
    const profit = chunk.reduce((s, d) => s + (d.profit || 0), 0);
    const orders = chunk.reduce((s, d) => s + (d.orders || 0), 0);
    const startDate = chunk[0].period;
    const endDate = chunk[chunk.length - 1].period;
    weeks.push({ period: startDate, endDate, revenue, profit, orders });
  }
  return weeks;
}

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Growth modal state ──
  const [growthProduct, setGrowthProduct] = useState(null);

  // ── Interactive filter states ──
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [revenueRange, setRevenueRange] = useState([0, 100]);
  const [maxRevenueValue, setMaxRevenueValue] = useState(100);

  // API data states
  const [summary, setSummary] = useState({ total_revenue: 0, total_profit: 0, total_orders: 0 });
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryRes, trendRes, monthlyRes, topRes, catRes, payRes, statusRes, lowStockRes, ordersRes] = await Promise.all([
        ownerAPI.getSalesOverview(),
        ownerAPI.getRevenueTrend(),
        ownerAPI.getRevenueTrend({ period: 'monthly' }),
        ownerAPI.getTopProducts(),
        ownerAPI.getCategoryPerformance(),
        ownerAPI.getPaymentMethodStats(),
        ownerAPI.getOrderStatusStats(),
        ownerAPI.getLowStockProducts(),
        ownerAPI.getAllOrders({ page_size: 6, ordering: '-order_date' }),
      ]);
      setSummary(summaryRes.data);
      setRevenueTrend(trendRes.data);
      setMonthlyRevenue(monthlyRes.data);
      const top = topRes.data;
      setTopProducts(top);
      setCategoryData(catRes.data);
      setPaymentMethods(payRes.data);
      setStatusDistribution(statusRes.data);
      setLowStockProducts(lowStockRes.data);
      setRecentOrders(ordersRes.data.results || ordersRes.data);
      // Set slider max from top product revenue
      if (top.length) {
        const maxRev = Math.max(...top.map((p) => p.total_revenue));
        setMaxRevenueValue(maxRev);
        setRevenueRange([0, maxRev]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalRevenue = summary.total_revenue || 0;
  const totalProfit = summary.total_profit || 0;
  const totalOrders = summary.total_orders || 0;

  // Derive unique categories for dropdown
  const categoryOptions = useMemo(() => {
    const cats = [...new Set(topProducts.map((p) => p.category))].filter(Boolean);
    return cats;
  }, [topProducts]);

  // Filtered top products based on dropdown + slider
  const filteredTopProducts = useMemo(() => {
    return topProducts.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (p.total_revenue < revenueRange[0] || p.total_revenue > revenueRange[1]) return false;
      return true;
    });
  }, [topProducts, selectedCategory, revenueRange]);

  const tabs = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
  ];

  if (loading && !error && revenueTrend.length === 0 && topProducts.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: 1280, margin: '0 auto' }}>
        <HeaderSkeleton titleWidth={240} subtitleWidth={220} />
        <CardGridSkeleton cards={4} columns="repeat(auto-fit, minmax(220px, 1fr))" minHeight={130} />
        <div style={{ marginTop: 18 }}>
          <CardGridSkeleton cards={2} columns="repeat(auto-fit, minmax(360px, 1fr))" minHeight={260} />
        </div>
      </div>
    );
  }

  return (
    <div className="owner-an">
      {/* Header */}
      <div className="owner-an-header">
        <div>
          <h1 className="owner-an-title">Analytics & Reports</h1>
          <p className="owner-an-sub">Insights into your store performance</p>
        </div>
        <div className="owner-an-actions">
          <button className="an-action-btn" onClick={fetchData} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh</button>
          <button className="an-action-btn an-print-btn" onClick={async () => {
            // Capture all Plotly charts as static PNG images, then open a clean print window
            const printBtn = document.querySelector('.an-print-btn');
            if (printBtn) { printBtn.disabled = true; printBtn.textContent = 'Preparing...'; }

            try {
              // 1) Show all tabs temporarily so we can capture hidden charts
              const hiddenTabs = document.querySelectorAll('.an-tab-hidden');
              hiddenTabs.forEach(el => { el.dataset.wasHidden = 'true'; el.style.display = 'block'; });

              // Small delay for hidden Plotly charts to render
              await new Promise(r => setTimeout(r, 500));

              // 2) Capture each Plotly chart as a base64 PNG
              const PlotlyLib = (await import('plotly.js-dist-min')).default;
              const plotEls = document.querySelectorAll('.owner-an .js-plotly-plot');
              const chartImages = [];
              for (const plotEl of plotEls) {
                try {
                  if (PlotlyLib) {
                    const imgData = await PlotlyLib.toImage(plotEl, { format: 'png', width: 900, height: 400, scale: 2 });
                    // Find the closest card title
                    const card = plotEl.closest('.an-chart-card');
                    const title = card?.querySelector('.an-card-title')?.textContent || '';
                    chartImages.push({ src: imgData, title });
                  }
                } catch { /* skip chart */ }
              }

              // 3) Re-hide tabs
              hiddenTabs.forEach(el => { if (el.dataset.wasHidden) { el.style.display = ''; delete el.dataset.wasHidden; } });

              // 4) Build print-friendly HTML
              const summaryCards = document.querySelector('.owner-an-summary');
              const topProductsList = document.querySelector('[data-tab="products"] .an-top-list');
              const lowStockTable = document.querySelector('.an-low-stock-table');
              const ordersTable = document.querySelector('[data-tab="orders"] .an-top-list');

              const now = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

              const printHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>ElectroNest Analytics Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; padding: 20px 30px; }
  h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 2px; }
  .sub { font-size: 0.85rem; color: #6b7280; margin-bottom: 16px; }
  .date { font-size: 0.75rem; color: #9ca3af; }
  .header { border-bottom: 3px solid #F97316; padding-bottom: 10px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .sum-card { border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
  .sum-label { font-size: 0.65rem; color: #9ca3af; text-transform: uppercase; font-weight: 600; letter-spacing: 0.03em; }
  .sum-value { font-size: 1.15rem; font-weight: 800; color: #1e293b; margin-top: 2px; }
  .section-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #F97316; }
  .chart-block { page-break-inside: avoid; margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
  .chart-title { font-size: 0.85rem; font-weight: 700; color: #374151; padding: 8px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
  .chart-block img { width: 100%; height: auto; display: block; }
  .chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-bottom: 10px; }
  th { background: #f9fafb; padding: 6px 10px; text-align: left; font-weight: 600; color: #6b7280; font-size: 0.7rem; text-transform: uppercase; border-bottom: 1.5px solid #e5e7eb; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
  .product-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f3f4f6; font-size: 0.8rem; }
  .product-row .rank { width: 22px; height: 22px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 700; color: #6b7280; }
  .product-row .name { flex: 1; font-weight: 600; }
  .product-row .rev { font-weight: 700; }
  .footer { text-align: center; font-size: 0.7rem; color: #9ca3af; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; }
  @media print { body { padding: 10px 15px; } .chart-block { break-inside: avoid; } }
</style></head><body>
  <div class="header">
    <div><h1>ElectroNest Analytics Report</h1><div class="sub">Store Performance Overview</div></div>
    <div class="date">Generated: ${now}</div>
  </div>

  ${summaryCards ? `<div class="summary-grid">${Array.from(summaryCards.querySelectorAll('.an-sum-card')).map(card => {
    const label = card.querySelector('.an-sum-label')?.textContent || '';
    const value = card.querySelector('.an-sum-value')?.textContent || '';
    return `<div class="sum-card"><div class="sum-label">${label}</div><div class="sum-value">${value}</div></div>`;
  }).join('')}</div>` : ''}

  <div class="section-title">Revenue Analysis</div>
  <div class="chart-grid">
    ${chartImages.slice(0, 2).map(c => `<div class="chart-block"><div class="chart-title">${c.title}</div><img src="${c.src}" /></div>`).join('')}
  </div>
  ${chartImages[2] ? `<div class="chart-block"><div class="chart-title">${chartImages[2].title}</div><img src="${chartImages[2].src}" /></div>` : ''}

  <div class="section-title">Products Analysis</div>
  <div class="chart-grid">
    ${chartImages[3] ? `<div class="chart-block"><div class="chart-title">${chartImages[3].title}</div><img src="${chartImages[3].src}" /></div>` : ''}
    <div class="chart-block"><div class="chart-title">Top Products by Revenue</div><div style="padding:8px 12px;">
      ${topProductsList ? Array.from(topProductsList.querySelectorAll('.an-top-item')).slice(0, 10).map((item, i) => {
        const name = item.querySelector('.an-top-name')?.textContent || '';
        const rev = item.querySelector('.an-top-revenue')?.textContent || '';
        const meta = item.querySelector('.an-top-meta')?.textContent || '';
        return `<div class="product-row"><span class="rank">${i + 1}</span><span class="name">${name}<br><small style="color:#9ca3af;font-weight:400">${meta}</small></span><span class="rev">${rev}</span></div>`;
      }).join('') : '<p style="color:#9ca3af;text-align:center;padding:10px">No data</p>'}
    </div></div>
  </div>

  ${lowStockTable ? `<div class="chart-block"><div class="chart-title">Low Stock Items</div><div style="padding:4px">${lowStockTable.innerHTML}</div></div>` : ''}

  <div class="section-title">Orders Analysis</div>
  <div class="chart-grid">
    ${chartImages[4] ? `<div class="chart-block"><div class="chart-title">${chartImages[4].title}</div><img src="${chartImages[4].src}" /></div>` : ''}
    <div class="chart-block"><div class="chart-title">Orders Summary</div><div style="padding:8px 12px;">
      ${ordersTable ? Array.from(ordersTable.querySelectorAll('.an-top-item')).slice(0, 6).map(item => {
        const id = item.querySelector('.an-order-id')?.textContent || '';
        const name = item.querySelector('.an-top-name')?.textContent || '';
        const status = item.querySelector('.an-top-status')?.textContent || '';
        const rev = item.querySelector('.an-top-revenue')?.textContent || '';
        return `<div class="product-row"><span class="rank">${id}</span><span class="name">${name}</span><span style="font-weight:600;font-size:0.75rem">${status}</span><span class="rev">${rev}</span></div>`;
      }).join('') : '<p style="color:#9ca3af;text-align:center;padding:10px">No data</p>'}
    </div></div>
  </div>

  <div class="footer">ElectroNest Analytics Report &mdash; ${now}</div>
</body></html>`;

              // 5) Open new window and print
              const printWindow = window.open('', '_blank', 'width=900,height=700');
              printWindow.document.write(printHtml);
              printWindow.document.close();
              printWindow.onload = () => {
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 400);
              };
            } catch (err) {
              console.error('Print error:', err);
              // Fallback to basic window.print()
              window.print();
            } finally {
              if (printBtn) { printBtn.disabled = false; printBtn.textContent = ''; }
            }
          }}><Printer size={16} /> Print</button>
          <button className="an-action-btn primary"><Download size={16} /> Export</button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="owner-an-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={fetchData} className="an-retry-btn">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="owner-an-summary">
        <div className="an-sum-card">
          <div className="an-sum-icon" style={{ background: '#3B82F6' }}><DollarSign size={20} color="#fff" /></div>
          <div><span className="an-sum-label">Total Revenue</span><span className="an-sum-value">{fmt(totalRevenue)}</span></div>
        </div>
        <div className="an-sum-card">
          <div className="an-sum-icon" style={{ background: '#10B981' }}><TrendingUp size={20} color="#fff" /></div>
          <div><span className="an-sum-label">Total Profit</span><span className="an-sum-value">{fmt(totalProfit)}</span></div>
        </div>
        <div className="an-sum-card">
          <div className="an-sum-icon" style={{ background: '#8B5CF6' }}><Users size={20} color="#fff" /></div>
          <div><span className="an-sum-label">Total Orders</span><span className="an-sum-value">{totalOrders.toLocaleString('en-IN')}</span></div>
        </div>
        <div className="an-sum-card">
          <div className="an-sum-icon" style={{ background: '#F97316' }}><Package size={20} color="#fff" /></div>
          <div><span className="an-sum-label">Low Stock Items</span><span className="an-sum-value">{lowStockProducts.length}</span></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="owner-an-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`an-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      <div className={`an-content${activeTab !== 'revenue' ? ' an-tab-hidden' : ''}`} data-tab="revenue">
          <h2 className="an-print-section-title">Revenue Analysis</h2>
          <div className="an-grid-2">
            {/* Monthly Revenue Bar Chart — Plotly */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Monthly Revenue vs Profit</h3>
              <Plot
                data={[
                  { x: monthlyRevenue.map((d) => d.month), y: monthlyRevenue.map((d) => d.revenue), type: 'bar', name: 'Revenue', marker: { color: '#3B82F6', cornerradius: 4 }, hovertemplate: '<b>%{x}</b><br>Revenue: ₹%{y:,.0f}<extra></extra>' },
                  { x: monthlyRevenue.map((d) => d.month), y: monthlyRevenue.map((d) => d.profit), type: 'bar', name: 'Profit', marker: { color: '#10B981', cornerradius: 4 }, hovertemplate: '<b>%{x}</b><br>Profit: ₹%{y:,.0f}<extra></extra>' },
                ]}
                layout={{ autosize: true, height: 300, margin: { t: 10, r: 10, b: 40, l: 60 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { family: 'inherit', size: 11, color: '#9ca3af' }, barmode: 'group', xaxis: { showgrid: false }, yaxis: { gridcolor: '#e5e7eb', tickprefix: '₹', separatethousands: true }, legend: { orientation: 'h', y: -0.2, x: 0.5, xanchor: 'center' }, hovermode: 'x unified' }}
                config={{ responsive: true, displayModeBar: false }}
                useResizeHandler style={{ width: '100%' }}
              />
            </div>

            {/* Payment Methods — SVG 3D Donut */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Revenue by Payment Method</h3>
              <SvgDonut data={paymentMethods} labelKey="name" valueKey="value" fmtVal={fmt} id="pay-donut" />
            </div>
          </div>

          {/* Daily/Weekly Revenue Trend — Plotly */}
          <div className="an-chart-card">
            <h3 className="an-card-title">
              Revenue Trend
              {revenueTrend.length > 60 && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>(Aggregated weekly)</span>}
            </h3>
            {(() => {
              const chartData = aggregateToWeekly(revenueTrend);
              const isWeekly = revenueTrend.length > 60;
              return (
                <Plot
                  data={[
                    {
                      x: chartData.map((d) => d.period),
                      y: chartData.map((d) => d.revenue),
                      type: 'scatter', mode: 'lines+markers', name: 'Revenue',
                      line: { color: '#3B82F6', width: 2.5, shape: 'spline' },
                      marker: { size: isWeekly ? 4 : 5, color: '#3B82F6' },
                      fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.08)',
                      hovertemplate: isWeekly
                        ? '<b>Week of %{x}</b><br>Revenue: NPR %{y:,.0f}<extra></extra>'
                        : '<b>%{x}</b><br>Revenue: NPR %{y:,.0f}<extra></extra>',
                    },
                    {
                      x: chartData.map((d) => d.period),
                      y: chartData.map((d) => d.profit),
                      type: 'scatter', mode: 'lines+markers', name: 'Profit',
                      line: { color: '#10B981', width: 2.5, shape: 'spline' },
                      marker: { size: isWeekly ? 4 : 5, color: '#10B981' },
                      fill: 'tozeroy', fillcolor: 'rgba(16,185,129,0.08)',
                      hovertemplate: isWeekly
                        ? '<b>Week of %{x}</b><br>Profit: NPR %{y:,.0f}<extra></extra>'
                        : '<b>%{x}</b><br>Profit: NPR %{y:,.0f}<extra></extra>',
                    },
                  ]}
                  layout={{
                    autosize: true, height: 320,
                    margin: { t: 15, r: 20, b: 50, l: 70 },
                    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                    font: { family: 'inherit', size: 11, color: '#9ca3af' },
                    xaxis: {
                      showgrid: false,
                      tickangle: -35,
                      nticks: 15,
                      tickfont: { size: 10 },
                      type: 'date',
                    },
                    yaxis: {
                      gridcolor: '#f1f5f9', gridwidth: 1,
                      tickprefix: 'NPR ', separatethousands: true,
                      tickfont: { size: 10 },
                    },
                    legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center', font: { size: 11 } },
                    hovermode: 'x unified',
                  }}
                  config={{ responsive: true, displayModeBar: false }}
                  useResizeHandler style={{ width: '100%' }}
                />
              );
            })()}
          </div>
      </div>

      {/* Orders Tab */}
      <div className={`an-content${activeTab !== 'orders' ? ' an-tab-hidden' : ''}`} data-tab="orders">
          <h2 className="an-print-section-title">Orders Analysis</h2>
          {loading ? (
            <div className="an-grid-2">
              <div className="an-chart-card an-shimmer-card">
                <div className="an-shim an-shim-title" />
                <div className="an-shim an-shim-circle" />
              </div>
              <div className="an-chart-card an-shimmer-card">
                <div className="an-shim an-shim-title" />
                <div className="an-shim an-shim-bar" style={{ marginBottom: 10 }} />
                <div className="an-shim an-shim-bar" style={{ width: '75%', marginBottom: 10 }} />
                <div className="an-shim an-shim-bar" style={{ width: '85%', marginBottom: 10 }} />
                <div className="an-shim an-shim-bar" style={{ width: '60%' }} />
              </div>
            </div>
          ) : (
            <div className="an-grid-2">
              {/* Order Status Distribution — SVG 3D Donut */}
              <div className="an-chart-card">
                <h3 className="an-card-title">Order Status Distribution</h3>
                <SvgDonut data={statusDistribution} labelKey="name" valueKey="value" colorMap={STATUS_COLORS_MAP} id="status-donut" />
              </div>

              {/* Category Performance — moved from products tab */}
              <div className="an-chart-card an-cat-chart-card">
                <h3 className="an-card-title">Category Performance</h3>
                <div className="an-cat-bar-wrap">
                  {categoryData.length === 0 ? (
                    <p className="an-no-data">No category data</p>
                  ) : (
                    <div className="an-cat-plot-host">
                      <Plot
                        data={[{
                          y: categoryData.map((d) => d.category_name),
                          x: categoryData.map((d) => d.total_revenue),
                          customdata: categoryData.map((d) => [d.total_orders ?? 0, d.product_count ?? 0]),
                          type: 'bar', orientation: 'h',
                          cliponaxis: true,
                          marker: { color: categoryData.map((_, i) => COLORS[i % COLORS.length]), cornerradius: 4 },
                          hovertemplate:
                            '<b>%{y}</b><br>Revenue: NPR %{x:,.0f}<br>Orders: %{customdata[0]} · Products: %{customdata[1]}<extra></extra>',
                        }]}
                        layout={{
                          autosize: true,
                          height: Math.max(300, categoryData.length * 44 + 72),
                          margin: { t: 12, r: 28, b: 52, l: 12 },
                          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                          font: { family: 'system-ui, -apple-system, Segoe UI, sans-serif', size: 12, color: '#374151' },
                          xaxis: {
                            gridcolor: '#e5e7eb',
                            zerolinecolor: '#e5e7eb',
                            tickprefix: 'NPR ',
                            separatethousands: true,
                            automargin: true,
                            title: { text: 'Revenue', font: { size: 11, color: '#64748b' }, standoff: 14 },
                            fixedrange: true,
                          },
                          yaxis: {
                            autorange: 'reversed',
                            automargin: true,
                            tickfont: { size: 11, color: '#334155' },
                            fixedrange: true,
                          },
                          hovermode: 'closest',
                        }}
                        config={{ responsive: true, displayModeBar: false, scrollZoom: false }}
                        useResizeHandler
                        style={{ width: '100%', minHeight: 260 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Comprehensive Forecast Modal */}
      {growthProduct && <ComprehensiveForecastModal product={growthProduct} onClose={() => setGrowthProduct(null)} />}

      <style>{`
        .owner-an { min-height: calc(100vh - 120px); background: #F3F4F6; padding: 2rem; }
        .owner-an-header { max-width: 1280px; margin: 0 auto 1.5rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
        .owner-an-title { font-size: 1.65rem; font-weight: 800; color: #1e293b; margin: 0; }
        .owner-an-sub { font-size: 0.88rem; color: #6b7280; margin-top: 0.2rem; }
        .owner-an-actions { display: flex; gap: 0.5rem; }
        .an-action-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.82rem; cursor: pointer; font-family: inherit; border: 1.5px solid #d1d5db; background: #fff; color: #4b5563; transition: all 0.15s; }
        .an-action-btn:hover { border-color: #9ca3af; background: #f3f4f6; }
        .an-action-btn.primary { background: #F97316; color: #fff; border-color: #F97316; }
        .an-action-btn.primary:hover { background: #ea580c; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        /* Error */
        .owner-an-error { max-width: 1280px; margin: 0 auto 1.25rem; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; border-radius: 10px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font-size: 0.85rem; font-weight: 500; }
        .an-retry-btn { margin-left: auto; padding: 0.35rem 0.85rem; border-radius: 6px; background: #DC2626; color: #fff; font-weight: 600; font-size: 0.78rem; border: none; cursor: pointer; font-family: inherit; }
        .an-retry-btn:hover { background: #b91c1c; }

        /* Summary */
        .owner-an-summary { max-width: 1280px; margin: 0 auto 1.5rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        .an-sum-card { background: #fff; padding: 1.15rem; border-radius: 12px; border: 1px solid #e5e7eb; display: flex; align-items: center; gap: 0.85rem; }
        .an-sum-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .an-sum-label { display: block; font-size: 0.72rem; font-weight: 500; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.03em; }
        .an-sum-value { display: block; font-size: 1.25rem; font-weight: 800; color: #1e293b; margin-top: 1px; }

        /* Tabs */
        .owner-an-tabs { max-width: 1280px; margin: 0 auto 1.25rem; display: flex; gap: 0; background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden; }
        .an-tab { flex: 1; padding: 0.65rem 1rem; text-align: center; font-weight: 600; font-size: 0.85rem; color: #6b7280; background: transparent; border: none; cursor: pointer; font-family: inherit; transition: all 0.15s; border-bottom: 2px solid transparent; }
        .an-tab:hover { color: #1e293b; background: #f9fafb; }
        .an-tab.active { color: #F97316; border-bottom-color: #F97316; background: #FFF7ED; }

        /* Content */
        .an-content { max-width: 1280px; margin: 0 auto; }
        .an-tab-hidden { display: none; }
        .an-print-section-title { display: none; }
        .an-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; margin-bottom: 1.25rem; }
        .an-grid-2 > .an-chart-card { min-width: 0; }
        .an-chart-card { background: #fff; padding: 1.5rem; border-radius: 14px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .an-card-title { font-size: 1rem; font-weight: 700; color: #1e293b; margin: 0 0 1rem; }

        /* Filters Bar */
        .an-filters-bar {
          max-width: 1280px; margin: 0 auto 1.25rem;
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
          background: #fff; padding: 0.85rem 1.25rem; border-radius: 12px;
          border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .an-filters-label { font-size: 0.82rem; font-weight: 700; color: #374151; }
        .an-filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .an-filter-lbl { font-size: 0.7rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
        .an-filter-select {
          padding: 0.4rem 0.75rem; border-radius: 8px; border: 1.5px solid #d1d5db;
          font-size: 0.82rem; font-family: inherit; color: #1e293b; background: #fff;
          cursor: pointer; min-width: 160px;
        }
        .an-filter-select:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .slider-group { min-width: 150px; }
        .an-filter-slider {
          width: 100%; height: 6px; border-radius: 3px; -webkit-appearance: none; appearance: none;
          background: linear-gradient(to right, #F97316, #3B82F6); outline: none; cursor: pointer;
        }
        .an-filter-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #fff; border: 2px solid #F97316; cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .an-filter-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff; border: 2px solid #F97316; cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .an-filter-reset {
          padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
          border: 1.5px solid #d1d5db; background: #fff; color: #6b7280; cursor: pointer;
          font-family: inherit; transition: all 0.15s; margin-left: auto;
        }
        .an-filter-reset:hover { border-color: #F97316; color: #F97316; background: #FFF7ED; }

        .an-no-data { text-align: center; color: #9ca3af; font-size: 0.85rem; padding: 1.5rem 0; }

        /* Category bar chart */
        .an-cat-chart-card { display: flex; flex-direction: column; min-width: 0; }
        .an-cat-bar-wrap {
          flex: 1;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: linear-gradient(180deg, #fafbfc 0%, #fff 40%);
        }
        .an-cat-plot-host {
          width: 100%;
          box-sizing: border-box;
          padding: 4px 2px 8px;
        }
        .an-cat-bar-wrap .js-plotly-plot,
        .an-cat-bar-wrap .plot-container,
        .an-cat-bar-wrap .svg-container {
          max-width: 100% !important;
        }

        /* Shimmer skeleton for orders tab */
        @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .an-shim {
          border-radius: 8px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 800px 100%;
          animation: shimmer 1.4s infinite linear;
        }
        .an-shim-title { height: 18px; width: 55%; margin-bottom: 18px; }
        .an-shim-circle { width: 180px; height: 180px; border-radius: 50%; margin: 12px auto; }
        .an-shim-bar { height: 28px; width: 100%; border-radius: 6px; }
        .an-shimmer-card { min-height: 300px; }

        /* Top List */
        .an-top-list { display: flex; flex-direction: column; gap: 0; }
        .an-top-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0; border-bottom: 1px solid #f3f4f6; }
        .an-top-item:last-child { border-bottom: none; }
        .an-top-rank { width: 26px; height: 26px; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #6b7280; flex-shrink: 0; }
        .an-order-id { font-weight: 700; color: #1e293b; font-size: 0.82rem; min-width: 50px; }
        .an-top-info { flex: 1; min-width: 0; }
        .an-top-name { display: block; font-weight: 600; color: #1e293b; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .an-top-meta { display: block; font-size: 0.7rem; color: #9ca3af; }
        .an-top-revenue { font-weight: 700; color: #1e293b; font-size: 0.85rem; white-space: nowrap; }
        .an-top-status { font-weight: 600; font-size: 0.78rem; white-space: nowrap; }
        .an-low-stock-table { overflow-x: auto; }
        .an-eye-btn { background: none; border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 6px; cursor: pointer; color: #9ca3af; transition: all 0.15s; display: flex; align-items: center; flex-shrink: 0; }
        .an-eye-btn:hover { color: #F97316; border-color: #F97316; background: #FFF7ED; }

        @media (max-width: 900px) {
          .owner-an { padding: 1.25rem; }
          .owner-an-summary { grid-template-columns: 1fr 1fr; }
          .an-grid-2 { grid-template-columns: 1fr; }
          .an-filters-bar { flex-direction: column; align-items: stretch; }
        }
        @media (max-width: 540px) {
          .owner-an-summary { grid-template-columns: 1fr; }
        }

        /* ── Print Styles ── */
        @media print {
          /* Force backgrounds and colors to print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          /* Reset page layout */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          /* Hide navigation, footer, and non-essential UI */
          nav, footer, header,
          .navbar, .footer-section,
          .owner-navbar, .owner-topbar,
          .owner-an-actions,
          .an-action-btn,
          .an-filters-bar,
          .an-filter-reset,
          .owner-an-tabs,
          .an-eye-btn,
          .an-retry-btn,
          .owner-an-error {
            display: none !important;
          }

          /* Show ALL hidden tab content when printing */
          .an-tab-hidden {
            display: block !important;
          }

          /* Main container — full width, no background padding */
          .owner-layout { display: block !important; }
          .owner-main-content { margin: 0 !important; padding: 0 !important; }
          .owner-an {
            padding: 0.5rem !important;
            background: #fff !important;
            min-height: auto !important;
          }

          /* Header — keep title visible */
          .owner-an-header {
            margin-bottom: 0.75rem !important;
            padding-bottom: 0.5rem !important;
            border-bottom: 2px solid #1e293b !important;
          }
          .owner-an-title {
            font-size: 1.4rem !important;
            color: #000 !important;
          }
          .owner-an-sub {
            font-size: 0.8rem !important;
            color: #555 !important;
          }

          /* Summary cards — grid, compact */
          .owner-an-summary {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 0.5rem !important;
            margin-bottom: 1rem !important;
          }
          .an-sum-card {
            padding: 0.6rem !important;
            border: 1px solid #ccc !important;
            background: #f9f9f9 !important;
            break-inside: avoid !important;
          }
          .an-sum-icon {
            width: 32px !important;
            height: 32px !important;
          }
          .an-sum-value {
            font-size: 1rem !important;
            color: #000 !important;
          }

          /* Content layout for print */
          .an-content {
            break-inside: avoid !important;
          }
          .an-print-section-title {
            display: block !important;
            font-size: 1.1rem !important;
            font-weight: 700 !important;
            color: #1e293b !important;
            margin: 1rem 0 0.5rem !important;
            padding-bottom: 0.3rem !important;
            border-bottom: 2px solid #F97316 !important;
          }

          /* Chart cards — ensure they render with borders */
          .an-chart-card {
            background: #fff !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
            padding: 1rem !important;
            margin-bottom: 0.75rem !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .an-card-title {
            color: #000 !important;
            font-size: 0.9rem !important;
            border-bottom: 1px solid #eee !important;
            padding-bottom: 0.3rem !important;
            margin-bottom: 0.5rem !important;
          }

          /* Plotly charts — ensure SVGs have explicit dimensions */
          .js-plotly-plot, .plot-container, .svg-container {
            width: 100% !important;
            height: auto !important;
            min-height: 250px !important;
          }
          .js-plotly-plot .main-svg {
            width: 100% !important;
            height: auto !important;
          }

          /* Grid layout for print */
          .an-grid-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 0.75rem !important;
          }

          /* Top product list */
          .an-top-list {
            break-inside: avoid !important;
          }
          .an-top-item {
            border-bottom: 1px solid #eee !important;
            padding: 0.4rem 0 !important;
          }
          .an-top-name, .an-top-revenue {
            color: #000 !important;
          }

          /* Low stock table */
          .an-low-stock-table table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .an-low-stock-table th,
          .an-low-stock-table td {
            border: 1px solid #ddd !important;
            padding: 0.4rem !important;
          }

          /* Page breaks */
          .an-chart-card { page-break-inside: avoid !important; }
          .an-grid-2 { page-break-inside: avoid !important; }

          /* Print footer */
          .owner-an::after {
            content: "ElectroNest Analytics Report — Printed on " attr(data-date);
            display: block;
            text-align: center;
            font-size: 0.7rem;
            color: #999;
            margin-top: 1rem;
            padding-top: 0.5rem;
            border-top: 1px solid #ddd;
          }
        }
      `}</style>
    </div>
  );
}
