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
    <section style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerWrap}>
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
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <tbody>
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
                  {/* Fill empty columns if less than 3 */}
                  {[...Array(3 - items.length)].map((_, i) => (
                    <td key={`empty-${i}`} style={{ ...styles.td, background: "#e07b3c" }}>
                      <Link to="/" style={{ textDecoration: 'none', height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#cbd5e1", flexDirection: "column", gap: 10, minHeight: 200 }}>
                        <div style={{ width: 60, height: 60, borderRadius: "50%", border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Scale size={24} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>Add Product</span>
                      </Link>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th style={styles.th}>Price</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <span style={styles.price}>{formatPrice(item.price)}</span>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`empty-price-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>
                <tr>
                  <th style={styles.th}>Category</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <span style={styles.value}>{item.category}</span>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`empty-cat-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>
                <tr ref={specsRef} onClick={toggleSpecs} style={{ cursor: "pointer", background: showSpecs ? "#f8fafc" : "transparent" }}>
                  <th style={styles.th}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#F97316" }}>
                      Specification {showSpecs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  </th>
                  <td colSpan={3} style={{ ...styles.td, textAlign: "left", color: "#64748b", fontStyle: "italic" }}>
                    {showSpecs ? "Hide details" : "Click to view detailed specifications"}
                  </td>
                </tr>
                {showSpecs && allSpecKeys.map((specKey) => (
                  <tr key={specKey}>
                    <th style={{ ...styles.th, paddingLeft: 32, fontSize: 13 }}>{specKey}</th>
                    {items.map((item) => (
                      <td key={item.id} style={styles.td}><span style={styles.value}>{parseSpecs(item)[specKey] || "-"}</span></td>
                    ))}
                    {[...Array(3 - items.length)].map((_, i) => <td key={`empty-spec-${specKey}-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                  </tr>
                ))}
                <tr>
                  <th style={styles.th}>Rating</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <StarRating rating={item.averageRating ?? item.rating ?? 0} />
                      <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                        ({Number(item.reviewCount ?? item.review_count ?? 0)} reviews)
                      </div>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`empty-rating-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
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
                  {[...Array(3 - items.length)].map((_, i) => <td key={`empty-stock-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>
                <tr>
                  <th style={styles.th}>Warranty</th>
                  {items.map((item) => (
                    <td key={item.id} style={styles.td}>
                      <span style={styles.value}>{item.warranty || "1 Year"}</span>
                    </td>
                  ))}
                  {[...Array(3 - items.length)].map((_, i) => <td key={`empty-war-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>
                <tr>
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
                  {[...Array(3 - items.length)].map((_, i) => <td key={`empty-action-${i}`} style={{ ...styles.td, background: "#f8fafc" }}></td>)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default Compare;
