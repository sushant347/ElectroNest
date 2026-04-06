import { useState, useEffect, useCallback } from 'react';
import { Truck, Search, RefreshCw, AlertCircle, Plus, Edit2, Trash2, X, Filter, CheckCircle, XCircle } from 'lucide-react';
import { adminAPI } from '../../services/api';
import { TableSkeleton } from '../../components/Common/SkeletonLoader';

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [form, setForm] = useState({
    name: '',
    contact_person_name: '',
    contact_email: '',
    phone: '',
    city: '',
    country: '',
    is_active: true,
  });

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      const res = await adminAPI.getSuppliers(params);
      setSuppliers(res.data?.results || res.data || []);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setError('Failed to load suppliers.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const openCreate = () => {
    setEditSupplier(null);
    setForm({ name: '', contact_person_name: '', contact_email: '', phone: '', city: '', country: '', is_active: true });
    setShowModal(true);
  };

  const openEdit = (s) => {
    setEditSupplier(s);
    setForm({
      name: s.name || '',
      contact_person_name: s.contact_person_name || '',
      contact_email: s.contact_email || '',
      phone: s.phone || '',
      city: s.city || '',
      country: s.country || '',
      is_active: s.is_active !== false,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editSupplier) {
        await adminAPI.updateSupplier(editSupplier.id, form);
      } else {
        await adminAPI.createSupplier(form);
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    }
  };

  const handleDelete = async (supplier) => {
    try {
      await adminAPI.deleteSupplier(supplier.id);
      setDeleteConfirm(null);
      fetchSuppliers();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filtered = suppliers.filter(s => {
    if (statusFilter === 'active') return s.is_active;
    if (statusFilter === 'inactive') return !s.is_active;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="sup-page">
      <div className="sup-header">
        <div>
          <h1 className="sup-title"><Truck size={24} /> Supplier Management</h1>
          <p className="sup-subtitle">
            {filtered.length} of {suppliers.length} suppliers
            {statusFilter && ` · ${statusFilter}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="sup-create-btn" onClick={openCreate}><Plus size={16} /> Add Supplier</button>
          <button className="sup-refresh" onClick={fetchSuppliers} title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="sup-filter-bar">
        <div className="sup-search-wrap">
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search by name, contact, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sup-search-input"
          />
          {search && (
            <button className="sup-clear-btn" onClick={() => setSearch('')}><X size={14} /></button>
          )}
        </div>
        <div className="sup-filter-group">
          <Filter size={14} color="#6B7280" />
          <span className="sup-filter-label">Status:</span>
          {['', 'active', 'inactive'].map(s => (
            <button
              key={s || 'all'}
              className={`sup-filter-tab ${statusFilter === s ? 'active' : ''}`}
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="sup-error"><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <TableSkeleton rows={8} columns={8} />
      ) : (
        <>
          {/* Stats Row */}
          <div className="sup-stats-row">
            <div className="sup-stat-pill">
              <CheckCircle size={14} color="#16A34A" />
              <span>{suppliers.filter(s => s.is_active).length} Active</span>
            </div>
            <div className="sup-stat-pill">
              <XCircle size={14} color="#DC2626" />
              <span>{suppliers.filter(s => !s.is_active).length} Inactive</span>
            </div>
          </div>

          <div className="sup-table-wrap">
            <table className="sup-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                      {search || statusFilter ? 'No suppliers match your filters' : 'No suppliers found'}
                    </td>
                  </tr>
                ) : paged.map((s, idx) => (
                  <tr key={s.id}>
                    <td style={{ color: '#9CA3AF', fontWeight: 600, fontSize: '0.8rem' }}>
                      {(page - 1) * perPage + idx + 1}
                    </td>
                    <td>
                      <div className="sup-name-cell">
                        <div className="sup-icon-sm"><Truck size={14} /></div>
                        <span className="sup-name-text">{s.name}</span>
                      </div>
                    </td>
                    <td>{s.contact_person_name || <span className="sup-empty">—</span>}</td>
                    <td>{s.contact_email || <span className="sup-empty">—</span>}</td>
                    <td>{s.phone || <span className="sup-empty">—</span>}</td>
                    <td>
                      {s.city || s.country
                        ? `${s.city || ''}${s.city && s.country ? ', ' : ''}${s.country || ''}`
                        : <span className="sup-empty">—</span>}
                    </td>
                    <td>
                      <span className={`sup-status-badge ${s.is_active ? 'active' : 'inactive'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="sup-action-btns">
                        <button className="sup-edit-btn" onClick={() => openEdit(s)} title="Edit supplier">
                          <Edit2 size={14} />
                        </button>
                        <button className="sup-delete-btn" onClick={() => setDeleteConfirm(s)} title="Delete supplier">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="sup-pagination">
              <span className="sup-page-info">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
              </span>
              <div className="sup-page-btns">
                <button className="sup-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} className={`sup-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                      {p}
                    </button>
                  );
                })}
                <button className="sup-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="sup-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sup-modal" onClick={e => e.stopPropagation()}>
            <div className="sup-modal-header">
              <div>
                <h2>{editSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                  {editSupplier ? `Editing: ${editSupplier.name}` : 'Fill in the supplier details below'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="sup-close"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="sup-form">
              <div className="sup-field">
                <label>Supplier Name <span className="sup-required">*</span></label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. TechParts Nepal Pvt. Ltd."
                  required
                />
              </div>
              <div className="sup-form-row">
                <div className="sup-field">
                  <label>Contact Person</label>
                  <input
                    value={form.contact_person_name}
                    onChange={e => setForm(f => ({ ...f, contact_person_name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="sup-field">
                  <label>Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+977 98XXXXXXXX"
                  />
                </div>
              </div>
              <div className="sup-field">
                <label>Contact Email</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="supplier@example.com"
                />
              </div>
              <div className="sup-form-row">
                <div className="sup-field">
                  <label>City</label>
                  <input
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Kathmandu"
                  />
                </div>
                <div className="sup-field">
                  <label>Country</label>
                  <input
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    placeholder="Nepal"
                  />
                </div>
              </div>
              <div className="sup-field">
                <label>Status</label>
                <div className="sup-toggle-row">
                  <button
                    type="button"
                    className={`sup-toggle-btn ${form.is_active ? 'active' : ''}`}
                    onClick={() => setForm(f => ({ ...f, is_active: true }))}
                  >
                    <CheckCircle size={14} /> Active
                  </button>
                  <button
                    type="button"
                    className={`sup-toggle-btn ${!form.is_active ? 'inactive' : ''}`}
                    onClick={() => setForm(f => ({ ...f, is_active: false }))}
                  >
                    <XCircle size={14} /> Inactive
                  </button>
                </div>
              </div>
              <div className="sup-form-actions">
                <button type="button" className="sup-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="sup-submit">
                  {editSupplier ? 'Update Supplier' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="sup-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="sup-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="sup-confirm-icon"><Trash2 size={28} color="#DC2626" /></div>
            <h3>Delete Supplier?</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
            <div className="sup-confirm-actions">
              <button className="sup-cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="sup-delete-confirm-btn" onClick={() => handleDelete(deleteConfirm)}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .sup-page { padding: 28px 32px 40px; max-width: 1400px; margin: 0 auto; }
        .sup-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .sup-title { margin: 0; font-size: 1.5rem; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 10px; }
        .sup-subtitle { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }
        .sup-create-btn { display: flex; align-items: center; gap: 6px; padding: 9px 18px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.2s; }
        .sup-create-btn:hover { background: #B91C1C; }
        .sup-refresh { width: 38px; height: 38px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6B7280; transition: all 0.2s; }
        .sup-refresh:hover { border-color: #DC2626; color: #DC2626; }

        .sup-filter-bar { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 16px; margin-bottom: 16px; flex-wrap: wrap; }
        .sup-search-wrap { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; }
        .sup-search-input { flex: 1; border: none; outline: none; font-size: 0.88rem; color: #1e293b; background: transparent; }
        .sup-clear-btn { background: none; border: none; cursor: pointer; color: #9CA3AF; display: flex; align-items: center; padding: 0; }
        .sup-clear-btn:hover { color: #DC2626; }
        .sup-filter-group { display: flex; align-items: center; gap: 6px; border-left: 1px solid #e5e7eb; padding-left: 12px; }
        .sup-filter-label { font-size: 0.78rem; font-weight: 500; color: #6B7280; white-space: nowrap; }
        .sup-filter-tab { padding: 5px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; color: #6B7280; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .sup-filter-tab:hover { border-color: #DC2626; color: #DC2626; }
        .sup-filter-tab.active { background: #DC2626; color: #fff; border-color: #DC2626; }

        .sup-stats-row { display: flex; gap: 10px; margin-bottom: 14px; }
        .sup-stat-pill { display: flex; align-items: center; gap: 6px; padding: 5px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 20px; font-size: 0.8rem; font-weight: 600; color: #374151; }

        .sup-error { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: #DC2626; font-size: 0.85rem; margin-bottom: 16px; }
        .sup-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #6B7280; gap: 12px; }
        .sup-spin { animation: supSpin 1s linear infinite; }
        @keyframes supSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        .sup-table-wrap { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow-x: auto; }
        .sup-table { width: 100%; border-collapse: collapse; }
        .sup-table th { padding: 11px 14px; text-align: left; font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; white-space: nowrap; }
        .sup-table td { padding: 11px 14px; font-size: 0.85rem; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .sup-table tr:last-child td { border-bottom: none; }
        .sup-table tr:hover td { background: #FAFAFA; }
        .sup-name-cell { display: flex; align-items: center; gap: 10px; }
        .sup-icon-sm { width: 30px; height: 30px; border-radius: 8px; background: #F3F4F6; display: flex; align-items: center; justify-content: center; color: #6B7280; flex-shrink: 0; }
        .sup-name-text { font-weight: 600; color: #111827; }
        .sup-empty { color: #D1D5DB; }
        .sup-status-badge { font-size: 0.72rem; font-weight: 600; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }
        .sup-status-badge.active { background: #DCFCE7; color: #16A34A; }
        .sup-status-badge.inactive { background: #FEE2E2; color: #DC2626; }
        .sup-action-btns { display: flex; gap: 4px; }
        .sup-edit-btn, .sup-delete-btn { width: 30px; height: 30px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .sup-edit-btn { color: #2563EB; } .sup-edit-btn:hover { background: #EFF6FF; border-color: #BFDBFE; }
        .sup-delete-btn { color: #DC2626; } .sup-delete-btn:hover { background: #FEF2F2; border-color: #FECACA; }

        .sup-pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; flex-wrap: wrap; gap: 8px; }
        .sup-page-info { font-size: 0.78rem; color: #6B7280; font-weight: 500; }
        .sup-page-btns { display: flex; gap: 3px; }
        .sup-page-btn { min-width: 30px; height: 30px; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.8rem; font-weight: 600; padding: 0 6px; transition: all 0.15s; }
        .sup-page-btn:hover:not(:disabled) { background: #FEF2F2; border-color: #DC2626; color: #DC2626; }
        .sup-page-btn.active { background: #DC2626; color: #fff; border-color: #DC2626; }
        .sup-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .sup-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .sup-modal { background: #fff; border-radius: 16px; padding: 28px; width: 520px; max-width: 100%; max-height: 90vh; overflow-y: auto; }
        .sup-modal-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .sup-modal-header h2 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #111827; }
        .sup-close { background: none; border: none; color: #6B7280; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; }
        .sup-close:hover { background: #F3F4F6; }
        .sup-form { display: flex; flex-direction: column; gap: 16px; }
        .sup-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .sup-field { display: flex; flex-direction: column; gap: 5px; }
        .sup-field label { font-size: 0.78rem; font-weight: 600; color: #374151; }
        .sup-required { color: #DC2626; }
        .sup-field input { padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #111827; transition: border-color 0.2s; }
        .sup-field input:focus { outline: none; border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .sup-toggle-row { display: flex; gap: 8px; }
        .sup-toggle-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: 1.5px solid #e5e7eb; background: #fff; color: #6B7280; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .sup-toggle-btn.active { border-color: #16A34A; background: #DCFCE7; color: #16A34A; }
        .sup-toggle-btn.inactive { border-color: #DC2626; background: #FEE2E2; color: #DC2626; }
        .sup-form-actions { display: flex; gap: 10px; margin-top: 4px; }
        .sup-cancel-btn { flex: 1; padding: 10px; background: #F3F4F6; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.88rem; }
        .sup-cancel-btn:hover { background: #E5E7EB; }
        .sup-submit { flex: 2; padding: 10px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.88rem; transition: background 0.2s; }
        .sup-submit:hover { background: #B91C1C; }

        .sup-confirm-modal { background: #fff; border-radius: 16px; padding: 32px 28px; width: 420px; max-width: 90vw; text-align: center; }
        .sup-confirm-icon { width: 56px; height: 56px; border-radius: 50%; background: #FEF2F2; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
        .sup-confirm-modal h3 { margin: 0 0 8px; font-size: 1.15rem; font-weight: 700; color: #111827; }
        .sup-confirm-modal p { margin: 0 0 24px; font-size: 0.88rem; color: #6B7280; line-height: 1.5; }
        .sup-confirm-actions { display: flex; gap: 10px; justify-content: center; }
        .sup-delete-confirm-btn { display: flex; align-items: center; gap: 6px; padding: 10px 20px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.88rem; }
        .sup-delete-confirm-btn:hover { background: #B91C1C; }
      `}</style>
    </div>
  );
}
