import { useState } from 'react';

const actionColors = {
  CREATE: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  UPDATE: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  DELETE: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  LOGIN: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
  LOGOUT: { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
  ERROR: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  EXPORT: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
};

const statusColors = {
  success: '#f0fdf4',
  failure: '#fef2f2',
  warning: '#fffbeb',
};

export default function LogTable({ logs, loading }) {
  const [expandedId, setExpandedId] = useState(null);

  if (loading) {
    return (
      <div className="lt-skeleton-wrap">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="lt-skeleton-row">
            <div className="lt-skeleton lt-sk-time" />
            <div className="lt-skeleton lt-sk-action" />
            <div className="lt-skeleton lt-sk-user" />
            <div className="lt-skeleton lt-sk-desc" />
            <div className="lt-skeleton lt-sk-status" />
          </div>
        ))}
        <style>{`
          .lt-skeleton-wrap { display: flex; flex-direction: column; gap: 6px; padding: 16px; }
          .lt-skeleton-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: #f8fafc; border-radius: 8px; }
          .lt-skeleton { background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: ltShimmer 1.5s infinite; border-radius: 6px; }
          .lt-sk-time { width: 100px; height: 14px; }
          .lt-sk-action { width: 70px; height: 22px; }
          .lt-sk-user { width: 110px; height: 14px; }
          .lt-sk-desc { flex: 1; height: 14px; }
          .lt-sk-status { width: 60px; height: 22px; }
          @keyframes ltShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8', fontSize: '14px' }}>No logs found.</div>;
  }

  return (
    <div className="lt-table-wrap">
      <table className="lt-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>User</th>
            <th>Description</th>
            <th>IP Address</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => {
            const ac = actionColors[log.action] || actionColors.CREATE;
            const rowBg = statusColors[log.status] || 'transparent';
            const isExpanded = expandedId === log.id;
            const desc = log.description || '';
            const isTruncated = desc.length > 80;
            return (
              <tr key={log.id} style={{ background: log.status === 'failure' ? '#fef2f2' : undefined }}>
                <td>
                  <div className="lt-time">{new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                  <div className="lt-time-sub">{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                </td>
                <td>
                  <span className="lt-action-badge" style={{ background: ac.bg, color: ac.color, border: `1px solid ${ac.border}` }}>
                    {log.action}
                  </span>
                </td>
                <td>
                  <div className="lt-user">{log.user_name || log.user_email || '—'}</div>
                  {log.user_role && <div className="lt-user-role">{log.user_role}</div>}
                </td>
                <td>
                  <div
                    className={`lt-desc ${isTruncated && !isExpanded ? 'truncated' : ''}`}
                    title={isTruncated ? desc : undefined}
                    onClick={() => isTruncated && setExpandedId(isExpanded ? null : log.id)}
                    style={isTruncated ? { cursor: 'pointer' } : undefined}
                  >
                    {isExpanded ? desc : isTruncated ? desc.slice(0, 80) + '…' : desc}
                  </div>
                </td>
                <td><span className="lt-ip">{log.ip_address || '—'}</span></td>
                <td>
                  <span className={`lt-status ${log.status || 'success'}`}>
                    {log.status || 'success'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style>{`
        .lt-table-wrap { overflow-x: auto; }
        .lt-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
        .lt-table thead th {
          text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;
          background: #f8fafc; border-bottom: 1px solid #e5e7eb;
        }
        .lt-table tbody tr { transition: background 0.15s; }
        .lt-table tbody tr:hover { background: #f8fafc !important; }
        .lt-table tbody td { padding: 10px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .lt-time { font-weight: 600; color: #1e293b; font-size: 13px; }
        .lt-time-sub { font-size: 11px; color: #94a3b8; }
        .lt-action-badge {
          display: inline-flex; padding: 3px 10px; border-radius: 6px;
          font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .lt-user { font-weight: 500; color: #1e293b; }
        .lt-user-role { font-size: 11px; color: #94a3b8; text-transform: capitalize; }
        .lt-desc { color: #475569; font-size: 13px; line-height: 1.4; max-width: 320px; }
        .lt-desc.truncated:hover { color: #1e293b; }
        .lt-ip { font-family: monospace; font-size: 12px; color: #64748b; }
        .lt-status {
          display: inline-flex; padding: 3px 10px; border-radius: 20px;
          font-size: 11px; font-weight: 600; text-transform: capitalize;
        }
        .lt-status.success { color: #16a34a; background: #f0fdf4; }
        .lt-status.failure { color: #dc2626; background: #fef2f2; }
        .lt-status.warning { color: #ca8a04; background: #fefce8; }
      `}</style>
    </div>
  );
}
