import { useState, useEffect } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, AlertCircle, RotateCcw, Wrench, Calendar, User, FileText, Package, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { warehouseAPI } from '../../services/api';

const TYPE_CONFIG = {
  stock_in:   { icon: ArrowDownLeft, bg: '#DCFCE7', color: '#16A34A', label: 'Stock In' },
  stock_out:  { icon: ArrowUpRight, bg: '#DBEAFE', color: '#2563EB', label: 'Stock Out' },
  damaged:    { icon: AlertCircle, bg: '#FEE2E2', color: '#DC2626', label: 'Damaged' },
  returned:   { icon: RotateCcw, bg: '#F3E8FF', color: '#7C3AED', label: 'Returned' },
  transferred:{ icon: Wrench, bg: '#FEF3C7', color: '#D97706', label: 'Transferred' },
};

/**
 * MovementModal – dual mode:
 *   • View mode  – pass `movement` prop
 *   • Create mode – pass `onSubmit` prop (no `movement`)
 */
export default function MovementModal({ movement, onClose, onSubmit }) {
  const isCreateMode = !movement && typeof onSubmit === 'function';

  // Form state for create mode
  const [form, setForm] = useState({ product_id: '', type: 'stock_in', quantity: '', reason: '', reference: '' });
  const [products, setProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isCreateMode) {
      warehouseAPI.getInventoryItems({ page_size: 500 })
        .then(res => setProducts(res.data?.results || res.data || []))
        .catch(() => {});
    }
  }, [isCreateMode]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_id || !form.quantity || !form.reason) { setFormError('Product, quantity & reason are required'); return; }
    setSubmitting(true);
    setFormError('');
    try { await onSubmit({ ...form, quantity: Number(form.quantity) }); } catch (err) { setFormError('Failed to record movement'); }
    setSubmitting(false);
  };

  // ── Create mode ──
  if (isCreateMode) {
    return (
      <>
        <div className="mm-overlay" onClick={onClose}>
          <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mm-header">
              <div className="mm-header-left">
                <div className="mm-type-icon" style={{ background: '#FFF7ED', color: '#F97316' }}><Plus size={20} /></div>
                <div><h2 className="mm-title">Record Stock Movement</h2></div>
              </div>
              <button className="mm-close" onClick={onClose}><X size={18} /></button>
            </div>
            <form className="mm-body" onSubmit={handleFormSubmit}>
              {formError && <div style={{ background: '#FEF2F2', color: '#DC2626', padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginBottom: 14 }}>{formError}</div>}
              <div className="mm-form-group">
                <label className="mm-form-label">Product *</label>
                <select className="mm-form-input" value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))} required>
                  <option value="">Select product...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.product_name || p.name} ({p.sku || p.id})</option>)}
                </select>
              </div>
              <div className="mm-form-row">
                <div className="mm-form-group">
                  <label className="mm-form-label">Type *</label>
                  <select className="mm-form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div className="mm-form-group">
                  <label className="mm-form-label">Quantity *</label>
                  <input type="number" min="1" className="mm-form-input" placeholder="0" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} required />
                </div>
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Reason *</label>
                <textarea className="mm-form-input mm-textarea" placeholder="Reason for this movement..." value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required />
              </div>
              <div className="mm-form-group">
                <label className="mm-form-label">Reference (optional)</label>
                <input className="mm-form-input" placeholder="PO-2025-001, INV-123, etc." value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="mm-footer" style={{ padding: '16px 0 0', borderTop: 'none' }}>
                <button type="button" className="mm-btn-secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="mm-btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Record Movement'}</button>
              </div>
            </form>
          </div>
        </div>
        <style>{`
          .mm-form-group { margin-bottom: 14px; }
          .mm-form-label { display: block; font-size: 0.78rem; font-weight: 600; color: #374151; margin-bottom: 5px; }
          .mm-form-input { width: 100%; padding: 9px 12px; border: 1px solid #E5E7EB; border-radius: 10px; font-size: 0.88rem; outline: none; font-family: inherit; box-sizing: border-box; }
          .mm-form-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
          .mm-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .mm-textarea { min-height: 70px; resize: vertical; }
          .mm-btn-primary { padding: 9px 22px; background: #F97316; color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 0.85rem; cursor: pointer; margin-left: 8px; }
          .mm-btn-primary:hover { background: #EA580C; }
          .mm-btn-primary:disabled { opacity: 0.6; cursor: wait; }
        `}</style>
      </>
    );
  }

  // ── View mode ──
  if (!movement) return null;

  const config = TYPE_CONFIG[movement.type] || TYPE_CONFIG.stock_in;
  const Icon = config.icon;

  return (
    <>
      <div className="mm-overlay" onClick={onClose}>
        <div className="mm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="mm-header">
            <div className="mm-header-left">
              <div className="mm-type-icon" style={{ background: config.bg, color: config.color }}>
                <Icon size={20} />
              </div>
              <div>
                <h2 className="mm-title">Stock Movement Details</h2>
                <span className="mm-id">{movement.id}</span>
              </div>
            </div>
            <button className="mm-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="mm-body">
            <div className="mm-type-badge" style={{ background: config.bg, color: config.color }}>
              <Icon size={16} />
              <span>{config.label}</span>
            </div>

            <div className="mm-section">
              <h4 className="mm-section-title"><Package size={15} /> Product Information</h4>
              <div className="mm-info-grid">
                <div className="mm-info-item"><span className="mm-label">Product</span><span className="mm-value">{movement.product_name}</span></div>
                <div className="mm-info-item"><span className="mm-label">Product ID</span><span className="mm-value mm-mono">{movement.product_id}</span></div>
                <div className="mm-info-item"><span className="mm-label">Owner</span><span className="mm-value">{movement.owner}</span></div>
                <div className="mm-info-item"><span className="mm-label">Quantity</span>
                  <span className={`mm-value mm-qty ${movement.type === 'stock_in' || movement.type === 'returned' ? 'positive' : 'negative'}`}>
                    {movement.type === 'stock_in' || movement.type === 'returned' ? '+' : '-'}{Math.abs(movement.quantity)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mm-section">
              <h4 className="mm-section-title"><FileText size={15} /> Movement Details</h4>
              <div className="mm-info-grid">
                <div className="mm-info-item"><span className="mm-label">Reference</span><span className="mm-value mm-mono">{movement.reference}</span></div>
                <div className="mm-info-item"><span className="mm-label">Reason</span><span className="mm-value">{movement.reason}</span></div>
                <div className="mm-info-item"><span className="mm-label"><Calendar size={13} /> Date</span><span className="mm-value">{movement.date ? format(new Date(movement.date), 'dd MMM yyyy, hh:mm a') : '—'}</span></div>
                <div className="mm-info-item"><span className="mm-label"><User size={13} /> Performed By</span><span className="mm-value">{movement.performed_by}</span></div>
              </div>
            </div>
          </div>

          <div className="mm-footer">
            <button className="mm-btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>

      <style>{`
        .mm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: mmFadeIn 0.2s ease-out;
          backdrop-filter: blur(4px);
        }
        .mm-modal {
          background: white;
          border-radius: 20px;
          width: 95%;
          max-width: 560px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.2);
          animation: mmSlideUp 0.3s ease-out;
        }
        .mm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid #F3F4F6;
        }
        .mm-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .mm-type-icon {
          padding: 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mm-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
        }
        .mm-id {
          font-size: 0.75rem;
          color: #9CA3AF;
          font-family: 'Courier New', monospace;
        }
        .mm-close {
          background: #F3F4F6;
          border: none;
          padding: 8px;
          border-radius: 10px;
          cursor: pointer;
          color: #6B7280;
          transition: all 0.2s;
        }
        .mm-close:hover {
          background: #FEE2E2;
          color: #DC2626;
        }
        .mm-body {
          padding: 24px;
        }
        .mm-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .mm-section {
          margin-bottom: 20px;
        }
        .mm-section-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #6B7280;
          margin: 0 0 12px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .mm-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .mm-info-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mm-label {
          font-size: 0.75rem;
          color: #9CA3AF;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mm-value {
          font-size: 0.9rem;
          color: #111827;
          font-weight: 500;
        }
        .mm-mono {
          font-family: 'Courier New', monospace;
          font-size: 0.82rem;
        }
        .mm-qty {
          font-size: 1.1rem;
          font-weight: 700;
        }
        .mm-qty.positive { color: #16A34A; }
        .mm-qty.negative { color: #DC2626; }
        .mm-footer {
          display: flex;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #F3F4F6;
        }
        .mm-btn-secondary {
          padding: 8px 20px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          background: white;
          font-size: 0.85rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mm-btn-secondary:hover {
          border-color: #F97316;
          color: #F97316;
        }
        @keyframes mmFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mmSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
