import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const emptyForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'customer',
  company_name: '',
  password: '',
  confirm_password: '',
};

export default function UserModal({ user, onClose, onSubmit }) {
  const isEdit = !!user;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        role: user.role || 'customer',
        company_name: user.company_name || '',
        password: '',
        confirm_password: '',
      });
    } else {
      setForm(emptyForm);
    }
    setErrors({});
  }, [user]);

  const validate = () => {
    const errs = {};
    if (!form.first_name.trim()) errs.first_name = 'First name is required';
    if (!form.last_name.trim()) errs.last_name = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (form.phone && !/^(\+977)?[9][6-8]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) errs.phone = 'Invalid Nepal phone number';
    if ((form.role === 'owner' || form.role === 'warehouse') && !form.company_name.trim()) errs.company_name = 'Company name required for this role';
    if (!isEdit) {
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'Min 8 characters';
      if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const data = { ...form };
      if (isEdit) {
        delete data.password;
        delete data.confirm_password;
      } else {
        delete data.confirm_password;
      }
      if (data.role !== 'owner' && data.role !== 'warehouse') delete data.company_name;
      await onSubmit(data, user?.id);
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

  const showCompany = form.role === 'owner' || form.role === 'warehouse';

  return (
    <div className="um-overlay" onClick={onClose}>
      <div className="um-modal" onClick={e => e.stopPropagation()}>
        <div className="um-header">
          <h3 className="um-title">{isEdit ? 'Edit User' : 'Add New User'}</h3>
          <button className="um-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="um-form">
          <div className="um-row">
            <div className="um-field">
              <label>First Name *</label>
              <input type="text" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} className={errors.first_name ? 'error' : ''} />
              {errors.first_name && <span className="um-error">{errors.first_name}</span>}
            </div>
            <div className="um-field">
              <label>Last Name *</label>
              <input type="text" value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} className={errors.last_name ? 'error' : ''} />
              {errors.last_name && <span className="um-error">{errors.last_name}</span>}
            </div>
          </div>
          <div className="um-field">
            <label>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={errors.email ? 'error' : ''} />
            {errors.email && <span className="um-error">{errors.email}</span>}
          </div>
          <div className="um-row">
            <div className="um-field">
              <label>Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+977 98XXXXXXXX" className={errors.phone ? 'error' : ''} />
              {errors.phone && <span className="um-error">{errors.phone}</span>}
            </div>
            <div className="um-field">
              <label>Role *</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                <option value="customer">Customer</option>
                <option value="owner">Owner</option>
                <option value="warehouse">Warehouse</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          {showCompany && (
            <div className="um-field">
              <label>Company Name *</label>
              <input type="text" value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} className={errors.company_name ? 'error' : ''} />
              {errors.company_name && <span className="um-error">{errors.company_name}</span>}
            </div>
          )}
          {!isEdit && (
            <div className="um-row">
              <div className="um-field">
                <label>Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className={errors.password ? 'error' : ''} />
                {errors.password && <span className="um-error">{errors.password}</span>}
              </div>
              <div className="um-field">
                <label>Confirm Password *</label>
                <input type="password" value={form.confirm_password} onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))} className={errors.confirm_password ? 'error' : ''} />
                {errors.confirm_password && <span className="um-error">{errors.confirm_password}</span>}
              </div>
            </div>
          )}
          <div className="um-actions">
            <button type="button" className="um-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="um-submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .um-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: umFadeIn 0.2s;
        }
        @keyframes umFadeIn { from { opacity: 0; } to { opacity: 1; } }
        .um-modal {
          background: #fff;
          border-radius: 16px;
          width: 520px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: umSlideUp 0.3s ease;
        }
        @keyframes umSlideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .um-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .um-title { margin: 0; font-size: 18px; font-weight: 700; color: #1e293b; }
        .um-close {
          width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 8px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;
          transition: all 0.15s;
        }
        .um-close:hover { background: #fee2e2; color: #dc2626; }
        .um-form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }
        .um-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .um-field { display: flex; flex-direction: column; gap: 5px; }
        .um-field label { font-size: 12px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.3px; }
        .um-field input, .um-field select {
          padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;
          transition: border 0.15s; outline: none; color: #1e293b; background: #fff;
        }
        .um-field input:focus, .um-field select:focus { border-color: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .um-field input.error, .um-field select.error { border-color: #dc2626; }
        .um-error { font-size: 11px; color: #dc2626; }
        .um-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
        .um-cancel {
          padding: 9px 20px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;
          font-size: 13px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s;
        }
        .um-cancel:hover { background: #f8fafc; }
        .um-submit {
          padding: 9px 24px; border: none; border-radius: 8px; background: #dc2626;
          font-size: 13px; font-weight: 600; color: #fff; cursor: pointer; transition: all 0.15s;
        }
        .um-submit:hover { background: #b91c1c; }
        .um-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
