import RoleBadge from './RoleBadge';
import { Edit2, Trash2, ToggleLeft, ToggleRight, KeyRound, Eye } from 'lucide-react';

export default function UserTable({ users, loading, onEdit, onDelete, onToggleStatus, onResetPassword, onViewActivity }) {
  if (loading) {
    return (
      <div className="ut-skeleton-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ut-skeleton-row">
            <div className="ut-skeleton ut-sk-avatar" />
            <div style={{ flex: 1 }}>
              <div className="ut-skeleton ut-sk-name" />
              <div className="ut-skeleton ut-sk-email" />
            </div>
            <div className="ut-skeleton ut-sk-badge" />
            <div className="ut-skeleton ut-sk-status" />
            <div className="ut-skeleton ut-sk-actions" />
          </div>
        ))}
        <style>{`
          .ut-skeleton-wrap { display: flex; flex-direction: column; gap: 8px; padding: 16px; }
          .ut-skeleton-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #f8fafc; border-radius: 10px; }
          .ut-skeleton { background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: utShimmer 1.5s infinite; border-radius: 6px; }
          .ut-sk-avatar { width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0; }
          .ut-sk-name { width: 120px; height: 14px; margin-bottom: 6px; }
          .ut-sk-email { width: 180px; height: 12px; }
          .ut-sk-badge { width: 70px; height: 24px; }
          .ut-sk-status { width: 60px; height: 24px; }
          .ut-sk-actions { width: 120px; height: 30px; }
          @keyframes utShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8', fontSize: '14px' }}>No users found.</div>;
  }

  return (
    <div className="ut-table-wrap">
      <table className="ut-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Joined</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => {
            const initials = `${(user.first_name || '')[0] || ''}${(user.last_name || '')[0] || ''}`.toUpperCase() || '?';
            const isActive = user.is_active !== false;
            return (
              <tr key={user.id} className={!isActive ? 'ut-inactive' : ''}>
                <td>
                  <div className="ut-user-cell">
                    <div className="ut-avatar">{initials}</div>
                    <div>
                      <div className="ut-user-name">{user.first_name} {user.last_name}</div>
                      <div className="ut-user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td><RoleBadge role={user.role} /></td>
                <td><span className="ut-phone">{user.phone || '—'}</span></td>
                <td>
                  <span className={`ut-status ${isActive ? 'active' : 'inactive'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <span className="ut-date">{user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                </td>
                <td>
                  <div className="ut-actions">
                    {onViewActivity && (
                      <button className="ut-action-btn ut-view" title="View Activity" onClick={() => onViewActivity(user)}>
                        <Eye size={14} />
                      </button>
                    )}
                    {onEdit && (
                      <button className="ut-action-btn ut-edit" title="Edit" onClick={() => onEdit(user)}>
                        <Edit2 size={14} />
                      </button>
                    )}
                    {onToggleStatus && (
                      <button className="ut-action-btn ut-toggle" title={isActive ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(user)}>
                        {isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>
                    )}
                    {onResetPassword && (
                      <button className="ut-action-btn ut-reset" title="Reset Password" onClick={() => onResetPassword(user)}>
                        <KeyRound size={14} />
                      </button>
                    )}
                    {onDelete && user.role !== 'admin' && (
                      <button className="ut-action-btn ut-delete" title="Delete" onClick={() => onDelete(user)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <style>{`
        .ut-table-wrap { overflow-x: auto; }
        .ut-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 13px;
        }
        .ut-table thead th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
        }
        .ut-table tbody tr {
          transition: background 0.15s;
        }
        .ut-table tbody tr:hover { background: #f8fafc; }
        .ut-table tbody tr.ut-inactive { opacity: 0.6; }
        .ut-table tbody td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .ut-user-cell { display: flex; align-items: center; gap: 10px; }
        .ut-avatar {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #6366f1, #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          color: #fff;
          flex-shrink: 0;
        }
        .ut-user-name { font-weight: 600; color: #1e293b; }
        .ut-user-email { font-size: 12px; color: #94a3b8; }
        .ut-phone { color: #64748b; }
        .ut-date { color: #64748b; font-size: 12px; }
        .ut-status {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
        }
        .ut-status.active { color: #16a34a; background: #f0fdf4; }
        .ut-status.inactive { color: #dc2626; background: #fef2f2; }
        .ut-actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }
        .ut-action-btn {
          width: 30px;
          height: 30px;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          background: #fff;
          color: #64748b;
        }
        .ut-action-btn:hover { border-color: #cbd5e1; }
        .ut-view:hover { color: #6366f1; background: #eef2ff; border-color: #c7d2fe; }
        .ut-edit:hover { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
        .ut-toggle:hover { color: #ea580c; background: #fff7ed; border-color: #fed7aa; }
        .ut-reset:hover { color: #7c3aed; background: #f5f3ff; border-color: #ddd6fe; }
        .ut-delete:hover { color: #dc2626; background: #fef2f2; border-color: #fecaca; }
      `}</style>
    </div>
  );
}
