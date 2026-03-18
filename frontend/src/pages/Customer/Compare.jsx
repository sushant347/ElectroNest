import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Scale,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Star,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const toast = ({ title, description }) => console.info(`${title}: `);

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(price);

function StarRating({ rating }) {
  const safeRating = Number(rating || 0);
  return (
    <div className="flex items-center gap-1 justify-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          fill={star <= Math.floor(safeRating) ? "#F97316" : star - 0.5 <= safeRating ? "#fdba74" : "none"}
          stroke={star <= safeRating ? "#F97316" : "#cbd5e1"}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1.5 text-xs font-medium text-slate-500">{safeRating.toFixed(1)}</span>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 35%)",
    padding: "48px 24px 64px",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  headerWrap: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 40,
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 999,
    padding: "4px 14px",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#F97316",
    marginBottom: 8,
  },
  title: {
    fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
    fontWeight: 800,
    color: "#1e293b",
    lineHeight: 1.15,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: "#64748b",
  },
  emptyWrap: {
    textAlign: "center",
    padding: "80px 24px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#1e293b",
    marginTop: 16,
  },
  emptyDesc: {
    marginTop: 8,
    fontSize: 15,
    color: "#64748b",
  },
  emptyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    padding: "12px 28px",
    borderRadius: 12,
    border: "none",
    background: "#F97316",
    color: "#fff",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
  },
  tableContainer: {
    overflowX: "auto",
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 800,
  },
  th: {
    padding: "20px",
    textAlign: "left",
    color: "#64748b",
    fontWeight: 600,
    fontSize: 14,
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
    width: "200px",
  },
  td: {
    padding: "20px",
    textAlign: "center",
    borderBottom: "1px solid #e2e8f0",
    borderLeft: "1px solid #f1f5f9",
    verticalAlign: "top",
    width: "calc((100% - 200px) / 3)",
  },
  productImg: {
    width: 120,
    height: 120,
    objectFit: "cover",
    borderRadius: 12,
    marginBottom: 16,
    background: "#f1f5f9",
  },
  productName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 1.4,
  },
  removeBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    border: "1px solid #fecaca",
    background: "transparent",
    color: "#ef4444",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
    transition: "all .2s",
  },
  addToCartBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: "#F97316",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 16,
    transition: "background .2s",
    width: "100%",
    justifyContent: "center",
  },
  price: {
    fontSize: 18,
    fontWeight: 700,
    color: "#F97316",
  },
  value: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: 500,
  },
  stockBadge: (inStock) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    background: inStock ? "#f0fdf4" : "#fef2f2",
    color: inStock ? "#16a34a" : "#ef4444",
    border: `1px solid ${inStock ? "#bbf7d0" : "#fecaca"}`,
  }),
};

