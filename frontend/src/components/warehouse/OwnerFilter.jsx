import { useState, useEffect } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { warehouseAPI } from '../../services/api';

export default function OwnerFilter({ value = 'All Owners', onChange }) {
  const [open, setOpen] = useState(false);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    warehouseAPI.getOwners()
      .then(res => {
        const data = res.data?.results || res.data || [];
        const names = data.map(o => (typeof o === 'string' ? o : o.name || o.owner_name || o.username));
        setOwners(names.filter(Boolean));
      })
      .catch(() => setOwners([]));
  }, []);

  const handleSelect = (owner) => {
    onChange?.(owner === 'All Owners' ? '' : owner);
    setOpen(false);
  };

  const displayValue = value || 'All Owners';
  const ownerList = ['All Owners', ...owners];

  return (
    <>
      <div className="owner-filter-wrap">
        <button className="owner-filter-btn" onClick={() => setOpen(!open)}>
          <Filter size={15} />
          <span>{displayValue}</span>
          <ChevronDown size={14} className={`owner-filter-chevron ${open ? 'open' : ''}`} />
        </button>

        {value && value !== 'All Owners' && (
          <button
            className="owner-filter-clear"
            onClick={(e) => { e.stopPropagation(); onChange?.(''); }}
            title="Clear filter"
          >
            <X size={14} />
          </button>
        )}

        {open && (
          <div className="owner-filter-dropdown">
            {ownerList.map((owner) => (
              <button
                key={owner}
                className={`owner-filter-option ${displayValue === owner ? 'selected' : ''}`}
                onClick={() => handleSelect(owner)}
              >
                {owner}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .owner-filter-wrap {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .owner-filter-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }
        .owner-filter-btn:hover {
          border-color: #F97316;
          box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.08);
        }
        .owner-filter-chevron {
          transition: transform 0.2s;
        }
        .owner-filter-chevron.open {
          transform: rotate(180deg);
        }
        .owner-filter-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          background: #FEE2E2;
          border: none;
          border-radius: 50%;
          color: #DC2626;
          cursor: pointer;
          transition: all 0.2s;
        }
        .owner-filter-clear:hover {
          background: #FECACA;
        }
        .owner-filter-dropdown {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 220px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.12);
          z-index: 100;
          padding: 6px;
          animation: ownerFilterFadeIn 0.15s ease-out;
        }
        .owner-filter-option {
          display: block;
          width: 100%;
          text-align: left;
          padding: 10px 14px;
          border: none;
          background: transparent;
          font-size: 0.85rem;
          color: #374151;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .owner-filter-option:hover {
          background: #FFF7ED;
          color: #F97316;
        }
        .owner-filter-option.selected {
          background: #FFF7ED;
          color: #F97316;
          font-weight: 600;
        }
        @keyframes ownerFilterFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
