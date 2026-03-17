import { Edit2, ToggleLeft, ToggleRight, Star } from 'lucide-react';

export default function SupplierTable({ suppliers, loading, onEdit, onToggleStatus }) {
  if (loading) {
    return (
      <div className="st-skeleton-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="st-skeleton-row">
            <div className="st-skeleton st-sk-name" />
            <div className="st-skeleton st-sk-type" />
            <div className="st-skeleton st-sk-rate" />
            <div className="st-skeleton st-sk-rating" />
            <div className="st-skeleton st-sk-actions" />
          </div>
        ))}
        <style>{`
          .st-skeleton-wrap { display: flex; flex-direction: column; gap: 8px; padding: 16px; }
          .st-skeleton-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: #f8fafc; border-radius: 10px; }
          .st-skeleton { background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: stShimmer 1.5s infinite; border-radius: 6px; }
          .st-sk-name { width: 180px; height: 14px; }
          .st-sk-type { width: 90px; height: 24px; }
          .st-sk-rate { width: 120px; height: 16px; }
          .st-sk-rating { width: 80px; height: 16px; }
          .st-sk-actions { width: 80px; height: 30px; margin-left: auto; }
          @keyframes stShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        `}</style>
      </div>
    );
  }

  if (!suppliers || suppliers.length === 0) {
    return <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8', fontSize: '14px' }}>No suppliers found.</div>;
  }

  const renderStars = (rating) => {
    const stars = [];
    const r = Math.round((rating || 0) * 2) / 2;
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star key={i} size={13} fill={i <= r ? '#f59e0b' : 'none'} color={i <= r ? '#f59e0b' : '#d1d5db'} />
      );
    }
    return stars;
  };

  return (
    <div className="st-table-wrap">
      <table className="st-table">
        <thead>
          <tr>
            <th>Supplier</th>
            <th>Type</th>
            <th>Contact</th>
            <th>On-Time Rate</th>
            <th>Rating</th>
            <th>Products</th>
            <th>Status</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map(s => {
            const isActive = s.is_active !== false;
            const onTimeRate = s.on_time_delivery_rate || 0;
            return (
              <tr key={s.id} className={!isActive ? 'st-inactive' : ''}>
                <td>
                  <div className="st-supplier-name">{s.name}</div>
                  {s.company && <div className="st-supplier-company">{s.company}</div>}
                </td>
                <td>
                  <span className={`st-type-badge ${s.type || 'manufacturer'}`}>
                    {s.type === 'owner' ? 'Owner-Supplier' : 'Manufacturer'}
                  </span>
                </td>
                <td>
                  <div className="st-contact">{s.email || '—'}</div>
                  <div className="st-contact-phone">{s.phone || ''}</div>
                </td>
                <td>
                  <div className="st-rate-wrap">
                    <div className="st-rate-bar">
                      <div className="st-rate-fill" style={{ width: `${onTimeRate}%`, background: onTimeRate >= 90 ? '#16a34a' : onTimeRate >= 70 ? '#f59e0b' : '#dc2626' }} />
                    </div>
                    <span className="st-rate-text">{onTimeRate}%</span>
                  </div>
                </td>
                <td>
                  <div className="st-rating">
                    {renderStars(s.rating)}
                    <span className="st-rating-val">{(s.rating || 0).toFixed(1)}</span>
                  </div>
                </td>
                <td><span className="st-product-count">{s.product_count ?? '—'}</span></td>
                <td>
                  <span className={`st-status ${isActive ? 'active' : 'inactive'}`}>
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="st-actions">
                    {onEdit && (
                      <button className="st-action-btn st-edit-btn" title="Edit" onClick={() => onEdit(s)}>
                        <Edit2 size={14} />
                      </button>
                    )}
                    {onToggleStatus && (
                      <button className="st-action-btn st-toggle-btn" title={isActive ? 'Deactivate' : 'Activate'} onClick={() => onToggleStatus(s)}>
                        {isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
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
        .st-table-wrap { overflow-x: auto; }
        .st-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13px; }
        .st-table thead th {
          text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;
          background: #f8fafc; border-bottom: 1px solid #e5e7eb;
        }
        .st-table tbody tr { transition: background 0.15s; }
        .st-table tbody tr:hover { background: #f8fafc; }
        .st-table tbody tr.st-inactive { opacity: 0.6; }
        .st-table tbody td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
        .st-supplier-name { font-weight: 600; color: #1e293b; }
        .st-supplier-company { font-size: 12px; color: #94a3b8; }
        .st-type-badge {
          display: inline-flex; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;
        }
        .st-type-badge.manufacturer { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
        .st-type-badge.owner { background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; }
        .st-contact { color: #475569; font-size: 13px; }
        .st-contact-phone { color: #94a3b8; font-size: 12px; }
        .st-rate-wrap { display: flex; align-items: center; gap: 8px; }
        .st-rate-bar {
          width: 80px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;
        }
        .st-rate-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
        .st-rate-text { font-size: 12px; font-weight: 600; color: #475569; }
        .st-rating { display: flex; align-items: center; gap: 2px; }
        .st-rating-val { font-size: 12px; font-weight: 600; color: #475569; margin-left: 4px; }
        .st-product-count { font-weight: 600; color: #475569; }
        .st-status {
          display: inline-flex; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
        }
        .st-status.active { color: #16a34a; background: #f0fdf4; }
        .st-status.inactive { color: #dc2626; background: #fef2f2; }
        .st-actions { display: flex; gap: 4px; justify-content: flex-end; }
        .st-action-btn {
          width: 30px; height: 30px; border: 1px solid #e5e7eb; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.15s; background: #fff; color: #64748b;
        }
        .st-edit-btn:hover { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
        .st-toggle-btn:hover { color: #ea580c; background: #fff7ed; border-color: #fed7aa; }
      `}</style>
    </div>
  );
}
