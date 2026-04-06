import { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, RefreshCw, AlertCircle, Plus, Edit2, Trash2,
  X, Filter, ChevronLeft, ChevronRight, UserCheck, ShoppingBag,
  CheckCircle, XCircle, SlidersHorizontal
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { TableRowsSkeleton } from '../../components/Common/SkeletonLoader';

/* ── Shared helper ── */
const RoleBadge = ({ role }) => {
  const cfg = {
    admin:     { bg: '#FEE2E2', color: '#DC2626' },
    owner:     { bg: '#FFEDD5', color: '#EA580C' },
    warehouse: { bg: '#DBEAFE', color: '#2563EB' },
    customer:  { bg: '#DCFCE7', color: '#16A34A' },
  };
  const { bg, color } = cfg[role] || { bg: '#F3F4F6', color: '#6B7280' };
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
      background: bg, color, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {role}
    </span>
  );
};

/* ────────────────────────────────────────────
   SYSTEM USERS SECTION
──────────────────────────────────────────── */
function SystemUsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState({ email: '', first_name: '', last_name: '', role: 'owner', password: '', phone: '', gender: '' });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data?.results || res.data || []);
    } catch {
      setError('Failed to load system users.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ email: '', first_name: '', last_name: '', role: 'owner', password: '', phone: '', gender: '' });
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role, password: '', phone: u.phone || '', gender: u.gender || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        const data = { ...form };
        if (!data.password) delete data.password;
        await adminAPI.updateUser(editUser.id, data);
      } else {
        await adminAPI.createUser(form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
    }
  };

  const handleDelete = async (u) => {
    try {
      await adminAPI.deleteUser(u.id);
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggle = async (u) => {
    try {
      await adminAPI.toggleUserStatus(u.id);
      fetchUsers();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const roles = ['', 'admin', 'owner', 'warehouse'];

  return (
    <section className="um-section">
      <div className="um-section-header">
        <div className="um-section-title-wrap">
          <UserCheck size={20} color="#DC2626" />
          <div>
            <h2 className="um-section-title">System Users</h2>
            <p className="um-section-sub">Admins, owners & warehouse staff — {users.length} accounts</p>
          </div>
        </div>
        <div className="um-section-actions">
          <button className="um-create-btn" onClick={openCreate}><Plus size={15} /> Add User</button>
          <button className="um-icon-btn" onClick={fetchUsers} title="Refresh"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="um-filter-bar">
        <div className="um-search-wrap">
          <Search size={15} color="#9CA3AF" />
          <input
            type="text" placeholder="Search by name or email..." value={search}
            onChange={e => setSearch(e.target.value)} className="um-search-input"
          />
          {search && <button className="um-clear" onClick={() => setSearch('')}><X size={13} /></button>}
        </div>
        <div className="um-role-tabs">
          {roles.map(r => (
            <button
              key={r || 'all'}
              className={`um-role-tab ${roleFilter === r ? 'active' : ''}`}
              onClick={() => setRoleFilter(r)}
            >
              {r ? r.charAt(0).toUpperCase() + r.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="um-error-msg"><AlertCircle size={15} /> {error}</div>}

      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableRowsSkeleton rows={7} columns={8} />
            ) : users.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                {search || roleFilter ? 'No users match your filters' : 'No system users found'}
              </td></tr>
            ) : users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="um-user-cell">
                    <div className="um-avatar" style={{ background: `${u.role === 'admin' ? '#DC2626' : u.role === 'owner' ? '#EA580C' : '#2563EB'}18`, color: u.role === 'admin' ? '#DC2626' : u.role === 'owner' ? '#EA580C' : '#2563EB' }}>
                      {(u.first_name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <span className="um-user-name">{u.first_name} {u.last_name}</span>
                  </div>
                </td>
                <td className="um-email">{u.email}</td>
                <td><RoleBadge role={u.role} /></td>
                <td>{u.phone || <span className="um-dim">—</span>}</td>
                <td>
                  <button
                    className={`um-status-btn ${u.is_active ? 'active' : 'inactive'}`}
                    onClick={() => handleToggle(u)}
                    title="Click to toggle"
                  >
                    {u.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {u.is_active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td>{u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td>{u.last_login ? new Date(u.last_login).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : <span className="um-dim">Never</span>}</td>
                <td>
                  <div className="um-action-btns">
                    <button className="um-edit-btn" onClick={() => openEdit(u)} title="Edit"><Edit2 size={13} /></button>
                    <button className="um-del-btn" onClick={() => setDeleteConfirm(u)} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="um-overlay" onClick={() => setShowModal(false)}>
          <div className="um-modal" onClick={e => e.stopPropagation()}>
            <div className="um-modal-hdr">
              <div>
                <h2>{editUser ? 'Edit User' : 'Create System User'}</h2>
                <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: '#6B7280' }}>
                  {editUser ? `Editing ${editUser.email}` : 'Add a new admin, owner, or warehouse user'}
                </p>
              </div>
              <button className="um-close" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="um-form">
              <div className="um-field">
                <label>Email <span style={{ color: '#DC2626' }}>*</span></label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required placeholder="user@example.com" />
              </div>
              <div className="um-form-row">
                <div className="um-field">
                  <label>First Name <span style={{ color: '#DC2626' }}>*</span></label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required placeholder="First name" />
                </div>
                <div className="um-field">
                  <label>Last Name</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Last name" />
                </div>
              </div>
              <div className="um-form-row">
                <div className="um-field">
                  <label>Role <span style={{ color: '#DC2626' }}>*</span></label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="owner">Owner</option>
                    <option value="warehouse">Warehouse</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="um-field">
                  <label>Gender</label>
                  <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="um-field">
                <label>Phone</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+977 98XXXXXXXX" />
              </div>
              <div className="um-field">
                <label>{editUser ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} {...(!editUser ? { required: true } : {})} placeholder="••••••••" />
              </div>
              <div className="um-form-actions">
                <button type="button" className="um-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="um-submit-btn">{editUser ? 'Update User' : 'Create User'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="um-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="um-confirm-box" onClick={e => e.stopPropagation()}>
            <Trash2 size={28} color="#DC2626" />
            <h3>Delete User?</h3>
            <p>Remove <strong>{deleteConfirm.email}</strong> from the system? This cannot be undone.</p>
            <div className="um-form-actions">
              <button className="um-cancel-btn" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="um-delete-confirm" onClick={() => handleDelete(deleteConfirm)}><Trash2 size={13} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────
   CUSTOMERS SECTION
──────────────────────────────────────────── */
function CustomersSection() {
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 15;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (genderFilter) params.gender = genderFilter;
      if (statusFilter) params.is_active = statusFilter === 'active' ? 'true' : 'false';
      const res = await adminAPI.getCustomers(params);
      const all = res.data?.results || res.data || [];
      setTotal(all.length);
      setCustomers(all);
      setPage(1);
    } catch {
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, [search, genderFilter, statusFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const totalPages = Math.ceil(customers.length / perPage);
  const paged = customers.slice((page - 1) * perPage, page * perPage);

  const activeCount = customers.filter(c => c.is_active).length;
  const maleCount = customers.filter(c => c.gender === 'Male').length;
  const femaleCount = customers.filter(c => c.gender === 'Female').length;

  const hasFilters = search || genderFilter || statusFilter;

  return (
    <section className="um-section um-cust-section">
      <div className="um-section-header">
        <div className="um-section-title-wrap">
          <ShoppingBag size={20} color="#16A34A" />
          <div>
            <h2 className="um-section-title">Customers</h2>
            <p className="um-section-sub">
              {hasFilters ? `${total} matching` : `${total} total`} customers from database
              {hasFilters && <button className="um-clear-filters" onClick={() => { setSearch(''); setGenderFilter(''); setStatusFilter(''); }}>Clear filters</button>}
            </p>
          </div>
        </div>
        <div className="um-section-actions">
          <button
            className={`um-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(f => !f)}
          >
            <SlidersHorizontal size={15} />
            Filters
            {hasFilters && <span className="um-filter-dot" />}
          </button>
          <button className="um-icon-btn" onClick={fetchCustomers} title="Refresh"><RefreshCw size={15} /></button>
        </div>
      </div>

      {/* Stats Pills */}
      <div className="um-cust-stats">
        <div className="um-cust-stat-pill green">
          <CheckCircle size={13} /> {activeCount} Active
        </div>
        <div className="um-cust-stat-pill red">
          <XCircle size={13} /> {total - activeCount} Inactive
        </div>
        <div className="um-cust-stat-pill blue">
          {maleCount} Male
        </div>
        <div className="um-cust-stat-pill pink">
          {femaleCount} Female
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="um-filter-panel">
          <div className="um-search-wrap">
            <Search size={15} color="#9CA3AF" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="um-search-input"
            />
            {search && <button className="um-clear" onClick={() => setSearch('')}><X size={13} /></button>}
          </div>
          <div className="um-filter-selects">
            <div className="um-filter-group">
              <label>Gender</label>
              <div className="um-filter-tabs">
                {['', 'Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g || 'all'}
                    className={`um-role-tab ${genderFilter === g ? 'active' : ''}`}
                    onClick={() => setGenderFilter(g)}
                  >
                    {g || 'All'}
                  </button>
                ))}
              </div>
            </div>
            <div className="um-filter-group">
              <label>Status</label>
              <div className="um-filter-tabs">
                {[['', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([val, label]) => (
                  <button
                    key={val || 'all'}
                    className={`um-role-tab ${statusFilter === val ? 'active' : ''}`}
                    onClick={() => setStatusFilter(val)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <div className="um-error-msg"><AlertCircle size={15} /> {error}</div>}

      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>Registered</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableRowsSkeleton rows={8} columns={8} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 48, color: '#9CA3AF' }}>
                {hasFilters ? 'No customers match your filters' : 'No customers found'}
              </td></tr>
            ) : paged.map((c, idx) => (
              <tr key={c.id}>
                <td style={{ color: '#9CA3AF', fontSize: '0.78rem', fontWeight: 600 }}>
                  {(page - 1) * perPage + idx + 1}
                </td>
                <td>
                  <div className="um-user-cell">
                    <div className="um-avatar" style={{ background: '#DCFCE7', color: '#16A34A' }}>
                      {(c.first_name || '?')[0].toUpperCase()}
                    </div>
                    <span className="um-user-name">{c.first_name} {c.last_name}</span>
                  </div>
                </td>
                <td className="um-email">{c.email}</td>
                <td>{c.phone || <span className="um-dim">—</span>}</td>
                <td>
                  <span className={`um-gender-badge ${(c.gender || '').toLowerCase()}`}>
                    {c.gender || <span className="um-dim">—</span>}
                  </span>
                </td>
                <td>
                  {c.date_of_birth
                    ? new Date(c.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : <span className="um-dim">—</span>}
                </td>
                <td>
                  {c.registration_date
                    ? new Date(c.registration_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : <span className="um-dim">—</span>}
                </td>
                <td>
                  <span className={`um-status-chip ${c.is_active ? 'active' : 'inactive'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="um-pagination">
          <span className="um-page-info">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, customers.length)} of {customers.length} customers
          </span>
          <div className="um-page-btns">
            <button className="um-page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            {(() => {
              const range = [];
              const delta = 2;
              for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
                range.push(i);
              }
              return range.map(p => (
                <button key={p} className={`um-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>
                  {p}
                </button>
              ));
            })()}
            <button className="um-page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
          <span className="um-page-info">Page {page} of {totalPages}</span>
        </div>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────── */
export default function UserManagement() {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="um-page">
      <div className="um-page-header">
        <div>
          <h1 className="um-page-title"><Users size={26} /> User Management</h1>
          <p className="um-page-sub">Manage system users and view customer database</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="um-tabs">
        <button
          className={`um-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <UserCheck size={16} /> System Users
        </button>
        <button
          className={`um-tab ${activeTab === 'customers' ? 'active' : ''}`}
          onClick={() => setActiveTab('customers')}
        >
          <ShoppingBag size={16} /> Customers
        </button>
      </div>

      {activeTab === 'users' ? <SystemUsersSection /> : <CustomersSection />}

      <style>{`
        .um-page { padding: 28px 32px 48px; max-width: 1440px; margin: 0 auto; }
        .um-page-header { margin-bottom: 20px; }
        .um-page-title { margin: 0; font-size: 1.6rem; font-weight: 800; color: #111827; display: flex; align-items: center; gap: 10px; }
        .um-page-sub { margin: 4px 0 0; font-size: 0.85rem; color: #6B7280; }

        .um-tabs { display: flex; gap: 4px; margin-bottom: 24px; background: #F3F4F6; border-radius: 12px; padding: 4px; width: fit-content; }
        .um-tab { display: flex; align-items: center; gap: 7px; padding: 9px 20px; border-radius: 9px; border: none; background: none; color: #6B7280; font-size: 0.88rem; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit; }
        .um-tab:hover { color: #111827; }
        .um-tab.active { background: #fff; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

        .um-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; }
        .um-cust-section { border-color: #BBF7D0; }
        .um-section-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .um-section-title-wrap { display: flex; align-items: flex-start; gap: 12px; }
        .um-section-title { margin: 0; font-size: 1.1rem; font-weight: 700; color: #111827; }
        .um-section-sub { margin: 3px 0 0; font-size: 0.8rem; color: #6B7280; display: flex; align-items: center; gap: 8px; }
        .um-clear-filters { background: none; border: none; color: #DC2626; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-decoration: underline; padding: 0; }
        .um-section-actions { display: flex; gap: 8px; align-items: center; }

        .um-create-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.82rem; transition: background 0.2s; }
        .um-create-btn:hover { background: #B91C1C; }
        .um-icon-btn { width: 36px; height: 36px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #6B7280; transition: all 0.2s; }
        .um-icon-btn:hover { border-color: #DC2626; color: #DC2626; }

        .um-filter-toggle { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1.5px solid #e5e7eb; border-radius: 8px; background: #fff; color: #6B7280; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s; position: relative; }
        .um-filter-toggle:hover, .um-filter-toggle.active { border-color: #16A34A; color: #16A34A; background: #F0FDF4; }
        .um-filter-dot { width: 7px; height: 7px; border-radius: 50%; background: #DC2626; position: absolute; top: 6px; right: 6px; }

        .um-filter-bar { display: flex; align-items: center; gap: 12px; background: #F9FAFB; border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 14px; margin-bottom: 16px; flex-wrap: wrap; }
        .um-filter-panel { background: #F9FAFB; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
        .um-search-wrap { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; }
        .um-search-input { flex: 1; border: none; outline: none; font-size: 0.88rem; color: #1e293b; background: transparent; }
        .um-clear { background: none; border: none; cursor: pointer; color: #9CA3AF; display: flex; padding: 0; }
        .um-clear:hover { color: #DC2626; }
        .um-filter-selects { display: flex; gap: 20px; flex-wrap: wrap; }
        .um-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .um-filter-group label { font-size: 0.75rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }
        .um-filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; }

        .um-role-tabs { display: flex; gap: 4px; flex-wrap: wrap; }
        .um-role-tab { padding: 5px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #fff; color: #6B7280; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
        .um-role-tab:hover { border-color: #DC2626; color: #DC2626; }
        .um-role-tab.active { background: #DC2626; color: #fff; border-color: #DC2626; }

        .um-error-msg { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; color: #DC2626; font-size: 0.82rem; margin-bottom: 14px; }

        .um-cust-stats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .um-cust-stat-pill { display: flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 600; }
        .um-cust-stat-pill.green { background: #DCFCE7; color: #16A34A; }
        .um-cust-stat-pill.red { background: #FEE2E2; color: #DC2626; }
        .um-cust-stat-pill.blue { background: #DBEAFE; color: #2563EB; }
        .um-cust-stat-pill.pink { background: #FCE7F3; color: #DB2777; }

        .um-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 10px; }
        .um-table { width: 100%; border-collapse: collapse; }
        .um-table th { padding: 11px 14px; text-align: left; font-size: 0.72rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; background: #F9FAFB; white-space: nowrap; }
        .um-table td { padding: 11px 14px; font-size: 0.84rem; color: #374151; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
        .um-table tr:last-child td { border-bottom: none; }
        .um-table tr:hover td { background: #FAFAFA; }

        .um-user-cell { display: flex; align-items: center; gap: 10px; }
        .um-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.82rem; flex-shrink: 0; }
        .um-user-name { font-weight: 600; color: #111827; white-space: nowrap; }
        .um-email { color: #6B7280; font-size: 0.82rem; }
        .um-dim { color: #D1D5DB; }
        .um-spin { animation: umSpin 1s linear infinite; }
        @keyframes umSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        .um-status-btn { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; cursor: pointer; border: none; transition: all 0.15s; }
        .um-status-btn.active { background: #DCFCE7; color: #16A34A; }
        .um-status-btn.inactive { background: #FEE2E2; color: #DC2626; }
        .um-status-btn:hover { opacity: 0.8; }

        .um-status-chip { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
        .um-status-chip.active { background: #DCFCE7; color: #16A34A; }
        .um-status-chip.inactive { background: #FEE2E2; color: #DC2626; }

        .um-gender-badge { font-size: 0.72rem; font-weight: 600; padding: 3px 9px; border-radius: 20px; }
        .um-gender-badge.male { background: #DBEAFE; color: #2563EB; }
        .um-gender-badge.female { background: #FCE7F3; color: #DB2777; }
        .um-gender-badge.other { background: #F3E8FF; color: #7C3AED; }

        .um-action-btns { display: flex; gap: 4px; }
        .um-edit-btn, .um-del-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
        .um-edit-btn { color: #2563EB; } .um-edit-btn:hover { background: #EFF6FF; border-color: #BFDBFE; }
        .um-del-btn { color: #DC2626; } .um-del-btn:hover { background: #FEF2F2; border-color: #FECACA; }

        .um-pagination { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; flex-wrap: wrap; gap: 8px; }
        .um-page-info { font-size: 0.78rem; color: #6B7280; font-weight: 500; }
        .um-page-btns { display: flex; gap: 3px; }
        .um-page-btn { min-width: 32px; height: 32px; border-radius: 7px; border: 1px solid #d1d5db; background: #fff; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 0.82rem; font-weight: 600; padding: 0 4px; transition: all 0.15s; }
        .um-page-btn:hover:not(:disabled) { background: #FEF2F2; border-color: #DC2626; color: #DC2626; }
        .um-page-btn.active { background: #DC2626; color: #fff; border-color: #DC2626; }
        .um-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .um-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; backdrop-filter: blur(2px); }
        .um-modal { background: #fff; border-radius: 16px; padding: 28px; width: 520px; max-width: 100%; max-height: 90vh; overflow-y: auto; animation: umSlideIn 0.2s ease; }
        @keyframes umSlideIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        .um-modal-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
        .um-modal-hdr h2 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #111827; }
        .um-close { background: none; border: none; color: #6B7280; cursor: pointer; padding: 4px; border-radius: 6px; }
        .um-close:hover { background: #F3F4F6; }
        .um-form { display: flex; flex-direction: column; gap: 14px; }
        .um-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .um-field { display: flex; flex-direction: column; gap: 5px; }
        .um-field label { font-size: 0.78rem; font-weight: 600; color: #374151; }
        .um-field input, .um-field select { padding: 9px 12px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #111827; background: #fff; }
        .um-field input:focus, .um-field select:focus { outline: none; border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.08); }
        .um-form-actions { display: flex; gap: 10px; margin-top: 4px; }
        .um-cancel-btn { flex: 1; padding: 10px; background: #F3F4F6; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.88rem; }
        .um-cancel-btn:hover { background: #E5E7EB; }
        .um-submit-btn { flex: 2; padding: 10px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.88rem; }
        .um-submit-btn:hover { background: #B91C1C; }
        .um-delete-confirm { display: flex; align-items: center; gap: 6px; flex: 2; padding: 10px; background: #DC2626; color: #fff; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.88rem; justify-content: center; }
        .um-delete-confirm:hover { background: #B91C1C; }

        .um-confirm-box { background: #fff; border-radius: 16px; padding: 32px 28px; width: 400px; max-width: 90vw; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; animation: umSlideIn 0.2s ease; }
        .um-confirm-box h3 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #111827; }
        .um-confirm-box p { margin: 0; font-size: 0.88rem; color: #6B7280; line-height: 1.5; }
        .um-confirm-box .um-form-actions { width: 100%; }

        @media (max-width: 768px) {
          .um-page { padding: 16px; }
          .um-form-row { grid-template-columns: 1fr; }
          .um-filter-selects { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
