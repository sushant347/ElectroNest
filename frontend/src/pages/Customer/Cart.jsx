import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  CreditCard,
  ShieldCheck,
  Truck,
  Check
} from "lucide-react";
import { useState, useEffect } from "react";

/* ── toast replacement ───────────────────────────────────── */
const toast = ({ title, description }) => console.info(`${title}: ${description}`);

/* ── data ────────────────────────────────────────────────── */
const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(price);

/* ── styles ──────────────────────────────────────────────── */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #fff7ed 0%, #ffffff 35%)",
    padding: "48px 24px 64px",
    overflowX: "hidden",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    width: "100%",
  },

  
  /* header */
  headerWrap: {
    marginBottom: 32,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
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
  clearCartBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    border: "1px solid #fecaca",
    color: "#ef4444",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
    height: "fit-content",
    alignSelf: "flex-end",
  },
  /* layout */
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 380px",
    gap: 32,
    alignItems: "start",
  },
  /* cart items */
  itemsList: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cartItem: {
    display: "flex",
    gap: 20,
    padding: 20,
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    transition: "transform .2s, box-shadow .2s",
  },
  itemImg: {
    width: 100,
    height: 100,
    borderRadius: 12,
    objectFit: "cover",
    background: "#f1f5f9",
  },
  itemInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  itemSelectWrap: {
    display: "flex",
    alignItems: "flex-start",
    marginRight: 4,
  },
  itemSelectBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "2px solid #cbd5e1",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all .2s",
    marginTop: 4,
  },
  itemCat: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#94a3b8",
    letterSpacing: "0.05em",
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#1e293b",
    textDecoration: "none",
    marginBottom: 4,
    display: "block",
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 700,
    color: "#F97316",
  },
  itemActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  qtyWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "#f8fafc",
    padding: "4px 6px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
  },
  qtyBtn: {
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    cursor: "pointer",
    color: "#334155",
    transition: "all .2s",
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: 600,
    color: "#1e293b",
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "transparent",
    border: "none",
    color: "#ef4444",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    padding: "6px 10px",
    borderRadius: 8,
    transition: "background .2s",
  },
  /* summary sidebar */
  summaryCard: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
    position: "sticky",
    top: 100,
    width: "100%",
    boxSizing: "border-box",
    minWidth: 0,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1e293b",
    marginBottom: 20,
  },
  selectedPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    borderRadius: 999,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#F97316",
    marginBottom: 14,
  },
  selectAllBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 8,
    color: "#334155",
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
    fontSize: 14,
    color: "#64748b",
    minWidth: 0,
  },
  summaryVal: {
    fontWeight: 600,
    color: "#1e293b",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  divider: {
    height: 1,
    background: "#e2e8f0",
    margin: "20px 0",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 24,
    minWidth: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: "#1e293b",
    flexShrink: 1,
    minWidth: 0,
  },
  totalVal: {
    fontSize: 20,
    fontWeight: 800,
    color: "#F97316",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  checkoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px",
    background: "#dc7023",
    color: "#ffffff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(249,115,22,0.25)",
    transition: "background .2s, transform .1s",
  },
  checkoutBtnDisabled: {
    background: "#ed871b",
    color: "#ffffff",
    cursor: "not-allowed",
    boxShadow: "none",
  },
  features: {
    marginTop: 24,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 13,
    color: "#64748b",
  },
  /* empty state */
  emptyWrap: {
    textAlign: "center",
    padding: "80px 24px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 24,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  emptyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
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
};

/* ── component ───────────────────────────────────────────── */
const Cart = ({ cartItems = [], updateCartQuantity, removeFromCart, clearCart, checkoutSelection = [], setCheckoutItems }) => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState(
    checkoutSelection.length > 0 ? checkoutSelection : cartItems.map((item) => item.id)
  );

  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = prev.filter((id) => cartItems.some((item) => item.id === id));
      if (validIds.length === 0 && cartItems.length > 0) {
        return cartItems.map((item) => item.id);
      }
      return validIds;
    });
  }, [cartItems]);

  useEffect(() => {
    if (checkoutSelection.length > 0) {
      const valid = checkoutSelection.filter((id) => cartItems.some((item) => item.id === id));
      if (valid.length > 0) setSelectedIds(valid);
    }
  }, [checkoutSelection, cartItems]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(cartItems.map((item) => item.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const selectedItems = cartItems.filter((item) => selectedIds.includes(item.id));
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const total = subtotal;
  const isCheckoutDisabled = selectedIds.length === 0;

  const handleProceedCheckout = () => {
    if (selectedIds.length === 0) {
      toast({ title: "Select products", description: "Please select at least one product for checkout." });
      return;
    }
    if (typeof setCheckoutItems === "function") {
      setCheckoutItems(selectedIds);
    }
    navigate("/checkout");
  };

  return (
    <section style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.headerWrap}>
          <div>
            <h1 style={styles.title}>Your Cart</h1>
            <p style={styles.subtitle}>
              {cartItems.length > 0
                ? `You have ${totalItems} items in your cart ready for checkout.`
                : "Your cart is Feeling Lonely."}
            </p>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div style={styles.emptyWrap}>
            <ShoppingBag size={64} color="#F97316" strokeWidth={1.5} style={{ opacity: 0.8 }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#1e293b", marginTop: 20 }}>
              Your cart is Feeling Lonely
            </h2>
            <p style={{ color: "#64748b", marginTop: 8 }}>
              Looks like you haven't added anything yet.
            </p>
            <Link to="/">
              <button style={styles.emptyBtn}>
                <ArrowRight size={18} /> Start Shopping
              </button>
            </Link>
          </div>
        ) : (
          <div style={styles.contentGrid} className="cart-grid">
            {/* Items List */}
            <div style={styles.itemsList}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={clearCart}
                  style={styles.clearCartBtn}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fe5555";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "#fe5555";
                  }}
                >
                  <Trash2 size={16} /> Clear Cart
                </button>
                <button
                  onClick={selectedIds.length === cartItems.length ? clearSelection : selectAll}
                  style={styles.selectAllBtn}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#F97316")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                >
                  {selectedIds.length === cartItems.length ? "Unselect All" : "Select All"}
                </button>
              </div>
              {cartItems.map((item) => (
                <div key={item.id} style={styles.cartItem}>
                  <div style={styles.itemSelectWrap}>
                    <button
                      onClick={() => toggleSelect(item.id)}
                      style={{
                        ...styles.itemSelectBtn,
                        borderColor: selectedIds.includes(item.id) ? "#F97316" : "#cbd5e1",
                        background: selectedIds.includes(item.id) ? "#fff7ed" : "#fff",
                      }}
                      title={selectedIds.includes(item.id) ? "Selected for checkout" : "Select for checkout"}
                    >
                      {selectedIds.includes(item.id) && <Check size={14} color="#F97316" />}
                    </button>
                  </div>
                  <Link to={`/product/${item.id}`}>
                    <img src={item.image} alt={item.name} style={styles.itemImg} />
                  </Link>
                  <div style={styles.itemInfo}>
                    <div>
                      <span style={styles.itemCat}>{item.category}</span>
                      <Link to={`/product/${item.id}`} style={styles.itemName}>
                        {item.name}
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={styles.itemPrice}>{formatPrice(item.price)}</span>
                        {item.onSale && item.origPrice && (
                          <span style={{ fontSize: 13, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 500 }}>{formatPrice(item.origPrice)}</span>
                        )}
                        {item.onSale && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: '#fff7ed', color: '#F97316', border: '1px solid #fed7aa', borderRadius: 4, padding: '1px 6px' }}>SALE</span>
                        )}
                      </div>
                    </div>
                    <div style={styles.itemActions}>
                      <div style={styles.qtyWrap}>
                        <button
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          style={styles.qtyBtn}
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={styles.qtyVal}>{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.id, Math.min(6, item.quantity + 1))}
                          style={{ ...styles.qtyBtn, ...(item.quantity >= 6 ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
                          disabled={item.quantity >= 6}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      {item.quantity >= 6 && (
                        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>Max 6 per order</span>
                      )}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={styles.removeBtn}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Sidebar */}
            <div style={styles.summaryCard}>
              <h3 style={styles.summaryTitle}>Order Summary</h3>
              <div style={styles.selectedPill}>Selected: {selectedItems.length} / {cartItems.length} products</div>
              <div style={styles.summaryRow}>
                <span>Subtotal</span>
                <span style={styles.summaryVal}>{formatPrice(subtotal)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Shipping</span>
                <span style={{ ...styles.summaryVal, color: "#64748b", fontSize: 12 }}>Calculated at checkout</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.totalRow}>
                <span style={styles.totalLabel}>Order Total</span>
                <span style={styles.totalVal}>{formatPrice(total)}</span>
              </div>
              <button
                style={{
                  ...styles.checkoutBtn,
                  ...(isCheckoutDisabled ? styles.checkoutBtnDisabled : {}),
                }}
                onMouseEnter={(e) => {
                  if (!isCheckoutDisabled) e.currentTarget.style.background = "#ea580c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCheckoutDisabled ? styles.checkoutBtnDisabled.background : styles.checkoutBtn.background;
                }}
                onClick={handleProceedCheckout}
                disabled={isCheckoutDisabled}
              >
                Checkout {selectedIds.length > 0 ? `(${selectedIds.length})` : ""} <ArrowRight size={18} />
              </button>

              <div style={styles.features}>
                <div style={styles.featureItem}>
                  <ShieldCheck size={16} color="#16a34a" />
                  <span>Secure SSL Encryption</span>
                </div>
                <div style={styles.featureItem}>
                  <Truck size={16} color="#F97316" />
                  <span>Nepal: Rs.200 · India: Rs.3500 delivery</span>
                </div>
                <div style={styles.featureItem}>
                  <CreditCard size={16} color="#64748b" />
                  <span>All major cards accepted</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        @media (max-width: 900px) {
          .cart-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .cart-grid > div > div > div {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .cart-grid img {
            width: 80px !important;
            height: 80px !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Cart;
