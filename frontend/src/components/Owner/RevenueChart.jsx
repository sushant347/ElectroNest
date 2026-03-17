import { useMemo } from 'react';
import Plot from 'react-plotly.js';
import { format, parseISO } from 'date-fns';

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

export default function RevenueChart({ data, loading }) {
  const isWeekly = data && data.length > 60;
  const chartData = useMemo(() => aggregateToWeekly(data), [data]);

  const plotData = useMemo(() => {
    if (!chartData || !chartData.length) return [];
    const dates = chartData.map((d) => {
      try { return format(parseISO(d.period), isWeekly ? 'dd MMM yy' : 'dd MMM yyyy'); } catch { return d.period; }
    });
    return [
      {
        x: dates,
        y: chartData.map((d) => d.orders),
        type: 'bar',
        name: 'Orders',
        marker: { color: 'rgba(249,115,22,0.2)', line: { color: '#F97316', width: 1 } },
        yaxis: 'y2',
        hovertemplate: isWeekly
          ? '<b>Week of %{x}</b><br>Orders: %{y}<extra></extra>'
          : '<b>%{x}</b><br>Orders: %{y}<extra></extra>',
      },
      {
        x: dates,
        y: chartData.map((d) => d.revenue),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Revenue',
        line: { color: '#3B82F6', width: 2.5, shape: 'spline' },
        marker: { size: isWeekly ? 4 : 5, color: '#3B82F6' },
        fill: 'tozeroy',
        fillcolor: 'rgba(59,130,246,0.06)',
        hovertemplate: isWeekly
          ? '<b>Week of %{x}</b><br>Revenue: NPR %{y:,.0f}<extra></extra>'
          : '<b>%{x}</b><br>Revenue: NPR %{y:,.0f}<extra></extra>',
      },
      {
        x: dates,
        y: chartData.map((d) => d.profit),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Profit',
        line: { color: '#10B981', width: 2.5, shape: 'spline' },
        marker: { size: isWeekly ? 4 : 5, color: '#10B981' },
        fill: 'tozeroy',
        fillcolor: 'rgba(16,185,129,0.06)',
        hovertemplate: isWeekly
          ? '<b>Week of %{x}</b><br>Profit: NPR %{y:,.0f}<extra></extra>'
          : '<b>%{x}</b><br>Profit: NPR %{y:,.0f}<extra></extra>',
      },
    ];
  }, [chartData, isWeekly]);

  // Summary stats
  const totalRevenue = useMemo(() => data?.reduce((s, d) => s + (d.revenue || 0), 0) || 0, [data]);
  const totalProfit = useMemo(() => data?.reduce((s, d) => s + (d.profit || 0), 0) || 0, [data]);
  const totalOrders = useMemo(() => data?.reduce((s, d) => s + (d.orders || 0), 0) || 0, [data]);

  if (loading) {
    return (
      <div className="owner-chart-card">
        <div className="owner-chart-title">Revenue Trend</div>
        <div className="owner-chart-skeleton"><div className="skel-rect" /></div>
      </div>
    );
  }

  return (
    <div className="owner-chart-card">
      <div className="owner-chart-header">
        <div className="owner-chart-title">
          Revenue Trend
          {isWeekly && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>(Weekly)</span>}
        </div>
        <div className="owner-chart-summary">
          <span className="chart-summary-item"><span className="chart-sum-dot" style={{ background: '#3B82F6' }} />Revenue: <strong>{fmtNPR(totalRevenue)}</strong></span>
          <span className="chart-summary-item"><span className="chart-sum-dot" style={{ background: '#10B981' }} />Profit: <strong>{fmtNPR(totalProfit)}</strong></span>
          <span className="chart-summary-item"><span className="chart-sum-dot" style={{ background: '#F97316' }} />Orders: <strong>{totalOrders.toLocaleString('en-IN')}</strong></span>
        </div>
      </div>
      <Plot
        data={plotData}
        layout={{
          autosize: true,
          height: 340,
          margin: { t: 10, r: 50, b: 50, l: 70 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'inherit', size: 11, color: '#9ca3af' },
          xaxis: { showgrid: false, tickangle: -35, nticks: 15, tickfont: { size: 10 } },
          yaxis: { gridcolor: '#f1f5f9', gridwidth: 1, tickprefix: 'NPR ', separatethousands: true, tickfont: { size: 10 }, title: { text: '' } },
          yaxis2: { overlaying: 'y', side: 'right', showgrid: false, tickfont: { size: 10, color: '#F97316' }, title: { text: '' } },
          legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center', font: { size: 11 } },
          hovermode: 'x unified',
          bargap: 0.3,
        }}
        config={{ responsive: true, displayModeBar: false }}
        useResizeHandler
        style={{ width: '100%' }}
      />
      <style>{`
        .owner-chart-card {
          background: #fff; padding: 1.5rem; border-radius: 14px;
          border: 1px solid #e5e7eb;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .owner-chart-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem; }
        .owner-chart-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; }
        .owner-chart-summary { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .chart-summary-item { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; color: #6b7280; }
        .chart-summary-item strong { color: #1e293b; }
        .chart-sum-dot { width: 8px; height: 8px; border-radius: 50%; }
        .owner-chart-skeleton { height: 340px; background: #f3f4f6; border-radius: 10px; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
