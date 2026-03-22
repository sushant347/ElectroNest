import { useMemo, useState } from 'react';

const COLORS = ['#F97316', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#D97706', '#0891B2', '#6366F1', '#DC2626', '#059669', '#8B5CF6', '#F43F5E'];
const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

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
  return [`M ${o1.x} ${o1.y}`, `A ${outerR} ${outerR} 0 ${large} 1 ${o2.x} ${o2.y}`, `L ${i1.x} ${i1.y}`, `A ${innerR} ${innerR} 0 ${large} 0 ${i2.x} ${i2.y}`, 'Z'].join(' ');
}

export default function CategoryChart({ data, loading }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });

  const totalRevenue = useMemo(() => data?.reduce((s, d) => s + (d.total_revenue || 0), 0) || 0, [data]);
  const sortedData = useMemo(() => data ? [...data].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)) : [], [data]);

  if (loading) {
    return (
      <div className="owner-cc-card">
        <div className="owner-chart-title">Sales by Category</div>
        <div className="cc-skeleton" />
        <style>{styles}</style>
      </div>
    );
  }

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

  const CX = 120, CY = 120, OR = 112, IR = 63;
  let cumDeg = 0;
  const segments = sortedData.map((d, i) => {
    const startDeg = cumDeg;
    const sweep = totalRevenue > 0 ? (d.total_revenue / totalRevenue) * 360 : 0;
    cumDeg += sweep;
    return {
      ...d,
      startDeg,
      endDeg: cumDeg,
      pct: totalRevenue > 0 ? (d.total_revenue / totalRevenue) * 100 : 0,
      color: COLORS[i % COLORS.length],
      path: arcPath(CX, CY, OR, IR, startDeg, cumDeg),
      midDeg: startDeg + sweep / 2,
    };
  });
  const active = hovered !== null ? segments[hovered] : null;
  const topCategory = sortedData[0]?.category_name || '-';

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

      <div className="cc-donut-body">
        <div className="cc-svg-wrap" onMouseLeave={() => setHovered(null)}>
          <svg className="cc-svg" width={240} height={240} viewBox="0 0 240 240" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <filter id="cc-seg-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#00000030" />
              </filter>
            </defs>
            {segments.map((s, i) => {
              const isActive = hovered === i;
              const midRad = ((s.midDeg - 90) * Math.PI) / 180;
              const offset = isActive ? 8 : 0;
              return (
                <path
                  key={i}
                  d={s.path}
                  fill={s.color}
                  transform={`translate(${offset * Math.cos(midRad)}, ${offset * Math.sin(midRad)})`}
                  filter={isActive ? 'url(#cc-seg-shadow)' : undefined}
                  stroke="#fff"
                  strokeWidth={isActive ? 2.5 : 1.5}
                  style={{ cursor: 'pointer', transition: 'transform 0.18s ease, filter 0.18s ease' }}
                  onMouseMove={e => { setHovered(i); setTooltip({ x: e.clientX, y: e.clientY }); }}
                  onMouseEnter={e => { setHovered(i); setTooltip({ x: e.clientX, y: e.clientY }); }}
                />
              );
            })}
            <circle cx={CX} cy={CY} r={IR - 2} fill="#fff" />
            {active ? (
              <>
                <text x={CX} y={CY - 15} textAnchor="middle" style={{ fontSize: 9, fill: active.color, fontWeight: 700, fontFamily: 'inherit' }}>
                  {active.category_name.length > 14 ? active.category_name.slice(0, 13) + '…' : active.category_name}
                </text>
                <text x={CX} y={CY + 1} textAnchor="middle" style={{ fontSize: 8, fill: '#6B7280', fontFamily: 'inherit' }}>Revenue</text>
                <text x={CX} y={CY + 16} textAnchor="middle" style={{ fontSize: 10, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                  {fmtNPR(active.total_revenue)}
                </text>
                <text x={CX} y={CY + 30} textAnchor="middle" style={{ fontSize: 10, fill: active.color, fontWeight: 600, fontFamily: 'inherit' }}>
                  {active.pct.toFixed(1)}%
                </text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 8} textAnchor="middle" style={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'inherit', fontWeight: 600 }}>
                  {sortedData.length} Categories
                </text>
                <text x={CX} y={CY + 10} textAnchor="middle" style={{ fontSize: 10, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                  {fmtNPR(totalRevenue)}
                </text>
              </>
            )}
          </svg>

          {active && (
            <div
              className="cc-tooltip"
              style={{
                position: 'fixed',
                left: tooltip.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400) ? 'auto' : tooltip.x + 14,
                right: tooltip.x > (typeof window !== 'undefined' ? window.innerWidth / 2 : 400) ? (typeof window !== 'undefined' ? window.innerWidth - tooltip.x + 14 : 'auto') : 'auto',
                top: Math.min(tooltip.y - 10, typeof window !== 'undefined' ? window.innerHeight - 150 : tooltip.y),
                zIndex: 9999,
              }}
            >
              <div className="cc-tt-cat" style={{ borderLeft: `3px solid ${active.color}` }}>{active.category_name}</div>
              <div className="cc-tt-row"><span>Revenue</span><strong style={{ color: active.color }}>{fmtNPR(active.total_revenue)}</strong></div>
              <div className="cc-tt-row"><span>Share</span><strong>{active.pct.toFixed(1)}%</strong></div>
              <div className="cc-tt-row"><span>Orders</span><strong>{active.total_orders || 0}</strong></div>
            </div>
          )}
        </div>

        <div className="cc-legend">
          {segments.map((s, i) => (
            <div
              key={i}
              className={`cc-leg-item ${hovered === i ? 'active' : ''}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <div className="cc-leg-dot" style={{ background: s.color, transform: hovered === i ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.15s' }} />
              <div className="cc-leg-info">
                <span className="cc-leg-name" style={{ color: hovered === i ? s.color : undefined }}>{s.category_name}</span>
                <span className="cc-leg-detail">
                  <span className="cc-leg-val">{fmtNPR(s.total_revenue)}</span>
                  <span className="cc-leg-pct">({s.pct.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .owner-cc-card {
    background: #fff; padding: 1.5rem; border-radius: 14px;
    border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .owner-cc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 1rem; }
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

  .cc-donut-body { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .cc-svg-wrap { position: relative; flex-shrink: 0; width: min(240px, 100%); }
  .cc-svg { width: 100%; height: auto; }

  .cc-legend { display: flex; flex-direction: column; gap: 0.4rem; flex: 1; min-width: 140px; max-height: 240px; overflow-y: auto; }
  .cc-leg-item { display: flex; align-items: center; gap: 0.5rem; padding: 3px 0; }
  .cc-leg-item.active .cc-leg-name { font-weight: 700; }
  .cc-leg-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .cc-leg-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .cc-leg-name { font-size: 0.78rem; font-weight: 600; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 130px; }
  .cc-leg-detail { display: flex; gap: 4px; align-items: center; }
  .cc-leg-val { font-size: 0.72rem; font-weight: 700; color: #1e293b; }
  .cc-leg-pct { font-size: 0.68rem; color: #9ca3af; }

  .cc-tooltip {
    background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
    padding: 10px 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    min-width: 160px; pointer-events: none;
  }
  .cc-tt-cat { font-size: 0.82rem; font-weight: 700; color: #1e293b; padding-left: 8px; margin-bottom: 8px; }
  .cc-tt-row { display: flex; justify-content: space-between; gap: 16px; font-size: 0.78rem; color: #6B7280; margin-bottom: 3px; }
  .cc-tt-row strong { font-size: 0.8rem; color: #1e293b; }

  @media (max-width: 640px) {
    .owner-cc-card { padding: 1rem; }
    .owner-cc-header { flex-direction: column; gap: 0.45rem; align-items: stretch; }
    .cc-total { text-align: left; }
    .cc-donut-body { flex-direction: column; align-items: stretch; }
    .cc-svg-wrap { margin: 0 auto; }
    .cc-legend { min-width: 0; max-height: none; }
    .cc-leg-name { max-width: 100%; }
  }

  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
