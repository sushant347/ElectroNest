import { useState, useEffect } from 'react';
import { X, Package, TrendingUp, DollarSign, BarChart3, Layers, Tag } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import { SkeletonBlock, SkeletonText } from '../Common/SkeletonLoader';

const fmtNPR = (v) => `NPR ${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function ProductDetailModal({ isOpen, onClose, productSummary }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !productSummary?.product_id) return;
        setLoading(true);
        ownerAPI.getProduct(productSummary.product_id)
            .then(res => setProduct(res.data))
            .catch(() => setProduct(null))
            .finally(() => setLoading(false));
    }, [isOpen, productSummary?.product_id]);

    if (!isOpen || !productSummary) return null;

    const specs = product?.specifications;
    let specEntries = [];
    if (specs) {
        try {
            const parsed = typeof specs === 'string' ? JSON.parse(specs) : specs;
            specEntries = Object.entries(parsed);
        } catch { specEntries = []; }
    }

    return (
        <div className="pdm-overlay" onClick={onClose}>
            <div className="pdm-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="pdm-header">
                    <div>
                        <h2 className="pdm-title">{productSummary.name}</h2>
                        <span className="pdm-subtitle">{productSummary.brand} · {productSummary.category}</span>
                    </div>
                    <button className="pdm-close" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="pdm-body">
                    {loading ? (
                        <div className="pdm-loading" style={{ alignItems: 'stretch' }}>
                            <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <SkeletonBlock width="45%" height={16} />
                                <SkeletonText lines={2} lineHeight={11} lastWidth="60%" />
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                                    {Array.from({ length: 3 }).map((_, idx) => (
                                        <SkeletonBlock key={`pdm-skl-${idx}`} height={72} radius={10} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* KPI Row */}
                            <div className="pdm-kpi-row">
                                <div className="pdm-kpi">
                                    <div className="pdm-kpi-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}><DollarSign size={18} /></div>
                                    <div>
                                        <span className="pdm-kpi-label">Total Revenue</span>
                                        <span className="pdm-kpi-value">{fmtNPR(productSummary.total_revenue)}</span>
                                    </div>
                                </div>
                                <div className="pdm-kpi">
                                    <div className="pdm-kpi-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}><TrendingUp size={18} /></div>
                                    <div>
                                        <span className="pdm-kpi-label">Units Sold</span>
                                        <span className="pdm-kpi-value">{(productSummary.total_quantity_sold || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                                <div className="pdm-kpi">
                                    <div className="pdm-kpi-icon" style={{ background: '#FFF7ED', color: '#F97316' }}><BarChart3 size={18} /></div>
                                    <div>
                                        <span className="pdm-kpi-label">Avg per Unit</span>
                                        <span className="pdm-kpi-value">{fmtNPR(productSummary.total_quantity_sold > 0 ? productSummary.total_revenue / productSummary.total_quantity_sold : 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Product Info */}
                            {product && (
                                <>
                                    <div className="pdm-section">
                                        <h3 className="pdm-section-title"><Package size={15} /> Product Information</h3>
                                        <div className="pdm-info-grid">
                                            <div><span className="pdm-info-label">SKU</span><span className="pdm-info-value"><code>{product.sku}</code></span></div>
                                            <div><span className="pdm-info-label">Selling Price</span><span className="pdm-info-value" style={{ color: '#16A34A', fontWeight: 700 }}>{fmtNPR(product.selling_price)}</span></div>
                                            <div><span className="pdm-info-label">Current Stock</span><span className={`pdm-info-value ${product.stock <= product.reorder_level ? 'pdm-low' : ''}`}>{product.stock} units</span></div>
                                            <div><span className="pdm-info-label">Reorder Level</span><span className="pdm-info-value">{product.reorder_level} units</span></div>
                                            <div><span className="pdm-info-label">Category</span><span className="pdm-info-value"><span className="pdm-cat-badge"><Layers size={12} /> {product.category_name || productSummary.category}</span></span></div>
                                            <div><span className="pdm-info-label">Brand</span><span className="pdm-info-value"><span className="pdm-cat-badge"><Tag size={12} /> {product.brand || productSummary.brand}</span></span></div>
                                            <div><span className="pdm-info-label">Owner</span><span className="pdm-info-value">{product.owner_name || '-'}</span></div>
                                        </div>
                                    </div>

                                    {/* Stock Bar */}
                                    <div className="pdm-section">
                                        <h3 className="pdm-section-title">Stock Level</h3>
                                        <div className="pdm-stock-bar-wrap">
                                            <div className="pdm-stock-bar" style={{
                                                width: `${Math.min(100, (product.stock / Math.max(product.reorder_level * 3, 1)) * 100)}%`,
                                                background: product.stock <= 0 ? '#DC2626' : product.stock <= product.reorder_level ? '#D97706' : '#16A34A'
                                            }} />
                                        </div>
                                        <div className="pdm-stock-labels">
                                            <span>{product.stock <= 0 ? '⚠️ Out of Stock' : product.stock <= product.reorder_level ? '⚠️ Low Stock' : '✅ In Stock'}</span>
                                            <span>{product.stock} / {product.reorder_level * 3} capacity</span>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    {product.description && (
                                        <div className="pdm-section">
                                            <h3 className="pdm-section-title">Description</h3>
                                            <p className="pdm-description">{product.description}</p>
                                        </div>
                                    )}

                                    {/* Specifications */}
                                    {specEntries.length > 0 && (
                                        <div className="pdm-section">
                                            <h3 className="pdm-section-title">Specifications</h3>
                                            <div className="pdm-specs">
                                                {specEntries.map(([key, val], i) => (
                                                    <div key={i} className="pdm-spec-row">
                                                        <span className="pdm-spec-key">{key}</span>
                                                        <span className="pdm-spec-val">{String(val)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>

                <div className="pdm-footer">
                    <button className="pdm-btn-close" onClick={onClose}>Close</button>
                </div>
            </div>
            <style>{styles}</style>
        </div>
    );
}

const styles = `
  .pdm-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 1rem; backdrop-filter: blur(2px); }
  .pdm-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 680px; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: pdmIn 0.2s ease; }
  @keyframes pdmIn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
  .pdm-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 1.25rem 1.5rem; border-bottom: 1px solid #e5e7eb; }
  .pdm-title { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 0; }
  .pdm-subtitle { font-size: 0.78rem; color: #9ca3af; }
  .pdm-close { background: none; border: none; color: #9ca3af; cursor: pointer; padding: 4px; border-radius: 6px; }
  .pdm-close:hover { color: #ef4444; }
  .pdm-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }
  .pdm-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; color: #6b7280; gap: 12px; }
  .pdm-spinner { width: 32px; height: 32px; border: 3px solid #e5e7eb; border-top-color: #F97316; border-radius: 50%; animation: pdmSpin 0.8s linear infinite; }
  @keyframes pdmSpin { to { transform: rotate(360deg); } }

  .pdm-kpi-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 1.25rem; }
  .pdm-kpi { display: flex; align-items: center; gap: 10px; background: #f9fafb; border-radius: 10px; padding: 12px; border: 1px solid #f3f4f6; }
  .pdm-kpi-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pdm-kpi-label { display: block; font-size: 0.68rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; }
  .pdm-kpi-value { display: block; font-size: 0.95rem; font-weight: 700; color: #1e293b; margin-top: 1px; }

  .pdm-section { margin-bottom: 1.25rem; }
  .pdm-section-title { font-size: 0.82rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem; display: flex; align-items: center; gap: 6px; }
  .pdm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .pdm-info-label { display: block; font-size: 0.7rem; color: #9ca3af; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
  .pdm-info-value { display: flex; align-items: center; gap: 4px; font-size: 0.85rem; color: #1e293b; font-weight: 500; margin-top: 1px; }
  .pdm-info-value code { font-size: 0.78rem; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  .pdm-low { color: #DC2626 !important; font-weight: 700 !important; }
  .pdm-cat-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; background: #EFF6FF; color: #3B82F6; padding: 2px 8px; border-radius: 6px; font-weight: 600; }

  .pdm-stock-bar-wrap { height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
  .pdm-stock-bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .pdm-stock-labels { display: flex; justify-content: space-between; font-size: 0.72rem; color: #6b7280; }

  .pdm-description { font-size: 0.85rem; color: #4b5563; line-height: 1.6; margin: 0; }

  .pdm-specs { background: #f9fafb; border-radius: 10px; overflow: hidden; border: 1px solid #f3f4f6; }
  .pdm-spec-row { display: flex; padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
  .pdm-spec-row:last-child { border-bottom: none; }
  .pdm-spec-key { width: 40%; font-size: 0.78rem; color: #6b7280; font-weight: 600; }
  .pdm-spec-val { flex: 1; font-size: 0.78rem; color: #1e293b; font-weight: 500; }

  .pdm-footer { display: flex; justify-content: flex-end; padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; }
  .pdm-btn-close { padding: 0.5rem 1.25rem; border-radius: 8px; background: #F97316; color: #fff; font-weight: 600; font-size: 0.82rem; border: none; cursor: pointer; font-family: inherit; }
  .pdm-btn-close:hover { background: #ea580c; }

  @media (max-width: 540px) { .pdm-kpi-row { grid-template-columns: 1fr; } .pdm-info-grid { grid-template-columns: 1fr; } }
`;
