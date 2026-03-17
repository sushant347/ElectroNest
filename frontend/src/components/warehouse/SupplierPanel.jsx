import { useState } from 'react';
import { Search, Star, Phone, Mail, MapPin, Package, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export default function SupplierPanel({ suppliers = [] }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = suppliers.filter(s => {
    const matchSearch = (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.contact_person || '').toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || s.type === typeFilter;
    return matchSearch && matchType;
  });

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <>
      <div className="sp-panel">
        <div className="sp-header">
          <h3 className="sp-title">Suppliers Directory</h3>
          <span className="sp-count">{filtered.length} suppliers</span>
        </div>

        {/* Filters */}
        <div className="sp-filters">
          <div className="sp-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="sp-type-tabs">
            {['all', 'owner', 'manufacturer'].map(t => (
              <button
                key={t}
                className={`sp-type-tab ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1) + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Supplier List */}
        <div className="sp-list">
          {filtered.length === 0 ? (
            <div className="sp-empty">No suppliers found</div>
          ) : (
            filtered.map(supplier => (
              <div key={supplier.id} className="sp-card">
                <div className="sp-card-main" onClick={() => toggleExpand(supplier.id)}>
                  <div className="sp-card-left">
                    <div className={`sp-avatar ${supplier.type === 'owner' ? 'sp-avatar-owner' : 'sp-avatar-mfg'}`}>
                      {supplier.name.charAt(0)}
                    </div>
                    <div className="sp-card-info">
                      <div className="sp-name">{supplier.name}</div>
                      <div className="sp-type-label">
                        <span className={`sp-type-badge ${supplier.type}`}>
                          {supplier.type === 'owner' ? 'Store Owner' : 'Manufacturer'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="sp-card-right">
                    <div className="sp-rating">
                      <Star size={14} fill="#F59E0B" color="#F59E0B" />
                      <span>{supplier.rating}</span>
                    </div>
                    {expandedId === supplier.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {expandedId === supplier.id && (
                  <div className="sp-card-details">
                    <div className="sp-detail-grid">
                      <div className="sp-detail-item">
                        <span className="sp-detail-icon"><Mail size={14} /></span>
                        <span>{supplier.email}</span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-icon"><Phone size={14} /></span>
                        <span>{supplier.phone}</span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-icon"><MapPin size={14} /></span>
                        <span>{supplier.address}</span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-icon"><Package size={14} /></span>
                        <span>{supplier.products_supplied} products supplied</span>
                      </div>
                      <div className="sp-detail-item">
                        <span className="sp-detail-icon"><Clock size={14} /></span>
                        <span>Avg lead time: {supplier.avg_lead_time_days} days</span>
                      </div>
                    </div>
                    <div className="sp-contact-person">
                      Contact: <strong>{supplier.contact_person}</strong>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .sp-panel {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
        }
        .sp-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-bottom: 1px solid #F3F4F6;
        }
        .sp-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 700;
          color: #111827;
        }
        .sp-count {
          font-size: 0.78rem;
          color: #9CA3AF;
          background: #F3F4F6;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .sp-filters {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid #F3F4F6;
          flex-wrap: wrap;
        }
        .sp-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 6px 12px;
          flex: 1;
          min-width: 180px;
          color: #9CA3AF;
        }
        .sp-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.82rem;
          width: 100%;
          color: #374151;
        }
        .sp-type-tabs {
          display: flex;
          gap: 4px;
          background: #F3F4F6;
          padding: 3px;
          border-radius: 8px;
        }
        .sp-type-tab {
          padding: 5px 12px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .sp-type-tab.active {
          background: white;
          color: #F97316;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          font-weight: 600;
        }
        .sp-list {
          max-height: 500px;
          overflow-y: auto;
          padding: 8px;
        }
        .sp-card {
          border: 1px solid #F3F4F6;
          border-radius: 12px;
          margin-bottom: 6px;
          transition: border-color 0.2s;
        }
        .sp-card:hover {
          border-color: #E5E7EB;
        }
        .sp-card-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          cursor: pointer;
        }
        .sp-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sp-avatar {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .sp-avatar-owner {
          background: #FFF7ED;
          color: #F97316;
        }
        .sp-avatar-mfg {
          background: #EEF2FF;
          color: #6366F1;
        }
        .sp-card-info {}
        .sp-name {
          font-weight: 600;
          font-size: 0.88rem;
          color: #111827;
        }
        .sp-type-badge {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .sp-type-badge.owner {
          background: #FFF7ED;
          color: #EA580C;
        }
        .sp-type-badge.manufacturer {
          background: #EEF2FF;
          color: #6366F1;
        }
        .sp-card-right {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #9CA3AF;
        }
        .sp-rating {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #374151;
        }
        .sp-card-details {
          padding: 0 14px 14px;
          animation: spSlideDown 0.2s ease-out;
        }
        .sp-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 12px;
          background: #F9FAFB;
          border-radius: 10px;
          margin-bottom: 10px;
        }
        .sp-detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: #374151;
        }
        .sp-detail-icon {
          color: #9CA3AF;
          display: flex;
          flex-shrink: 0;
        }
        .sp-contact-person {
          font-size: 0.8rem;
          color: #6B7280;
          padding-left: 12px;
        }
        .sp-empty {
          text-align: center;
          padding: 40px 16px;
          color: #9CA3AF;
          font-size: 0.85rem;
        }
        @keyframes spSlideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 300px; }
        }
      `}</style>
    </>
  );
}
