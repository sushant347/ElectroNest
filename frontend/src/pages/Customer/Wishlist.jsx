import { Link, useNavigate } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  X,
  Star,
  SlidersHorizontal,
  ArrowUpDown,
  Trash2,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";

/* ── toast replacement ───────────────────────────────────── */
const toast = ({ title, description }) => console.info(`${title}: ${description}`);

/* ── data ────────────────────────────────────────────────── */

const formatPrice = (price) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(price);

/* ── star rating ─────────────────────────────────────────── */
function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1 mt-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          fill={star <= Math.floor(rating) ? "#F97316" : star - 0.5 <= rating ? "#fdba74" : "none"}
          stroke={star <= rating ? "#F97316" : "#cbd5e1"}
          strokeWidth={1.5}
        />
      ))}
      <span className="ml-1.5 text-xs font-medium text-slate-500">{rating}</span>
    </div>
  );
}

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
  /* filters */
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 32,
    padding: "14px 20px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  catBtn: (active) => ({
    padding: "6px 16px",
    borderRadius: 999,
    border: active ? "none" : "1px solid #e2e8f0",
    background: active ? "#F97316" : "#f8fafc",
    color: active ? "#fff" : "#64748b",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all .2s",
  }),
  sortSelect: {
    height: 34,
    width: 170,
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    padding: "0 10px",
    fontSize: 12,
    color: "#334155",
    cursor: "pointer",
    outline: "none",
  },
  /* grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
    gap: 24,
  },
  /* card */
  card: {
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    transition: "transform .25s, box-shadow .25s",
    cursor: "default",
  },
  cardHover: {
    transform: "translateY(-4px)",
    boxShadow: "0 12px 32px rgba(249,115,22,0.12)",
  },
  imgWrap: {
    position: "relative",
    overflow: "hidden",
    background: "#f8fafc",
    height: 210,
    width: "calc(100% - 18px)",
    margin: "10px auto 0",
    borderRadius: 10,
    flexShrink: 0,
  },
  img: {
    display: "block",
    width: "100%",
    height: "100%",
    objectFit: "contain",
    background: "#fff",
    transition: "transform .45s",
  },
  catBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(6px)",
    border: "1px solid #fed7aa",
    borderRadius: 999,
    padding: "3px 12px",
    fontSize: 11,
    fontWeight: 600,
    color: "#F97316",
  },
  dateBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(6px)",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "2px 10px",
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: 500,
  },
  removeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    border: "1px solid #fecaca",
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(6px)",
    color: "#ef4444",
    cursor: "pointer",
    transition: "all .2s",
  },
  cardBody: {
    padding: "18px 20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  productName: {
    fontSize: 17,
    fontWeight: 700,
    color: "#1e293b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  price: {
    fontSize: 24,
    fontWeight: 800,
    color: "#F97316",
    marginTop: 6,
  },
  stock: (inStock) => ({
    fontSize: 12,
    fontWeight: 600,
    color: inStock ? "#16a34a" : "#ef4444",
    marginTop: 2,
  }),
  btnRow: {
    display: "flex",
    gap: 10,
    marginTop: 16,
  },
  addCartBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 0",
    borderRadius: 10,
    border: "none",
    background: "#F97316",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s",
  },
  buyNowBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "10px 0",
    borderRadius: 10,
    border: "1.5px solid #fdba74",
    background: "transparent",
    color: "#F97316",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s",
  },
  /* progress */
  progressOuter: {
    marginTop: 28,
    padding: "16px 20px",
    background: "#fff7ed",
    borderRadius: 12,
    border: "1px solid #fed7aa",
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    background: "#fed7aa",
    overflow: "hidden",
    marginTop: 8,
  },
  progressFill: (pct) => ({
    height: "100%",
    width: `${pct}%`,
    background: "#F97316",
    borderRadius: 999,
    transition: "width .35s ease",
  }),
  /* footer summary */
  footer: {
    marginTop: 36,
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "20px 24px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  },
  footerStat: {
    fontSize: 14,
    color: "#64748b",
  },
  footerValue: {
    fontWeight: 700,
    color: "#F97316",
  },
  moveAllBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 18px",
    borderRadius: 10,
    border: "1.5px solid #fdba74",
    background: "transparent",
    color: "#F97316",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s",
  },
  clearBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "9px 18px",
    borderRadius: 10,
    border: "1.5px solid #fecaca",
    background: "transparent",
    color: "#ef4444",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background .2s",
  },
  /* empty */
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
  /* no‑match */
  noMatch: {
    marginTop: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
  },
};

