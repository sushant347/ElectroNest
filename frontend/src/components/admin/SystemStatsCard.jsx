import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function SystemStatsCard({ title, value, change, changeLabel, icon: Icon, format = 'number', color = '#2563eb' }) {
  const formatValue = (val) => {
    if (val === null || val === undefined) return '—';
    if (format === 'currency') return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(val);
    if (format === 'percentage') return `${val}%`;
    if (typeof val === 'number' && val >= 1000) return new Intl.NumberFormat('en-IN').format(val);
    return val;
  };

  const changeNum = parseFloat(change) || 0;
  const isPositive = changeNum > 0;
  const isNeutral = changeNum === 0;

  return (
    <div className="sys-stats-card">
      <div className="sys-stats-header">
        <div>
          <p className="sys-stats-title">{title}</p>
          <h3 className="sys-stats-value">{formatValue(value)}</h3>
        </div>
        {Icon && (
          <div className="sys-stats-icon" style={{ background: `${color}15`, color }}>
            <Icon size={22} />
          </div>
        )}
      </div>
      {(change !== undefined || changeLabel) && (
        <div className="sys-stats-footer">
          <span className={`sys-stats-change ${isPositive ? 'positive' : isNeutral ? 'neutral' : 'negative'}`}>
            {isPositive ? <TrendingUp size={13} /> : isNeutral ? <Minus size={13} /> : <TrendingDown size={13} />}
            {isPositive ? '+' : ''}{changeNum}%
          </span>
          {changeLabel && <span className="sys-stats-label">{changeLabel}</span>}
        </div>
      )}
      <style>{`
        .sys-stats-card {
          background: #fff;
          border-radius: 14px;
          padding: 20px 22px;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
        }
        .sys-stats-card:hover {
          box-shadow: 0 4px 16px rgba(0,0,0,0.06);
          transform: translateY(-2px);
        }
        .sys-stats-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .sys-stats-title {
          font-size: 13px;
          color: #64748b;
          margin: 0 0 6px;
          font-weight: 500;
        }
        .sys-stats-value {
          font-size: 26px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          line-height: 1.1;
        }
        .sys-stats-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sys-stats-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid #f1f5f9;
        }
        .sys-stats-change {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 12px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .sys-stats-change.positive { color: #16a34a; background: #f0fdf4; }
        .sys-stats-change.negative { color: #dc2626; background: #fef2f2; }
        .sys-stats-change.neutral { color: #64748b; background: #f8fafc; }
        .sys-stats-label {
          font-size: 12px;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
}