const Compare = ({ items = [], removeFromCompare, addToCart }) => {
  const [showSpecs, setShowSpecs] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const specsRef = useRef(null);

  const toggleSpecs = () => {
    setShowSpecs((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => {
          specsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
      return next;
    });
  };

  const parseSpecs = (item) => {
    if (!item.specifications) return {};
    try {
      const parsed = JSON.parse(item.specifications);
      const flat = {};
      const flatten = (obj, prefix = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const label = prefix ? `${prefix} - ${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            flatten(value, label);
          } else {
            flat[label] = Array.isArray(value) ? value.join(', ') : String(value);
          }
        }
      };
      if (typeof parsed === 'object' && parsed !== null) flatten(parsed);
      return flat;
    } catch {
      // Not JSON — parse pipe-delimited format: "Key: Value | Key: Value | ..."
      const flat = {};
      const parts = item.specifications.split('|').map(s => s.trim()).filter(Boolean);
      parts.forEach(part => {
        const colonIdx = part.indexOf(':');
        if (colonIdx > 0) {
          flat[part.substring(0, colonIdx).trim()] = part.substring(colonIdx + 1).trim();
        } else {
          flat['Info'] = part;
        }
      });
      return flat;
    }
  };

  // Collect all unique spec keys across all items
  const allSpecKeys = [...new Set(items.flatMap((item) => Object.keys(parseSpecs(item))))];

  const handleRemove = (id, name) => {
    removeFromCompare(id);
    toast({ title: "Removed", description: ` removed from comparison.` });
  };

  const handleAddToCart = (item) => {
    addToCart(item);
    toast({ title: "Added to cart", description: `${item.name} added to your cart.` });
  };

  return (
    <section className="cmp-page" style={styles.page}>
      <style>{`
        /* ── Desktop / Tablet ── */
        @media (max-width: 900px) {
          .cmp-page { padding: 28px 16px 48px !important; }
          .cmp-table { min-width: unset !important; }
          .cmp-table th { width: 100px !important; padding: 14px 10px !important; font-size: 13px !important; }
          .cmp-table td { padding: 14px 10px !important; }
          .cmp-table img { width: 90px !important; height: 90px !important; margin-bottom: 10px !important; }
        }

        /* ── Sidebar toggle button (mobile only) ── */
        .cmp-sidebar-btn-wrap { display: none; }
        @media (max-width: 640px) {
          .cmp-sidebar-btn-wrap {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
          }
          .cmp-sidebar-toggle-btn {
            display: flex;
            align-items: center;
            gap: 5px;
            background: #fff;
            border: 1.5px solid #e2e8f0;
            border-radius: 20px;
            padding: 5px 12px;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            font-family: inherit;
            transition: border-color 0.15s, color 0.15s;
          }
          .cmp-sidebar-toggle-btn:hover { border-color: #F97316; color: #F97316; }
        }

        /* ── Mobile table layout ── */
        @media (max-width: 640px) {
          /* hide empty "Add Product" placeholder columns */
          .cmp-empty-col { display: none !important; }

          .cmp-page { padding: 16px 10px 32px !important; }
          .cmp-table-container { overflow-x: auto !important; border-radius: 12px !important; -webkit-overflow-scrolling: touch; }
          .cmp-table {
            min-width: unset !important;
            width: 100% !important;
            table-layout: auto !important;
            /* Override global white-space:nowrap from index.css */
            white-space: normal !important;
          }

          /* Override global white-space:nowrap on all cells */
          .cmp-table th,
          .cmp-table td {
            white-space: normal !important;
          }

          /* ── Sidebar label column — narrow, text wraps to 2 lines ── */
          .cmp-table th {
            width: 68px !important;
            min-width: 68px !important;
            max-width: 68px !important;
            padding: 10px 5px !important;
            font-size: 10px !important;
            word-break: break-word !important;
            text-align: center !important;
            line-height: 1.3 !important;
            vertical-align: middle !important;
          }

          /* ── Product columns: 2 products fit without scroll ──
               68 (label) + 2 × 136 (products) = 340px — fits 360px phones   ── */
          .cmp-table td {
            min-width: 136px !important;
            padding: 10px 6px !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
          }

          /* ── Product name: clamp to 2 lines, never overflow ── */
          .cmp-table h3 {
            font-size: 11px !important;
            line-height: 1.3 !important;
            margin-bottom: 4px !important;
            white-space: normal !important;
            overflow: hidden !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 2 !important;
            -webkit-box-orient: vertical !important;
            word-break: break-word !important;
            max-width: 100% !important;
          }

          /* ── When sidebar is hidden: products fill the full width ── */
          .cmp-table-container[data-sidebar='hide'] .cmp-table th {
            display: none !important;
          }
          .cmp-table-container[data-sidebar='hide'] .cmp-table td {
            min-width: 46vw !important;
          }

          .cmp-table img { width: 72px !important; height: 72px !important; margin-bottom: 8px !important; border-radius: 8px !important; }
          .cmp-table button { font-size: 10px !important; padding: 5px 8px !important; }
          .cmp-table span { font-size: 11px !important; white-space: normal !important; }
          .cmp-header { margin-bottom: 20px !important; }
        }

        @media (max-width: 380px) {
          .cmp-table th { width: 58px !important; min-width: 58px !important; max-width: 58px !important; padding: 8px 4px !important; font-size: 9px !important; }
          .cmp-table td { min-width: 120px !important; padding: 8px 4px !important; }
          .cmp-table img { width: 56px !important; height: 56px !important; }
          .cmp-table h3 { font-size: 10px !important; }
          .cmp-table span { font-size: 10px !important; }
        }
      `}</style>
      <div style={styles.container}>
        <div className="cmp-header" style={styles.headerWrap}>
          <div>
            <span style={styles.pill}>
              <Scale size={13} /> Compare Products
            </span>
            <h1 style={styles.title}>Product Comparison</h1>
            <p style={styles.subtitle}>
              {items.length > 0
                ? `Comparing ${items.length} product${items.length > 1 ? "s" : ""} side by side.`
                : "Add products to compare their features."}
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={styles.emptyWrap}>
            <Scale size={52} color="#F97316" strokeWidth={1.5} />
            <h2 style={styles.emptyTitle}>No products to compare</h2>
            <p style={styles.emptyDesc}>Browse products and tap the compare icon to add them here.</p>
            <Link to="/">
              <button style={styles.emptyBtn}>
                <ShoppingBag size={16} /> Browse Products
              </button>
            </Link>
          </div>
        ) : (
          <>
          {/* Mobile sidebar toggle — only visible on phones */}
          <div className="cmp-sidebar-btn-wrap">
            <button
              className="cmp-sidebar-toggle-btn"
              onClick={() => setSidebarVisible(v => !v)}
            >
              {sidebarVisible ? '✕ Hide Labels' : '☰ Show Labels'}
            </button>
          </div>
          <div className="cmp-table-container" style={styles.tableContainer} data-sidebar={sidebarVisible ? 'show' : 'hide'}>
            <table className="cmp-table" style={styles.table}>
              <tbody>
                {/* ── Product (always visible) ── */}
                <tr>
                  <th style={styles.th}>Product</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <img src={item.image} alt={item.name} style={styles.productImg} />
                        <h3 style={styles.productName}>{item.name}</h3>
                        <button
                          onClick={() => handleRemove(item.id, item.name)}
                          style={styles.removeBtn}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      </div>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => (
                    <td key={`empty-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}>
                      <Link to="/" style={{ textDecoration: 'none', display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", flexDirection: "column", gap: 10, minHeight: 140 }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Scale size={18} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>Add Product</span>
                      </Link>
                    </td>
                  ))}
                </tr>

                {/* ── Price (always visible) ── */}
                <tr>
                  <th style={styles.th}>Price</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <span style={styles.price}>{formatPrice(item.price)}</span>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`ep-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>

                {/* ── Category (always visible) ── */}
                <tr>
                  <th style={styles.th}>Category</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <span style={styles.value}>{item.category}</span>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`ec-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>

                {/* ── More Details Toggle ── */}
                <tr onClick={() => setShowMore(p => !p)} style={{ cursor: "pointer", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                  <th style={{ ...styles.th, background: "#f8fafc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#F97316", fontWeight: 700 }}>
                      {showMore ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      More
                    </div>
                  </th>
                  <td colSpan={items.length} style={{ ...styles.td, textAlign: "left", color: "#94a3b8", fontSize: 12, fontStyle: "italic", background: "#f8fafc" }}>
                    {showMore ? "Hide rating, availability & specs" : "Rating, availability & specs"}
                  </td>
                </tr>

                {/* ── Collapsible: Rating, Availability, Warranty, Specs ── */}
                {showMore && (
                  <>
                    <tr>
                      <th style={styles.th}>Rating</th>
                      {items.map((item) => (
                        <td key={item.id} style={styles.td}>
                          <StarRating rating={item.averageRating ?? item.rating ?? 0} />
                          <div style={{ marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                            ({Number(item.reviewCount ?? item.review_count ?? 0)} reviews)
                          </div>
                        </td>
                      ))}
                      {[...Array(3 - items.length)].map((_, i) => <td key={`er-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                    </tr>
                    <tr>
                      <th style={styles.th}>Availability</th>
                      {items.map((item) => (
                        <td key={item.id} style={styles.td}>
                          <span style={styles.stockBadge(item.inStock !== false)}>
                            {item.inStock !== false ? <Check size={12} /> : <AlertCircle size={12} />}
                            {item.inStock !== false ? "In Stock" : "Out of Stock"}
                          </span>
                        </td>
                      ))}
                      {[...Array(3 - items.length)].map((_, i) => <td key={`es-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                    </tr>
                    <tr>
                      <th style={styles.th}>Warranty</th>
                      {items.map((item) => (
                        <td key={item.id} style={styles.td}>
                          <span style={styles.value}>{item.warranty || "1 Year"}</span>
                        </td>
                      ))}
                      {[...Array(3 - items.length)].map((_, i) => <td key={`ew-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                    </tr>
                    <tr ref={specsRef} onClick={toggleSpecs} style={{ cursor: "pointer", background: showSpecs ? "#f8fafc" : "transparent" }}>
                      <th style={styles.th}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#F97316" }}>
                          Specs {showSpecs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </th>
                      <td colSpan={items.length} style={{ ...styles.td, textAlign: "left", color: "#64748b", fontStyle: "italic" }}>
                        {showSpecs ? "Hide specifications" : "Tap to view detailed specs"}
                      </td>
                    </tr>
                    {showSpecs && allSpecKeys.map((specKey) => (
                      <tr key={specKey}>
                        <th style={{ ...styles.th, paddingLeft: 28, fontSize: 12 }}>{specKey}</th>
                        {items.map((item) => (
                          <td key={item.id} style={styles.td}><span style={styles.value}>{parseSpecs(item)[specKey] || "-"}</span></td>
                        ))}
                        {[...Array(3 - items.length)].map((_, i) => <td key={`espec-${specKey}-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                      </tr>
                    ))}
                  </>
                )}

                {/* ── Action (always visible) ── */}
                <tr style={{ borderTop: "2px solid #f1f5f9" }}>
                  <th style={styles.th}>Action</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <button
                        onClick={() => handleAddToCart(item)}
                        style={styles.addToCartBtn}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#ea580c"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#F97316"; }}
                      >
                        <ShoppingCart size={16} /> Add to Cart
                      </button>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`ea-${i}`} className="cmp-empty-col" style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Compare;