/* ── component ───────────────────────────────────────────── */
const Wishlist = ({ items = [], removeFromWishlist, addToCart, clearWishlist, moveAllToCart, buyNowFromWishlist }) => {
  const navigate = useNavigate();
  const [removingId, setRemovingId] = useState(null);
  const [addingToCartId, setAddingToCartId] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState("date");
  const [moveAllProgress, setMoveAllProgress] = useState(null);
  const [clearingProgress, setClearingProgress] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  const filtered = useMemo(() => {
    const result = activeCategory === "All" ? items : items.filter((i) => i.category === activeCategory);
    switch (sortBy) {
      case "price-asc":
        return [...result].sort((a, b) => a.price - b.price);
      case "price-desc":
        return [...result].sort((a, b) => b.price - a.price);
      case "name":
        return [...result].sort((a, b) => a.name.localeCompare(b.name));
      default:
        return [...result].sort((a, b) => a.addedDaysAgo - b.addedDaysAgo);
    }
  }, [items, activeCategory, sortBy]);

  const totalValue = items.reduce((sum, i) => sum + i.price, 0);

  const handleRemove = useCallback((id, name) => {
    setRemovingId(id);
    setTimeout(() => {
      removeFromWishlist(id);
      setRemovingId(null);
      toast({ title: "Removed", description: `${name} removed from wishlist.` });
    }, 350);
  }, []);

  const handleAddToCart = useCallback((id, name) => {
    setAddingToCartId(id);
    setTimeout(() => {
      setAddingToCartId(null);
      const item = items.find(i => i.id === id);
      addToCart(item);
      toast({ title: "Added to cart", description: `${name} added to your cart.` });
    }, 1200);
  }, []);

  const handleClearAll = useCallback(() => {
    setClearingProgress(0);
    const total = items.length || 1;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setClearingProgress(Math.round((step / total) * 100));
      if (step >= total) {
        clearInterval(interval);
        setTimeout(() => {
          setClearingProgress(null);
          clearWishlist();
          toast({ title: "Wishlist cleared", description: "All items removed." });
        }, 400);
      }
    }, 150);
  }, [items.length, clearWishlist]);

  const handleMoveAll = useCallback(() => {
    setMoveAllProgress(0);
    const total = items.length;
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setMoveAllProgress(Math.round((step / total) * 100));
      if (step >= total) {
        clearInterval(interval);
        setTimeout(() => {
          setMoveAllProgress(null);
          moveAllToCart();
          toast({ title: "All moved", description: `${total} items moved to cart.` });
        }, 400);
      }
    }, 200);
  }, [items.length, moveAllToCart]);

  /* ── render ──────────────────────────────────────────── */
  return (
    <section style={styles.page}>
      <style>{`
        .wl-img-wrap { height: 210px; }
        @media (max-width: 768px) { .wl-img-wrap { height: 180px; } }
      `}</style>
      <div style={styles.container}>
        {/* ── Header ─────────────────────────────────────── */}
        <div style={styles.headerWrap}>
          <div>
            <span style={styles.pill}>
              <Heart size={13} /> Saved For Later
            </span>
            <h1 style={styles.title}>My Wishlist</h1>
            <p style={styles.subtitle}>
              {items.length > 0
                ? "Premium picks you love — add them to cart whenever you're ready."
                : "Your saved items will appear here."}
            </p>
          </div>
        </div>

        {/* ── Filters & Sort ─────────────────────────────── */}
        {items.length > 0 && (
          <div style={styles.filterBar}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              <SlidersHorizontal size={15} color="#94a3b8" />
              {["All", ...new Set(items.map(i => i.category).filter(Boolean))].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={styles.catBtn(activeCategory === cat)}
                  onMouseEnter={(e) => {
                    if (activeCategory !== cat) e.currentTarget.style.borderColor = "#fdba74";
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategory !== cat) e.currentTarget.style.borderColor = "#e2e8f0";
                  }}
                >
                  {cat}
                </button>
              ))}
              {activeCategory !== "All" && (
                <button
                  onClick={() => setActiveCategory("All")}
                  style={{ background: "none", border: "none", color: "#F97316", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowUpDown size={14} color="#94a3b8" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={styles.sortSelect}
              >
                <option value="date">Recently Added</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="name">Name A–Z</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────── */}
        {items.length === 0 ? (
          <div style={styles.emptyWrap}>
            <Heart size={52} color="#F97316" strokeWidth={1.5} />
            <h2 style={styles.emptyTitle}>Your wishlist is empty</h2>
            <p style={styles.emptyDesc}>Browse products and tap the heart icon to save them here.</p>
            <Link to="/">
              <button style={styles.emptyBtn}>
                <ShoppingBag size={16} /> Browse Products
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Product grid ───────────────────────────── */}
            <div style={styles.grid}>
              {filtered.map((item) => {
                const isHovered = hoveredCard === item.id;
                const isRemoving = removingId === item.id;
                return (
                  <article
                    key={item.id}
                    style={{
                      ...styles.card,
                      ...(isHovered ? styles.cardHover : {}),
                      opacity: isRemoving ? 0.4 : 1,
                      pointerEvents: isRemoving ? "none" : "auto",
                    }}
                    onMouseEnter={() => setHoveredCard(item.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    {/* image */}
                    <div className="wl-img-wrap" style={styles.imgWrap}>
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        style={{ ...styles.img, transform: isHovered ? "scale(1.08)" : "scale(1)" }}
                      />
                      <span style={styles.catBadge}>{item.category}</span>
                      <span style={styles.dateBadge}>
                        Added {item.addedDaysAgo === 1 ? "yesterday" : `${item.addedDaysAgo}d ago`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id, item.name)}
                        style={styles.removeBtn}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#ef4444";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.85)";
                          e.currentTarget.style.color = "#ef4444";
                        }}
                        aria-label={`Remove ${item.name}`}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {/* info */}
                    <div style={styles.cardBody}>
                      <h3 style={styles.productName}>{item.name}</h3>
                      <StarRating rating={item.rating} />
                      <p style={styles.price}>{formatPrice(item.price)}</p>
                      <span style={styles.stock(item.inStock)}>
                        {item.inStock ? "● In Stock" : "● Out of Stock"}
                      </span>

                      <div style={styles.btnRow}>
                        <button
                          type="button"
                          style={{
                            ...styles.addCartBtn,
                            opacity: !item.inStock || addingToCartId === item.id ? 0.55 : 1,
                            cursor: !item.inStock || addingToCartId === item.id ? "not-allowed" : "pointer",
                          }}
                          disabled={!item.inStock || addingToCartId === item.id}
                          onClick={() => handleAddToCart(item.id, item.name)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#ea580c"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "#F97316"; }}
                        >
                          {addingToCartId === item.id ? (
                            <><Loader2 size={14} className="animate-spin" /> Adding…</>
                          ) : (
                            <><ShoppingCart size={14} /> Add to Cart</>
                          )}
                        </button>
                        <button
                          type="button"
                          style={styles.buyNowBtn}
                          onClick={() => {
                            if (typeof buyNowFromWishlist === "function") {
                              buyNowFromWishlist(item);
                            } else {
                              addToCart(item);
                            }
                            navigate("/checkout");
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fff7ed"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* no-match */}
            {filtered.length === 0 && items.length > 0 && (
              <div style={styles.noMatch}>
                <p>No items match the selected filter.</p>
                <button
                  onClick={() => setActiveCategory("All")}
                  style={{ background: "none", border: "none", color: "#F97316", cursor: "pointer", fontWeight: 600, marginTop: 8 }}
                >
                  Show all items
                </button>
              </div>
            )}

            {/* move-all progress bar (orange) */}
            {moveAllProgress !== null && (
              <div style={styles.progressOuter}>
                <span style={{ fontSize: 13, color: "#F97316", fontWeight: 600 }}>
                  Moving items to cart… {moveAllProgress}%
                </span>
                <div style={styles.progressTrack}>
                  <div style={styles.progressFill(moveAllProgress)} />
                </div>
              </div>
            )}

            {/* clear progress bar (red) */}
            {clearingProgress !== null && (
              <div style={{ ...styles.progressOuter, background: "#fef2f2", border: "1px solid #fecaca" }}>
                <span style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>
                  Clearing wishlist… {clearingProgress}%
                </span>
                <div style={{ ...styles.progressTrack, background: "#fecaca" }}>
                  <div style={{ ...styles.progressFill(clearingProgress), background: "#ef4444" }} />
                </div>
              </div>
            )}

            {/* ── Summary footer ─────────────────────────── */}
            <div style={styles.footer}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <span style={styles.footerStat}>
                  <strong style={{ color: "#1e293b" }}>{items.length}</strong> items saved
                </span>
                <span style={styles.footerStat}>
                  Total value: <strong style={styles.footerValue}>{formatPrice(totalValue)}</strong>
                </span>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  style={styles.moveAllBtn}
                  onClick={handleMoveAll}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fff7ed"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <ShoppingCart size={14} /> Move All to Cart
                </button>
                <button
                  type="button"
                  style={styles.clearBtn}
                  onClick={handleClearAll}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#fef2f2"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <Trash2 size={14} /> Clear Wishlist
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default Wishlist;
