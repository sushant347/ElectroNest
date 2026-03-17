import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Package, ArrowUpDown } from 'lucide-react';

const STATUS_STYLES = {
  in_stock:     { bg: '#DCFCE7', color: '#16A34A', label: 'In Stock' },
  low_stock:    { bg: '#FEF3C7', color: '#D97706', label: 'Low Stock' },
  out_of_stock: { bg: '#FEE2E2', color: '#DC2626', label: 'Out of Stock' },
};

export default function InventoryTable({ items = [], onRowClick }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('product_name');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.product_name || '').toLowerCase().includes(q) ||
      (i.sku || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.owner || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={13} className="inv-sort-icon-inactive" />;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  const formatNPR = (val) => `NPR ${val.toLocaleString('en-NP')}`;

  return (
    <>
      <div className="inv-table-wrap">
        {/* Search */}
        <div className="inv-table-toolbar">
          <div className="inv-search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by product, SKU, category, owner..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <span className="inv-result-count">
            {filtered.length} of {items.length} items
          </span>
        </div>

        {/* Table */}
        <div className="inv-table-scroll">
          <table className="inv-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('product_name')} className="inv-th-sortable">
                  Product <SortIcon col="product_name" />
                </th>
                <th>SKU</th>
                <th onClick={() => handleSort('category')} className="inv-th-sortable">
                  Category <SortIcon col="category" />
                </th>
                <th onClick={() => handleSort('owner')} className="inv-th-sortable">
                  Owner <SortIcon col="owner" />
                </th>
                <th onClick={() => handleSort('quantity_in_stock')} className="inv-th-sortable">
                  Stock <SortIcon col="quantity_in_stock" />
                </th>
                <th onClick={() => handleSort('unit_price')} className="inv-th-sortable">
                  Unit Price <SortIcon col="unit_price" />
                </th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={8} className="inv-empty">
                    <Package size={32} />
                    <p>No inventory items found</p>
                  </td>
                </tr>
              ) : (
                paged.map((item) => {
                  const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.in_stock;
                  const stockPercent = item.max_stock > 0 ? Math.round((item.quantity_in_stock / item.max_stock) * 100) : 0;

                  return (
                    <tr
                      key={item.id}
                      className="inv-row"
                      onClick={() => onRowClick?.(item)}
                    >
                      <td className="inv-td-product">
                        <span className="inv-product-name">{item.product_name}</span>
                      </td>
                      <td className="inv-td-sku">{item.sku}</td>
                      <td>{item.category}</td>
                      <td className="inv-td-owner">{item.owner}</td>
                      <td>
                        <div className="inv-stock-cell">
                          <span className="inv-stock-qty">{item.quantity_in_stock}</span>
                          <span className="inv-stock-max">/ {item.max_stock}</span>
                          <div className="inv-stock-bar">
                            <div
                              className="inv-stock-fill"
                              style={{
                                width: `${stockPercent}%`,
                                background: item.status === 'out_of_stock' ? '#EF4444'
                                  : item.status === 'low_stock' ? '#F59E0B'
                                  : '#22C55E'
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="inv-td-price">{formatNPR(item.unit_price)}</td>
                      <td>
                        <span
                          className="inv-status-badge"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="inv-td-loc">{item.warehouse_location}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="inv-pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="inv-page-btn"
            >
              Previous
            </button>
            <div className="inv-page-nums">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`inv-page-num ${currentPage === p ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="inv-page-btn"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <style>{`
        .inv-table-wrap {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          overflow: hidden;
        }
        .inv-table-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #F3F4F6;
          gap: 16px;
          flex-wrap: wrap;
        }
        .inv-search-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          padding: 8px 14px;
          flex: 1;
          max-width: 420px;
          color: #9CA3AF;
        }
        .inv-search-box input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.85rem;
          width: 100%;
          color: #374151;
        }
        .inv-result-count {
          font-size: 0.8rem;
          color: #9CA3AF;
          white-space: nowrap;
        }
        .inv-table-scroll {
          overflow-x: auto;
        }
        .inv-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }
        .inv-table thead th {
          text-align: left;
          padding: 12px 16px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6B7280;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
          white-space: nowrap;
          user-select: none;
        }
        .inv-th-sortable {
          cursor: pointer;
          transition: color 0.2s;
        }
        .inv-th-sortable:hover {
          color: #F97316;
        }
        .inv-sort-icon-inactive {
          opacity: 0.3;
        }
        .inv-table tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid #F3F4F6;
          font-size: 0.88rem;
          color: #374151;
        }
        .inv-row {
          cursor: pointer;
          transition: background 0.15s;
        }
        .inv-row:hover {
          background: #FFFBF5;
        }
        .inv-td-product { max-width: 240px; }
        .inv-product-name {
          font-weight: 600;
          color: #111827;
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .inv-td-sku {
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          color: #9CA3AF;
        }
        .inv-td-owner {
          font-size: 0.82rem;
          color: #6B7280;
        }
        .inv-stock-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 80px;
        }
        .inv-stock-qty {
          font-weight: 700;
          color: #111827;
          font-size: 0.9rem;
        }
        .inv-stock-max {
          font-size: 0.75rem;
          color: #9CA3AF;
        }
        .inv-stock-bar {
          width: 100%;
          height: 4px;
          background: #F3F4F6;
          border-radius: 4px;
          overflow: hidden;
        }
        .inv-stock-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.4s ease;
        }
        .inv-td-price {
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
        }
        .inv-status-badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .inv-td-loc {
          font-family: 'Courier New', monospace;
          font-size: 0.8rem;
          color: #6B7280;
        }
        .inv-empty {
          text-align: center;
          padding: 48px 16px !important;
          color: #9CA3AF;
        }
        .inv-empty p {
          margin: 8px 0 0;
          font-size: 0.9rem;
        }
        .inv-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid #F3F4F6;
        }
        .inv-page-btn {
          padding: 6px 14px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: white;
          font-size: 0.82rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }
        .inv-page-btn:hover:not(:disabled) {
          border-color: #F97316;
          color: #F97316;
        }
        .inv-page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .inv-page-nums {
          display: flex;
          gap: 4px;
        }
        .inv-page-num {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: white;
          font-size: 0.82rem;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
        }
        .inv-page-num:hover {
          border-color: #F97316;
          color: #F97316;
        }
        .inv-page-num.active {
          background: #F97316;
          border-color: #F97316;
          color: white;
          font-weight: 600;
        }
      `}</style>
    </>
  );
}
