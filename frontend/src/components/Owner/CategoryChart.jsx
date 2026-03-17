import { useMemo } from 'react';
import Plot from 'react-plotly.js';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#D97706', '#0891B2', '#DC2626'];
const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function CategoryChart({ data, loading }) {
  const plotData = useMemo(() => {
    if (!data || !data.length) return [];
    const sorted = [...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    return [{
      labels: sorted.map((d) => d.category_name),
      values: sorted.map((d) => d.total_revenue),
      type: 'pie',
      hole: 0.5,
      marker: { colors: COLORS.slice(0, sorted.length) },
      textinfo: 'percent',
      textposition: 'auto',
      textfont: { size: 11, color: '#fff' },
      insidetextorientation: 'horizontal',
      automargin: true,
      hovertemplate: '<b>%{label}</b><br>Revenue: NPR %{value:,.0f}<br>Share: %{percent}<extra></extra>',
      pull: sorted.map((_, i) => i === 0 ? 0.04 : 0),
      sort: false,
    }];
  }, [data]);

  const totalRevenue = useMemo(() => data?.reduce((s, d) => s + (d.total_revenue || 0), 0) || 0, [data]);
  const topCategory = useMemo(() => {
    if (!data || !data.length) return '-';
    const sorted = [...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));
    return sorted[0]?.category_name || '-';
  }, [data]);

  if (loading) {
    return (
      <div className="owner-cc-card">
        <div className="owner-chart-title">Sales by Category</div>
        <div className="cc-skeleton" />
        <style>{styles}</style>
      </div>
    );
  }

  // Empty state for time ranges with no data
  if (!data || data.length === 0) {
    return (
      <div className="owner-cc-card">
        <div className="owner-chart-title">Sales by Category</div>
        <div className="cc-empty">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#E5E7EB" strokeWidth="2" /><path d="M12 2a10 10 0 0 1 0 20" stroke="#D1D5DB" strokeWidth="2" /></svg>
          <p className="cc-empty-text">No sales data for this period</p>
          <p className="cc-empty-sub">Try selecting a longer time range</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Sort for breakdown table
  const sortedData = [...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0));

  return (
    <div className="owner-cc-card">
      <div className="owner-cc-header">
        <div>
          <div className="owner-chart-title">Sales by Category</div>
          <span className="owner-cc-sub">Revenue Distribution · Top: <strong>{topCategory}</strong></span>
        </div>
        <div className="cc-total">
          <span className="cc-total-label">Total</span>
          <span className="cc-total-value">{fmtNPR(totalRevenue)}</span>
        </div>
      </div>
      <Plot
        data={plotData}
        layout={{
          autosize: true,
          height: 300,
          margin: { t: 20, r: 40, b: 20, l: 40 },
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { family: 'inherit', size: 11 },
          showlegend: true,
          legend: { orientation: 'h', y: -0.15, x: 0.5, xanchor: 'center', font: { size: 10, color: '#4b5563' } },
          annotations: [{
            text: `${data?.length || 0}<br>Categories`,
            showarrow: false,
            font: { size: 14, color: '#1e293b', family: 'inherit' },
            x: 0.5, y: 0.5, xanchor: 'center', yanchor: 'middle',
          }],
        }}
        config={{ responsive: true, displayModeBar: false }}
        useResizeHandler
        style={{ width: '100%' }}
      />
      {/* Category breakdown table */}
      {sortedData.length > 0 && (
        <div className="cc-breakdown">
          {sortedData.slice(0, 5).map((d, i) => (
            <div key={i} className="cc-row">
              <span className="cc-dot" style={{ background: COLORS[i] }} />
              <span className="cc-cat-name">{d.category_name}</span>
              <span className="cc-cat-orders">{d.total_orders || 0} orders</span>
              <span className="cc-cat-revenue">{fmtNPR(d.total_revenue)}</span>
            </div>
          ))}
        </div>
      )}
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .owner-cc-card {
    background: #fff; padding: 1.5rem; border-radius: 14px;
    border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .owner-cc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.5rem; }
  .owner-chart-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; }
  .owner-cc-sub { font-size: 0.78rem; color: #9ca3af; }
  .owner-cc-sub strong { color: #1e293b; }
  .cc-total { text-align: right; }
  .cc-total-label { display: block; font-size: 0.7rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; }
  .cc-total-value { font-size: 1.1rem; font-weight: 700; color: #16a34a; }
  .cc-skeleton { width: 200px; height: 200px; border-radius: 50%; margin: 2rem auto; background: #f3f4f6; animation: pulse 1.5s infinite; }
  .cc-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 1rem; }
  .cc-empty-text { margin: 12px 0 4px; font-size: 0.92rem; font-weight: 600; color: #6b7280; }
  .cc-empty-sub { font-size: 0.78rem; color: #9ca3af; }
  .cc-breakdown { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; border-top: 1px solid #f3f4f6; padding-top: 0.75rem; }
  .cc-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; }
  .cc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .cc-cat-name { flex: 1; font-weight: 600; color: #374151; }
  .cc-cat-orders { color: #9ca3af; font-size: 0.72rem; }
  .cc-cat-revenue { font-weight: 700; color: #1e293b; min-width: 100px; text-align: right; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
