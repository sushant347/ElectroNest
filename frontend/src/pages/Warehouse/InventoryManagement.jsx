import { useState, useEffect, useCallback } from 'react';
import { Package, Search, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';
import { warehouseAPI } from '../../services/api';
import { TableSkeleton } from '../../components/Common/SkeletonLoader';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function InventoryManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      const res = await warehouseAPI.getProducts(params);
      const data = res.data;
      setProducts(data.results || data || []);
      if (data.count) setTotalPages(Math.ceil(data.count / 20));
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <div className="inv-page">
      <div className="inv-header">
        <div>
          <h1 className="inv-title">Inventory Management</h1>
          <p className="inv-subtitle">Monitor and manage product stock levels</p>
        </div>
        <button className="inv-refresh" onClick={fetchProducts}><RefreshCw size={16} /> Refresh</button>
      </div>

      {/* Search */}
      <div className="inv-search-bar">
        <Search size={18} color="#9CA3AF" />
        <input
          type="text"
          placeholder="Search products by name, brand, or SKU..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="inv-search-input"
        />
      </div>

      {error && (
        <div className="inv-error">
          <AlertCircle size={16} /> {error}
          <button onClick={fetchProducts} className="inv-retry">Retry</button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : (
        <>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Brand</th>
                  <th>Category</th>
                  <th>Owner</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9CA3AF', padding: 40 }}>No products found</td></tr>
                ) : products.map(p => {
                  const stock = p.stock || 0;
                  const reorder = p.reorder_level || 10;
                  const status = stock <= 0 ? 'out' : stock <= reorder ? 'low' : 'ok';
                  return (
                    <tr key={p.id}>
                      <td className="inv-product-cell">
                        {p.image_url ? <img src={p.image_url} alt="" className="inv-thumb" /> : <div className="inv-thumb-placeholder"><Package size={16} /></div>}
                        <span className="inv-product-name">{p.name}</span>
                      </td>
                      <td>{p.brand || '-'}</td>
                      <td>{p.category_name || '-'}</td>
                      <td>{p.owner_name || '-'}</td>
                      <td><span className={`inv-stock ${status}`}>{stock}</span></td>
                      <td>{reorder}</td>
                      <td>{fmtNPR(p.selling_price)}</td>
                      <td>
                        <span className={`inv-status-badge ${status}`}>
                          {status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'In Stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="inv-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      <style>{`
        .inv-page { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .inv-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #111827; }
        .inv-subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }
        .inv-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-weight: 600; font-size: 0.82rem; cursor: pointer; color: #374151; }
        .inv-refresh:hover { border-color: #F97316; color: #F97316; }
        .inv-search-bar { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 16px; margin-bottom: 20px; }
        .inv-search-input { flex: 1; border: none; outline: none; font-size: 0.88rem; color: #1e293b; }
        .inv-error { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: #DC2626; font-size: 0.85rem; margin-bottom: 16px; }
        .inv-retry { margin-left: auto; padding: 4px 12px; background: #DC2626; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.78rem; }
        .inv-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #6B7280; gap: 12px; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .inv-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow-x: auto; }
        .inv-table { width: 100%; border-collapse: collapse; }
        .inv-table th { padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; }
        .inv-table td { padding: 12px 16px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .inv-table tr:hover { background: #F9FAFB; }
        .inv-product-cell { display: flex; align-items: center; gap: 10px; }
        .inv-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; }
        .inv-thumb-placeholder { width: 36px; height: 36px; border-radius: 6px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; color: #9CA3AF; }
        .inv-product-name { font-weight: 600; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .inv-stock { font-weight: 700; }
        .inv-stock.out { color: #DC2626; }
        .inv-stock.low { color: #D97706; }
        .inv-stock.ok { color: #16A34A; }
        .inv-status-badge { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .inv-status-badge.out { background: #FEE2E2; color: #DC2626; }
        .inv-status-badge.low { background: #FEF3C7; color: #D97706; }
        .inv-status-badge.ok { background: #DCFCE7; color: #16A34A; }
        .inv-pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; }
        .inv-pagination button { padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-weight: 600; cursor: pointer; font-size: 0.82rem; }
        .inv-pagination button:disabled { opacity: 0.5; cursor: not-allowed; }
        .inv-pagination button:hover:not(:disabled) { border-color: #F97316; color: #F97316; }
        .inv-pagination span { font-size: 0.85rem; color: #6B7280; }
      `}</style>
    </div>
  );
}
