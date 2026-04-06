import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, LogOut, Package, Plus, Pencil, Trash2, Check, X, Calendar, ShieldCheck } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { SkeletonBlock } from '../../components/Common/SkeletonLoader';

const NEPAL_PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'];
const INDIA_STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
const emptyAddr = { street: '', city: '', province: '', country: 'Nepal', address_type: 'Shipping' };

// Address limits
const MAX_BILLING_ADDRESSES = 2;
const MAX_SHIPPING_ADDRESSES = 4;

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [addresses, setAddresses]     = useState([]);
  const [addrLoading, setAddrLoading] = useState(true);
  const [addrError, setAddrError]     = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [editId, setEditId]           = useState(null);
  const [form, setForm]               = useState(emptyAddr);
  const [saving, setSaving]           = useState(false);
  const [deleteId, setDeleteId]       = useState(null);

  useEffect(() => { if (user) fetchAddresses(); }, [user]);

  const fetchAddresses = async () => {
    setAddrLoading(true); setAddrError('');
    try {
      const res = await customerAPI.getAddresses();
      setAddresses(res.data?.results || res.data || []);
    } catch { setAddrError('Failed to load addresses.'); }
    finally  { setAddrLoading(false); }
  };

  // Count addresses by type
  const billingCount = addresses.filter(a => a.address_type === 'Billing').length;
  const shippingCount = addresses.filter(a => a.address_type === 'Shipping').length;
  
  // Check if can add more addresses of each type
  const canAddBilling = billingCount < MAX_BILLING_ADDRESSES;
  const canAddShipping = shippingCount < MAX_SHIPPING_ADDRESSES;
  const canAddAddress = canAddBilling || canAddShipping;
  
  // Check if can delete (need at least 1 address)
  const canDelete = addresses.length > 1;
  
  // Get available provinces based on country
  const getProvinces = (country) => {
    if (country === 'India') return INDIA_STATES;
    return NEPAL_PROVINCES;
  };

  if (!user) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b' }}>Please log in to view your profile.</p>
    </div>
  );

  const handleLogout = () => { logout(); navigate('/login'); };
  const openAdd  = () => { 
    // Set default address type based on availability
    let defaultType = 'Shipping';
    if (!canAddShipping && canAddBilling) defaultType = 'Billing';
    setForm({ ...emptyAddr, address_type: defaultType }); 
    setEditId(null); 
    setShowForm(true); 
  };
  const openEdit = (addr) => {
    setForm({ street: addr.street, city: addr.city, province: addr.province, country: addr.country, address_type: addr.address_type });
    setEditId(addr.id); setShowForm(true);
  };
  const cancelForm = () => { setShowForm(false); setEditId(null); setForm(emptyAddr); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.city.trim()) return;
    
    // Check address limits when adding new address
    if (!editId) {
      if (form.address_type === 'Billing' && !canAddBilling) {
        setAddrError(`Maximum ${MAX_BILLING_ADDRESSES} billing addresses allowed.`);
        return;
      }
      if (form.address_type === 'Shipping' && !canAddShipping) {
        setAddrError(`Maximum ${MAX_SHIPPING_ADDRESSES} shipping addresses allowed.`);
        return;
      }
    }
    
    setSaving(true);
    try {
      if (editId) { await customerAPI.updateAddress(editId, form); }
      else        { await customerAPI.addAddress(form); }
      await fetchAddresses();
      cancelForm();
      setAddrError('');
    } catch (err) { 
      const msg = err.response?.data?.detail || 'Failed to save address. Please try again.';
      setAddrError(msg); 
    }
    finally  { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!canDelete) {
      setAddrError('Cannot delete. At least one address is required.');
      return;
    }
    
    setDeleteId(id);
    try {
      await customerAPI.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      setAddrError('');
    } catch (err) { 
      const msg = err.response?.data?.detail || 'Failed to delete address.';
      setAddrError(msg); 
    }
    finally  { setDeleteId(null); }
  };

  const joined   = user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const initials = `${(user.firstName || user.first_name || '?')[0]}${(user.lastName || user.last_name || '')[0] || ''}`.toUpperCase();

  // Get available address types for the form dropdown
  const getAvailableAddressTypes = () => {
    const types = [];
    if (editId) {
      // When editing, allow both types
      types.push({ value: 'Shipping', label: 'Shipping' });
      types.push({ value: 'Billing', label: 'Billing' });
    } else {
      // When adding, only show types that haven't reached their limit
      if (canAddShipping) types.push({ value: 'Shipping', label: `Shipping (${shippingCount}/${MAX_SHIPPING_ADDRESSES})` });
      if (canAddBilling) types.push({ value: 'Billing', label: `Billing (${billingCount}/${MAX_BILLING_ADDRESSES})` });
    }
    return types;
  };

  return (
    <section style={s.page}>
      <div style={s.container}>

        {/* Header */}
        <div style={s.header}>
          <h1 style={s.title}>My Profile</h1>
          <button onClick={handleLogout} style={s.logoutBtn}
            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        {/* Profile Card */}
        <div style={s.card}>
          <div style={s.avatarRow}>
            <div style={s.avatar}><span style={s.avatarText}>{initials}</span></div>
            <div>
              <div style={s.userName}>{user.firstName || user.first_name} {user.lastName || user.last_name}</div>
              <span style={s.roleBadge}><ShieldCheck size={13} style={{ marginRight: 4 }} />Customer</span>
            </div>
          </div>
          <div style={s.infoGrid}>
            <InfoTile icon={<Mail size={17} />}     label="Email"         value={user.email} />
            <InfoTile icon={<Phone size={17} />}    label="Phone"         value={user.phone || '—'} />
            <InfoTile icon={<User size={17} />}     label="Gender"        value={user.gender || '—'} />
            <InfoTile icon={<Calendar size={17} />} label="Date of Birth" value={user.dob || '—'} />
            <InfoTile icon={<Package size={17} />}  label="Member Since"  value={joined} span />
          </div>
        </div>

        {/* Addresses Card */}
        <div style={s.card}>
          <div style={s.addrHeader}>
            <h2 style={s.sectionTitle}><MapPin size={17} style={{ marginRight: 8, color: '#F97316' }} />Saved Addresses</h2>
            {!showForm && canAddAddress && (
              <button onClick={openAdd} style={s.addBtn}><Plus size={14} /> Add Address</button>
            )}
          </div>
          
          {/* Address limits info */}
          <div style={s.limitsInfo}>
            <span style={s.limitBadge}>Billing: {billingCount}/{MAX_BILLING_ADDRESSES}</span>
            <span style={s.limitBadge}>Shipping: {shippingCount}/{MAX_SHIPPING_ADDRESSES}</span>
          </div>

          {addrError && <div style={s.errBox}>{addrError}</div>}

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSave} style={s.form}>
              <div style={s.formTitle}>{editId ? 'Edit Address' : 'New Address'}</div>
              <div style={s.formGrid}>
                <Field label="City *">
                  <input style={s.input} value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Kathmandu" required />
                </Field>
                <Field label="Country">
                  <select style={s.input} value={form.country} onChange={e => setForm(p => ({ ...p, country: e.target.value, province: '' }))}>
                    <option value="Nepal">Nepal</option>
                    <option value="India">India</option>
                  </select>
                </Field>
                <Field label="Province / State">
                  <select style={s.input} value={form.province} onChange={e => setForm(p => ({ ...p, province: e.target.value }))}>
                    <option value="">Select {form.country === 'India' ? 'State' : 'Province'}</option>
                    {getProvinces(form.country).map(pr => <option key={pr} value={pr}>{pr}</option>)}
                  </select>
                </Field>
                <Field label="Street / Area">
                  <input style={s.input} value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="e.g. New Baneshwor" />
                </Field>
                <Field label="Type">
                  <select style={s.input} value={form.address_type} onChange={e => setForm(p => ({ ...p, address_type: e.target.value }))}>
                    {getAvailableAddressTypes().map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div style={s.formActions}>
                <button type="submit" style={s.saveBtn} disabled={saving}><Check size={14} /> {saving ? 'Saving…' : 'Save'}</button>
                <button type="button" onClick={cancelForm} style={s.cancelBtn}><X size={14} /> Cancel</button>
              </div>
            </form>
          )}

          {/* Address list */}
          {addrLoading ? (
            <div style={s.addrGrid}>
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={`addr-skl-${idx}`} style={s.addrCard}>
                  <SkeletonBlock width={92} height={22} radius={999} />
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <SkeletonBlock width="62%" height={16} />
                    <SkeletonBlock width="100%" height={13} />
                    <SkeletonBlock width="88%" height={13} />
                    <SkeletonBlock width="72%" height={13} />
                  </div>
                </div>
              ))}
            </div>
          ) : addresses.length === 0 && !showForm ? (
            <div style={s.empty}><MapPin size={30} style={{ color: '#cbd5e1' }} /><p style={{ color: '#94a3b8', marginTop: 8 }}>No saved addresses yet.</p></div>
          ) : (
            <div style={s.addrGrid}>
              {addresses.map(addr => (
                <div key={addr.id} style={s.addrCard}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#F97316'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(249,115,22,0.15)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'; }}
                >
                  <span style={s.typeBadge}>{addr.address_type}</span>
                  <div style={s.addrCity}>
                    <MapPin size={16} color="#F97316" />
                    {addr.city}
                  </div>
                  <div style={s.addrFieldRow}><span style={s.addrFieldLabel}>Country</span><span style={s.addrFieldValue}>{addr.country || '—'}</span></div>
                  <div style={s.addrFieldRow}><span style={s.addrFieldLabel}>Province</span><span style={s.addrFieldValue}>{addr.province || '—'}</span></div>
                  {addr.street && <div style={s.addrFieldRow}><span style={s.addrFieldLabel}>Street</span><span style={s.addrFieldValue}>{addr.street}</span></div>}
                  <div style={s.addrActs}>
                    <button style={s.editBtn} onClick={() => openEdit(addr)} title="Edit"
                      onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    {canDelete && (
                      <button style={s.delBtn} onClick={() => handleDelete(addr.id)} disabled={deleteId === addr.id} title="Delete"
                        onMouseEnter={e => { if (deleteId !== addr.id) { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                        onMouseLeave={e => { if (deleteId !== addr.id) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                      >
                        {deleteId === addr.id ? '…' : <><Trash2 size={13} /> Delete</>}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </section>
  );
}

function InfoTile({ icon, label, value, span }) {
  return (
    <div style={{ ...s.infoItem, ...(span ? { gridColumn: '1 / -1' } : {}) }}>
      <div style={s.iconBox}>{icon}</div>
      <div>
        <div style={s.infoLabel}>{label}</div>
        <div style={s.infoValue}>{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

const s = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg,#fff7ed 0%,#fff 35%)', padding: '40px 24px 64px', overflowX: 'hidden' },
  container: { maxWidth: 820, margin: '0 auto', width: '100%' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:     { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', margin: 0 },
  logoutBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },
  card:      { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '28px 32px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', marginBottom: 24 },
  // Avatar row
  avatarRow: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' },
  avatar:    { width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:{ color: '#fff', fontSize: 26, fontWeight: 800 },
  userName:  { fontSize: 21, fontWeight: 700, color: '#1e293b', marginBottom: 6 },
  roleBadge: { display: 'inline-flex', alignItems: 'center', padding: '3px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.05em' },
  // Info grid
  infoGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 },
  infoItem:  { display: 'flex', alignItems: 'flex-start', gap: 12 },
  iconBox:   { width: 36, height: 36, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 },
  infoValue: { fontSize: 15, color: '#1e293b', fontWeight: 500 },
  // Address section
  addrHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', margin: 0 },
  addBtn:       { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  errBox:       { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 },
  empty:        { textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  addrGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginTop: 4 },
  addrCard:     { background: '#fff', border: '2px solid #e2e8f0', borderRadius: 14, padding: '18px 20px', position: 'relative', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  typeBadge:    { display: 'inline-block', padding: '4px 12px', background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fed7aa', borderRadius: 999, fontSize: 10, fontWeight: 700, color: '#F97316', textTransform: 'uppercase', marginBottom: 10, letterSpacing: '0.06em' },
  addrCity:     { fontSize: 16, fontWeight: 700, color: '#1e293b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 },
  addrFieldRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' },
  addrFieldLabel: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' },
  addrFieldValue: { fontSize: 13, fontWeight: 600, color: '#1e293b' },
  addrActs:     { display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid #f1f5f9' },
  editBtn:      { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },
  delBtn:       { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' },
  // Address limits info
  limitsInfo:   { display: 'flex', gap: 12, marginBottom: 16 },
  limitBadge:   { display: 'inline-flex', alignItems: 'center', padding: '4px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#64748b' },
  // Form
  form:       { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px', marginBottom: 20 },
  formTitle:  { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  formGrid:   { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' },
  input:      { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#1e293b', outline: 'none', background: '#fff', width: '100%', boxSizing: 'border-box' },
  formActions:{ display: 'flex', gap: 10, flexWrap: 'wrap' },
  saveBtn:    { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn:  { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
