import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

/* ── Field lives OUTSIDE ProductModal so its identity is stable across re-renders.
   Defining a component inside another component causes React to treat it as a new
   component type on every render, unmounting/remounting it and losing input focus. ── */
function Field({ label, name, type = 'text', required, rows, form, errors, onChange, hint }) {
  return (
    <div className="pm-field">
      <label className="pm-label">{label}{required && <span className="pm-req">*</span>}</label>
      {rows ? (
        <textarea
          className={`pm-input ${errors[name] ? 'pm-err' : ''}`}
          rows={rows}
          value={form[name] ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <input
          className={`pm-input ${errors[name] ? 'pm-err' : ''}`}
          type={type}
          value={form[name] ?? ''}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
      {hint && !errors[name] && <span className="pm-hint">{hint}</span>}
      {errors[name] && <span className="pm-error">{errors[name]}</span>}
    </div>
  );
}

export default function ProductModal({ isOpen, onClose, onSave, product, categories = [], owners = [] }) {
  const isEdit = !!product;
  const blank = {
    name: '', category: '', brand: '', description: '', specifications: '',
    cost_price: '', selling_price: '', discount_price: '', stock: '', reorder_level: '',
    owner_name: '', image_url: '',
  };
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setForm({
          ...blank,
          ...product,
          category:       product.category       ?? '',
          owner_name:     product.owner_name     ?? '',
          cost_price:     product.cost_price     ?? '',
          selling_price:  product.selling_price  ?? '',
          discount_price: product.discount_price ?? '',
          stock:          product.stock          ?? '',
          reorder_level:  product.reorder_level  ?? '',
        });
      } else {
        setForm(blank);
      }
      setErrors({});
    }
  }, [isOpen, product]);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = 'Required';
    if (!form.category) e.category = 'Required';
    if (!form.brand?.trim()) e.brand = 'Required';
    if (form.cost_price === '' || Number(form.cost_price) < 0) e.cost_price = 'Enter valid cost';
    if (form.selling_price === '' || Number(form.selling_price) < 0) e.selling_price = 'Enter valid price';
    if (form.cost_price !== '' && form.selling_price !== '' && Number(form.selling_price) <= Number(form.cost_price))
      e.selling_price = 'Must be > cost price';
    if (form.discount_price !== '') {
      const dp = Number(form.discount_price);
      const sp = Number(form.selling_price);
      if (dp <= 0) e.discount_price = 'Must be greater than 0';
      else if (sp && dp >= sp) e.discount_price = 'Must be less than selling price';
    }
    if (form.stock === '' || Number(form.stock) < 0) e.stock = 'Enter valid quantity';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name:          form.name.trim(),
        category:      Number(form.category),
        brand:         form.brand.trim(),
        description:   form.description ?? '',
        specifications: form.specifications ?? '',
        cost_price:    Number(form.cost_price),
        selling_price: Number(form.selling_price),
        discount_price: form.discount_price !== '' ? Number(form.discount_price) : null,
        stock:         Number(form.stock),
        reorder_level: form.reorder_level !== '' ? Number(form.reorder_level) : 10,
        image_url:     form.image_url ?? '',
      };
      if (form.owner_name?.trim()) {
        payload.owner_name = form.owner_name.trim();
      }
      await onSave(payload);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const hasSale = form.discount_price !== '' && Number(form.discount_price) > 0;
  const savings = hasSale && form.selling_price !== ''
    ? Math.round(Number(form.selling_price) - Number(form.discount_price))
    : null;
  const discPct = hasSale && form.selling_price !== '' && Number(form.selling_price) > 0
    ? Math.round((1 - Number(form.discount_price) / Number(form.selling_price)) * 100)
    : null;

  if (!isOpen) return null;

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <h2 className="pm-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button className="pm-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="pm-body">
          <div className="pm-grid">
            <Field label="Product Name"        name="name"           required form={form} errors={errors} onChange={set} />

            {/* Category */}
            <div className="pm-field">
              <label className="pm-label">Category<span className="pm-req">*</span></label>
              <select
                className={`pm-input ${errors.category ? 'pm-err' : ''}`}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                <option value="">Select...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category && <span className="pm-error">{errors.category}</span>}
            </div>

            <Field label="Brand"               name="brand"          required form={form} errors={errors} onChange={set} />
            <Field label="Cost Price (NPR)"    name="cost_price"     required type="number" form={form} errors={errors} onChange={set} />
            <Field label="Selling Price (NPR)" name="selling_price"  required type="number" form={form} errors={errors} onChange={set} />

            {/* Sale / Discount Price */}
            <div className="pm-field">
              <label className="pm-label">
                Sale Price (NPR)
                <span className="pm-optional"> — optional</span>
              </label>
              <input
                className={`pm-input pm-sale-input ${errors.discount_price ? 'pm-err' : ''} ${hasSale && !errors.discount_price ? 'pm-sale-active' : ''}`}
                type="number"
                placeholder="Leave blank = no sale"
                value={form.discount_price ?? ''}
                onChange={(e) => set('discount_price', e.target.value)}
              />
              {errors.discount_price && <span className="pm-error">{errors.discount_price}</span>}
              {hasSale && !errors.discount_price && savings !== null && (
                <span className="pm-sale-preview">
                  🏷️ ON SALE — {discPct}% off · Customer saves NPR {savings.toLocaleString()}
                </span>
              )}
              {!hasSale && !errors.discount_price && (
                <span className="pm-hint">Set a lower sale price to mark this product ON SALE</span>
              )}
            </div>

            <Field label="Stock Quantity"      name="stock"          required type="number" form={form} errors={errors} onChange={set} />
            <Field label="Reorder Level"       name="reorder_level"           type="number" form={form} errors={errors} onChange={set} />

            {/* Supplier Name — lists store owners, value stored as owner_name */}
            <div className="pm-field">
              <label className="pm-label">Supplier Name</label>
              <select
                className="pm-input"
                value={form.owner_name}
                onChange={(e) => set('owner_name', e.target.value)}
              >
                <option value="">Select owner...</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </div>

            {/* Image URL */}
            <div className="pm-field">
              <label className="pm-label">Image URL</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="pm-input"
                  style={{ flex: 1 }}
                  value={form.image_url ?? ''}
                  onChange={(e) => set('image_url', e.target.value)}
                  placeholder="https://..."
                />
                {form.image_url && <img src={form.image_url} alt="" className="pm-preview" />}
              </div>
            </div>
          </div>

          <Field label="Description"    name="description"    rows={3} form={form} errors={errors} onChange={set} />
          <Field label="Specifications" name="specifications" rows={3} form={form} errors={errors} onChange={set} />
        </div>

        <div className="pm-footer">
          <button className="pm-btn pm-btn-cancel" onClick={onClose}>Cancel</button>
          <button className="pm-btn pm-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </div>

      <style>{`
        .pm-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
        .pm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .pm-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
        .pm-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; }
        .pm-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.15s; }
        .pm-close:hover { color: #ef4444; background: #fef2f2; }
        .pm-body { padding: 1.5rem; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 0.85rem; }
        .pm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem 1.25rem; }
        @media (max-width: 540px) { .pm-grid { grid-template-columns: 1fr; } }
        .pm-field { display: flex; flex-direction: column; gap: 0.25rem; }
        .pm-label { font-size: 0.78rem; font-weight: 600; color: #374151; }
        .pm-optional { font-weight: 400; color: #9ca3af; font-size: 0.72rem; }
        .pm-req { color: #ef4444; margin-left: 2px; }
        .pm-input { padding: 0.5rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #1e293b; transition: border-color 0.15s; background: #fff; resize: vertical; }
        .pm-input:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .pm-input.pm-err { border-color: #ef4444; }
        .pm-sale-input.pm-sale-active { border-color: #F97316; background: #fff7ed; }
        .pm-hint { font-size: 0.7rem; color: #9ca3af; }
        .pm-sale-preview { font-size: 0.72rem; color: #ea580c; font-weight: 600; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6px; padding: 4px 8px; }
        .pm-error { font-size: 0.72rem; color: #ef4444; font-weight: 500; }
        .pm-preview { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; border: 1px solid #e5e7eb; flex-shrink: 0; }
        .pm-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; }
        .pm-btn { padding: 0.55rem 1.25rem; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; font-family: inherit; border: none; transition: all 0.15s; }
        .pm-btn-cancel { background: #f3f4f6; color: #4b5563; }
        .pm-btn-cancel:hover { background: #e5e7eb; }
        .pm-btn-save { background: #F97316; color: #fff; }
        .pm-btn-save:hover { background: #ea580c; }
        .pm-btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
