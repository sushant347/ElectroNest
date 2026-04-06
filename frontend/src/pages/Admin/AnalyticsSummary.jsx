import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, BarChart3, PieChart, CreditCard, PackageCheck } from 'lucide-react';
import Plot from 'react-plotly.js';
import { adminAPI } from '../../services/api';
import { HeaderSkeleton, CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/* ── SVG 3-D Donut helpers (shared) ── */
const DONUT_COLORS = ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#D97706', '#0891B2', '#6366F1', '#DC2626', '#059669', '#8B5CF6', '#F43F5E'];
function _ptc(cx, cy, r, deg) { const rad = ((deg - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
function _arc(cx, cy, oR, iR, s, e) {
  const se = e - s >= 359.99 ? s + 359.99 : e;
  const o1 = _ptc(cx, cy, oR, s), o2 = _ptc(cx, cy, oR, se);
  const i1 = _ptc(cx, cy, iR, se), i2 = _ptc(cx, cy, iR, s);
  return [`M ${o1.x} ${o1.y}`, `A ${oR} ${oR} 0 ${se - s > 180 ? 1 : 0} 1 ${o2.x} ${o2.y}`, `L ${i1.x} ${i1.y}`, `A ${iR} ${iR} 0 ${se - s > 180 ? 1 : 0} 0 ${i2.x} ${i2.y}`, 'Z'].join(' ');
}

function SvgCategoryDonut({ data }) {
  const [hovered, setHovered] = useState(null);
  const [tt, setTt] = useState({ x: 0, y: 0 });
  if (!data || !data.length) return <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No category data</p>;
  const total = data.reduce((s, d) => s + (d.total_revenue || 0), 0);
  if (total === 0) return <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No category data</p>;
  const CX = 120, CY = 120, OR = 108, IR = 60;
  let cum = 0;
  const segs = data.map((d, i) => {
    const start = cum, sweep = (d.total_revenue / total) * 360;
    cum += sweep;
    return { ...d, start, end: cum, pct: (d.total_revenue / total) * 100, color: DONUT_COLORS[i % DONUT_COLORS.length], path: _arc(CX, CY, OR, IR, start, cum), mid: start + sweep / 2 };
  });
  const act = hovered !== null ? segs[hovered] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
      <div style={{ position: 'relative', flexShrink: 0 }} onMouseLeave={() => setHovered(null)}>
        <svg width={240} height={240} viewBox="0 0 240 240" style={{ display: 'block', overflow: 'visible' }}>
          <defs><filter id="adm-cat-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000030"/></filter></defs>
          {segs.map((s, i) => {
            const on = hovered === i, mr = ((s.mid - 90) * Math.PI) / 180, off = on ? 8 : 0;
            return <path key={i} d={s.path} fill={s.color} transform={`translate(${off * Math.cos(mr)},${off * Math.sin(mr)})`} filter={on ? 'url(#adm-cat-shadow)' : undefined} stroke="#fff" strokeWidth={on ? 2.5 : 1.5} style={{ cursor: 'pointer', transition: 'transform 0.18s ease' }} onMouseMove={e => { setHovered(i); setTt({ x: e.clientX, y: e.clientY }); }} onMouseEnter={e => { setHovered(i); setTt({ x: e.clientX, y: e.clientY }); }} />;
          })}
          <circle cx={CX} cy={CY} r={IR - 2} fill="#fff" />
          {act ? (<>
            <text x={CX} y={CY - 14} textAnchor="middle" style={{ fontSize: 9, fill: act.color, fontWeight: 700, fontFamily: 'inherit' }}>{act.category_name?.length > 14 ? act.category_name.slice(0, 13) + '…' : act.category_name}</text>
            <text x={CX} y={CY + 2} textAnchor="middle" style={{ fontSize: 8, fill: '#6B7280', fontFamily: 'inherit' }}>Revenue</text>
            <text x={CX} y={CY + 17} textAnchor="middle" style={{ fontSize: 10, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>{fmtNPR(act.total_revenue)}</text>
            <text x={CX} y={CY + 31} textAnchor="middle" style={{ fontSize: 10, fill: act.color, fontWeight: 600, fontFamily: 'inherit' }}>{act.pct.toFixed(1)}%</text>
          </>) : (<>
            <text x={CX} y={CY - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'inherit', fontWeight: 600 }}>{data.length} Categories</text>
            <text x={CX} y={CY + 10} textAnchor="middle" style={{ fontSize: 10, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>{fmtNPR(total)}</text>
          </>)}
        </svg>
        {act && (
          <div style={{ position: 'fixed', left: tt.x > (window.innerWidth / 2) ? 'auto' : tt.x + 14, right: tt.x > (window.innerWidth / 2) ? window.innerWidth - tt.x + 14 : 'auto', top: Math.min(tt.y - 10, window.innerHeight - 150), zIndex: 9999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160, pointerEvents: 'none' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', borderLeft: `3px solid ${act.color}`, paddingLeft: 8, marginBottom: 8 }}>{act.category_name}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280', marginBottom: 3 }}><span>Revenue</span><strong style={{ color: act.color }}>{fmtNPR(act.total_revenue)}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280', marginBottom: 3 }}><span>Share</span><strong>{act.pct.toFixed(1)}%</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280' }}><span>Orders</span><strong>{act.total_orders || 0}</strong></div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 130, maxHeight: 240, overflowY: 'auto' }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '2px 0' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0, transform: hovered === i ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.15s' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: hovered === i ? s.color : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{s.category_name}</div>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{fmtNPR(s.total_revenue)} <span style={{ color: '#D1D5DB' }}>·</span> {s.pct.toFixed(1)}%</div>
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
    weeks.push({ period: chunk[0].period, revenue, profit, orders });
  }
  return weeks;
}

export default function AnalyticsSummary() {
  const [sales, setSales] = useState(null);
  const [trend, setTrend] = useState([]);
  const [categories, setCategories] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(3650);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    // Wave 1: fast core data — renders the page immediately
    try {
      const params = { days };
      const [salesRes, trendRes, catRes, topRes, statusRes, payRes] = await Promise.all([
        adminAPI.getSalesOverview(params),
        adminAPI.getRevenueTrend(params),
        adminAPI.getCategoryPerformance(params),
        adminAPI.getTopProducts(params),
        adminAPI.getOrderStatusStats(params).catch(() => ({ data: [] })),
        adminAPI.getPaymentMethodStats(params).catch(() => ({ data: [] })),
      ]);
      setSales(salesRes.data);
      setTrend(trendRes.data || []);
      setCategories(catRes.data || []);
      setTopProducts(topRes.data || []);
      setOrderStatus(statusRes.data || []);
      setPaymentMethods(payRes.data || []);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ padding: '28px 32px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <HeaderSkeleton titleWidth={220} subtitleWidth={260} />
        <CardGridSkeleton cards={4} columns="repeat(auto-fit, minmax(220px, 1fr))" minHeight={130} />
        <div style={{ marginTop: 20 }}>
          <CardGridSkeleton cards={2} columns="repeat(auto-fit, minmax(340px, 1fr))" minHeight={280} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12 }}>
        <p style={{ color: '#DC2626' }}>{error}</p>
        <button onClick={fetchData} style={{ padding: '8px 16px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  return (
    <div className="an-page">
      <div className="an-header">
        <div>
          <h1 className="an-title"><BarChart3 size={24} /> Analytics Summary</h1>
          <p className="an-subtitle">Business insights and performance metrics</p>
        </div>
        <div className="an-controls">
          {[7, 30, 90, 365, 3650].map(d => (
            <button key={d} className={`an-range-btn ${days === d ? 'active' : ''}`} onClick={() => setDays(d)}>
              {d === 3650 ? 'All Time' : d === 365 ? '1 Year' : `${d} Days`}
            </button>
          ))}
          <button className="an-refresh" onClick={fetchData}><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="an-kpi-grid">
        <div className="an-kpi"><span className="an-kpi-label">Total Revenue</span><span className="an-kpi-value green">{fmtNPR(sales?.total_revenue)}</span><span className="an-kpi-change">{sales?.revenue_change > 0 ? '↑' : '↓'} {Math.abs(sales?.revenue_change || 0)}% vs prev</span></div>
        <div className="an-kpi"><span className="an-kpi-label">Total Orders</span><span className="an-kpi-value blue">{sales?.total_orders || 0}</span><span className="an-kpi-change">{sales?.orders_change > 0 ? '↑' : '↓'} {Math.abs(sales?.orders_change || 0)}% vs prev</span></div>
        <div className="an-kpi"><span className="an-kpi-label">Total Customers</span><span className="an-kpi-value purple">{(sales?.total_customers || 0).toLocaleString('en-IN')}</span><span className="an-kpi-change">{sales?.active_customers || 0} active customers</span></div>
        <div className="an-kpi"><span className="an-kpi-label">Avg Order Value</span><span className="an-kpi-value amber">{fmtNPR(sales?.total_revenue && sales?.total_orders ? sales.total_revenue / sales.total_orders : 0)}</span><span className="an-kpi-change">Per completed order</span></div>
      </div>

      {/* Charts Row */}
      <div className="an-charts-row">
        <div className="an-chart-card">
          <h3 className="an-chart-title">
            Revenue Trend
            {trend.length > 60 && <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#9CA3AF', marginLeft: 8 }}>(Aggregated weekly)</span>}
          </h3>
          {trend.length > 0 ? (() => {
            const chartData = aggregateToWeekly(trend);
            const isWeekly = trend.length > 60;
            return (
              <Plot
                data={[
                  {
                    type: 'scatter', mode: 'lines+markers',
                    x: chartData.map(t => t.period), y: chartData.map(t => t.revenue),
                    name: 'Revenue',
                    line: { color: '#3B82F6', width: 2.5, shape: 'spline' },
                    marker: { size: isWeekly ? 3 : 4, color: '#3B82F6' },
                    fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.08)',
                    hovertemplate: isWeekly
                      ? '<b>Week of %{x}</b><br>Revenue: NPR %{y:,.0f}<extra></extra>'
                      : '<b>%{x}</b><br>Revenue: NPR %{y:,.0f}<extra></extra>',
                  },
                  {
                    type: 'scatter', mode: 'lines+markers',
                    x: chartData.map(t => t.period), y: chartData.map(t => t.profit || 0),
                    name: 'Profit',
                    line: { color: '#16A34A', width: 2.5, shape: 'spline' },
                    marker: { size: isWeekly ? 3 : 4, color: '#16A34A' },
                    fill: 'tozeroy', fillcolor: 'rgba(22,163,74,0.08)',
                    hovertemplate: isWeekly
                      ? '<b>Week of %{x}</b><br>Profit: NPR %{y:,.0f}<extra></extra>'
                      : '<b>%{x}</b><br>Profit: NPR %{y:,.0f}<extra></extra>',
                  },
                ]}
                layout={{
                  height: 300,
                  margin: { t: 15, b: 50, l: 65, r: 20 },
                  xaxis: {
                    showgrid: false,
                    tickfont: { size: 10 },
                    tickangle: -35,
                    nticks: 12,
                    type: 'date',
                  },
                  yaxis: {
                    showgrid: true, gridcolor: '#f1f5f9', gridwidth: 1,
                    tickfont: { size: 10 },
                    tickprefix: 'NPR ', separatethousands: true,
                  },
                  paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                  font: { family: 'inherit', size: 11, color: '#9ca3af' },
                  legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center', font: { size: 11 } },
                  hovermode: 'x unified',
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            );
          })() : <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No trend data</p>}
        </div>

        <div className="an-chart-card">
          <h3 className="an-chart-title">Category Performance</h3>
          <SvgCategoryDonut data={categories} />
        </div>
      </div>

      {/* ── BI Row: Order Status + Payment Methods ── */}
      <div className="an-charts-row" style={{ marginTop: 20 }}>
        <div className="an-chart-card">
          <h3 className="an-chart-title"><PackageCheck size={16} style={{ marginRight: 6 }} />Order Status Distribution</h3>
          {orderStatus.length > 0 ? (
            <Plot
              data={[{
                type: 'pie',
                labels: orderStatus.map(s => s.name),
                values: orderStatus.map(s => s.value),
                hole: 0.4,
                marker: { colors: ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#D97706', '#0891B2', '#EC4899'] },
                textinfo: 'label+value+percent',
                textfont: { size: 11 },
                hovertemplate: '<b>%{label}</b><br>Orders: %{value}<br>%{percent}<extra></extra>',
              }]}
              layout={{ height: 280, margin: { t: 10, b: 20, l: 10, r: 10 }, showlegend: false, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No order status data</p>}
        </div>

        <div className="an-chart-card">
          <h3 className="an-chart-title"><CreditCard size={16} style={{ marginRight: 6 }} />Payment Methods</h3>
          {paymentMethods.length > 0 ? (
            <Plot
              data={[{
                type: 'bar',
                x: paymentMethods.map(p => p.name),
                y: paymentMethods.map(p => p.value),
                marker: { color: ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#DC2626', '#D97706'], opacity: 0.85 },
                text: paymentMethods.map(p => fmtNPR(p.value)),
                textposition: 'outside',
                textfont: { size: 10, color: '#374151' },
                hovertemplate: '<b>%{x}</b><br>Amount: NPR %{y:,.0f}<extra></extra>',
              }]}
              layout={{
                height: 280, margin: { t: 10, b: 50, l: 60, r: 20 },
                xaxis: { tickfont: { size: 10 } },
                yaxis: { showgrid: true, gridcolor: '#f1f5f9', tickprefix: 'NPR ', tickfont: { size: 10 } },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', bargap: 0.3,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No payment data</p>}
        </div>
      </div>

      {/* Top Products Table — 1 top-selling product per store */}
      {(() => {
        const seen = new Set();
        const topPerStore = topProducts.filter(p => {
          const storeKey = (p.owner_name || '').trim().toLowerCase() || 'unknown store';
          if (seen.has(storeKey)) return false;
          seen.add(storeKey);
          return true;
        });
        return (
          <div className="an-chart-card" style={{ marginTop: 20 }}>
            <h3 className="an-chart-title">Top Product Per Store</h3>
            <div className="an-table-wrap">
              <table className="an-table">
                <thead><tr><th>#</th><th>Store</th><th>Product</th><th>Brand</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
                <tbody>
                  {topPerStore.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>No data</td></tr>
                  ) : topPerStore.map((p, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: '#F97316' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600, color: '#374151' }}>{p.owner_name || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td>{p.brand || '-'}</td>
                      <td>{p.category || '-'}</td>
                      <td>{p.total_quantity_sold}</td>
                      <td style={{ fontWeight: 600, color: '#16A34A' }}>{fmtNPR(p.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}


      <style>{`
        .an-page { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
        .an-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .an-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 10px; }
        .an-subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }
        .an-controls { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .an-range-btn { padding: 6px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer; background: #fff; color: #6B7280; }
        .an-range-btn.active { background: #DC2626; color: #fff; border-color: #DC2626; }
        .an-range-btn:hover:not(.active) { border-color: #DC2626; color: #DC2626; }
        .an-refresh { width: 34px; height: 34px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6B7280; }
        .an-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .an-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
        .an-kpi-label { font-size: 0.78rem; font-weight: 500; color: #6B7280; }
        .an-kpi-value { font-size: 1.4rem; font-weight: 700; }
        .an-kpi-value.green { color: #16A34A; }
        .an-kpi-value.blue { color: #2563EB; }
        .an-kpi-value.purple { color: #7C3AED; }
        .an-kpi-value.amber { color: #D97706; }
        .an-kpi-change { font-size: 0.72rem; color: #9CA3AF; }
        .an-charts-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 20px; }
        .an-chart-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; }
        .an-chart-title { margin: 0 0 14px; font-size: 0.95rem; font-weight: 700; color: #111827; display: flex; align-items: center; }
        .an-table-wrap { overflow-x: auto; }
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th { padding: 10px 14px; text-align: left; font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; white-space: nowrap; }
        .an-table td { padding: 10px 14px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .an-table tr:hover { background: #F9FAFB; }
        .an-churn-kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 2px; }
        .an-churn-kpi-val { font-size: 1.6rem; font-weight: 800; }
        .an-churn-kpi-lbl { font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }
        @media (max-width: 900px) { .an-kpi-grid { grid-template-columns: repeat(2, 1fr); } .an-charts-row { grid-template-columns: 1fr; } }
        @media (max-width: 600px) { .an-churn-kpi { padding: 10px 12px; } .an-churn-kpi-val { font-size: 1.2rem; } }
      `}</style>
    </div>
  );
}
