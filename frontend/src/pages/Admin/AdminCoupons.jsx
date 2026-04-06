import { useState, useEffect, useCallback } from 'react';
import {
  Tag, Plus, Edit2, Trash2, Search, RefreshCw, AlertCircle,
  X, CheckCircle, XCircle, Globe, Store, Percent, Truck,
  Calendar, Shield, Clock, ChevronLeft, ChevronRight
} from 'lucide-react';
import { adminAPI, ownerAPI } from '../../services/api';
import { CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const fmt = n => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(n || 0);

const emptyForm = {
  code: '', discount_percent: '', max_discount: '', min_order_amount: '',
  usage_limit: '', per_customer_limit: 1, free_delivery: false, is_active: true,
  valid_from: '', valid_until: '', owner_id: '', // empty = global
};

function StatusBadge({ coupon }) {
  const now = new Date();
  const from = coupon.valid_from ? new Date(coupon.valid_from) : null;
  const until = coupon.valid_until ? new Date(coupon.valid_until) : null;

  if (!coupon.is_active) return <Badge text="Inactive" bg="#FEE2E2" color="#DC2626" />;
  if (from && now < from) return <Badge text="Scheduled" bg="#FEF3C7" color="#D97706" />;
  if (until && now > until) return <Badge text="Expired" bg="#F3F4F6" color="#6B7280" />;
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return <Badge text="Exhausted" bg="#FEE2E2" color="#DC2626" />;
  return <Badge text="Active" bg="#DCFCE7" color="#16A34A" />;
}
function Badge({ text, bg, color }) {
  return <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color, whiteSpace: 'nowrap' }}>{text}</span>;
}

