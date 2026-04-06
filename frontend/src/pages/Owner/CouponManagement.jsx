import { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Pencil, Trash2, X, RefreshCw, AlertCircle, Store, Percent, Truck, Users, Clock } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import { CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Convert UTC ISO string → local datetime-local value (avoids timezone drift on edit)
const toLocalDT = (isoStr) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ls = {
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#374151', marginBottom: 5 },
  input: { width: '100%', padding: '0.5rem 0.75rem', border: '1.5px solid #d1d5db', borderRadius: 8, fontSize: '0.85rem', fontFamily: 'inherit', color: '#1e293b', outline: 'none', boxSizing: 'border-box', background: '#fafafa' },
};

const emptyForm = {
  code: '', discount_percent: '', max_discount: '', min_order_amount: '',
  usage_limit: '100', per_customer_limit: '1', valid_from: '', valid_until: '',
  is_active: true, free_delivery: false,
};

function CouponModal({ coupon, onClose, onSave }) {
  const [form, setForm] = useState(coupon ? {
    code: coupon.code || '',
    discount_percent: coupon.discount_percent || '',
    max_discount: coupon.max_discount || '',
    min_order_amount: coupon.min_order_amount || '0',
    usage_limit: coupon.usage_limit || '100',
    per_customer_limit: coupon.per_customer_limit ?? '1',
    valid_from: toLocalDT(coupon.valid_from),
    valid_until: toLocalDT(coupon.valid_until),
    is_active: coupon.is_active !== undefined ? coupon.is_active : true,
    free_delivery: coupon.free_delivery || false,
  } : { ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim() || !form.valid_from || !form.valid_until) {
      setError('Coupon code, valid from, and valid until are required.');
      return;
    }
    if (!form.free_delivery && !form.discount_percent) {
      setError('Discount % is required unless Free Delivery is selected.');
      return;
    }
    const fromDt = new Date(form.valid_from);
    const untilDt = new Date(form.valid_until);
    if (untilDt <= fromDt) {
      setError('Valid Until must be after Valid From.');
      return;
    }
    if (untilDt - fromDt < 6 * 3600 * 1000) {
      setError('Coupon duration must be at least 6 hours.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code.toUpperCase().trim(),
        discount_percent: form.discount_percent ? parseFloat(form.discount_percent) : 0,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        min_order_amount: parseFloat(form.min_order_amount || '0'),
        usage_limit: parseInt(form.usage_limit || '100', 10),
        per_customer_limit: parseInt(form.per_customer_limit || '1', 10),
        valid_from: fromDt.toISOString(),
        valid_until: untilDt.toISOString(),
        is_active: form.is_active,
        free_delivery: form.free_delivery,
      };
      if (coupon) {
        await ownerAPI.updateCoupon(coupon.id, payload);
      } else {
        await ownerAPI.createCoupon(payload);
      }
      onSave();
    } catch (err) {
      const data = err.response?.data;
      setError(typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.22)' }} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ background: 'linear-gradient(135deg, #fff7ed, #fff)', padding: '1.25rem 1.5rem', borderBottom: '1px solid #fed7aa', borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={18} color="#F97316" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
                  {coupon ? 'Edit Coupon' : 'New Store Coupon'}
                </h2>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#94a3b8' }}>
                  {coupon ? 'Update coupon details' : 'This coupon will be exclusive to your store'}
                </p>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={ls.label}>Coupon Code *</label>
              <input name="code" value={form.code} onChange={handleChange} placeholder="e.g. SUMMER25" required
                style={{ ...ls.input, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, fontSize: '1rem', color: '#F97316' }} />
              <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: '4px 0 0' }}>Will be auto-uppercased. Share this code with your customers.</p>
            </div>

            {!form.free_delivery && (<>
              <div>
                <label style={ls.label}><Percent size={11} style={{ display: 'inline', marginRight: 4 }} />Discount % *</label>
                <input name="discount_percent" type="number" min="0.1" max="100" step="0.1" value={form.discount_percent} onChange={handleChange} placeholder="e.g. 20" style={ls.input} />
              </div>
              <div>
                <label style={ls.label}>Max Discount (NPR)</label>
                <input name="max_discount" type="number" min="0" step="1" value={form.max_discount} onChange={handleChange} placeholder="No limit" style={ls.input} />
              </div>
            </>)}
            {form.free_delivery && form.discount_percent > 0 && (<>
              <div>
                <label style={ls.label}>Discount % (optional)</label>
                <input name="discount_percent" type="number" min="0" max="100" step="0.1" value={form.discount_percent} onChange={handleChange} placeholder="0 = no extra discount" style={ls.input} />
              </div>
              <div>
                <label style={ls.label}>Max Discount (NPR)</label>
                <input name="max_discount" type="number" min="0" step="1" value={form.max_discount} onChange={handleChange} placeholder="No limit" style={ls.input} />
              </div>
            </>)}

            <div>
              <label style={ls.label}>Min Order Amount (NPR)</label>
              <input name="min_order_amount" type="number" min="0" step="1" value={form.min_order_amount} onChange={handleChange} placeholder="0" style={ls.input} />
            </div>
            <div>
              <label style={ls.label}><Users size={11} style={{ display: 'inline', marginRight: 4 }} />Total Usage Limit <span style={{ fontWeight: 400, color: '#94a3b8' }}>(all customers)</span></label>
              <input name="usage_limit" type="number" min="1" step="1" value={form.usage_limit} onChange={handleChange} placeholder="100" style={ls.input} />
            </div>
            <div>
              <label style={ls.label}>Per-Customer Limit <span style={{ fontWeight: 400, color: '#94a3b8' }}>(times one customer can use)</span></label>
              <input name="per_customer_limit" type="number" min="1" step="1" value={form.per_customer_limit} onChange={handleChange} placeholder="1" style={ls.input} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={ls.label}><Clock size={11} style={{ display: 'inline', marginRight: 4 }} />Valid From * <span style={{ fontWeight: 400, color: '#94a3b8' }}>(your local time)</span></label>
              <input name="valid_from" type="datetime-local" value={form.valid_from} onChange={handleChange} required style={ls.input} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={ls.label}>Valid Until * <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.65rem' }}>(min 6 hrs after start)</span></label>
              <input name="valid_until" type="datetime-local" value={form.valid_until} onChange={handleChange} required style={ls.input} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
              <input type="checkbox" name="free_delivery" checked={form.free_delivery} onChange={handleChange} style={{ width: 16, height: 16, accentColor: '#16a34a' }} />
              <span>
                🚚 Free Delivery
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 400, color: '#6b7280', marginTop: 1 }}>Waives delivery charge when this coupon is applied</span>
              </span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
              <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} style={{ width: 16, height: 16, accentColor: '#F97316' }} />
              <span>
                ✓ Active
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 400, color: '#6b7280', marginTop: 1 }}>Visible and usable by your store's customers</span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, background: '#f3f4f6', color: '#4b5563', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{ padding: '0.5rem 1.5rem', borderRadius: 8, background: '#F97316', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
              {saving ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <>{coupon ? 'Update Coupon' : 'Create Coupon'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await ownerAPI.getCoupons();
      setCoupons(res.data?.results || res.data || []);
    } catch {
      setError('Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleSaved = () => {
    setShowModal(false);
    setEditing(null);
    fetchCoupons();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await ownerAPI.deleteCoupon(deleteId);
      setCoupons(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
    } catch {
      alert('Failed to delete coupon.');
    } finally {
      setDeleting(false);
    }
  };

  const now = new Date();
  const isExpired   = (c) => new Date(c.valid_until) < now;
  const isExhausted = (c) => c.used_count >= c.usage_limit;
  const isLive      = (c) => c.is_active && !isExpired(c) && !isExhausted(c);

  // Stats
  const activeCount   = coupons.filter(isLive).length;
  const expiredCount  = coupons.filter(c => isExpired(c) || isExhausted(c)).length;
  const storeName     = coupons.find(c => c.owner_name)?.owner_name || '';

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', background: '#F3F4F6', padding: '2rem' }}>
      {/* Page header */}
      <div style={{ maxWidth: 1100, margin: '0 auto 1.5rem' }}>
        <div style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 60%)', border: '1.5px solid #fed7aa', borderRadius: 20, padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, boxShadow: '0 4px 20px rgba(249,115,22,0.08)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff7ed', border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={20} color="#F97316" />
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Store Coupons
              </h1>
            </div>
            {storeName && (
              <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #fed7aa', borderRadius: 8, padding: '4px 12px', fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
                <Store size={13} /> {storeName}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={fetchCoupons} disabled={loading} title="Refresh" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1.5px solid #e2e8f0', color: '#64748b', cursor: 'pointer' }}>
              <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
            <button onClick={() => { setEditing(null); setShowModal(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.6rem 1.25rem', borderRadius: 10, background: '#F97316', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}>
              <Plus size={18} /> New Coupon
            </button>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {coupons.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto 1.25rem', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Coupons', value: coupons.length, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Active',        value: activeCount,    color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Expired / Used Up', value: expiredCount, color: '#64748b', bg: '#f8fafc' },
          ].map(stat => (
            <div key={stat.label} style={{ flex: '1 1 140px', background: stat.bg, border: `1px solid ${stat.color}22`, borderRadius: 12, padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ maxWidth: 1100, margin: '0 auto 1rem', display: 'flex', alignItems: 'center', gap: 10, padding: '0.85rem 1.25rem', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '0.85rem' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Coupons grid */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {loading ? (
          <CardGridSkeleton cards={6} columns="repeat(auto-fill, minmax(330px, 1fr))" minHeight={240} />
        ) : coupons.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: 20, border: '1.5px dashed #fed7aa' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff7ed', border: '1.5px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Tag size={28} color="#F97316" />
            </div>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#374151', margin: '0 0 6px' }}>No store coupons yet</p>
            <p style={{ fontSize: '0.82rem', color: '#9ca3af', maxWidth: 340, margin: '0 auto 20px', lineHeight: 1.6 }}>
              Create exclusive promo codes for your store. Only customers browsing your products will see them.
            </p>
            <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.65rem 1.5rem', borderRadius: 10, background: '#F97316', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}>
              <Plus size={16} /> Create First Coupon
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1rem' }}>
            {coupons.map(c => {
              const expired      = isExpired(c);
              const exhausted    = isExhausted(c);
              const live         = c.is_active && !expired && !exhausted;
              const remaining    = Math.max(0, c.usage_limit - c.used_count);
              // Bar shows REMAINING capacity → decreases as coupons are claimed
              const remainingPct = c.usage_limit > 0 ? Math.min(100, (remaining / c.usage_limit) * 100) : 0;
              const barColor     = remainingPct > 40 ? '#F97316' : remainingPct > 15 ? '#f59e0b' : '#ef4444';
              const lowThreshold = Math.max(5, Math.ceil(c.usage_limit * 0.1));

              return (
                <div key={c.id} style={{
                  background: '#fff', borderRadius: 16,
                  border: `1.5px solid ${live ? '#e5e7eb' : '#fca5a5'}`,
                  overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  opacity: live ? 1 : 0.8,
                  transition: 'box-shadow .2s, transform .2s',
                }}>
                  {/* Card top strip */}
                  <div style={{ background: live ? 'linear-gradient(135deg, #fff7ed 0%, #ffffff 100%)' : '#fef2f2', padding: '1rem 1.25rem', borderBottom: '1px dashed #e5e7eb', position: 'relative' }}>
                    {/* Store exclusive badge */}
                    <div style={{ position: 'absolute', top: 10, right: 12 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
                        background: live ? '#dcfce7' : expired ? '#fef2f2' : '#fef2f2',
                        color: live ? '#15803d' : '#dc2626',
                        border: `1px solid ${live ? '#86efac' : '#fecaca'}`,
                      }}>
                        {live ? '✓ Active' : expired ? 'Expired' : exhausted ? 'Used Up' : 'Inactive'}
                      </span>
                    </div>

                    {/* Code */}
                    <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 900, color: live ? '#F97316' : '#9ca3af', letterSpacing: '0.1em', marginBottom: 6 }}>
                      {c.code}
                    </div>

                    {/* Discount details */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {parseFloat(c.discount_percent) > 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                          <Percent size={10} /> {c.discount_percent}% OFF
                          {c.max_discount ? ` · max ${fmt(c.max_discount)}` : ''}
                        </span>
                      )}
                      {c.free_delivery && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac' }}>
                          <Truck size={10} /> Free Delivery
                        </span>
                      )}
                    </div>

                    {/* Store owner badge */}
                    {c.owner_name && (
                      <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '2px 8px', fontSize: '0.68rem', color: '#64748b', fontWeight: 600 }}>
                        <Store size={10} /> {c.owner_name}
                      </div>
                    )}
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '0.9rem 1.25rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Meta info row */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.72rem', color: '#6b7280' }}>
                      {parseFloat(c.min_order_amount) > 0 && (
                        <span>Min order: <strong style={{ color: '#374151' }}>{fmt(c.min_order_amount)}</strong></span>
                      )}
                      <span>Each customer: <strong style={{ color: '#374151' }}>{c.per_customer_limit ?? 1}× use</strong></span>
                      <span>Total claimed: <strong style={{ color: c.used_count > 0 ? '#F97316' : '#374151' }}>{c.used_count}</strong></span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 4 }} />
                      {fmtDate(c.valid_from)} — {fmtDate(c.valid_until)}
                    </div>

                    {/* Usage progress — bar DECREASES as coupons are claimed */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 4 }}>
                        <span style={{ color: '#6b7280' }}>Store pool remaining</span>
                        <span style={{ fontWeight: 700, color: remainingPct <= 15 ? '#ef4444' : '#374151' }}>
                          {remaining} / {c.usage_limit} left
                          {remaining <= lowThreshold && remaining > 0 && (
                            <span style={{ color: '#ef4444', marginLeft: 4 }}>
                              {remaining === 1 ? ' · ⚡ Only 1 left!' : ` · ⚡ Only ${remaining} left!`}
                            </span>
                          )}
                          {remaining === 0 && <span style={{ color: '#ef4444', marginLeft: 4 }}> · Exhausted</span>}
                        </span>
                      </div>
                      <div style={{ height: 5, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${remainingPct}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width .5s' }} />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                      <button
                        onClick={() => { setEditing(c); setShowModal(true); }}
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 0', borderRadius: 8, background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#374151', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .15s' }}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <CouponModal
          coupon={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSaved}
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: '2rem', textAlign: 'center', maxWidth: 380, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', border: '1.5px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={22} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>Delete this coupon?</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              This coupon will be permanently removed from your store. Customers will no longer be able to use it at checkout.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteId(null)} disabled={deleting} style={{ padding: '0.55rem 1.5rem', borderRadius: 10, background: '#f3f4f6', color: '#4b5563', fontWeight: 600, fontSize: '0.85rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: '0.55rem 1.5rem', borderRadius: 10, background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}


