import { AlertTriangle, AlertCircle, XCircle } from 'lucide-react';

const severityConfig = {
  critical: { icon: XCircle, bg: '#FEF2F2', border: '#FECACA', color: '#DC2626', label: 'Critical' },
  warning:  { icon: AlertTriangle, bg: '#FFFBEB', border: '#FDE68A', color: '#D97706', label: 'Warning' },
  info:     { icon: AlertCircle, bg: '#EFF6FF', border: '#BFDBFE', color: '#2563EB', label: 'Info' },
  low:      { icon: AlertCircle, bg: '#F0FDF4', border: '#BBF7D0', color: '#16A34A', label: 'Low' },
};

export default function AlertBadge({ severity = 'low', showLabel = true, size = 'md' }) {
  const config = severityConfig[severity] || severityConfig.low;
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;

  return (
    <>
      <span className={`alert-badge alert-badge--${severity} alert-badge--${size}`}>
        <Icon size={iconSize} />
        {showLabel && <span className="alert-badge__label">{config.label}</span>}
      </span>
      <style>{`
        .alert-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.75rem;
          white-space: nowrap;
          line-height: 1;
        }
        .alert-badge--sm { padding: 2px 8px; font-size: 0.7rem; }
        .alert-badge--lg { padding: 6px 14px; font-size: 0.85rem; }
        .alert-badge--critical {
          background: ${severityConfig.critical.bg};
          color: ${severityConfig.critical.color};
          border: 1px solid ${severityConfig.critical.border};
        }
        .alert-badge--warning {
          background: ${severityConfig.warning.bg};
          color: ${severityConfig.warning.color};
          border: 1px solid ${severityConfig.warning.border};
        }
        .alert-badge--low {
          background: ${severityConfig.low.bg};
          color: ${severityConfig.low.color};
          border: 1px solid ${severityConfig.low.border};
        }
      `}</style>
    </>
  );
}
