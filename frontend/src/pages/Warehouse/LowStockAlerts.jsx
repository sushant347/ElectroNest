import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, AlertCircle, Package, Send, CheckCircle } from 'lucide-react';
import { warehouseAPI } from '../../services/api';
import { CardGridSkeleton } from '../../components/Common/SkeletonLoader';

export default function LowStockAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifying, setNotifying] = useState({});
  const [notified, setNotified] = useState({});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await warehouseAPI.getLowStockProducts();
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch low stock alerts:', err);
      setError('Failed to load low stock data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleNotifyOwner = async (productId, productName) => {
    setNotifying(prev => ({ ...prev, [productId]: true }));
    try {
      await warehouseAPI.sendLowStockAlert(productId);
      setNotified(prev => ({ ...prev, [productId]: true }));
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to notify owner for ${productName}`);
    } finally {
      setNotifying(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="lsa-page">
      <div className="lsa-header">
        <div>
          <h1 className="lsa-title"><AlertTriangle size={24} color="#D97706" /> Low Stock Alerts</h1>
          <p className="lsa-subtitle">{alerts.length} products at or below reorder level</p>
        </div>
        <button className="lsa-refresh" onClick={fetchAlerts}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && (
        <div className="lsa-error"><AlertCircle size={16} /> {error} <button onClick={fetchAlerts} className="lsa-retry">Retry</button></div>
      )}

      {loading ? (
        <CardGridSkeleton cards={6} columns="repeat(auto-fill, minmax(320px, 1fr))" minHeight={190} />
      ) : alerts.length === 0 ? (
        <div className="lsa-loading"><Package size={40} color="#16A34A" /><p style={{ color: '#16A34A', fontWeight: 600 }}>All products are well stocked!</p></div>
      ) : (
        <div className="lsa-grid">
          {alerts.map((item, i) => {
            const critical = item.stock <= 0;
            const isNotified = notified[item.id];
            const isNotifying = notifying[item.id];
            return (
              <div key={i} className={`lsa-card ${critical ? 'critical' : 'warning'}`}>
                <div className="lsa-card-header">
                  <h3 className="lsa-product-name">{item.name}</h3>
                  <span className={`lsa-badge ${critical ? 'critical' : 'warning'}`}>
                    {critical ? 'Out of Stock' : 'Low Stock'}
                  </span>
                </div>
                <div className="lsa-card-details">
                  <div className="lsa-detail">
                    <span className="lsa-detail-label">Store Owner</span>
                    <span className="lsa-detail-value">{item.owner_name || '-'}</span>
                  </div>
                  <div className="lsa-detail">
                    <span className="lsa-detail-label">Current Stock</span>
                    <span className={`lsa-detail-value ${critical ? 'text-red' : 'text-amber'}`}>{item.stock}</span>
                  </div>
                  <div className="lsa-detail">
                    <span className="lsa-detail-label">Reorder Level</span>
                    <span className="lsa-detail-value">{item.reorder_level}</span>
                  </div>
                  <div className="lsa-detail">
                    <span className="lsa-detail-label">Category</span>
                    <span className="lsa-detail-value">{item.category_name || '-'}</span>
                  </div>
                </div>
                <div className="lsa-bar-wrap">
                  <div className="lsa-bar" style={{ width: `${Math.min(100, (item.stock / Math.max(item.reorder_level, 1)) * 100)}%`, background: critical ? '#DC2626' : '#D97706' }} />
                </div>
                {/* Notify Store Owner Button */}
                <button
                  className={`lsa-notify-btn ${isNotified ? 'notified' : ''}`}
                  onClick={() => !isNotified && handleNotifyOwner(item.id, item.name)}
                  disabled={isNotifying || isNotified}
                  title={`Send low stock notification to ${item.owner_name || 'store owner'}`}
                >
                  {isNotified ? (
                    <><CheckCircle size={14} /> Store Owner Notified</>
                  ) : isNotifying ? (
                    <><RefreshCw size={14} className="spin" /> Notifying...</>
                  ) : (
                    <><Send size={14} /> Notify Store Owner</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .lsa-page { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
        .lsa-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .lsa-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 10px; }
        .lsa-subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }
        .lsa-refresh { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-weight: 600; font-size: 0.82rem; cursor: pointer; color: #374151; }
        .lsa-refresh:hover { border-color: #F97316; color: #F97316; }
        .lsa-error { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: #DC2626; font-size: 0.85rem; margin-bottom: 16px; }
        .lsa-retry { margin-left: auto; padding: 4px 12px; background: #DC2626; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 0.78rem; }
        .lsa-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #6B7280; gap: 12px; }
        .spin { animation: spinA 1s linear infinite; }
        @keyframes spinA { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .lsa-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .lsa-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 20px; transition: box-shadow 0.15s; }
        .lsa-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .lsa-card.critical { border-left: 4px solid #DC2626; }
        .lsa-card.warning { border-left: 4px solid #D97706; }
        .lsa-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .lsa-product-name { margin: 0; font-size: 0.92rem; font-weight: 700; color: #111827; }
        .lsa-badge { font-size: 0.7rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .lsa-badge.critical { background: #FEE2E2; color: #DC2626; }
        .lsa-badge.warning { background: #FEF3C7; color: #D97706; }
        .lsa-card-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .lsa-detail { display: flex; flex-direction: column; }
        .lsa-detail-label { font-size: 0.7rem; color: #9CA3AF; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
        .lsa-detail-value { font-size: 0.88rem; font-weight: 600; color: #374151; }
        .text-red { color: #DC2626 !important; }
        .text-amber { color: #D97706 !important; }
        .lsa-bar-wrap { height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
        .lsa-bar { height: 100%; border-radius: 3px; transition: width 0.3s; }

        .lsa-notify-btn {
          display: inline-flex; align-items: center; gap: 6px;
          width: 100%; justify-content: center;
          padding: 8px 16px; border-radius: 8px;
          font-size: 0.8rem; font-weight: 600; font-family: inherit;
          cursor: pointer; transition: all 0.15s;
          background: #F97316; color: #fff; border: none;
        }
        .lsa-notify-btn:hover:not(:disabled) { background: #ea580c; }
        .lsa-notify-btn:disabled { cursor: not-allowed; opacity: 0.7; }
        .lsa-notify-btn.notified { background: #DCFCE7; color: #16A34A; border: 1px solid #BBF7D0; }

        @media (max-width: 768px) { .lsa-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