function toLocalDatetime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function toUTC(local) {
  if (!local) return null;
  return new Date(local).toISOString();
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCoupon, setEditCoupon] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [scopeFilter, setScopeFilter] = useState(''); // '' | 'global' | 'store'
  const perPage = 12;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cRes, uRes] = await Promise.all([
        ownerAPI.getCoupons(),
        adminAPI.getUsers({ role: 'owner', page_size: 200 }),
      ]);
      setCoupons(cRes.data?.results || cRes.data || []);
      setOwners(uRes.data?.results || uRes.data || []);
    } catch {
      setError('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditCoupon(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditCoupon(c);
    setForm({
      code: c.code || '',
      discount_percent: c.discount_percent || '',
      max_discount: c.max_discount || '',
      min_order_amount: c.min_order_amount || '',
      usage_limit: c.usage_limit || '',
      per_customer_limit: c.per_customer_limit || 1,
      free_delivery: c.free_delivery || false,
      is_active: c.is_active !== false,
      valid_from: toLocalDatetime(c.valid_from),
      valid_until: toLocalDatetime(c.valid_until),
      owner_id: c.owner || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { setFormError('Coupon code is required.'); return; }
    if (!form.discount_percent || parseFloat(form.discount_percent) <= 0) { setFormError('Discount % is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        discount_percent: parseFloat(form.discount_percent),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        per_customer_limit: parseInt(form.per_customer_limit) || 1,
        free_delivery: form.free_delivery,
        is_active: form.is_active,
        valid_from: toUTC(form.valid_from),
        valid_until: toUTC(form.valid_until),
        ...(form.owner_id ? { owner: form.owner_id } : {}),
      };
      if (editCoupon) {
        await ownerAPI.updateCoupon(editCoupon.id, payload);
      } else {
        await ownerAPI.createCoupon(payload);
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      const d = e.response?.data;
      setFormError(typeof d === 'string' ? d : d?.detail || d?.code?.[0] || 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await ownerAPI.deleteCoupon(id);
      setCoupons(p => p.filter(c => c.id !== id));
    } catch {
      setError('Failed to delete coupon.');
    }
    setDeleteConfirm(null);
  };

  const filtered = coupons.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = !search || c.code?.toLowerCase().includes(s) || (c.owner_name || '').toLowerCase().includes(s);
    const matchScope = !scopeFilter || (scopeFilter === 'global' ? !c.owner : !!c.owner);
    return matchSearch && matchScope;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const inp = (extra = {}) => ({
    width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8,
    fontSize: '0.85rem', color: '#1e293b', fontFamily: 'inherit', background: '#f8fafc',
    outline: 'none', boxSizing: 'border-box', ...extra,
  });

  return (
    <div className="ac-page">
      <style>{`
        .ac-page { padding: 28px 32px 48px; max-width: 1440px; margin: 0 auto; }
        .ac-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
        @media (max-width: 900px) { .ac-stats { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 600px) {
          .ac-page { padding: 12px 12px 32px; }
          .ac-stats { grid-template-columns: 1fr 1fr; gap: 10px; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag size={24} color="#F97316" /> Global Coupons
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6B7280' }}>
            Create platform-wide coupons or store-specific discount codes
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontWeight: 600, cursor: 'pointer', color: '#374151', fontSize: '0.82rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, background: '#F97316', color: '#fff', border: 'none', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            <Plus size={15} /> New Coupon
          </button>
        </div>
      </div>

      {error && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.85rem', marginBottom: 14 }}><AlertCircle size={15} /> {error}</div>}

      {/* Summary Cards */}
      <div className="ac-stats">
        {[
          { label: 'Total Coupons', val: coupons.length, icon: Tag, color: '#F97316' },
          { label: 'Active', val: coupons.filter(c => c.is_active && !(c.valid_until && new Date(c.valid_until) < new Date())).length, icon: CheckCircle, color: '#16A34A' },
          { label: 'Global (all stores)', val: coupons.filter(c => !c.owner).length, icon: Globe, color: '#2563EB' },
          { label: 'Store-specific', val: coupons.filter(c => c.owner).length, icon: Store, color: '#7C3AED' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', border: '1px solid #e5e7eb', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <c.icon size={18} color={c.color} />
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{c.val}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 600 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 9, padding: '8px 14px', flex: 1, minWidth: 200 }}>
          <Search size={14} color="#9CA3AF" />
          <input type="text" placeholder="Search by code or store..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.85rem', color: '#1e293b', width: '100%' }} />
        </div>
        {['', 'global', 'store'].map(s => (
          <button key={s || 'all'} onClick={() => { setScopeFilter(s); setPage(1); }} style={{
            padding: '8px 16px', borderRadius: 9, border: `1.5px solid ${scopeFilter === s ? '#F97316' : '#e5e7eb'}`,
            background: scopeFilter === s ? '#FFF7ED' : '#fff', color: scopeFilter === s ? '#c2410c' : '#6B7280',
            fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
          }}>{s === '' ? 'All' : s === 'global' ? '🌐 Global' : '🏪 Store-specific'}</button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 14 }}>
            <CardGridSkeleton cards={6} columns="repeat(auto-fill, minmax(280px, 1fr))" minHeight={180} />
          </div>
        ) : paged.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#9CA3AF', fontSize: '0.85rem' }}>
            {search || scopeFilter ? 'No coupons match your filters' : 'No coupons yet — create your first one'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Code', 'Scope', 'Discount', 'Min Order', 'Free Delivery', 'Validity', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e5e7eb', background: '#F9FAFB', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Tag size={14} color="#F97316" />
                        </div>
                        <div>
                          <code style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b', letterSpacing: '0.05em', fontFamily: 'monospace' }}>{c.code}</code>
                          {c.usage_limit && <div style={{ fontSize: '0.68rem', color: '#9CA3AF' }}>{c.used_count || 0}/{c.usage_limit} used</div>}
                        </div>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {c.owner ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#7C3AED', background: '#F5F3FF', padding: '3px 10px', borderRadius: 20, width: 'fit-content' }}>
                          <Store size={11} /> {c.owner_name || 'Store'}
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 600, color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: 20, width: 'fit-content' }}>
                          <Globe size={11} /> Global
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: '#F97316', fontSize: '0.9rem' }}>{c.discount_percent}%</div>
                      {c.max_discount && <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>max {fmt(c.max_discount)}</div>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{c.min_order_amount > 0 ? fmt(c.min_order_amount) : '—'}</span>
                    </td>
                    <td style={tdStyle}>
                      {c.free_delivery
                        ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: '#16A34A' }}><Truck size={12} /> Yes</span>
                        : <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>No</span>}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {c.valid_from ? <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} /> {new Date(c.valid_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div> : <span style={{ color: '#D1D5DB' }}>—</span>}
                        {c.valid_until ? <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}><Clock size={11} /> {new Date(c.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div> : null}
                      </div>
                    </td>
                    <td style={tdStyle}><StatusBadge coupon={c} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(c)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                          <Edit2 size={11} /> Edit
                        </button>
                        <button onClick={() => setDeleteConfirm(c)} style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600 }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: '0.78rem', color: '#6B7280' }}>Showing {(page-1)*perPage+1}–{Math.min(page*perPage,filtered.length)} of {filtered.length}</span>
          <div style={{ display: 'flex', gap: 3 }}>
            <button onClick={() => setPage(p => p-1)} disabled={page===1} style={pgBtn(false)}><ChevronLeft size={14}/></button>
            {Array.from({length: Math.min(5, totalPages)}, (_,i) => i+1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={pgBtn(page===p)}>{p}</button>
            ))}
            <button onClick={() => setPage(p => p+1)} disabled={page===totalPages} style={pgBtn(false)}><ChevronRight size={14}/></button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tag size={18} color="#F97316" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>{editCoupon ? 'Edit Coupon' : 'Create Coupon'}</span>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 4 }}><X size={18}/></button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {formError && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: '#DC2626', fontSize: '0.82rem' }}>{formError}</div>}

              {/* Scope selector */}
              <div>
                <label style={lbl}>Coupon Scope</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <button type="button" onClick={() => setForm(f => ({ ...f, owner_id: '' }))} style={{
                    flex: 1, padding: '10px', borderRadius: 9, border: `2px solid ${!form.owner_id ? '#F97316' : '#e5e7eb'}`,
                    background: !form.owner_id ? '#FFF7ED' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    color: !form.owner_id ? '#c2410c' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <Globe size={14} /> Global (All Stores)
                  </button>
                  <button type="button" onClick={() => setForm(f => ({ ...f, owner_id: owners[0]?.id || '' }))} style={{
                    flex: 1, padding: '10px', borderRadius: 9, border: `2px solid ${form.owner_id ? '#F97316' : '#e5e7eb'}`,
                    background: form.owner_id ? '#FFF7ED' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    color: form.owner_id ? '#c2410c' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <Store size={14} /> Store-specific
                  </button>
                </div>
              </div>

              {form.owner_id !== '' && (
                <div>
                  <label style={lbl}>Select Store</label>
                  <select value={form.owner_id} onChange={e => setForm(f => ({ ...f, owner_id: e.target.value }))} style={inp()}>
                    <option value="">-- Select Owner --</option>
                    {owners.map(o => (
                      <option key={o.id} value={o.id}>{o.first_name} {o.last_name} ({o.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Coupon Code *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE20" style={{ ...inp(), fontWeight: 800, letterSpacing: '0.08em', fontFamily: 'monospace' }} />
                </div>
                <div>
                  <label style={lbl}>Discount % *</label>
                  <input type="number" min="1" max="100" step="0.01" value={form.discount_percent}
                    onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                    placeholder="e.g. 20" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Max Discount (NPR)</label>
                  <input type="number" min="0" value={form.max_discount}
                    onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))}
                    placeholder="Leave blank = unlimited" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Min Order Amount</label>
                  <input type="number" min="0" value={form.min_order_amount}
                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="0" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Total Usage Limit</label>
                  <input type="number" min="1" value={form.usage_limit}
                    onChange={e => setForm(f => ({ ...f, usage_limit: e.target.value }))}
                    placeholder="Unlimited" style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Per Customer Limit</label>
                  <input type="number" min="1" value={form.per_customer_limit}
                    onChange={e => setForm(f => ({ ...f, per_customer_limit: e.target.value }))}
                    style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Valid From</label>
                  <input type="datetime-local" value={form.valid_from}
                    onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} style={inp()} />
                </div>
                <div>
                  <label style={lbl}>Valid Until</label>
                  <input type="datetime-local" value={form.valid_until}
                    onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} style={inp()} />
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { key: 'free_delivery', label: 'Free Delivery', icon: <Truck size={14} />, color: '#16A34A' },
                  { key: 'is_active', label: 'Active', icon: <Shield size={14} />, color: '#2563EB' },
                ].map(t => (
                  <button key={t.key} type="button" onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key] }))} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px', borderRadius: 9, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    border: `2px solid ${form[t.key] ? t.color : '#e5e7eb'}`,
                    background: form[t.key] ? `${t.color}18` : '#fff',
                    color: form[t.key] ? t.color : '#6B7280',
                  }}>
                    {t.icon} {t.label} {form[t.key] ? '✓' : ''}
                  </button>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', borderRadius: 9, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '11px', borderRadius: 9, border: 'none', background: saving ? '#9CA3AF' : '#F97316', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}>
                  {saving ? 'Saving...' : editCoupon ? 'Update Coupon' : 'Create Coupon'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px', maxWidth: 400, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: 50, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={22} color="#DC2626" />
            </div>
            <h3 style={{ margin: '0 0 8px', color: '#111827' }}>Delete Coupon?</h3>
            <p style={{ color: '#6B7280', fontSize: '0.85rem', margin: '0 0 20px' }}>
              Delete <strong style={{ color: '#F97316' }}>{deleteConfirm.code}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#DC2626', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const tdStyle = { padding: '12px 16px', fontSize: '0.85rem', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' };
const lbl = { fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 };
const inp = (extra = {}) => ({ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '0.85rem', color: '#1e293b', fontFamily: 'inherit', background: '#f8fafc', outline: 'none', boxSizing: 'border-box', ...extra });
const pgBtn = (active) => ({ minWidth: 32, height: 32, borderRadius: 7, border: `1px solid ${active ? '#F97316' : '#d1d5db'}`, background: active ? '#F97316' : '#fff', color: active ? '#fff' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, padding: '0 4px' });
