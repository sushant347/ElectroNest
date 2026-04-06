import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Search, Plus, Pencil, Trash2, RotateCcw, ChevronLeft, ChevronRight, Package, AlertCircle, RefreshCw, X, FileText, Layers, Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import { TableRowsSkeleton } from '../../components/Common/SkeletonLoader';
import ProductModal from '../../components/Owner/ProductModal';

const fmt = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(v);

// ── Stock Increase Modal ──
function StockIncreaseModal({ products, onClose, onStockUpdate }) {
  const [search, setSearch] = useState('');
  const [increments, setIncrements] = useState({});
  const [saving, setSaving] = useState(null);

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = async (product) => {
    const inc = parseInt(increments[product.id] || 0, 10);
    if (!inc || inc <= 0) { alert('Enter a valid quantity to add'); return; }
    setSaving(product.id);
    try {
      await ownerAPI.increaseStock(product.id, (product.stock || 0) + inc);
      onStockUpdate(product.id, (product.stock || 0) + inc);
      setIncrements(prev => ({ ...prev, [product.id]: '' }));
    } catch {
      alert('Failed to update stock');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="si-overlay" onClick={onClose}>
      <div className="si-modal" onClick={e => e.stopPropagation()}>
        <div className="si-header">
          <h2 className="si-title">Increase Stock</h2>
          <button className="si-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="si-search-wrap">
          <Search size={14} className="si-search-icon" />
          <input className="si-search-input" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="si-list">
          {filtered.length === 0 ? (
            <div className="si-empty"><Package size={32} /><p>No products found</p></div>
          ) : filtered.map(product => (
            <div key={product.id} className="si-row">
              <div className="si-product-info">
                {product.image_url
                  ? <img src={product.image_url} alt="" className="si-thumb" onError={e => { e.target.style.display = 'none'; }} />
                  : <div className="si-thumb-ph"><Package size={16} /></div>
                }
                <div className="si-product-text">
                  <div className="si-product-name">{product.name}</div>
                  <div className="si-product-meta">
                    <span className="si-stock-badge">{product.stock || 0} in stock</span>
                    {product.brand && <span>{product.brand}</span>}
                  </div>
                </div>
              </div>
              <div className="si-add-row">
                <input
                  className="si-qty-input"
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={increments[product.id] || ''}
                  onChange={e => setIncrements(prev => ({ ...prev, [product.id]: e.target.value }))}
                />
                <button
                  className="si-confirm-btn"
                  onClick={() => handleConfirm(product)}
                  disabled={saving === product.id || !increments[product.id]}
                >
                  {saving === product.id ? '...' : <><Plus size={13} /> Add</>}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="si-footer">
          <button className="si-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
      <style>{`
        .si-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
        .si-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .si-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
        .si-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; }
        .si-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.15s; display: flex; align-items: center; }
        .si-close:hover { color: #ef4444; background: #fef2f2; }
        .si-search-wrap { position: relative; padding: 1rem 1.5rem 0.5rem; flex-shrink: 0; }
        .si-search-icon { position: absolute; left: calc(1.5rem + 11px); top: calc(1rem + 10px); color: #9ca3af; pointer-events: none; }
        .si-search-input { width: 100%; padding: 9px 12px 9px 34px; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.84rem; font-family: inherit; color: #1e293b; outline: none; box-sizing: border-box; }
        .si-search-input:focus { border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.08); }
        .si-list { flex: 1; overflow-y: auto; padding: 0.5rem 1.5rem; display: flex; flex-direction: column; gap: 8px; }
        .si-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; color: #9ca3af; gap: 8px; }
        .si-empty p { font-size: 0.85rem; margin: 0; }
        .si-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fafafa; }
        .si-product-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
        .si-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid #e5e7eb; flex-shrink: 0; }
        .si-thumb-ph { width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #d1d5db; flex-shrink: 0; }
        .si-product-text { flex: 1; min-width: 0; }
        .si-product-name { font-size: 0.85rem; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .si-product-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; font-size: 0.72rem; color: #9ca3af; }
        .si-stock-badge { background: #DCFCE7; color: #16A34A; font-weight: 600; padding: 1px 7px; border-radius: 10px; font-size: 0.68rem; }
        .si-add-row { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        .si-qty-input { width: 72px; padding: 7px 8px; border: 1.5px solid #d1d5db; border-radius: 7px; font-size: 0.82rem; font-family: inherit; text-align: center; outline: none; }
        .si-qty-input:focus { border-color: #F97316; }
        .si-confirm-btn { display: inline-flex; align-items: center; gap: 4px; padding: 7px 12px; border-radius: 7px; background: #F97316; color: #fff; font-weight: 700; font-size: 0.78rem; border: none; cursor: pointer; font-family: inherit; white-space: nowrap; transition: all 0.15s; }
        .si-confirm-btn:hover:not(:disabled) { background: #ea580c; }
        .si-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .si-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; flex-shrink: 0; }
        .si-done-btn { padding: 0.5rem 1.5rem; border-radius: 8px; background: #232F3E; color: #fff; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; font-family: inherit; }
        .si-done-btn:hover { background: #37475A; }
      `}</style>
    </div>
  );
}

// ── CSV Import Modal ──
function CsvImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await ownerAPI.bulkImportProducts(formData);
      setResult(res.data);
      if (res.data.created_count > 0) {
        setTimeout(() => onImported(res.data.created_count), 1500);
      }
    } catch (err) {
      setResult({ error: err.response?.data?.detail || 'Upload failed. Please try again.' });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'name,sku,brand,category,supplier,selling_price,cost_price,stock,reorder_level,description,image_url';
    const example = 'Sample Laptop,LAP-001,Dell,Laptops,,85000,65000,20,5,A great laptop,';
    const csv = `${header}\n${example}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products_template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="si-overlay" onClick={onClose}>
      <div className="si-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div className="si-header">
          <h2 className="si-title">CSV Bulk Import</h2>
          <button className="si-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div style={{ padding: '1rem 1.5rem', flex: 1, overflowY: 'auto' }}>
          {/* Template download */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.75rem', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', marginBottom: '1rem' }}>
            <Download size={16} color="#2563eb" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.8rem', color: '#1d4ed8' }}>
              Download the CSV template with the correct column headers.
            </div>
            <button onClick={downloadTemplate} style={{ padding: '5px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Template
            </button>
          </div>

          {/* Required columns note */}
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            <strong style={{ color: '#374151' }}>Required columns:</strong> name, selling_price, cost_price.
            Optional: sku, brand, category, supplier, stock (default 64), reorder_level, description, image_url
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${file ? '#16a34a' : '#d1d5db'}`,
              borderRadius: 12, padding: '2rem', textAlign: 'center',
              cursor: 'pointer', background: file ? '#f0fdf4' : '#fafafa',
              transition: 'all 0.2s', marginBottom: '1rem',
            }}
          >
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
            {file ? (
              <>
                <CheckCircle size={32} color="#16a34a" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#15803d' }}>{file.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB · Click to change</div>
              </>
            ) : (
              <>
                <Upload size={32} color="#9ca3af" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#374151' }}>Drop CSV file here or click to browse</div>
                <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 4 }}>Only .csv files are supported</div>
              </>
            )}
          </div>

          {/* Upload result */}
          {result && !result.error && (
            <div style={{ background: result.created_count > 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.created_count > 0 ? '#bbf7d0' : '#fecaca'}`, borderRadius: 10, padding: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                {result.created_count > 0
                  ? <CheckCircle size={16} color="#16a34a" />
                  : <XCircle size={16} color="#dc2626" />
                }
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: result.created_count > 0 ? '#15803d' : '#dc2626' }}>
                  {result.created_count} product{result.created_count !== 1 ? 's' : ''} imported
                  {result.error_count > 0 ? `, ${result.error_count} error${result.error_count !== 1 ? 's' : ''}` : ''}
                </span>
              </div>
              {result.errors && result.errors.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#dc2626', maxHeight: 100, overflowY: 'auto' }}>
                  {result.errors.map((e, i) => <div key={i}>• {e}</div>)}
                </div>
              )}
            </div>
          )}
          {result?.error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '0.85rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <XCircle size={16} color="#dc2626" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#dc2626' }}>{result.error}</span>
              </div>
            </div>
          )}
        </div>

        <div className="si-footer" style={{ justifyContent: 'space-between' }}>
          <button className="si-done-btn" style={{ background: '#f3f4f6', color: '#374151' }} onClick={onClose}>Cancel</button>
          <button
            className="si-confirm-btn"
            style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? <><RefreshCw size={14} className="spin" /> Uploading...</> : <><Upload size={14} /> Import Products</>}
          </button>
        </div>
      </div>
      <style>{`
        .si-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
        .si-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 560px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .si-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; flex-shrink: 0; }
        .si-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; }
        .si-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 6px; transition: all 0.15s; display: flex; align-items: center; }
        .si-close:hover { color: #ef4444; background: #fef2f2; }
        .si-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; flex-shrink: 0; gap: 0.5rem; }
        .si-done-btn { padding: 0.5rem 1.5rem; border-radius: 8px; background: #232F3E; color: #fff; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; font-family: inherit; }
        .si-done-btn:hover { background: #37475A; }
        .si-confirm-btn { display: inline-flex; align-items: center; gap: 4px; padding: 7px 12px; border-radius: 7px; background: #F97316; color: #fff; font-weight: 700; font-size: 0.78rem; border: none; cursor: pointer; font-family: inherit; white-space: nowrap; transition: all 0.15s; }
        .si-confirm-btn:hover:not(:disabled) { background: #ea580c; }
        .si-confirm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Inline: useProductFilters hook ──
function useProductFilters(products = []) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.category_name?.toLowerCase().includes(q));
    }
    if (selectedCategory) result = result.filter((p) => p.category_name === selectedCategory);
    if (minPrice !== '') result = result.filter((p) => p.selling_price >= Number(minPrice));
    if (maxPrice !== '') result = result.filter((p) => p.selling_price <= Number(maxPrice));
    result.sort((a, b) => {
      let valA = a[sortBy], valB = b[sortBy];
      if (typeof valA === 'string') { valA = valA.toLowerCase(); valB = valB.toLowerCase(); }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [products, searchQuery, selectedCategory, minPrice, maxPrice, sortBy, sortOrder]);

  const resetFilters = useCallback(() => {
    setSearchQuery(''); setSelectedCategory(''); setMinPrice(''); setMaxPrice(''); setSortBy('name'); setSortOrder('asc');
  }, []);

  return { filteredProducts, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, minPrice, setMinPrice, maxPrice, setMaxPrice, sortBy, setSortBy, sortOrder, setSortOrder, resetFilters };
}

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [ownersList, setOwnersList] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const {
    filteredProducts, searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    minPrice, setMinPrice, maxPrice, setMaxPrice,
    sortBy, setSortBy, resetFilters,
  } = useProductFilters(products);

  const fetchData = useCallback(async () => {
    try {
      setPageLoading(true);
      setPageError(null);
      const [prodRes, catRes, ownersRes] = await Promise.all([
        ownerAPI.getAllProducts({ page_size: 1000, my_products: true }),
        ownerAPI.getCategories(),
        ownerAPI.getOwners(),
      ]);
      setProducts(prodRes.data.results || prodRes.data);
      setCategoriesList(catRes.data.results || catRes.data || []);
      setOwnersList(ownersRes.data || []);
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to load products. Please try again.');
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
  const csvInputRef = useRef(null);

  const perPage = 10;
  const totalPages = Math.ceil(filteredProducts.length / perPage);
  const paged = filteredProducts.slice((currentPage - 1) * perPage, currentPage * perPage);

  const categories = categoriesList.map(c => c.name).filter(Boolean);

  const openAdd = () => setShowAddChoice(true);
  const openNewProduct = () => { setShowAddChoice(false); setEditingProduct(null); setShowModal(true); };
  const openExistingProduct = () => { setShowAddChoice(false); setShowStockModal(true); };
  const openCsvImport = () => { setShowAddChoice(false); setShowCsvModal(true); };
  const openEdit = (p) => { setEditingProduct(p); setShowModal(true); };

  const handleStockUpdate = (productId, newStock) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
  };

  const handleSave = async (data) => {
    try {
      if (editingProduct) {
        const res = await ownerAPI.updateProduct(editingProduct.id, data);
        setProducts((prev) => prev.map((p) => p.id === editingProduct.id ? res.data : p));
      } else {
        const res = await ownerAPI.createProduct(data);
        setProducts((prev) => [...prev, res.data]);
      }
      setShowModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await ownerAPI.deleteProduct(deleteConfirm.id);
        setProducts((prev) => prev.filter((p) => p.id !== deleteConfirm.id));
        setDeleteConfirm(null);
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to delete product');
      }
    }
  };

  return (
    <div className="owner-pm">
      {/* Header */}
      <div className="owner-pm-header">
        <div>
          <h1 className="owner-pm-title">Product Management</h1>
          <p className="owner-pm-sub">{products.length} products · {products.filter((p) => (p.stock || 0) > 0).length} in stock</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="owner-pm-refresh-btn" onClick={fetchData} disabled={pageLoading}><RefreshCw size={16} className={pageLoading ? 'spin' : ''} /></button>
          <button className="owner-pm-add-btn" onClick={openAdd}><Plus size={18} /> Add Product</button>
        </div>
      </div>

      {/* Error */}
      {pageError && (
        <div className="owner-pm-error">
          <AlertCircle size={18} />
          <span>{pageError}</span>
          <button onClick={fetchData} className="pm-retry-btn">Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="owner-pm-filters">
        <div className="owner-pm-search">
          <Search size={16} className="owner-pm-search-icon" />
          <input placeholder="Search products, brands..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
        </div>
        <select className="owner-pm-select" value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" className="owner-pm-price-input" placeholder="Min ₹" value={minPrice} onChange={(e) => { setMinPrice(e.target.value); setCurrentPage(1); }} />
        <input type="number" className="owner-pm-price-input" placeholder="Max ₹" value={maxPrice} onChange={(e) => { setMaxPrice(e.target.value); setCurrentPage(1); }} />
        <select className="owner-pm-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="selling_price">Sort by Price</option>
          <option value="stock">Sort by Stock</option>
        </select>
        <button className="owner-pm-reset-btn" onClick={() => { resetFilters(); setCurrentPage(1); }}><RotateCcw size={14} /> Reset</button>
      </div>

      {/* Table */}
      <div className="owner-pm-table-wrap">
        <table className="owner-pm-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Brand</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageLoading ? (
              <TableRowsSkeleton rows={8} columns={8} />
            ) : paged.length === 0 ? (
              <tr><td colSpan={8} className="owner-pm-empty"><Package size={32} /><span>No products found</span></td></tr>
            ) : (
              paged.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="pm-product-cell">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="pm-product-img" />
                      ) : (
                        <div className="pm-product-img-placeholder"><Package size={16} /></div>
                      )}
                      <span className="pm-product-name">{p.name}</span>
                    </div>
                  </td>
                  <td><span className="pm-cat-badge">{p.category_name}</span></td>
                  <td className="pm-brand">{p.brand}</td>
                  <td className="pm-num">{fmt(p.cost_price)}</td>
                  <td className="pm-num pm-price">{fmt(p.selling_price)}</td>
                  <td className="pm-num">
                    <span className={`pm-stock ${(p.stock || 0) === 0 ? 'out' : (p.stock || 0) <= (p.reorder_level || 10) ? 'low' : ''}`}>
                      {p.stock || 0}
                    </span>
                  </td>
                  <td>
                    <span className={`pm-status-badge ${(p.stock || 0) > 0 ? 'active' : 'inactive'}`}>{(p.stock || 0) > 0 ? 'Active' : 'Out of Stock'}</span>
                  </td>
                  <td>
                    <div className="pm-actions">
                      <button className="pm-act-btn edit" onClick={() => openEdit(p)} title="Edit"><Pencil size={14} /></button>
                      <button className="pm-act-btn delete" onClick={() => setDeleteConfirm(p)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="owner-pm-pagination">
          <span className="pm-page-info">Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filteredProducts.length)} of {filteredProducts.length}</span>
          <div className="pm-page-btns">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="pm-page-btn"><ChevronLeft size={16} /></button>
            {(() => {
              const pages = [];
              const maxVisible = 5;
              if (totalPages <= maxVisible + 2) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
              } else {
                if (currentPage <= 3) {
                  for (let i = 1; i <= maxVisible; i++) pages.push(i);
                  pages.push('...');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 2) {
                  pages.push(1);
                  pages.push('...');
                  for (let i = totalPages - maxVisible + 1; i <= totalPages; i++) pages.push(i);
                } else {
                  pages.push(1);
                  pages.push('...');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                  pages.push('...');
                  pages.push(totalPages);
                }
              }
              return pages.map((page, idx) => 
                page === '...' ? <span key={`ellipsis-${idx}`} className="pm-page-ellipsis">...</span> : 
                <button key={page} className={`pm-page-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
              );
            })()}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="pm-page-btn"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProductModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={handleSave} product={editingProduct} categories={categoriesList} owners={ownersList} />

      {showStockModal && (
        <StockIncreaseModal products={products} onClose={() => setShowStockModal(false)} onStockUpdate={handleStockUpdate} />
      )}

      {showAddChoice && (
        <div className="ac-overlay" onClick={() => setShowAddChoice(false)}>
          <div className="ac-modal" onClick={e => e.stopPropagation()}>
            <div className="ac-header">
              <h2 className="ac-title">Add Product</h2>
              <button className="ac-close" onClick={() => setShowAddChoice(false)}><X size={20} /></button>
            </div>
            <p className="ac-sub">What would you like to do?</p>
            <div className="ac-options">
              <button className="ac-option" onClick={openNewProduct}>
                <div className="ac-option-icon" style={{ background: '#FFF7ED', color: '#F97316' }}><FileText size={24} /></div>
                <div className="ac-option-text">
                  <span className="ac-option-title">New Product</span>
                  <span className="ac-option-desc">Add a brand-new product to your store. Stock defaults to 64 units.</span>
                </div>
              </button>
              <button className="ac-option" onClick={openExistingProduct}>
                <div className="ac-option-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}><Layers size={24} /></div>
                <div className="ac-option-text">
                  <span className="ac-option-title">Existing Product</span>
                  <span className="ac-option-desc">Increase the stock quantity of a product you already have.</span>
                </div>
              </button>
              <button className="ac-option" onClick={openCsvImport}>
                <div className="ac-option-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}><Upload size={24} /></div>
                <div className="ac-option-text">
                  <span className="ac-option-title">CSV Bulk Import</span>
                  <span className="ac-option-desc">Upload a CSV file to add many products at once.</span>
                </div>
              </button>
            </div>
          </div>
          <style>{`
            .ac-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
            .ac-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 440px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: acIn 0.18s ease; }
            @keyframes acIn { from { opacity: 0; transform: translateY(-10px) scale(0.97); } to { opacity: 1; transform: none; } }
            .ac-header { display: flex; align-items: center; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
            .ac-title { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; }
            .ac-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 6px; display: flex; align-items: center; }
            .ac-close:hover { color: #ef4444; background: #fef2f2; }
            .ac-sub { font-size: 0.85rem; color: #6b7280; margin: 0; padding: 1rem 1.5rem 0.5rem; }
            .ac-options { display: flex; flex-direction: column; gap: 10px; padding: 0.5rem 1.5rem 1.5rem; }
            .ac-option { display: flex; align-items: center; gap: 14px; padding: 1rem; border-radius: 12px; border: 2px solid #e5e7eb; background: #fff; cursor: pointer; text-align: left; font-family: inherit; transition: all 0.15s; width: 100%; }
            .ac-option:hover { border-color: #F97316; background: #FFFBF5; transform: translateY(-1px); }
            .ac-option-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .ac-option-text { display: flex; flex-direction: column; gap: 3px; }
            .ac-option-title { font-size: 0.9rem; font-weight: 700; color: #1e293b; }
            .ac-option-desc { font-size: 0.75rem; color: #6b7280; line-height: 1.35; }
          `}</style>
        </div>
      )}

      {showCsvModal && (
        <CsvImportModal
          csvInputRef={csvInputRef}
          onClose={() => setShowCsvModal(false)}
          onImported={(count) => {
            setShowCsvModal(false);
            fetchData();
            alert(`✅ ${count} product${count !== 1 ? 's' : ''} imported successfully!`);
          }}
        />
      )}

      {deleteConfirm && (
        <div className="pm-del-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="pm-del-modal" onClick={(e) => e.stopPropagation()}>
            <Trash2 size={32} color="#ef4444" />
            <h3>Delete Product?</h3>
            <p>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This cannot be undone.</p>
            <div className="pm-del-btns">
              <button className="pm-del-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="pm-del-confirm" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .owner-pm { min-height: calc(100vh - 120px); background: #F3F4F6; padding: 2rem; }
        .owner-pm-header { max-width: 1280px; margin: 0 auto 1.25rem; display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
        .owner-pm-title { font-size: 1.65rem; font-weight: 800; color: #1e293b; margin: 0; }
        .owner-pm-sub { font-size: 0.85rem; color: #6b7280; margin-top: 0.15rem; }
        .owner-pm-add-btn { display: inline-flex; align-items: center; gap: 6px; padding: 0.55rem 1.15rem; border-radius: 8px; background: #F97316; color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; border: none; font-family: inherit; transition: background 0.15s; }
        .owner-pm-add-btn:hover { background: #ea580c; }
        .owner-pm-refresh-btn { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; background: #232F3E; color: #fff; cursor: pointer; border: none; transition: background 0.15s; }
        .owner-pm-refresh-btn:hover { background: #37475A; }
        .owner-pm-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        /* Error */
        .owner-pm-error { max-width: 1280px; margin: 0 auto 1rem; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1.25rem; border-radius: 10px; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; font-size: 0.85rem; font-weight: 500; }
        .pm-retry-btn { margin-left: auto; padding: 0.35rem 0.85rem; border-radius: 6px; background: #DC2626; color: #fff; font-weight: 600; font-size: 0.78rem; border: none; cursor: pointer; font-family: inherit; }
        .pm-retry-btn:hover { background: #b91c1c; }

        /* Filters */
        .owner-pm-filters { max-width: 1280px; margin: 0 auto 1rem; display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; }
        .owner-pm-search { position: relative; flex: 1; min-width: 200px; }
        .owner-pm-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
        .owner-pm-search input { width: 100%; padding: 0.5rem 0.75rem 0.5rem 2.25rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.85rem; font-family: inherit; color: #1e293b; }
        .owner-pm-search input:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .owner-pm-select { padding: 0.5rem 0.75rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.82rem; font-family: inherit; color: #374151; background: #fff; cursor: pointer; }
        .owner-pm-select:focus { outline: none; border-color: #F97316; }
        .owner-pm-price-input { width: 100px; padding: 0.5rem 0.6rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: 0.82rem; font-family: inherit; }
        .owner-pm-price-input:focus { outline: none; border-color: #F97316; }
        .owner-pm-reset-btn { display: inline-flex; align-items: center; gap: 4px; padding: 0.5rem 0.85rem; border-radius: 8px; background: #fff; color: #6b7280; font-size: 0.82rem; font-weight: 600; border: 1.5px solid #d1d5db; cursor: pointer; font-family: inherit; }
        .owner-pm-reset-btn:hover { background: #f3f4f6; color: #374151; }

        /* Table */
        .owner-pm-table-wrap { max-width: 1280px; margin: 0 auto; background: #fff; border-radius: 14px; border: 1px solid #e5e7eb; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        .owner-pm-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .owner-pm-table th { text-align: left; padding: 0.75rem 1rem; color: #6b7280; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
        .owner-pm-table td { padding: 0.7rem 1rem; border-bottom: 1px solid #f3f4f6; color: #374151; }
        .owner-pm-table tbody tr:hover { background: #FFF7ED; }
        .owner-pm-empty { text-align: center; padding: 2.5rem 1rem !important; color: #9ca3af; }
        .owner-pm-empty span { display: block; margin-top: 0.5rem; font-weight: 500; }

        .pm-product-cell { display: flex; align-items: center; gap: 0.6rem; }
        .pm-product-img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid #e5e7eb; flex-shrink: 0; }
        .pm-product-img-placeholder { width: 40px; height: 40px; border-radius: 8px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #d1d5db; flex-shrink: 0; }
        .pm-product-name { font-weight: 600; color: #1e293b; white-space: nowrap; }
        .pm-cat-badge { font-size: 0.72rem; font-weight: 600; padding: 0.2rem 0.5rem; border-radius: 5px; background: #EFF6FF; color: #3B82F6; white-space: nowrap; }
        .pm-brand { color: #6b7280; font-weight: 500; }
        .pm-num { text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
        .pm-price { color: #16a34a; }
        .pm-stock { font-weight: 700; }
        .pm-stock.low { color: #ca8a04; }
        .pm-stock.out { color: #dc2626; }
        .pm-status-badge { font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 20px; }
        .pm-status-badge.active { background: #DCFCE7; color: #16A34A; }
        .pm-status-badge.inactive { background: #FEE2E2; color: #DC2626; }
        .pm-actions { display: flex; gap: 0.35rem; }
        .pm-act-btn { background: none; border: 1px solid #e5e7eb; border-radius: 6px; padding: 5px 7px; cursor: pointer; color: #9ca3af; transition: all 0.15s; }
        .pm-act-btn.edit:hover { color: #F97316; border-color: #F97316; background: #FFF7ED; }
        .pm-act-btn.delete:hover { color: #ef4444; border-color: #ef4444; background: #FEF2F2; }

        /* Pagination */
        .owner-pm-pagination { max-width: 1280px; margin: 1rem auto 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; }
        .pm-page-info { font-size: 0.82rem; color: #6b7280; font-weight: 500; }
        .pm-page-btns { display: flex; gap: 0.3rem; align-items: center; }
        .pm-page-btn { width: 34px; height: 34px; border-radius: 8px; border: 1px solid #d1d5db; background: #fff; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; font-family: inherit; font-size: 0.82rem; font-weight: 600; transition: all 0.15s; }
        .pm-page-btn:hover:not(:disabled) { background: #FFF7ED; border-color: #F97316; color: #F97316; }
        .pm-page-btn.active { background: #F97316; color: #fff; border-color: #F97316; }
        .pm-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .pm-page-ellipsis { color: #9ca3af; font-size: 0.82rem; font-weight: 600; padding: 0 4px; }

        /* Delete Modal */
        .pm-del-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; }
        .pm-del-modal { background: #fff; border-radius: 16px; padding: 2rem; text-align: center; max-width: 380px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
        .pm-del-modal h3 { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0.75rem 0 0.5rem; }
        .pm-del-modal p { font-size: 0.85rem; color: #6b7280; margin: 0 0 1.25rem; line-height: 1.5; }
        .pm-del-btns { display: flex; gap: 0.75rem; justify-content: center; }
        .pm-del-cancel { padding: 0.5rem 1.25rem; border-radius: 8px; background: #f3f4f6; color: #4b5563; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; font-family: inherit; }
        .pm-del-confirm { padding: 0.5rem 1.25rem; border-radius: 8px; background: #ef4444; color: #fff; font-weight: 600; font-size: 0.85rem; border: none; cursor: pointer; font-family: inherit; }
        .pm-del-confirm:hover { background: #dc2626; }

        @media (max-width: 900px) { .owner-pm { padding: 1.25rem; } }
      `}</style>
    </div>
  );
}
