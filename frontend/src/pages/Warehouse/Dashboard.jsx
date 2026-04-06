import { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, AlertTriangle, Truck, RefreshCw, AlertCircle, Eye } from 'lucide-react';
import { warehouseAPI } from '../../services/api';
import { HeaderSkeleton, CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function WarehouseDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shippedOrders, setShippedOrders] = useState([]);
  const [viewOrder, setViewOrder] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashRes = await warehouseAPI.getDashboard();
      setData(dashRes.data);
      // Use ready_to_deliver from the dashboard API (server-side filtered with real details)
      setShippedOrders(dashRes.data?.ready_to_deliver || []);
    } catch (err) {
      console.error('Failed to fetch warehouse dashboard data:', err);
      setError('Failed to load dashboard data. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ padding: '28px 32px 40px', maxWidth: 1400, margin: '0 auto' }}>
        <HeaderSkeleton titleWidth={240} subtitleWidth={280} />
        <CardGridSkeleton cards={4} columns="repeat(auto-fit, minmax(220px, 1fr))" minHeight={110} />
        <div style={{ marginTop: 20 }}>
          <CardGridSkeleton cards={2} columns="repeat(auto-fit, minmax(320px, 1fr))" minHeight={220} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <AlertCircle size={40} color="#EF4444" />
          <h3 style={{ color: '#1F2937', margin: '12px 0 6px' }}>Failed to Load</h3>
          <p style={{ color: '#6B7280', fontSize: '0.88rem', marginBottom: 16 }}>{error}</p>
          <button onClick={fetchData} style={{ padding: '10px 24px', background: '#F97316', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const lowStockItems = data?.low_stock_items || [];
  const recentPOs = data?.recent_purchase_orders || [];
  const recentCustomerOrders = data?.recent_customer_orders || [];

  return (
    <>
      <div className="wh-dashboard">
        <div className="wh-page-header">
          <div>
            <h1 className="wh-page-title">Warehouse Dashboard</h1>
            <p className="wh-page-subtitle">Real-time inventory overview & analytics</p>
          </div>
          <button className="wh-refresh-btn" onClick={fetchData} title="Refresh data"><RefreshCw size={16} /></button>
        </div>

        <div className="wh-stats-grid">
          <StatCard title="Total Products" value={data?.total_products || 0} subtitle="Products in catalog" icon={Package} color="#F97316" />
          <StatCard title="Total Stock" value={(data?.total_stock || 0).toLocaleString()} subtitle="Units in warehouse" icon={TrendingUp} color="#2563EB" />
          <StatCard title="Low Stock Items" value={data?.low_stock_count || 0} subtitle="Below reorder level" icon={AlertTriangle} color="#D97706" />
          <StatCard title="Ready to Deliver" value={data?.shipped_count || shippedOrders.length} subtitle="Shipped orders pending" icon={Truck} color="#7C3AED" />
        </div>

        {/* Ready to Deliver */}
        <div className="wh-card wh-deliver-card">
          <h3 className="wh-card-title">
            <Truck size={17} color="#7C3AED" /> Ready to Deliver
            <span className="wh-deliver-count">{shippedOrders.length}</span>
          </h3>
          {shippedOrders.length === 0 ? (
            <p style={{ color: '#9CA3AF', textAlign: 'center', padding: '20px 0', fontSize: '0.85rem' }}>No shipped orders waiting for delivery</p>
          ) : (
            <div className="wh-deliver-list">
              {shippedOrders.map(order => (
                <div key={order.id} className="wh-deliver-row">
                  <div className="wh-deliver-info">
                    <span className="wh-deliver-num">Order #{order.order_number || order.id}</span>
                    <span className="wh-deliver-meta">
                      {order.customer_name || 'Customer'} · {order.items_count || 0} item{(order.items_count || 0) !== 1 ? 's' : ''} · {fmtNPR(order.total_amount)}
                    </span>
                    {order.items && order.items.length > 0 && (
                      <span className="wh-deliver-items">{order.items.map(i => `${i.product_name} x${i.quantity}`).join(', ')}</span>
                    )}
                  </div>
                  <button className="wh-eye-btn" onClick={() => setViewOrder(order)} title="View order details">
                    <Eye size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wh-bottom-row">
          {/* Low Stock Items */}
          <div className="wh-card">
            <h3 className="wh-card-title">
              <AlertTriangle size={17} color="#D97706" /> Low Stock Alerts
              <span className="wh-alert-count">{lowStockItems.length}</span>
            </h3>
            <div className="wh-alerts-list">
              {lowStockItems.length > 0 ? lowStockItems.slice(0, 10).map((item, i) => (
                <div key={i} className="wh-alert-item">
                  <div className="wh-alert-top">
                    <span className="wh-alert-name">{item.name || item.id}</span>
                    <span className={`wh-severity ${item.stock <= 0 ? 'critical' : 'warning'}`}>
                      {item.stock <= 0 ? 'Out of Stock' : 'Low Stock'}
                    </span>
                  </div>
                  <div className="wh-alert-details">
                    <span>Stock: <strong>{item.stock}</strong></span>
                    <span className="wh-alert-sep">|</span>
                    <span>Reorder: {item.reorder_level}</span>
                    {item.category_name && <><span className="wh-alert-sep">|</span><span>{item.category_name}</span></>}
                    {item.brand && <><span className="wh-alert-sep">|</span><span>{item.brand}</span></>}
                  </div>
                </div>
              )) : <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>No low stock alerts</p>}
            </div>
          </div>

          {/* Recent Purchase Orders — show supplier POs if available, else recent customer orders */}
          <div className="wh-card">
            <h3 className="wh-card-title">
              <Truck size={17} /> {recentPOs.length > 0 ? 'Recent Purchase Orders' : 'Recent Customer Orders'}
            </h3>
            <div className="wh-po-list">
              {recentPOs.length > 0 ? recentPOs.map((po, i) => (
                <div key={i} className="wh-po-item">
                  <div className="wh-po-info">
                    <p className="wh-po-supplier">{po.supplier_name || `PO #${po.id}`}</p>
                    <p className="wh-po-meta">
                      {fmtNPR(po.total_amount)} · {po.details?.length || 0} items
                    </p>
                  </div>
                  <span
                    className="wh-po-status"
                    style={{
                      color: po.status_name === 'Delivered' ? '#16A34A' : po.status_name === 'Pending' ? '#D97706' : '#2563EB',
                      background: po.status_name === 'Delivered' ? '#DCFCE7' : po.status_name === 'Pending' ? '#FEF3C7' : '#DBEAFE',
                    }}
                  >
                    {po.status_name || 'Unknown'}
                  </span>
                </div>
              )) : recentCustomerOrders.length > 0 ? recentCustomerOrders.map((order, i) => (
                <div key={i} className="wh-po-item">
                  <div className="wh-po-info">
                    <p className="wh-po-supplier">{order.order_number} — {order.customer_name}</p>
                    <p className="wh-po-meta">
                      {fmtNPR(order.total_amount)} · {order.items_count || 0} items
                      {order.items && order.items.length > 0 && ` · ${order.items[0].product_name}${order.items.length > 1 ? ` +${order.items.length - 1}` : ''}`}
                    </p>
                  </div>
                  <span
                    className="wh-po-status"
                    style={{
                      color: order.status === 'Pending' ? '#D97706' : '#2563EB',
                      background: order.status === 'Pending' ? '#FEF3C7' : '#DBEAFE',
                    }}
                  >
                    {order.status || 'Unknown'}
                  </span>
                </div>
              )) : <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20, fontSize: '0.85rem' }}>No recent orders found</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Order Detail Modal (Read-only) */}
      {viewOrder && (
        <div className="wh-modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="wh-modal" onClick={e => e.stopPropagation()}>
            <div className="wh-modal-header">
              <h3>Order #{viewOrder.order_number || viewOrder.id}</h3>
              <button className="wh-modal-close" onClick={() => setViewOrder(null)}>&times;</button>
            </div>
            <div className="wh-modal-body">
              <div className="wh-modal-info">
                <span><strong>Customer:</strong> {viewOrder.customer_name || 'N/A'}</span>
                <span><strong>Status:</strong> {viewOrder.status || 'Shipped'}</span>
                <span><strong>Total:</strong> {fmtNPR(viewOrder.total_amount)}</span>
                <span><strong>Items:</strong> {viewOrder.items_count || 0} products</span>
              </div>
              {viewOrder.items && viewOrder.items.length > 0 && (
                <table className="wh-modal-table">
                  <thead><tr><th>Product</th><th>Qty</th></tr></thead>
                  <tbody>
                    {viewOrder.items.map((d, i) => (
                      <tr key={i}>
                        <td>{d.product_name}</td>
                        <td style={{ textAlign: 'center' }}>{d.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .wh-dashboard { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
        .wh-page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .wh-page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: #111827; }
        .wh-page-subtitle { margin: 4px 0 0 0; font-size: 0.88rem; color: #6B7280; }
        .wh-refresh-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid #E5E7EB; background: white; color: #6B7280; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .wh-refresh-btn:hover { border-color: #F97316; color: #F97316; }
        .wh-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px; }
        .wh-bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .wh-card { background: white; border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px; }
        .wh-card-title { margin: 0 0 16px 0; font-size: 0.95rem; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }
        .wh-alert-count { background: #FEF3C7; color: #D97706; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; margin-left: auto; }
        .wh-alerts-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
        .wh-alert-item { padding: 10px 12px; border-radius: 10px; background: #F9FAFB; }
        .wh-alert-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
        .wh-alert-name { font-size: 0.82rem; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wh-alert-details { font-size: 0.72rem; color: #6B7280; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
        .wh-alert-sep { color: #D1D5DB; }
        .wh-severity { font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; white-space: nowrap; }
        .wh-severity.critical { background: #FEE2E2; color: #DC2626; }
        .wh-severity.warning { background: #FEF3C7; color: #D97706; }
        .wh-po-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
        .wh-po-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-radius: 10px; background: #F9FAFB; gap: 10px; }
        .wh-po-info { flex: 1; min-width: 0; }
        .wh-po-supplier { margin: 0; font-size: 0.82rem; font-weight: 600; color: #111827; }
        .wh-po-meta { margin: 2px 0 0; font-size: 0.72rem; color: #9CA3AF; }
        .wh-po-status { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .wh-stat-card { display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; }
        .wh-stat-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .wh-stat-label { font-size: 13px; color: #6b7280; font-weight: 500; }
        .wh-stat-value { font-size: 22px; font-weight: 700; color: #1e293b; margin-top: 2px; }
        .wh-stat-sub { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
        .wh-deliver-card { margin-bottom: 24px; }
        .wh-deliver-count { background: #EDE9FE; color: #7C3AED; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; margin-left: auto; }
        .wh-deliver-list { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow-y: auto; }
        .wh-deliver-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 10px; background: #F5F3FF; border: 1px solid #EDE9FE; }
        .wh-deliver-info { flex: 1; min-width: 0; }
        .wh-deliver-num { display: block; font-size: 0.85rem; font-weight: 700; color: #1e293b; }
        .wh-deliver-meta { display: block; font-size: 0.72rem; color: #6B7280; margin-top: 2px; }
        .wh-deliver-items { display: block; font-size: 0.68rem; color: #9CA3AF; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .wh-eye-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; background: #EDE9FE; color: #7C3AED; border: 1px solid #DDD6FE; cursor: pointer; transition: all 0.15s; flex-shrink: 0; }
        .wh-eye-btn:hover { background: #7C3AED; color: #fff; transform: translateY(-1px); }
        .wh-modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
        .wh-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 540px; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .wh-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
        .wh-modal-header h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b; }
        .wh-modal-close { background: none; border: none; font-size: 1.4rem; color: #9CA3AF; cursor: pointer; line-height: 1; }
        .wh-modal-close:hover { color: #ef4444; }
        .wh-modal-body { padding: 16px 20px 20px; }
        .wh-modal-info { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; font-size: 0.84rem; color: #374151; }
        .wh-modal-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
        .wh-modal-table th { padding: 8px 10px; background: #f9fafb; color: #6b7280; font-weight: 600; font-size: 0.72rem; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; text-align: left; }
        .wh-modal-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
        @media (max-width: 1200px) { .wh-stats-grid { grid-template-columns: repeat(2, 1fr); } .wh-bottom-row { grid-template-columns: 1fr; } }
        @media (max-width: 768px) {
          .wh-dashboard { padding: 1rem; }
          .wh-card { padding: 16px 14px; }
          .wh-page-title { font-size: 1.3rem; }
        }
        @media (max-width: 640px) {
          .wh-dashboard { padding: 0.75rem; }
          .wh-stats-grid { grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
          .wh-stat-card { padding: 14px 12px; gap: 10px; }
          .wh-card { padding: 14px 12px; }
          /* Let long product names wrap — no truncation on mobile */
          .wh-alert-name { white-space: normal !important; overflow: visible !important; text-overflow: unset !important; word-break: break-word; line-height: 1.35; }
          .wh-po-supplier { white-space: normal !important; word-break: break-word; }
          /* Badge moves to its own line when name is long */
          .wh-alert-top { flex-wrap: wrap; align-items: flex-start; gap: 4px; }
          .wh-severity { flex-shrink: 0; }
          /* PO items stack when content is wide */
          .wh-po-item { flex-wrap: wrap; gap: 6px; }
          .wh-po-status { align-self: flex-start; }
          /* Deliver rows */
          .wh-deliver-row { flex-wrap: wrap; gap: 8px; }
          .wh-deliver-meta { white-space: normal !important; overflow: visible !important; text-overflow: unset !important; word-break: break-word; }
        }
        @media (max-width: 400px) { .wh-stats-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <div className="wh-stat-card">
      <div className="wh-stat-icon" style={{ background: `${color}14`, color }}>
        <Icon size={22} />
      </div>
      <div>
        <div className="wh-stat-label">{title}</div>
        <div className="wh-stat-value">{value}</div>
        <div className="wh-stat-sub">{subtitle}</div>
      </div>
    </div>
  );
}
