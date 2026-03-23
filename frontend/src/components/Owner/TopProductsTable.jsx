import { useState } from 'react';
import { Trophy, ArrowUpDown } from 'lucide-react';
import ComprehensiveForecastModal from './ComprehensiveForecastModal';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);

const medalColors = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };

export default function TopProductsTable({ data, loading }) {
  const [sortKey, setSortKey] = useState('total_revenue');
  const [sortAsc, setSortAsc] = useState(false);
  const [growthProduct, setGrowthProduct] = useState(null);

  const handleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      // rank sorts asc (1 = best), everything else sorts desc by default
      setSortAsc(key === 'rank');
    }
  };

  const sorted = data ? [...data].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  }) : [];

  if (loading) {
    return (
      <div className="owner-tpt-card">
        <div className="owner-tpt-title">Top 10 Products</div>
        {[...Array(5)].map((_, i) => <div key={i} className="tpt-skel-row"><div className="skel-line" style={{ width: `${60 + Math.random() * 30}%` }} /></div>)}
        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className="owner-tpt-card">
      <div className="owner-tpt-header">
        <div className="owner-tpt-title">Top 10 Products</div>
      </div>
      <div className="owner-tpt-scroll">
        <table className="owner-tpt-table">
          <thead>
            <tr>
              {[
                { key: 'rank', label: '#' },
                { key: 'name', label: 'Product' },
                { key: 'total_quantity_sold', label: 'Sales' },
                { key: 'avg_revenue', label: 'Avg/Unit' },
                { key: null, label: '' },
              ].map((col) => (
                <th key={col.label || 'actions'} onClick={col.key ? () => handleSort(col.key) : undefined} style={col.key ? { cursor: 'pointer' } : {}}>
                  <span className="th-inner">
                    {col.label}
                    {col.key && <ArrowUpDown size={12} className="th-sort-icon" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.product_id} className="tpt-row-clickable" onClick={() => setGrowthProduct(p)}>
                <td className="rank-cell">
                  {p.rank <= 3 ? (
                    <span className="medal" style={{ background: medalColors[p.rank] }}>
                      <Trophy size={13} color="#fff" />
                    </span>
                  ) : (
                    <span className="rank-num">{p.rank}</span>
                  )}
                </td>
                <td>
                  <div className="product-cell">
                    <span className="product-cell-name">{p.name}</span>
                    <span className="product-cell-meta">{p.brand} · {p.category}</span>
                  </div>
                </td>
                <td className="num-cell">{(p.total_quantity_sold || 0).toLocaleString('en-IN')}</td>
                <td className="num-cell">{fmt(p.total_revenue || 0)}</td>
                <td className="num-cell">
                  <span>{fmt(p.total_quantity_sold > 0 ? (p.total_revenue || 0) / p.total_quantity_sold : 0)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comprehensive Forecast Modal */}
      {growthProduct && <ComprehensiveForecastModal product={growthProduct} onClose={() => setGrowthProduct(null)} />}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .owner-tpt-card {
    background: #fff; border-radius: 14px; padding: 1.5rem;
    border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    display: flex; flex-direction: column;
  }
  .owner-tpt-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
  .owner-tpt-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; }
  .owner-tpt-scroll { overflow-x: auto; }
  .owner-tpt-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .owner-tpt-table th {
    text-align: left; padding: 0.65rem 0.75rem; color: #6b7280; font-weight: 600;
    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em;
    background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap;
    user-select: none;
  }
  .th-inner { display: inline-flex; align-items: center; gap: 4px; }
  .th-sort-icon { opacity: 0.4; }
  .owner-tpt-table th:hover .th-sort-icon { opacity: 1; }
  .owner-tpt-table td { padding: 0.65rem 0.75rem; border-bottom: 1px solid #f3f4f6; color: #374151; }
  .owner-tpt-table tbody tr:hover { background: #FFF7ED; }
  .tpt-row-clickable { cursor: pointer; }
  .rank-cell { text-align: center; width: 48px; }
  .medal { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
  .rank-num { font-weight: 700; color: #9ca3af; }
  .product-cell { display: flex; flex-direction: column; }
  .product-cell-name { font-weight: 600; color: #1e293b; }
  .product-cell-meta { font-size: 0.72rem; color: #9ca3af; margin-top: 1px; }
  .num-cell { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .tpt-skel-row { padding: 0.75rem; }
  .skel-line { height: 16px; border-radius: 6px; background: #e5e7eb; animation: pulse 1.5s infinite; }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
`;
