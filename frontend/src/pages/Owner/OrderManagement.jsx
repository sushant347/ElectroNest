import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Eye, ShoppingBag, RefreshCw, AlertCircle, CalendarDays } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import OrderDetailsModal from '../../components/Owner/OrderDetailsModal';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);

const statusColors = {
  Pending: { bg: '#FEF3C7', color: '#CA8A04' },
  Processing: { bg: '#DBEAFE', color: '#2563EB' },
  Shipped: { bg: '#F3E8FF', color: '#7C3AED' },
  Delivered: { bg: '#DCFCE7', color: '#16A34A' },
  Cancelled: { bg: '#FEE2E2', color: '#DC2626' },
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(null);
  /** 30 / 90 / 0 (lifetime). Sent as API `days` so filtering happens in the database. */
  const [orderDays, setOrderDays] = useState(90);

  const orderPeriodSubtitle = useMemo(() => {
    if (orderDays === 0) return 'all time';
    return `last ${orderDays} days`;
  }, [orderDays]);

  const fetchOrders = useCallback(async () => {
    try {
      setPageLoading(true);
      setPageError(null);
      const res = await ownerAPI.getAllOrders({
        page_size: 1000,
        ordering: '-order_date',
        days: orderDays,
      });
      const list = res.data.results || res.data;
      list.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
      setOrders(list);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to load orders. Please try again.');
    } finally {
      setPageLoading(false);
    }
  }, [orderDays]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filtered = orders.filter((o) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        String(o.id).includes(q) ||
        o.user_name.toLowerCase().includes(q) ||
        o.user_email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const perPage = 10;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleStatusUpdate = async (orderId, statusData) => {
    if (updatingStatus) return;
    setUpdatingStatus(orderId);
    try {
      const res = await ownerAPI.updateOrderStatus(orderId, statusData);
      const updated = res.data;
      const newStatus = updated.status || updated.status_name;
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, ...updated, status: newStatus } : o));
      setSelectedOrder((prev) => prev && prev.id === orderId ? { ...prev, ...updated, status: newStatus } : prev);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update order status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const exportCSV = () => {
    const header = 'Order ID,Customer,Date,Items,Total,Status,Payment\n';
    const rows = filtered.map((o) => `${o.id},${o.user_name},${o.order_date},${o.items_count},${o.grand_total},${o.status},${o.payment_method}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const statusCounts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {});

  return (
    <div className="owner-om">
      {/* Header */}
      <div className="owner-om-header">
        <div>
          <h1 className="owner-om-title">Order Management</h1>
          <p className="owner-om-sub">
            {pageLoading ? 'Loading orders…' : `${orders.length} orders (${orderPeriodSubtitle})`}
          </p>
        </div>
        <button className="owner-om-export-btn" onClick={exportCSV}><Download size={16} /> Export CSV</button>
        <button className="owner-om-refresh-btn" onClick={fetchOrders} disabled={pageLoading}><RefreshCw size={16} className={pageLoading ? 'spin' : ''} /></button>
      </div>

      {/* Error */}
      {pageError && (
        <div className="owner-om-error">
          <AlertCircle size={18} />
          <span>{pageError}</span>
          <button onClick={fetchOrders} className="om-retry-btn">Retry</button>
        </div>
      )}

      {/* Status Pills */}
      <div className="owner-om-status-pills">
        <button className={`om-pill ${!statusFilter ? 'active' : ''}`} onClick={() => { setStatusFilter(''); setCurrentPage(1); }}>
          All <span className="om-pill-count">{orders.length}</span>
        </button>
        {Object.keys(statusColors).map((s) => {
          const sc = statusColors[s];
          return (
            <button key={s} className={`om-pill ${statusFilter === s ? 'active' : ''}`}
              style={statusFilter === s ? { background: sc.bg, color: sc.color, borderColor: sc.color + '40' } : {}}
              onClick={() => { setStatusFilter(s); setCurrentPage(1); }}>
              {s} <span className="om-pill-count">{statusCounts[s] || 0}</span>
            </button>
          );
        })}
      </div>

      {/* Period + search */}
      <div className="owner-om-toolbar">
        <div className="owner-om-period" title="Orders are loaded from the server for the range you select">
          <CalendarDays size={15} className="om-period-icon" />
          <span className="om-period-label">Period</span>
          <select
            className="om-period-select"
            value={orderDays}
            disabled={pageLoading}
            onChange={(e) => {
              setOrderDays(Number(e.target.value));
              setCurrentPage(1);
            }}
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={0}>Lifetime (all orders)</option>
          </select>
          {pageLoading && <RefreshCw size={14} className="om-period-spin spin" aria-hidden />}
        </div>
        <div className="owner-om-search">
          <Search size={16} className="om-search-icon" />
          <input placeholder="Search by Order ID, customer name or email..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>

      {/* Table */}
      <div className="owner-om-table-wrap">
        <table className="owner-om-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pageLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={`sk-${i}`} className="om-row om-row-skeleton">
                  <td><div className="om-shim" style={{ width: 48, height: 14 }} /></td>
                  <td>
                    <div className="om-customer">
                      <div className="om-shim" style={{ width: '70%', maxWidth: 160, height: 14, marginBottom: 6 }} />
                      <div className="om-shim" style={{ width: '55%', maxWidth: 200, height: 11 }} />
                    </div>
                  </td>
                  <td><div className="om-shim" style={{ width: 88, height: 14 }} /></td>
                  <td><div className="om-shim" style={{ width: 28, height: 14, margin: '0 auto' }} /></td>
                  <td><div className="om-shim" style={{ width: 72, height: 14 }} /></td>
                  <td><div className="om-shim" style={{ width: 76, height: 24, borderRadius: 20 }} /></td>
                  <td>
                    <div className="om-payment">
                      <div className="om-shim" style={{ width: 72, height: 13, marginBottom: 4 }} />
                      <div className="om-shim" style={{ width: 56, height: 11 }} />
                    </div>
                  </td>
                  <td><div className="om-shim" style={{ width: 34, height: 32, borderRadius: 6 }} /></td>
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="owner-om-empty"><ShoppingBag size={32} /><span>{orderDays === 0 ? 'No orders in your history' : `No orders in the ${orderPeriodSubtitle}`}</span></td></tr>
            ) : (
              paged.map((o) => {
                const sc = statusColors[o.status] || statusColors.Pending;
                return (
                  <tr key={o.id} className="om-row" onClick={() => setSelectedOrder(o)}>
                    <td className="om-id">#{o.id}</td>
                    <td>
                      <div className="om-customer">
                        <span className="om-cust-name">{o.user_name}</span>
                        <span className="om-cust-email">{o.user_email}</span>
                      </div>
                    </td>
                    <td className="om-date">{new Date(o.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="om-items">{o.items_count}</td>
                    <td className="om-total">{fmt(o.grand_total)}</td>
                    <td><span className="om-status-badge" style={{ background: sc.bg, color: sc.color }}>{o.status}</span></td>
                    <td>
                      <div className="om-payment">
                        <span>{o.payment_method}</span>
                        <span className={`om-pay-status ${o.payment_status === 'Completed' ? 'completed' : o.payment_status === 'Refunded' ? 'refunded' : 'pending'}`}>{o.payment_status}</span>
                      </div>
                    </td>
                    <td>
                      <button className="om-view-btn" onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }}><Eye size={15} /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!pageLoading && totalPages > 1 && (
        <div className="owner-om-pagination">
          <span className="om-page-info">Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} of {filtered.length}</span>
          <div className="om-page-btns">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="om-page-btn"><ChevronLeft size={16} /></button>
            {(() => {
              const pages = [];
              const maxVisible = 5;
              if (totalPages <= maxVisible + 2) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                if (currentPage <= 3) {
                  for (let i = 1; i <= maxVisible; i++) pages.push(i);
                  pages.push('...');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 2) {
                  pages.push(1);
                  pages.push('...');
                  for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  pages.push('...');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                  pages.push('...');
                  pages.push(totalPages);
                }
              }
              return pages.map((page, idx) => 
                page === '...' ? <span key={`ellipsis-${idx}`} className="om-page-ellipsis">...</span> : 
                <button key={page} className={`om-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
              );
            })()}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="om-page-btn"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} onStatusUpdate={handleStatusUpdate} />

      <style>{`
        .owner-om { min-height: calc(100vh - 120px); background: #F3F4F6; padding: 2rem; }
        .owner-om-header { max-width: 1280px; margin: 0 auto 1rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
        .owner-om-title { font-size: 1.65rem; font-weight: 800; color: #1e293b; margin: 0; }
        .owner-om-sub { font-size: 0.85rem; color: #6b7280; margin-top: 0.15rem; }
        .owner-om-export-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.55rem 1.15rem; border-radius: 8px; background: #232F3E; color: #fff; font-weight: 600; font-size: 0.82rem; cursor: pointer; border: none; font-family: inherit; transition: background 0.15s; }
        .owner-om-export-btn:hover { background: #37475A; }
        .owner-om-refresh-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; background: #232F3E; color: #fff; cursor: pointer; border: none; transition: background 0.15s; }
        .owner-om-refresh-btn:hover { background: #37475A; }
        .owner-om-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        /* Error */
        .owner-om-error { max-width: 1280px; margin: 0 auto 1rem; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; border-radius: 10px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font-size: 0.85rem; font-weight: 500; }
        .om-retry-btn { margin-left: auto; padding: 0.35rem 0.85rem; border-radius: 6px; background: #DC2626; color: #fff; font-weight: 600; font-size: 0.78rem; border: none; cursor: pointer; font-family: inherit; }
        .om-retry-btn:hover { background: #b91c1c; }

        /* Status Pills */
        .owner-om-status-pills { max-width: 1280px; margin: 0 auto 1rem; display: flex; gap: 0.4rem; flex-wrap: wrap; }
        .om-pill { display: inline-flex; align-items: center; gap: 6px; padding: 0.4rem 0.85rem; border-radius: 20px; font-size: 0.78rem; font-weight: 600; border: 1.5px solid #d1d5db; background: #fff; color: #4b5563; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .om-pill:hover { border-color: #9ca3af; }
        .om-pill.active { border-color: #F97316; background: #FFF7ED; color: #F97316; }
        .om-pill-count { background: rgba(0,0,0,0.06); padding: 0.1rem 0.4rem; border-radius: 10px; font-size: 0.7rem; }

        /* Search */
        .owner-om-toolbar {
          max-width: 1280px; margin: 0 auto 1rem;
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
        }
        .owner-om-period {
          display: flex; align-items: center; gap: 8px; flex-shrink: 0;
        }
        .om-period-icon { color: #F97316; flex-shrink: 0; }
        .om-period-label { font-size: 0.72rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
        .om-period-select {
          padding: 0.5rem 0.75rem; border-radius: 8px; border: 1.5px solid #d1d5db;
          font-size: 0.82rem; font-weight: 600; font-family: inherit; color: #1e293b; background: #fff;
          cursor: pointer; min-width: 170px;
        }
        .om-period-select:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.12); }
        .om-period-select:disabled { opacity: 0.65; cursor: wait; }
        .om-period-spin { color: #F97316; flex-shrink: 0; }
        .owner-om-search { position: relative; flex: 1; min-width: 220px; max-width: 420px; }
        .om-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
        .owner-om-search input { width: 100%; padding: 0.55rem 0.75rem 0.55rem 2.25rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #1e293b; }
        .owner-om-search input:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }

        /* Table */
        .owner-om-table-wrap { max-width: 1280px; margin: 0 auto; background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .owner-om-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .owner-om-table th { text-align: left; padding: 0.75rem 1rem; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .owner-om-table td { padding: 0.7rem 1rem; border-bottom: 1px solid #f3f4f6; }
        .om-row { cursor: pointer; transition: background 0.1s; }
        .om-row:hover { background: #FFF7ED; }
        .owner-om-empty { text-align: center; padding: 2.5rem 1rem !important; color: #9ca3af; }
        .owner-om-empty span { display: block; margin-top: 0.5rem; font-weight: 500; }

        .om-id { font-weight: 700; color: #1e293b; white-space: nowrap; }
        .om-customer { display: flex; flex-direction: column; }
        .om-cust-name { font-weight: 600; color: #1e293b; }
        .om-cust-email { font-size: 0.72rem; color: #9ca3af; }
        .om-date { color: #6b7280; white-space: nowrap; }
        .om-items { text-align: center; font-weight: 600; }
        .om-total { font-weight: 700; color: #1e293b; white-space: nowrap; }
        .om-status-badge { font-size: 0.72rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 20px; white-space: nowrap; }
        .om-payment { display: flex; flex-direction: column; font-size: 0.82rem; }
        .om-pay-status { font-size: 0.7rem; font-weight: 600; }
        .om-pay-status.completed { color: #16a34a; }
        .om-pay-status.refunded { color: #dc2626; }
        .om-pay-status.pending { color: #ca8a04; }
        .om-view-btn { background: none; border: 1px solid #e5e7eb; border-radius: 6px; padding: 5px 8px; cursor: pointer; color: #9ca3af; transition: all 0.15s; }
        .om-view-btn:hover { color: #F97316; border-color: #F97316; background: #FFF7ED; }

        /* Pagination */
        .owner-om-pagination { max-width: 1280px; margin: 1rem auto 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
        .om-page-info { font-size: 0.82rem; color: #6b7280; font-weight: 500; }
        .om-page-btns { display: flex; gap: 0.3rem; align-items: center; }
        .om-page-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; font-size: 0.82rem; font-weight: 600; transition: all 0.15s; }
        .om-page-btn:hover:not(:disabled) { background: #FFF7ED; border-color: #F97316; color: #F97316; }
        .om-page-btn.active { background: #F97316; color: #fff; border-color: #F97316; }
        .om-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .om-page-ellipsis { color: #9ca3af; font-size: 0.82rem; font-weight: 600; padding: 0 4px; }

        @keyframes om-shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        .om-shim {
          border-radius: 6px;
          background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
          background-size: 800px 100%;
          animation: om-shimmer 1.35s infinite linear;
        }
        .om-row-skeleton { cursor: default; pointer-events: none; }
        .om-row-skeleton:hover { background: transparent; }

        @media (max-width: 900px) { .owner-om { padding: 1.25rem; } }

        @media (max-width: 768px) {
          .owner-om-header {
            align-items: stretch;
          }
          .owner-om-header > div:first-child {
            flex: 1 1 100%;
          }
          .owner-om-toolbar {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          .owner-om-period {
            width: 100%;
            flex-wrap: wrap;
          }
          .om-period-select {
            flex: 1;
            min-width: 0;
          }
          .owner-om-search {
            max-width: none;
            min-width: 0;
            width: 100%;
          }
          .owner-om-table {
            min-width: 760px;
          }
          .owner-om-pagination {
            justify-content: center;
          }
        }

        @media (max-width: 640px) {
          .owner-om {
            padding: 0.85rem;
          }
          .owner-om-title {
            font-size: 1.35rem;
          }
          .owner-om-export-btn,
          .owner-om-refresh-btn {
            width: 100%;
            justify-content: center;
          }
          .owner-om-refresh-btn {
            height: 40px;
          }
          .owner-om-pagination {
            flex-direction: column;
            align-items: center;
          }
          .om-page-btns {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
