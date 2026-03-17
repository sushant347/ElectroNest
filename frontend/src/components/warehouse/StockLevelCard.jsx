import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StockLevelCard({ title, value, subtitle, icon: Icon, trend, color = '#F97316' }) {
  const trendIcon = trend === 'up'
    ? <TrendingUp size={14} />
    : trend === 'down'
      ? <TrendingDown size={14} />
      : <Minus size={14} />;

  const trendColor = trend === 'up' ? '#16A34A' : trend === 'down' ? '#DC2626' : '#6B7280';

  return (
    <>
      <div className="stock-level-card">
        <div className="slc-icon-wrap" style={{ background: `${color}14`, color }}>
          {Icon && <Icon size={22} />}
        </div>
        <div className="slc-content">
          <p className="slc-title">{title}</p>
          <h3 className="slc-value">{value}</h3>
          {subtitle && (
            <p className="slc-subtitle">
              {trend && <span className="slc-trend" style={{ color: trendColor }}>{trendIcon}</span>}
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <style>{`
        .stock-level-card {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 14px;
          padding: 20px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .stock-level-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
        }
        .slc-icon-wrap {
          padding: 12px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .slc-content {
          flex: 1;
          min-width: 0;
        }
        .slc-title {
          margin: 0;
          font-size: 0.82rem;
          color: #6B7280;
          font-weight: 500;
        }
        .slc-value {
          margin: 4px 0 0 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          line-height: 1.2;
        }
        .slc-subtitle {
          margin: 6px 0 0 0;
          font-size: 0.78rem;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .slc-trend {
          display: inline-flex;
          align-items: center;
        }
      `}</style>
    </>
  );
}
