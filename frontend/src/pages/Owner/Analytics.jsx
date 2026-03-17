import { useState, useEffect, useCallback, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, AlertTriangle, Printer, Download, RefreshCw, AlertCircle, SlidersHorizontal, Eye, X } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import ComprehensiveForecastModal from '../../components/Owner/ComprehensiveForecastModal';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);
const fmtShort = (v) => { if (v >= 10000000) return `Rs.${(v / 10000000).toFixed(1)}Cr`; if (v >= 100000) return `Rs.${(v / 100000).toFixed(1)}L`; if (v >= 1000) return `Rs.${(v / 1000).toFixed(0)}K`; return `Rs.${v}`; };
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

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
    { key: 'products', label: 'Products' },
    { key: 'orders', label: 'Orders' },
  ];

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

            {/* Payment Methods Pie — Plotly */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Revenue by Payment Method</h3>
              <Plot
                data={[{
                  labels: paymentMethods.map((d) => d.name),
                  values: paymentMethods.map((d) => d.value),
                  type: 'pie', hole: 0.4,
                  marker: { colors: COLORS.slice(0, paymentMethods.length) },
                  hovertemplate: '<b>%{label}</b><br>₹%{value:,.0f}<br>%{percent}<extra></extra>',
                  textinfo: 'label+percent', textposition: 'outside', textfont: { size: 11 },
                }]}
                layout={{ autosize: true, height: 300, margin: { t: 10, r: 10, b: 10, l: 10 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { family: 'inherit', size: 11 }, showlegend: true, legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10, color: '#4b5563' } } }}
                config={{ responsive: true, displayModeBar: false }}
                useResizeHandler style={{ width: '100%' }}
              />
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

      {/* Products Tab */}
      <div className={`an-content${activeTab !== 'products' ? ' an-tab-hidden' : ''}`} data-tab="products">
          <h2 className="an-print-section-title">Products Analysis</h2>
          {/* ── Interactive Filters: Dropdown + Slider ── */}
          <div className="an-filters-bar">
            <SlidersHorizontal size={16} color="#6b7280" />
            <span className="an-filters-label">Filters:</span>

            {/* Category Dropdown */}
            <div className="an-filter-group">
              <label className="an-filter-lbl">Category</label>
              <select className="an-filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">All Categories</option>
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Revenue Range Slider */}
            <div className="an-filter-group slider-group">
              <label className="an-filter-lbl">Min Revenue: {fmtShort(revenueRange[0])}</label>
              <input type="range" className="an-filter-slider" min={0} max={maxRevenueValue} step={Math.max(1, Math.round(maxRevenueValue / 100))} value={revenueRange[0]} onChange={(e) => setRevenueRange([Number(e.target.value), revenueRange[1]])} />
            </div>
            <div className="an-filter-group slider-group">
              <label className="an-filter-lbl">Max Revenue: {fmtShort(revenueRange[1])}</label>
              <input type="range" className="an-filter-slider" min={0} max={maxRevenueValue} step={Math.max(1, Math.round(maxRevenueValue / 100))} value={revenueRange[1]} onChange={(e) => setRevenueRange([revenueRange[0], Number(e.target.value)])} />
            </div>

            <button className="an-filter-reset" onClick={() => { setSelectedCategory('all'); setRevenueRange([0, maxRevenueValue]); }}>Reset</button>
          </div>

          <div className="an-grid-2">
            {/* Category Performance — Plotly horizontal bar */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Category Performance</h3>
              <Plot
                data={[{
                  y: categoryData.map((d) => d.category_name),
                  x: categoryData.map((d) => d.total_revenue),
                  type: 'bar', orientation: 'h', name: 'Revenue',
                  marker: { color: '#F97316', cornerradius: 4 },
                  hovertemplate: '<b>%{y}</b><br>Revenue: ₹%{x:,.0f}<extra></extra>',
                }]}
                layout={{ autosize: true, height: 300, margin: { t: 0, r: 20, b: 30, l: 110 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { family: 'inherit', size: 11, color: '#374151' }, xaxis: { gridcolor: '#e5e7eb', tickprefix: '₹', separatethousands: true }, yaxis: { autorange: 'reversed' } }}
                config={{ responsive: true, displayModeBar: false }}
                useResizeHandler style={{ width: '100%' }}
              />
            </div>

            {/* Top Products (filtered) */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Top Products by Revenue {selectedCategory !== 'all' ? `(${selectedCategory})` : ''}</h3>
              <div className="an-top-list">
                {filteredTopProducts.slice(0, 10).map((p, i) => (
                  <div key={p.product_id} className="an-top-item">
                    <span className="an-top-rank">{i + 1}</span>
                    <div className="an-top-info">
                      <span className="an-top-name">{p.name}</span>
                      <span className="an-top-meta">{p.brand} · {p.total_quantity_sold.toLocaleString('en-IN')} sold</span>
                    </div>
                    <span className="an-top-revenue">{fmt(p.total_revenue)}</span>
                    <button className="an-eye-btn" title="View Growth Chart" onClick={() => setGrowthProduct(p)}>
                      <Eye size={13} />
                    </button>
                  </div>
                ))}
                {filteredTopProducts.length === 0 && <p className="an-no-data">No products match current filters</p>}
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="an-chart-card">
            <h3 className="an-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color="#CA8A04" /> Low Stock Items ({lowStockProducts.length})
            </h3>
            <div className="an-low-stock-table">
              <table className="owner-om-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '0.6rem 0.75rem', background: '#f9fafb', color: '#6b7280', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>Product</th>
                    <th style={{ padding: '0.6rem 0.75rem', background: '#f9fafb', color: '#6b7280', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                    <th style={{ padding: '0.6rem 0.75rem', background: '#f9fafb', color: '#6b7280', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Stock</th>
                    <th style={{ padding: '0.6rem 0.75rem', background: '#f9fafb', color: '#6b7280', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Reorder Level</th>
                    <th style={{ padding: '0.6rem 0.75rem', background: '#f9fafb', color: '#6b7280', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockProducts.map((p) => (
                    <tr key={p.product_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#1e293b' }}>{p.name}</td>
                      <td style={{ padding: '0.6rem 0.75rem', color: '#6b7280' }}>{p.category_name}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: (p.stock ?? p.stock_quantity ?? 0) === 0 ? '#dc2626' : '#ca8a04' }}>{p.stock ?? p.stock_quantity ?? 0}</td>
                      <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: '#6b7280' }}>{p.reorder_level}</td>
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: 20, background: (p.stock ?? p.stock_quantity ?? 0) === 0 ? '#FEE2E2' : '#FEF3C7', color: (p.stock ?? p.stock_quantity ?? 0) === 0 ? '#DC2626' : '#CA8A04' }}>
                          {(p.stock ?? p.stock_quantity ?? 0) === 0 ? 'Out of Stock' : 'Low Stock'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* Orders Tab */}
      <div className={`an-content${activeTab !== 'orders' ? ' an-tab-hidden' : ''}`} data-tab="orders">
          <h2 className="an-print-section-title">Orders Analysis</h2>
          <div className="an-grid-2">
            {/* Order Status Distribution — Plotly Pie */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Order Status Distribution</h3>
              <Plot
                data={[{
                  labels: statusDistribution.map((d) => d.name),
                  values: statusDistribution.map((d) => d.value),
                  type: 'pie', hole: 0.4,
                  marker: { colors: statusDistribution.map((d) => ({ Pending: '#F59E0B', Processing: '#3B82F6', Shipped: '#8B5CF6', Delivered: '#10B981', Cancelled: '#EF4444' }[d.name] || COLORS[0])) },
                  hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>%{percent}<extra></extra>',
                  textinfo: 'label+percent', textposition: 'outside', textfont: { size: 11 },
                }]}
                layout={{ autosize: true, height: 300, margin: { t: 10, r: 10, b: 10, l: 10 }, paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', font: { family: 'inherit', size: 11 }, showlegend: true, legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10, color: '#4b5563' } } }}
                config={{ responsive: true, displayModeBar: false }}
                useResizeHandler style={{ width: '100%' }}
              />
            </div>

            {/* Recent Orders */}
            <div className="an-chart-card">
              <h3 className="an-card-title">Orders Summary</h3>
              <div className="an-top-list">
                {recentOrders.slice(0, 6).map((o) => {
                  const sc = { Pending: '#CA8A04', Processing: '#2563EB', Shipped: '#7C3AED', Delivered: '#16A34A', Cancelled: '#DC2626' };
                  return (
                    <div key={o.id} className="an-top-item">
                      <span className="an-order-id">#{o.id}</span>
                      <div className="an-top-info">
                        <span className="an-top-name">{o.user_name}</span>
                        <span className="an-top-meta">{new Date(o.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                      <span className="an-top-status" style={{ color: sc[o.status] }}>{o.status}</span>
                      <span className="an-top-revenue">{fmt(o.grand_total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
