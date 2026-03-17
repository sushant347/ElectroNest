import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, TrendingUp, BarChart3, Users, PieChart, CreditCard, PackageCheck } from 'lucide-react';
import Plot from 'react-plotly.js';
import { adminAPI } from '../../services/api';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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
  const [lowStock, setLowStock] = useState([]);
  const [rfmData, setRfmData] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(3650);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { days };
      const [salesRes, trendRes, catRes, topRes, lowRes, rfmRes, statusRes, payRes] = await Promise.all([
        adminAPI.getSalesOverview(params),
        adminAPI.getRevenueTrend(params),
        adminAPI.getCategoryPerformance(params),
        adminAPI.getTopProducts(params),
        adminAPI.getLowStockProducts(params),
        adminAPI.getCustomerSegmentation({ days: Math.min(days, 365) }).catch(() => ({ data: [] })),
        adminAPI.getOrderStatusStats(params).catch(() => ({ data: [] })),
        adminAPI.getPaymentMethodStats(params).catch(() => ({ data: [] })),
      ]);
      setSales(salesRes.data);
      setTrend(trendRes.data || []);
      setCategories(catRes.data || []);
      setTopProducts(topRes.data || []);
      setLowStock(lowRes.data || []);
      setRfmData(rfmRes.data || []);
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#6B7280' }}>
        <RefreshCw size={24} className="spin" />
        <p>Loading analytics...</p>
        <style>{`.spin { animation: spinF 1s linear infinite; } @keyframes spinF { from { transform: rotate(0); } to { transform: rotate(360deg); } }`}</style>
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
        <div className="an-kpi"><span className="an-kpi-label">Low Stock Items</span><span className="an-kpi-value amber">{lowStock.length}</span><span className="an-kpi-change">Products below reorder level</span></div>
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
          {categories.length > 0 ? (
            <Plot
              data={[{
                type: 'pie',
                labels: categories.map(c => c.category_name),
                values: categories.map(c => c.total_revenue),
                hole: 0.45,
                marker: { colors: ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#D97706', '#0891B2', '#6366F1', '#DC2626', '#059669', '#8B5CF6', '#F43F5E'] },
                textinfo: 'label+percent',
                textfont: { size: 11 },
                hovertemplate: '<b>%{label}</b><br>Revenue: NPR %{value:,.0f}<br>%{percent}<extra></extra>',
              }]}
              layout={{ height: 280, margin: { t: 10, b: 20, l: 10, r: 10 }, showlegend: false, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent' }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>No category data</p>}
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

      {/* ── RFM Customer Segmentation ── */}
      {rfmData.length > 0 && (() => {
        const segmentCounts = rfmData.reduce((acc, c) => { acc[c.segment] = (acc[c.segment] || 0) + 1; return acc; }, {});
        const segmentRevenue = rfmData.reduce((acc, c) => { acc[c.segment] = (acc[c.segment] || 0) + (c.monetary || 0); return acc; }, {});
        const segments = Object.keys(segmentCounts);
        const segmentColors = { Champions: '#16A34A', 'Loyal Customers': '#2563EB', Regulars: '#F97316', 'At Risk': '#D97706', Lost: '#DC2626' };
        return (
          <div className="an-chart-card" style={{ marginTop: 20 }}>
            <h3 className="an-chart-title"><Users size={16} style={{ marginRight: 6 }} />Customer Segmentation (RFM Analysis)</h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '-8px 0 14px' }}>
              Recency-Frequency-Monetary analysis of {rfmData.length} customers
            </p>
            <div className="an-charts-row">
              <div>
                <Plot
                  data={[{
                    type: 'pie',
                    labels: segments,
                    values: segments.map(s => segmentCounts[s]),
                    hole: 0.45,
                    marker: { colors: segments.map(s => segmentColors[s] || '#6B7280') },
                    textinfo: 'label+value+percent',
                    textfont: { size: 11 },
                    hovertemplate: '<b>%{label}</b><br>Customers: %{value}<br>%{percent}<extra></extra>',
                  }]}
                  layout={{
                    height: 280, margin: { t: 10, b: 20, l: 10, r: 10 },
                    showlegend: false, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                    annotations: [{ text: `${rfmData.length}<br><span style="font-size:10px;color:#6B7280">Customers</span>`, showarrow: false, font: { size: 14, color: '#111827' }, x: 0.5, y: 0.5 }],
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <Plot
                  data={[{
                    type: 'bar', orientation: 'h',
                    y: segments, x: segments.map(s => segmentRevenue[s]),
                    marker: { color: segments.map(s => segmentColors[s] || '#6B7280'), opacity: 0.85 },
                    text: segments.map(s => fmtNPR(segmentRevenue[s])),
                    textposition: 'outside', textfont: { size: 10, color: '#374151' },
                    hovertemplate: '<b>%{y}</b><br>Revenue: NPR %{x:,.0f}<extra></extra>',
                  }]}
                  layout={{
                    height: 280, margin: { t: 10, b: 30, l: 110, r: 80 },
                    xaxis: { showgrid: true, gridcolor: '#f1f5f9', tickprefix: 'NPR ', tickfont: { size: 10 } },
                    yaxis: { autorange: 'reversed', tickfont: { size: 11 } },
                    paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', bargap: 0.2,
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            {/* RFM Segment summary table */}
            <div className="an-table-wrap" style={{ marginTop: 14 }}>
              <table className="an-table">
                <thead><tr><th>Segment</th><th>Customers</th><th>Avg Recency (days)</th><th>Avg Frequency</th><th>Total Revenue</th><th>Avg Revenue</th></tr></thead>
                <tbody>
                  {segments.map(seg => {
                    const segCustomers = rfmData.filter(c => c.segment === seg);
                    const avgRecency = (segCustomers.reduce((s, c) => s + (c.recency || 0), 0) / segCustomers.length).toFixed(0);
                    const avgFreq = (segCustomers.reduce((s, c) => s + (c.frequency || 0), 0) / segCustomers.length).toFixed(1);
                    const totalRev = segCustomers.reduce((s, c) => s + (c.monetary || 0), 0);
                    const avgRev = totalRev / segCustomers.length;
                    return (
                      <tr key={seg}>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: segmentColors[seg] || '#6B7280', display: 'inline-block' }} /><strong>{seg}</strong></span></td>
                        <td>{segCustomers.length}</td>
                        <td>{avgRecency}</td>
                        <td>{avgFreq}</td>
                        <td style={{ fontWeight: 600, color: '#16A34A' }}>{fmtNPR(totalRev)}</td>
                        <td>{fmtNPR(avgRev)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Top Products Table */}
      <div className="an-chart-card" style={{ marginTop: 20 }}>
        <h3 className="an-chart-title">Top 10 Products</h3>
        <div className="an-table-wrap">
          <table className="an-table">
            <thead><tr><th>#</th><th>Product</th><th>Brand</th><th>Category</th><th>Units Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>No data</td></tr>
              ) : topProducts.map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 700, color: '#F97316' }}>{i + 1}</td>
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

      {/* Low Stock Alert Table */}
      {lowStock.length > 0 && (
        <div className="an-chart-card" style={{ marginTop: 20 }}>
          <h3 className="an-chart-title" style={{ color: '#D97706' }}>Low Stock Alert ({lowStock.length} items)</h3>
          <div className="an-table-wrap">
            <table className="an-table">
              <thead><tr><th>#</th><th>Product</th><th>Category</th><th>Stock</th><th>Reorder Level</th><th>Status</th></tr></thead>
              <tbody>
                {lowStock.slice(0, 15).map((p, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, color: '#9CA3AF' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.category_name || '-'}</td>
                    <td style={{ fontWeight: 700, color: (p.stock || p.stock_quantity || 0) <= 0 ? '#DC2626' : '#D97706' }}>{p.stock || p.stock_quantity || 0}</td>
                    <td>{p.reorder_level}</td>
                    <td><span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: (p.stock || p.stock_quantity || 0) <= 0 ? '#FEE2E2' : '#FEF3C7', color: (p.stock || p.stock_quantity || 0) <= 0 ? '#DC2626' : '#D97706' }}>{(p.stock || p.stock_quantity || 0) <= 0 ? 'Out of Stock' : 'Low Stock'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
        .an-chart-title { margin: 0 0 14px; font-size: 0.95rem; font-weight: 700; color: #111827; }
        .an-table-wrap { overflow-x: auto; }
        .an-table { width: 100%; border-collapse: collapse; }
        .an-table th { padding: 10px 14px; text-align: left; font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; }
        .an-table td { padding: 10px 14px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .an-table tr:hover { background: #F9FAFB; }
        @media (max-width: 900px) { .an-kpi-grid { grid-template-columns: repeat(2, 1fr); } .an-charts-row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
