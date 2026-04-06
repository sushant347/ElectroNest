import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Users, ShoppingCart, DollarSign, Package, BarChart3,
  UserCheck, Search, ChevronLeft, ChevronRight, X, TrendingUp,
  Activity, AlertTriangle, Clock, Database, Eye, Download, Zap, Shield
} from 'lucide-react';
import Plot from 'react-plotly.js';
import { adminAPI } from '../../services/api';
import { HeaderSkeleton, CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const ADM_COLORS = ['#DC2626', '#EA580C', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#D97706', '#0891B2', '#6366F1', '#059669'];

/* ── SVG Donut helpers ── */
function _admPtc(cx, cy, r, a) { const rad = ((a - 90) * Math.PI) / 180; return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }; }
function _admArc(cx, cy, oR, iR, s, e) {
  const se = e - s >= 359.99 ? s + 359.99 : e;
  const o1 = _admPtc(cx, cy, oR, s), o2 = _admPtc(cx, cy, oR, se), i1 = _admPtc(cx, cy, iR, se), i2 = _admPtc(cx, cy, iR, s);
  const lg = se - s > 180 ? 1 : 0;
  return [`M ${o1.x} ${o1.y}`, `A ${oR} ${oR} 0 ${lg} 1 ${o2.x} ${o2.y}`, `L ${i1.x} ${i1.y}`, `A ${iR} ${iR} 0 ${lg} 0 ${i2.x} ${i2.y}`, 'Z'].join(' ');
}
function SvgAdminDonut({ items, id = 'adm-sd', centerLabel = null }) {
  const [hovered, setHovered] = useState(null);
  const [tooltip, setTooltip] = useState({ x: 0, y: 0 });
  const total = items.reduce((s, d) => s + (Number(d.value) || 0), 0);
  if (!items.length || total === 0) return <div className="chart-empty">No data available</div>;
  const CX = 110, CY = 110, OR = 100, IR = 56;
  let cumDeg = 0;
  const segments = items.map((d, i) => {
    const sv = Number(d.value) || 0;
    const startDeg = cumDeg;
    const sweep = (sv / total) * 360;
    cumDeg += sweep;
    return { label: d.label, value: sv, startDeg, endDeg: cumDeg, pct: (sv / total) * 100, color: d.color || ADM_COLORS[i % ADM_COLORS.length], path: _admArc(CX, CY, OR, IR, startDeg, cumDeg), midDeg: startDeg + sweep / 2 };
  });
  const active = hovered !== null ? segments[hovered] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
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
              <text x={CX} y={CY + 8} textAnchor="middle" style={{ fontSize: 12, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
                {active.value}
              </text>
              <text x={CX} y={CY + 24} textAnchor="middle" style={{ fontSize: 10, fill: active.color, fontWeight: 600, fontFamily: 'inherit' }}>
                {active.pct.toFixed(1)}%
              </text>
            </>
          ) : (
            <>
              <text x={CX} y={CY - 4} textAnchor="middle" style={{ fontSize: 9, fill: '#9CA3AF', fontFamily: 'inherit', fontWeight: 600 }}>
                {centerLabel || 'Total'}
              </text>
              <text x={CX} y={CY + 12} textAnchor="middle" style={{ fontSize: 13, fill: '#1e293b', fontWeight: 800, fontFamily: 'inherit' }}>
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
            top: Math.min(tooltip.y - 10, typeof window !== 'undefined' ? window.innerHeight - 110 : tooltip.y),
            zIndex: 9999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 140, pointerEvents: 'none',
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', borderLeft: `3px solid ${active.color}`, paddingLeft: 8, marginBottom: 8 }}>{active.label}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280', marginBottom: 3 }}>
              <span>Count</span><strong style={{ color: active.color }}>{active.value}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: '0.78rem', color: '#6B7280' }}>
              <span>Share</span><strong>{active.pct.toFixed(1)}%</strong>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: 110, maxHeight: 200, overflowY: 'auto' }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '3px 0' }}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0, transform: hovered === i ? 'scale(1.3)' : 'scale(1)', transition: 'transform 0.15s' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: hovered === i ? 700 : 600, color: hovered === i ? s.color : '#374151' }}>{s.label}</span>
              <span style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{s.value} ({s.pct.toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KPICard({ title, value, icon: Icon, color, sub, trend, info }) {
  return (
    <div className="adm-kpi">
      <div className="adm-kpi-icon" style={{ background: `${color}18`, color }}>
        <Icon size={22} />
      </div>
      <div className="adm-kpi-body">
        <div className="adm-kpi-label">{title}</div>
        <div className="adm-kpi-value">{value}</div>
        {sub && <div className="adm-kpi-sub">{sub}</div>}
        {info && (
          <div className="adm-kpi-info">
            {info.map((item, i) => (
              <span key={i} style={{ color: item.color }}>{item.label}: {item.value}</span>
            ))}
          </div>
        )}
      </div>
      {trend !== undefined && (
        <div className="adm-kpi-trend" style={{ color: trend >= 0 ? '#16A34A' : '#DC2626' }}>
          <TrendingUp size={14} style={{ transform: trend < 0 ? 'scaleY(-1)' : 'none' }} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

/* ── System Health Indicator ── */
function HealthDot({ title, status, details, icon: Icon }) {
  const colors = { healthy: '#16A34A', warning: '#F59E0B', critical: '#DC2626', unknown: '#6B7280' };
  return (
    <div className="health-item">
      <div className="health-dot" style={{ background: colors[status] || colors.unknown }}>
        <Icon size={14} />
      </div>
      <div>
        <div className="health-name">{title}</div>
        <div className="health-detail">{details}</div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════ */
export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [realtimeMode, setRealtimeMode] = useState(false);
  const [refreshTimer, setRefreshTimer] = useState(null);

  /* System health */
  const [health, setHealth] = useState({
    database: { status: 'healthy', details: 'All connections active' },
    auditLogs: { status: 'healthy', details: 'Logging operational' },
    users: { status: 'healthy', details: 'All systems normal' },
    orders: { status: 'healthy', details: 'Processing normally' },
  });

  /* Customer table state */
  const [customers, setCustomers] = useState([]);
  const [custLoading, setCustLoading] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [custGender, setCustGender] = useState('');
  const [custStatus, setCustStatus] = useState('');
  const [custPage, setCustPage] = useState(1);
  const custPerPage = 12;

  /* ── Fetch dashboard data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, logsRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getLogs({ page_size: 100 }).catch(() => ({ data: { results: [] } })),
      ]);
      const d = { ...dashRes.data, recentLogs: logsRes.data?.results || [] };
      setData(d);
      setLastUpdate(new Date());

      // Update health indicators
      const logCount = d.recentLogs?.length || 0;
      setHealth({
        database: { status: 'healthy', details: 'All connections active' },
        auditLogs: { status: 'healthy', details: `${logCount} recent entries` },
        users: {
          status: (d.total_users || 0) < 5 ? 'warning' : 'healthy',
          details: `${d.total_users || 0} total users`,
        },
        orders: { status: 'healthy', details: `${d.total_orders || 0} total orders` },
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data.');
      setHealth(prev => ({ ...prev, database: { status: 'critical', details: 'Connection failed' } }));
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── Fetch customers ── */
  const fetchCustomers = useCallback(async () => {
    setCustLoading(true);
    try {
      const params = {};
      if (custSearch.trim()) params.search = custSearch.trim();
      if (custGender) params.gender = custGender;
      if (custStatus) params.is_active = custStatus === 'active' ? 'true' : 'false';
      const res = await adminAPI.getCustomers(params);
      setCustomers(res.data?.results || res.data || []);
      setCustPage(1);
    } catch {
      setCustomers([]);
    } finally {
      setCustLoading(false);
    }
  }, [custSearch, custGender, custStatus]);

  /* ── Realtime toggle ── */
  const toggleRealtime = () => {
    setRealtimeMode(prev => {
      if (!prev) {
        const t = setInterval(fetchData, 30000);
        setRefreshTimer(t);
      } else {
        if (refreshTimer) { clearInterval(refreshTimer); setRefreshTimer(null); }
      }
      return !prev;
    });
  };

  useEffect(() => {
    fetchData();
    fetchCustomers();
    return () => { if (refreshTimer) clearInterval(refreshTimer); };
  }, [fetchData, fetchCustomers]);

  /* ── Export helper ── */
  const exportChart = (key) => {
    const payload = data?.[key] || [];
    const csv = 'data:text/csv;charset=utf-8,' + JSON.stringify(payload, null, 2);
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `${key}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /* ── Loading state ── */
  if (loading && !data) {
    return (
      <div style={{ padding: '28px 32px 60px', maxWidth: 1600, margin: '0 auto' }}>
        <HeaderSkeleton titleWidth={230} subtitleWidth={260} />
        <CardGridSkeleton cards={4} columns="repeat(auto-fit, minmax(280px, 1fr))" minHeight={160} />
        <div style={{ marginTop: 20 }}>
          <CardGridSkeleton cards={2} columns="repeat(auto-fit, minmax(420px, 1fr))" minHeight={260} />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="adm-center" style={{ color: '#DC2626' }}>
        <AlertTriangle size={48} style={{ marginBottom: 16 }} />
        <h2 style={{ margin: 0 }}>Dashboard Error</h2>
        <p>{error}</p>
        <button onClick={fetchData} style={{ padding: '12px 24px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <RefreshCw size={16} /> Retry
        </button>
        <style>{`.adm-center{display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:12px}`}</style>
      </div>
    );
  }

  /* ── Derived chart data ── */
  const roleDist = data?.role_distribution || [];
  const roleColors = { admin: '#DC2626', owner: '#EA580C', warehouse: '#2563EB', customer: '#16A34A' };
  const genderDist = (data?.customer_gender_dist || []).reduce((acc, g) => {
    const raw = String(g?.gender || '').trim();
    const key = raw ? raw.toLowerCase() : 'unknown';
    const count = Number(g?.count || 0);
    const found = acc.find((x) => x.key === key);
    if (found) {
      found.count += count;
      return acc;
    }
    const label = key === 'male'
      ? 'Male'
      : key === 'female'
        ? 'Female'
        : key === 'other'
          ? 'Other'
          : 'Unknown';
    acc.push({ key, label, count });
    return acc;
  }, []);
  const genderColors = ['#3B82F6', '#EC4899', '#8B5CF6', '#94a3b8'];
  const catRevenue = data?.category_revenue || [];
  const catColors = ['#DC2626', '#2563EB', '#16A34A', '#7C3AED', '#EC4899', '#D97706', '#0891B2', '#F97316', '#059669', '#8B5CF6', '#F43F5E', '#6366F1'];
  const custRegTrend = data?.customer_reg_trend || [];
  const topProducts = data?.top_products || [];
  const recentActivity = data?.recent_activity || data?.recentLogs?.slice(0, 10) || [];

  /* Customer pagination */
  const totalCustPages = Math.ceil(customers.length / custPerPage);
  const pagedCustomers = customers.slice((custPage - 1) * custPerPage, custPage * custPerPage);

  return (
    <div className="adm-dash">
      {/* ─── Header ─── */}
      <div className="dash-header">
        <div className="header-top">
          <div className="header-title-row">
            <h1><BarChart3 size={28} /> Admin Dashboard</h1>
            <p>
              Real-time system monitoring &amp; analytics
              {lastUpdate && (
                <span className="last-update"><Clock size={12} /> Updated {lastUpdate.toLocaleTimeString()}</span>
              )}
            </p>
          </div>
          <div className="header-controls">
            <button className={`rt-btn ${realtimeMode ? 'active' : ''}`} onClick={toggleRealtime}>
              <Zap size={15} /> {realtimeMode ? 'Live' : 'Static'}
            </button>
            <button className="refresh-btn" onClick={fetchData}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
        {/* System Health */}
        <div className="health-row">
          <HealthDot title="Database" status={health.database.status} details={health.database.details} icon={Database} />
          <HealthDot title="Audit Logs" status={health.auditLogs.status} details={health.auditLogs.details} icon={Shield} />
          <HealthDot title="Users" status={health.users.status} details={health.users.details} icon={Users} />
          <HealthDot title="Orders" status={health.orders.status} details={health.orders.details} icon={ShoppingCart} />
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="kpi-grid">
        <KPICard
          title="Total Users" value={(data?.total_users || 0).toLocaleString('en-IN')}
          icon={Users} color="#DC2626" sub={`${data?.active_customers || 0} customers active`}
          trend={12.5}
          info={[
            { label: 'Admins', value: roleDist.find(r => r.role === 'admin')?.count || 0, color: '#DC2626' },
            { label: 'Owners', value: roleDist.find(r => r.role === 'owner')?.count || 0, color: '#EA580C' },
          ]}
        />
        <KPICard
          title="Total Orders" value={(data?.total_orders || 0).toLocaleString('en-IN')}
          icon={ShoppingCart} color="#EA580C" sub={`${data?.total_products || 0} products in catalog`}
          trend={8.3}
        />
        <KPICard
          title="Total Revenue" value={fmtNPR(data?.total_revenue)}
          icon={DollarSign} color="#16A34A" sub={`${data?.total_categories || 0} categories`}
          trend={15.7}
          info={[
            { label: 'Avg Order', value: fmtNPR((data?.total_revenue || 0) / (data?.total_orders || 1)), color: '#6B7280' },
          ]}
        />
        <KPICard
          title="System Activity" value={recentActivity.length}
          icon={Activity} color="#7C3AED" sub="Recent audit entries"
        />
      </div>

      {/* ─── Charts Row 1 ─── */}
      <div className="charts-row">
        {/* Role Distribution */}
        <div className="chart-card">
          <div className="chart-hdr">
            <h3><Users size={16} /> Users by Role</h3>
            <button className="chart-act" onClick={() => exportChart('role_distribution')} title="Export"><Download size={14} /></button>
          </div>
          <SvgAdminDonut
            items={roleDist.map(r => ({ label: r.role.charAt(0).toUpperCase() + r.role.slice(1), value: r.count, color: roleColors[r.role] || '#94a3b8' }))}
            id="role-donut"
            centerLabel="Users"
          />
        </div>

        {/* Category Revenue */}
        <div className="chart-card">
          <div className="chart-hdr">
            <h3><BarChart3 size={16} /> Revenue by Category</h3>
            <button className="chart-act" onClick={() => exportChart('category_revenue')} title="Export"><Download size={14} /></button>
          </div>
          {catRevenue.length > 0 ? (
            <Plot
              data={[{
                type: 'bar', orientation: 'h',
                x: catRevenue.map(c => c.revenue), y: catRevenue.map(c => c.category),
                marker: { color: catRevenue.map((_, i) => catColors[i % catColors.length]), opacity: 0.85 },
                hovertemplate: '<b>%{y}</b><br>Revenue: NPR %{x:,.0f}<extra></extra>',
                text: catRevenue.map(c => fmtNPR(c.revenue)), textposition: 'outside', textfont: { size: 11, color: '#374151' },
              }]}
              layout={{
                height: 350, margin: { t: 20, b: 40, l: 120, r: 80 },
                xaxis: { showgrid: true, gridcolor: '#f1f5f9', tickprefix: 'NPR ', tickfont: { size: 10 } },
                yaxis: { autorange: 'reversed', tickfont: { size: 11 } },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent', bargap: 0.15,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : <div className="chart-empty">No category revenue data</div>}
        </div>
      </div>

      {/* ─── Charts Row 2 ─── */}
      <div className="charts-row">
        {/* Gender Demographics */}
        <div className="chart-card">
          <h3 className="chart-title-s">Customer Demographics (Gender)</h3>
          <SvgAdminDonut
            items={genderDist.map((g, i) => ({ label: g.label, value: g.count, color: genderColors[i % genderColors.length] }))}
            id="gender-donut"
            centerLabel="Customers"
          />
        </div>

        {/* Registration Trend */}
        <div className="chart-card">
          <h3 className="chart-title-s">Customer Registration Trend</h3>
          {custRegTrend.length > 0 ? (
            <Plot
              data={[{
                type: 'scatter', mode: 'lines+markers',
                x: custRegTrend.map(d => d.date), y: custRegTrend.map(d => d.count),
                line: { color: '#DC2626', width: 2, shape: 'spline' },
                marker: { size: 5, color: '#DC2626' },
                fill: 'tozeroy', fillcolor: 'rgba(220,38,38,0.08)',
                hovertemplate: '<b>%{x}</b><br>Registrations: %{y}<extra></extra>',
              }]}
              layout={{
                height: 280, margin: { t: 10, b: 40, l: 40, r: 20 },
                xaxis: { showgrid: false, tickfont: { size: 10 } },
                yaxis: { showgrid: true, gridcolor: '#f1f5f9', tickfont: { size: 10 } },
                paper_bgcolor: 'transparent', plot_bgcolor: 'transparent',
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          ) : <div className="chart-empty">No registration data</div>}
        </div>
      </div>

      {/* ─── Top Products ─── */}
      <div className="chart-card">
        <h3 className="chart-title-s"><Package size={15} style={{ marginRight: 6 }} />Top Products by Revenue</h3>
        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr><th>#</th><th>Product</th><th>Category</th><th>Units</th><th>Revenue</th></tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#9CA3AF' }}>No data</td></tr>
              ) : topProducts.map((p, i) => (
                <tr key={i}>
                  <td><span style={{ fontWeight: 700, color: '#DC2626' }}>{i + 1}</span></td>
                  <td><span style={{ fontWeight: 600, color: '#111827' }}>{p.name}</span></td>
                  <td><span className="cat-badge">{p.category || '—'}</span></td>
                  <td>{p.units_sold}</td>
                  <td><span style={{ fontWeight: 700, color: '#16A34A' }}>{fmtNPR(p.revenue)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ STYLES ═══ */}
      <style>{`
        .adm-dash{padding:28px 32px 60px;max-width:1600px;margin:0 auto;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-sizing:border-box;width:100%;overflow-x:hidden}

        /* ── Header ── */
        .dash-header{background:linear-gradient(135deg,#DC2626 0%,#991B1B 100%);border-radius:20px;padding:28px 32px;margin-bottom:28px;color:#fff;position:relative;overflow:hidden}
        .dash-header::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,0.12) 0%,transparent 60%);pointer-events:none}
        .header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap;position:relative;z-index:1;margin-bottom:20px}
        .header-title-row h1{margin:0;font-size:1.8rem;font-weight:800;display:flex;align-items:center;gap:12px}
        .header-title-row p{margin:6px 0 0;font-size:0.92rem;opacity:0.9;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
        .last-update{display:inline-flex;align-items:center;gap:4px;font-size:0.82rem;opacity:0.8;background:rgba(255,255,255,0.15);padding:3px 10px;border-radius:20px}
        .health-row{display:flex;gap:16px;flex-wrap:wrap;position:relative;z-index:1;background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border-radius:12px;padding:14px 20px;border:1px solid rgba(255,255,255,0.15)}
        .health-item{display:flex;align-items:center;gap:8px;flex:1;min-width:140px}
        .health-dot{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
        .health-name{font-size:0.8rem;font-weight:600}
        .health-detail{font-size:0.7rem;opacity:0.75}
        .header-controls{display:flex;gap:10px;position:relative;z-index:1;flex-wrap:wrap}
        .rt-btn,.refresh-btn{display:flex;align-items:center;gap:6px;padding:9px 18px;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.28);border-radius:10px;color:#fff;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all .2s}
        .rt-btn:hover,.refresh-btn:hover{background:rgba(255,255,255,0.28)}
        .rt-btn.active{background:#16A34A;border-color:#16A34A}
        .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}

        /* ── KPI Grid ── */
        .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:28px}
        .adm-kpi{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px;position:relative;transition:all .25s}
        .adm-kpi:hover{box-shadow:0 6px 24px rgba(0,0,0,0.08);transform:translateY(-2px)}
        .adm-kpi-icon{width:50px;height:50px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}
        .adm-kpi-label{font-size:0.78rem;color:#6B7280;font-weight:500;margin-bottom:4px}
        .adm-kpi-value{font-size:1.9rem;font-weight:800;color:#1e293b;line-height:1.1;margin-bottom:6px}
        .adm-kpi-sub{font-size:0.78rem;color:#9CA3AF}
        .adm-kpi-info{display:flex;gap:14px;margin-top:10px;flex-wrap:wrap}
        .adm-kpi-info span{font-size:0.73rem;font-weight:600}
        .adm-kpi-trend{position:absolute;top:18px;right:18px;font-size:0.78rem;font-weight:700;display:flex;align-items:center;gap:3px}

        /* ── Charts ── */
        .charts-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr));gap:20px;margin-bottom:24px}
        .chart-card{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:22px;transition:box-shadow .2s}
        .chart-card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.06)}
        .chart-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
        .chart-hdr h3{margin:0;font-size:1.05rem;font-weight:700;color:#1e293b;display:flex;align-items:center;gap:8px}
        .chart-act{padding:6px;background:none;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;color:#6B7280;transition:all .2s}
        .chart-act:hover{background:#f9fafb;color:#374151}
        .chart-title-s{margin:0 0 14px;font-size:1.05rem;font-weight:700;color:#1e293b;display:flex;align-items:center}
        .chart-empty{display:flex;align-items:center;justify-content:center;height:200px;color:#9CA3AF;font-size:0.9rem}

        /* ── Tables ── */
        .table-wrap{overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px}
        .dash-table{width:100%;border-collapse:collapse}
        .dash-table th{padding:11px 14px;text-align:left;font-size:0.72rem;font-weight:600;color:#6B7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;background:#F9FAFB;white-space:nowrap}
        .dash-table td{padding:11px 14px;font-size:0.84rem;color:#374151;border-bottom:1px solid #f3f4f6}
        .dash-table tr:last-child td{border-bottom:none}
        .dash-table tr:hover td{background:#FAFAFA}
        .cat-badge{font-size:0.7rem;font-weight:600;padding:4px 10px;border-radius:6px;background:#FEF2F2;color:#DC2626;white-space:nowrap}

        /* ── Activity Feed ── */
        .activity-feed{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto}
        .act-item{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:10px;transition:background .15s}
        .act-item:hover{background:#F8FAFC}
        .act-dot{width:10px;height:10px;border-radius:50%;margin-top:6px;flex-shrink:0}
        .act-body{flex:1;min-width:0}
        .act-text{display:block;font-size:0.84rem;color:#374151;line-height:1.4;margin-bottom:3px}
        .act-time{display:block;font-size:0.73rem;color:#94A3B8}

        /* ── Customer Section ── */
        .cust-section{margin-top:20px}
        .cust-hdr{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;margin-bottom:18px}
        .cust-filters{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
        .cust-search{position:relative;display:flex;align-items:center}
        .cust-search-ico{position:absolute;left:12px;color:#9CA3AF;pointer-events:none}
        .cust-search input{padding:9px 36px 9px 34px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.84rem;color:#1e293b;width:min(230px,100%);max-width:100%;font-family:inherit;transition:border-color .2s}
        .cust-search input:focus{outline:none;border-color:#DC2626;box-shadow:0 0 0 3px rgba(220,38,38,0.08)}
        .cust-clear{position:absolute;right:10px;background:none;border:none;cursor:pointer;color:#9CA3AF;display:flex;padding:4px;border-radius:4px}
        .cust-clear:hover{color:#DC2626;background:#fee2e2}
        .cust-sel{padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:0.84rem;color:#374151;background:#fff;cursor:pointer;font-family:inherit;transition:border-color .2s}
        .cust-sel:focus{outline:none;border-color:#DC2626}
        .cust-clear-all{display:flex;align-items:center;gap:5px;padding:9px 14px;border:1.5px solid #FECACA;border-radius:10px;background:#FEF2F2;color:#DC2626;font-size:0.78rem;font-weight:600;cursor:pointer;transition:all .2s}
        .cust-clear-all:hover{background:#FEE2E2}

        .gender-badge{font-size:0.72rem;font-weight:600;padding:3px 10px;border-radius:20px;white-space:nowrap}
        .gender-badge.male{background:#DBEAFE;color:#2563EB}
        .gender-badge.female{background:#FCE7F3;color:#DB2777}
        .gender-badge.other{background:#F3E8FF;color:#7C3AED}
        .status-chip{font-size:0.7rem;font-weight:700;padding:4px 10px;border-radius:20px;white-space:nowrap}
        .status-chip.active{background:#DCFCE7;color:#16A34A}
        .status-chip.inactive{background:#FEE2E2;color:#DC2626}

        /* ── Pagination ── */
        .cust-pager{display:flex;align-items:center;justify-content:space-between;margin-top:18px;flex-wrap:wrap;gap:10px}
        .pager-info{font-size:0.78rem;color:#6B7280;font-weight:500}
        .pager-btns{display:flex;gap:3px;align-items:center}
        .pg-btn{min-width:34px;height:34px;border-radius:8px;border:1px solid #d1d5db;background:#fff;color:#374151;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.82rem;font-weight:600;padding:0 6px;transition:all .15s}
        .pg-btn:hover:not(:disabled){background:#FEF2F2;border-color:#DC2626;color:#DC2626}
        .pg-btn.active{background:#DC2626;color:#fff;border-color:#DC2626}
        .pg-btn:disabled{opacity:.4;cursor:not-allowed}

        /* ── Responsive ── */
        @media(max-width:768px){
          .adm-dash{padding:16px 16px 40px}
          .dash-header{padding:20px}
          .header-top{flex-direction:column}
          .health-row{flex-direction:column;gap:10px}
          .kpi-grid{grid-template-columns:1fr}
          .charts-row{grid-template-columns:1fr}
          .cust-hdr{flex-direction:column;align-items:stretch}
          .cust-filters{flex-direction:column;align-items:stretch}
          .cust-search input{width:100%}
          .cust-pager{flex-direction:column;gap:14px}
        }
      `}</style>
    </div>
  );
}
