import { DollarSign, TrendingUp, Package, Users, ArrowUp, ArrowDown } from 'lucide-react';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v || 0);

const cards = [
  { key: 'revenue', label: 'Total Revenue', icon: DollarSign, valueKey: 'total_revenue', changeKey: 'revenue_change', subtitle: (d) => `${(d.total_orders || 0).toLocaleString('en-IN')} orders`, bg: '#EFF6FF', iconBg: '#3B82F6', format: true },
  { key: 'orders', label: 'Total Orders', icon: Package, valueKey: 'total_orders', changeKey: 'orders_change', subtitle: (d) => `${(d.total_customers || 0).toLocaleString('en-IN')} unique customers`, bg: '#F0FDF4', iconBg: '#10B981', format: false },
  { key: 'customers', label: 'Total Customers', icon: Users, valueKey: 'total_customers', changeKey: 'customers_change', subtitle: () => 'Active buyers', bg: '#FAF5FF', iconBg: '#8B5CF6', format: false },
  { key: 'avg', label: 'Avg Order Value', icon: TrendingUp, valueKey: null, changeKey: null, compute: (d) => d.total_orders > 0 ? d.total_revenue / d.total_orders : 0, subtitle: () => 'Per order', bg: '#FFF7ED', iconBg: '#F97316', format: true },
];

export default function SalesOverviewCards({ data, loading }) {
  if (loading) {
    return (
      <div className="owner-kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="owner-kpi-skeleton">
            <div className="skel-circle" />
            <div className="skel-lines"><div className="skel-line w40" /><div className="skel-line w70" /><div className="skel-line w50" /></div>
          </div>
        ))}
        <style>{skeletonCSS}</style>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="owner-kpi-grid">
      {cards.map((c) => {
        const Icon = c.icon;
        const value = c.compute ? c.compute(data) : data[c.valueKey];
        const change = c.changeKey ? data[c.changeKey] : null;
        const isPositive = change > 0;
        return (
          <div key={c.key} className="owner-kpi-card" style={{ background: c.bg }}>
            <div className="owner-kpi-icon" style={{ background: c.iconBg }}>
              <Icon size={22} color="#fff" />
            </div>
            <div className="owner-kpi-body">
              <span className="owner-kpi-label">{c.label}</span>
              <span className="owner-kpi-value">{c.format ? fmt(value) : (value || 0).toLocaleString('en-IN')}</span>
              <div className="owner-kpi-footer">
                {change !== null && (
                  <span className={`owner-kpi-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {Math.abs(change || 0)}%
                  </span>
                )}
                <span className="owner-kpi-sub">{c.subtitle(data)}</span>
              </div>
            </div>
          </div>
        );
      })}
      <style>{`
        .owner-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1024px) { .owner-kpi-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px) { .owner-kpi-grid { grid-template-columns: 1fr; } }

        .owner-kpi-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.35rem 1.25rem;
          border-radius: 14px;
          border: 1px solid rgba(0,0,0,0.04);
          transition: box-shadow 0.2s, transform 0.15s;
        }
        .owner-kpi-card:hover {
          box-shadow: 0 6px 24px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .owner-kpi-icon {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .owner-kpi-body { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
        .owner-kpi-label { font-size: 0.78rem; font-weight: 500; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
        .owner-kpi-value { font-size: 1.65rem; font-weight: 800; color: #1e293b; line-height: 1.1; }
        .owner-kpi-footer { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.15rem; flex-wrap: wrap; }
        .owner-kpi-change { display: inline-flex; align-items: center; gap: 2px; font-size: 0.78rem; font-weight: 600; border-radius: 6px; padding: 0.15rem 0.35rem; }
        .owner-kpi-change.positive { color: #16a34a; background: rgba(22,163,74,0.1); }
        .owner-kpi-change.negative { color: #dc2626; background: rgba(220,38,38,0.1); }
        .owner-kpi-sub { font-size: 0.75rem; color: #9ca3af; }
      `}</style>
    </div>
  );
}

const skeletonCSS = `
  .owner-kpi-skeleton {
    display: flex; align-items: flex-start; gap: 1rem;
    padding: 1.35rem 1.25rem; border-radius: 14px; background: #f3f4f6;
  }
  .skel-circle { width: 48px; height: 48px; border-radius: 12px; background: #e5e7eb; animation: pulse 1.5s infinite; flex-shrink: 0; }
  .skel-lines { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .skel-line { height: 14px; border-radius: 6px; background: #e5e7eb; animation: pulse 1.5s infinite; }
  .w40 { width: 40%; } .w70 { width: 70%; } .w50 { width: 50%; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
