import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  company: '',
  type: 'manufacturer',
  address: '',
};

export default function SupplierModal({ supplier, onClose, onSubmit }) {
  const isEdit = !!supplier;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        company: supplier.company || '',
        type: supplier.type || 'manufacturer',
        address: supplier.address || '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [supplier]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Supplier name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (form.phone && !/^(\+977)?[9][6-8]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) errs.phone = 'Invalid phone number';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSubmit(form, supplier?.id);
      onClose();
    } catch (err) {
      const resp = err.response?.data;
      if (resp && typeof resp === 'object') {
        const apiErrors = {};
        Object.entries(resp).forEach(([k, v]) => { apiErrors[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(apiErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="sm-overlay" onClick={onClose}>
      <div className="sm-modal" onClick={e => e.stopPropagation()}>
        <div className="sm-header">
          <h3 className="sm-title">{isEdit ? 'Edit Supplier' : 'Add New Supplier'}</h3>
          <button className="sm-close" onClick={onClose}><X size={18} /></button>
        </div>

        {form.type === 'owner' && (
          <div className="sm-warning">
            <AlertTriangle size={16} />
            <span>Owner-suppliers have access to the owner dashboard. Ensure appropriate permissions.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="sm-form">
          <div className="sm-row">
            <div className="sm-field">
              <label>Supplier Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={errors.name ? 'error' : ''} />
              {errors.name && <span className="sm-error">{errors.name}</span>}
            </div>
            <div className="sm-field">
              <label>Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="manufacturer">Manufacturer</option>
                <option value="owner">Owner-Supplier</option>
              </select>
            </div>
          </div>
          <div className="sm-row">
            <div className="sm-field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={errors.email ? 'error' : ''} />
              {errors.email && <span className="sm-error">{errors.email}</span>}
            </div>
            <div className="sm-field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+977 98XXXXXXXX" className={errors.phone ? 'error' : ''} />
              {errors.phone && <span className="sm-error">{errors.phone}</span>}
            </div>
          </div>
          <div className="sm-field">
            <label>Company</label>
            <input type="text" value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} />
          </div>
          <div className="sm-field">
            <label>Address</label>
            <textarea rows={3} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="sm-actions">
            <button type="button" className="sm-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="sm-submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update Supplier' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .sm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          animation: smFadeIn 0.2s;
        }
        @keyframes smFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .sm-modal {
          background: #fff; border-radius: 16px; width: 520px; max-width: 95vw;
          max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: smSlideUp 0.3s ease;
        }
        @keyframes smSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .sm-header {
          display: flex; justify-content: space-between; align-items: center;
          padding: 20px 24px 16px; border-bottom: 1px solid #f1f5f9;
        }
        .sm-title { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
        .sm-close {
          width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;
        }
        .sm-close:hover { background: #fee2e2; color: #dc2626; }
        .sm-warning {
          display: flex; align-items: center; gap: 8px; margin: 12px 24px 0;
          padding: 10px 14px; border-radius: 8px; background: #fff7ed;
          border: 1px solid #fed7aa; color: #c2410c; font-size: 12px;
        }
        .sm-form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .sm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sm-field { display: flex; flex-direction: column; gap: 5px; }
        .sm-field label { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; }
        .sm-field input, .sm-field select, .sm-field textarea {
          padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;
          transition: border 0.15s; outline: none; color: #1e293b; background: #fff;
          font-family: inherit; resize: vertical;
        }
        .sm-field input:focus, .sm-field select:focus, .sm-field textarea:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .sm-field input.error { border-color: #dc2626; }
        .sm-error { font-size: 11px; color: #dc2626; }
        .sm-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
        .sm-cancel {
          padding: 9px 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
          font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer;
        }
        .sm-cancel:hover { background: #f8fafc; }
        .sm-submit {
          padding: 9px 24px; border: none; border-radius: 8px; background: #dc2626;
          font-size: 13px; font-weight: 600; color: #fff; cursor: pointer;
        }
        .sm-submit:hover { background: #b91c1c; }
        .sm-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
