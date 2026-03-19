import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, BarChart3, Users, PieChart, CreditCard, PackageCheck, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  const [churnData, setChurnData] = useState(null);
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
      const [salesRes, trendRes, catRes, topRes, lowRes, rfmRes, churnRes, statusRes, payRes] = await Promise.all([
        adminAPI.getSalesOverview(params),
        adminAPI.getRevenueTrend(params),
        adminAPI.getCategoryPerformance(params),
        adminAPI.getTopProducts(params),
        adminAPI.getLowStockProducts(params),
        adminAPI.getCustomerSegmentation({ days: Math.min(days, 365) }).catch(() => ({ data: [] })),
        adminAPI.getChurnPrediction({ days: Math.min(days, 365) }).catch(() => ({ data: null })),
        adminAPI.getOrderStatusStats(params).catch(() => ({ data: [] })),
        adminAPI.getPaymentMethodStats(params).catch(() => ({ data: [] })),
      ]);
      setSales(salesRes.data);
      setTrend(trendRes.data || []);
      setCategories(catRes.data || []);
      setTopProducts(topRes.data || []);
      setLowStock(lowRes.data || []);
      setRfmData(rfmRes.data || []);
      setChurnData(churnRes.data);
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

      {/* ── Churn Prediction Dashboard ── */}
      {churnData && !churnData.error && churnData.customers?.length > 0 && (() => {
        const summary = churnData.summary || {};
        const modelInfo = churnData.model_info || {};
        const customers = churnData.customers || [];
        const riskColors = { 'Critical Risk': '#991B1B', 'High Risk': '#DC2626', 'Medium Risk': '#F59E0B', 'Low Risk': '#16A34A' };
        const riskBgs = { 'Critical Risk': '#FEF2F2', 'High Risk': '#FEF2F2', 'Medium Risk': '#FFFBEB', 'Low Risk': '#F0FDF4' };
        const riskSegments = ['Critical Risk', 'High Risk', 'Medium Risk', 'Low Risk'];
        const segCounts = riskSegments.map(s => customers.filter(c => c.risk_segment === s).length);

        return (
          <div className="an-chart-card" style={{ marginTop: 20 }}>
            <h3 className="an-chart-title"><ShieldAlert size={16} style={{ marginRight: 6 }} />Churn Prediction (ML-Powered)</h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '-8px 0 14px' }}>
              GradientBoosting model analyzing {summary.total_customers} customers
              {modelInfo.accuracy != null && <> — Model accuracy: <strong style={{ color: '#2563EB' }}>{(modelInfo.accuracy * 100).toFixed(1)}%</strong></>}
              {modelInfo.f1_score != null && <> | F1: <strong>{(modelInfo.f1_score * 100).toFixed(1)}%</strong></>}
            </p>

            {/* Churn KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
              <div className="an-churn-kpi" style={{ borderLeft: '4px solid #991B1B' }}>
                <span className="an-churn-kpi-val" style={{ color: '#991B1B' }}>{summary.critical_risk || 0}</span>
                <span className="an-churn-kpi-lbl">Critical Risk</span>
              </div>
              <div className="an-churn-kpi" style={{ borderLeft: '4px solid #DC2626' }}>
                <span className="an-churn-kpi-val" style={{ color: '#DC2626' }}>{summary.high_risk || 0}</span>
                <span className="an-churn-kpi-lbl">High Risk</span>
              </div>
              <div className="an-churn-kpi" style={{ borderLeft: '4px solid #F59E0B' }}>
                <span className="an-churn-kpi-val" style={{ color: '#F59E0B' }}>{summary.medium_risk || 0}</span>
                <span className="an-churn-kpi-lbl">Medium Risk</span>
              </div>
              <div className="an-churn-kpi" style={{ borderLeft: '4px solid #16A34A' }}>
                <span className="an-churn-kpi-val" style={{ color: '#16A34A' }}>{summary.low_risk || 0}</span>
                <span className="an-churn-kpi-lbl">Low Risk</span>
              </div>
            </div>

            {/* Summary banner */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Churn Rate</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#DC2626' }}>{summary.churn_rate || 0}%</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>of customers at high/critical risk</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '12px 16px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Revenue at Risk</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#EA580C' }}>{fmtNPR(summary.revenue_at_risk)}</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>from high & critical risk customers</div>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '12px 16px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>Avg Churn Probability</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#2563EB' }}>{((summary.avg_churn_probability || 0) * 100).toFixed(1)}%</div>
                <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>across all customers</div>
              </div>
            </div>

            {/* Charts Row: Risk distribution + Feature importance */}
            <div className="an-charts-row">
              <div>
                <Plot
                  data={[{
                    type: 'pie',
                    labels: riskSegments,
                    values: segCounts,
                    hole: 0.45,
                    marker: { colors: riskSegments.map(s => riskColors[s]) },
                    textinfo: 'label+value+percent',
                    textfont: { size: 11 },
                    hovertemplate: '<b>%{label}</b><br>Customers: %{value}<br>%{percent}<extra></extra>',
                  }]}
                  layout={{
                    height: 260, margin: { t: 10, b: 20, l: 10, r: 10 },
                    showlegend: false, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
                    annotations: [{ text: `${summary.churn_rate || 0}%<br><span style="font-size:9px;color:#6B7280">Churn Rate</span>`, showarrow: false, font: { size: 14, color: '#DC2626' }, x: 0.5, y: 0.5 }],
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: '100%' }}
                />
              </div>
              {modelInfo.feature_importance && (
                <div>
                  {(() => {
                    const features = Object.entries(modelInfo.feature_importance).sort((a, b) => b[1] - a[1]);
                    const featureLabels = { recency: 'Recency', frequency: 'Frequency', monetary: 'Monetary', avg_order_value: 'Avg Order Value', days_between_orders: 'Days Between Orders', order_trend: 'Order Trend', order_std: 'Order Volatility', tenure_days: 'Customer Tenure' };
                    return (
                      <Plot
                        data={[{
                          type: 'bar', orientation: 'h',
                          y: features.map(([k]) => featureLabels[k] || k),
                          x: features.map(([, v]) => v),
                          marker: { color: features.map(([, v], i) => i < 3 ? '#DC2626' : '#3B82F6'), opacity: 0.85 },
                          text: features.map(([, v]) => `${(v * 100).toFixed(1)}%`),
                          textposition: 'outside', textfont: { size: 10, color: '#374151' },
                          hovertemplate: '<b>%{y}</b><br>Importance: %{x:.1%}<extra></extra>',
                        }]}
                        layout={{
                          height: 260, margin: { t: 10, b: 30, l: 130, r: 60 },
                          xaxis: { showgrid: true, gridcolor: '#f1f5f9', tickformat: '.0%', tickfont: { size: 10 }, title: { text: 'Feature Importance', font: { size: 10, color: '#9CA3AF' } } },
                          yaxis: { autorange: 'reversed', tickfont: { size: 11 } },
                          paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', bargap: 0.15,
                        }}
                        config={{ displayModeBar: false, responsive: true }}
                        style={{ width: '100%' }}
                      />
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Top at-risk customers table */}
            <div className="an-table-wrap" style={{ marginTop: 14 }}>
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: 10 }}>
                <AlertTriangle size={14} style={{ marginRight: 6, color: '#DC2626' }} />
                Top At-Risk Customers
              </h4>
              <table className="an-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Risk</th>
                    <th>Churn Prob.</th>
                    <th>Last Order</th>
                    <th>Orders</th>
                    <th>Total Spent</th>
                    <th>Recommended Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.slice(0, 15).map((c, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{c.email}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: riskBgs[c.risk_segment] || '#F3F4F6',
                          color: riskColors[c.risk_segment] || '#6B7280',
                        }}>
                          {c.risk_segment}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 48, height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${c.churn_probability * 100}%`, background: riskColors[c.risk_segment] || '#6B7280', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: riskColors[c.risk_segment] || '#374151' }}>
                            {(c.churn_probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>{c.last_order || '-'}</td>
                      <td>{c.frequency}</td>
                      <td style={{ fontWeight: 600, color: '#16A34A' }}>{fmtNPR(c.monetary)}</td>
                      <td style={{ fontSize: '0.78rem', color: '#6B7280', maxWidth: 220 }}>{c.recommended_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── RFM Customer Segmentation ── */}
      {rfmData.length > 0 && (() => {
        const segmentCounts = rfmData.reduce((acc, c) => { acc[c.segment] = (acc[c.segment] || 0) + 1; return acc; }, {});
        const segmentRevenue = rfmData.reduce((acc, c) => { acc[c.segment] = (acc[c.segment] || 0) + (c.monetary || 0); return acc; }, {});
        const segments = Object.keys(segmentCounts);
        // Use colors from backend if available, otherwise fallback
        const fallbackColors = { Champions: '#16A34A', 'Loyal High-Value': '#059669', 'Recent Customers': '#0EA5E9', 'Loyal Customers': '#2563EB', 'Potential Loyalists': '#7C3AED', 'Promising': '#8B5CF6', 'Need Attention': '#F59E0B', 'At Risk': '#F97316', 'About to Sleep': '#EF4444', Lost: '#DC2626', Regulars: '#F97316' };
        const getSegColor = (seg) => {
          const sample = rfmData.find(c => c.segment === seg);
          return sample?.segment_color || fallbackColors[seg] || '#6B7280';
        };
        const totalCLV = rfmData.reduce((s, c) => s + (c.clv_estimate || 0), 0);
        return (
          <div className="an-chart-card" style={{ marginTop: 20 }}>
            <h3 className="an-chart-title"><Users size={16} style={{ marginRight: 6 }} />Customer Segmentation (RFM Analysis)</h3>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', margin: '-8px 0 14px' }}>
              Recency-Frequency-Monetary analysis of {rfmData.length} customers
              {totalCLV > 0 && <> — Total est. CLV: <strong style={{ color: '#16A34A' }}>{fmtNPR(totalCLV)}</strong>/yr</>}
            </p>
            <div className="an-charts-row">
              <div>
                <Plot
                  data={[{
                    type: 'pie',
                    labels: segments,
                    values: segments.map(s => segmentCounts[s]),
                    hole: 0.45,
                    marker: { colors: segments.map(s => getSegColor(s)) },
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
                    marker: { color: segments.map(s => getSegColor(s)), opacity: 0.85 },
                    text: segments.map(s => fmtNPR(segmentRevenue[s])),
                    textposition: 'outside', textfont: { size: 10, color: '#374151' },
                    hovertemplate: '<b>%{y}</b><br>Revenue: NPR %{x:,.0f}<extra></extra>',
                  }]}
                  layout={{
                    height: 280, margin: { t: 10, b: 30, l: 130, r: 80 },
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
                <thead><tr><th>Segment</th><th>Customers</th><th>Avg Recency</th><th>Avg Frequency</th><th>Total Revenue</th><th>Avg CLV/yr</th><th>Action</th></tr></thead>
                <tbody>
                  {segments.map(seg => {
                    const segCustomers = rfmData.filter(c => c.segment === seg);
                    const avgRecency = (segCustomers.reduce((s, c) => s + (c.recency || 0), 0) / segCustomers.length).toFixed(0);
                    const avgFreq = (segCustomers.reduce((s, c) => s + (c.frequency || 0), 0) / segCustomers.length).toFixed(1);
                    const totalRev = segCustomers.reduce((s, c) => s + (c.monetary || 0), 0);
                    const avgCLV = segCustomers.reduce((s, c) => s + (c.clv_estimate || 0), 0) / segCustomers.length;
                    const action = segCustomers[0]?.recommended_action || '';
                    return (
                      <tr key={seg}>
                        <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: getSegColor(seg), display: 'inline-block' }} /><strong>{seg}</strong></span></td>
                        <td>{segCustomers.length}</td>
                        <td>{avgRecency} days</td>
                        <td>{avgFreq}</td>
                        <td style={{ fontWeight: 600, color: '#16A34A' }}>{fmtNPR(totalRev)}</td>
                        <td style={{ fontWeight: 600, color: '#2563EB' }}>{fmtNPR(avgCLV)}</td>
                        <td style={{ fontSize: '0.78rem', color: '#6B7280', maxWidth: 240 }}>{action}</td>
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
