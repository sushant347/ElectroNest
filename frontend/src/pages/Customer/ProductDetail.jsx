import { useState, useEffect, useRef, useId } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Heart, Truck, ShieldCheck,
  RotateCcw, Package, Cpu, ChevronLeft, ChevronRight, Tag,
  Percent, Clock, Zap,
} from 'lucide-react';

import { customerAPI } from '../../services/api';
import { HeaderSkeleton, CardGridSkeleton, SkeletonText } from '../../components/Common/SkeletonLoader';

const formatPrice = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p);

const STAR_PTS = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";

function HalfStar({ size = 16, fill = 0, color = '#FBBF24' }) {
  const uid = useId();
  if (fill >= 1) return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points={STAR_PTS} fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (fill <= 0) return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points={STAR_PTS} fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <clipPath id={uid}><rect x="0" y="0" width="12" height="24" /></clipPath>
      </defs>
      <polygon points={STAR_PTS} fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={STAR_PTS} fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${uid})`} />
    </svg>
  );
}

function StarRow({ rating, size = 16, color = '#FBBF24' }) {
  return (
    <>
      {[1,2,3,4,5].map(n => {
        const fill = rating >= n ? 1 : rating >= n - 0.5 ? 0.5 : 0;
        return <HalfStar key={n} size={size} fill={fill} color={color} />;
      })}
    </>
  );
}

const normalize = (p) => {
  const selling = parseFloat(p.selling_price || 0);
  const disc = p.discount_price != null && p.discount_price !== '' ? parseFloat(p.discount_price) : null;
  const onSale = disc !== null && disc > 0 && disc < selling;
  return {
    id: p.id,
    name: p.name || p.ProductName || '',
    category: p.category_name || '',
    categoryId: p.category || p.CategoryID || null,
    price: onSale ? disc : selling,
    origPrice: onSale ? selling : null,
    onSale,
    image: p.image_url || '',
    rating: Number(p.average_rating ?? p.rating ?? 0),
    reviewCount: Number(p.review_count ?? 0),
    brand: p.brand || '',
    ownerName: p.owner_name || '',
    stock: p.stock || 0,
    description: p.description || '',
    specifications: p.specifications || '',
    sku: p.sku || '',
    reorderLevel: p.reorder_level || 10,
    unitsSold: p.units_sold || 0,
  };
};

const shouldFillContainerImage = (categoryName = '') => /laptop|camera|display|tablet/i.test(categoryName);

/* ── Coupon Carousel ─────────────────────────────────────────────── */
const PALETTE = [
  { left: '#F97316', right: '#ea580c', tag: '#fff7ed', tagText: '#c2410c' },
  { left: '#232F3E', right: '#1a2433', tag: '#f1f5f9', tagText: '#1e293b' },
  { left: '#0ea5e9', right: '#0284c7', tag: '#f0f9ff', tagText: '#0369a1' },
  { left: '#7c3aed', right: '#6d28d9', tag: '#faf5ff', tagText: '#6d28d9' },
];

function CouponCarousel({ coupons, storeName }) {
  const trackRef  = useRef(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(true);
  const [copied,   setCopied]   = useState(null);
  const [claimedSet, setClaimedSet] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('claimedCoupons') || '[]')); }
    catch { return new Set(); }
  });
  const [localDecrements, setLocalDecrements] = useState({});

  const scroll = (dir) => trackRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });

  const onScroll = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  // initialise scroll state
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanRight(el.scrollWidth > el.clientWidth + 4);
  }, [coupons]);

  const copy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const claim = (code) => {
    // Save for checkout auto-apply
    localStorage.setItem('claimedCouponCode', code);
    // Persist claimed set so button stays "Claimed" until used at checkout
    const next = new Set(claimedSet);
    next.add(code);
    setClaimedSet(next);
    localStorage.setItem('claimedCoupons', JSON.stringify([...next]));
    // Optimistic bar decrement
    setLocalDecrements(prev => ({ ...prev, [code]: true }));
  };

  if (!coupons?.length) return null;

  const now = new Date();
  const active = coupons.filter(c =>
    c.is_active &&
    new Date(c.valid_until) > now &&
    c.used_count < c.usage_limit &&
    (c.customer_used_count || 0) < (c.per_customer_limit || 1)
  );
  if (!active.length) return null;

  const showArrows = active.length > 1;

  return (
    <div style={cs.wrap}>
      <style>{couponCSS}</style>

      {/* Header */}
      <div style={cs.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={cs.headerIcon}><Zap size={15} color="#F97316" /></div>
          <div>
            <div style={cs.headerTitle}>
              {storeName ? `${storeName} — Exclusive Coupons` : 'Available Coupons'}
            </div>
            <div style={cs.headerSub}>Apply at checkout for instant savings</div>
          </div>
          <span style={cs.countPill}>{active.length} offer{active.length > 1 ? 's' : ''}</span>
        </div>
        {storeName && (
          <span style={cs.storeBadge}>
            🏪 {storeName}
          </span>
        )}
      </div>

      {/* Track wrapper — nav arrows sit on its sides */}
      <div style={{ position: 'relative' }}>
        {/* Left arrow */}
        {showArrows && canLeft && (
          <button onClick={() => scroll(-1)} className="cc-nav cc-nav-left" style={cs.navBtn}>
            <ChevronLeft size={18} />
          </button>
        )}
        {/* Right arrow */}
        {showArrows && canRight && (
          <button onClick={() => scroll(1)} className="cc-nav cc-nav-right" style={{ ...cs.navBtn, right: 0, left: 'auto' }}>
            <ChevronRight size={18} />
          </button>
        )}

        {/* Scrollable track */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          style={{ ...cs.track, paddingLeft: showArrows ? 36 : 0, paddingRight: showArrows ? 36 : 0 }}
          className="cc-track"
        >
          {active.map((c, i) => {
            const pal        = PALETTE[i % PALETTE.length];
            const expiresAt  = c.valid_until ? new Date(c.valid_until) : null;
            const hoursLeft  = expiresAt ? Math.ceil((expiresAt - now) / 3600000) : null;
            const daysLeft   = hoursLeft !== null ? Math.floor(hoursLeft / 24) : null;
            const isCopied       = copied === c.code;
            const isClaimed      = claimedSet.has(c.code);
            const customerUsed   = c.customer_used_count || 0;
            const perLimit       = c.per_customer_limit || 1;
            const isAlreadyUsed  = customerUsed >= perLimit;
            const discPct        = parseFloat(c.discount_percent) || 0;
            const freeOnly       = c.free_delivery && discPct === 0;
            const minAmt         = parseFloat(c.min_order_amount) || 0;

            return (
              <div
                key={c.id}
                className={`cc-card${hoursLeft !== null && hoursLeft <= 24 ? ' cc-urgent' : ''}`}
                style={{ ...cs.ticket, '--lc': pal.left, '--rc': pal.right }}
              >

                {/* LEFT stub */}
                <div style={cs.stub}>
                  {freeOnly ? (
                    <>
                      <div style={{ ...cs.stubPercent, fontSize: 18 }}>FREE</div>
                      <div style={cs.freeTag}>🚚 Delivery</div>
                    </>
                  ) : (
                    <>
                      <div style={cs.stubPercent}>{discPct}%</div>
                      <div style={cs.stubOff}>OFF</div>
                      {c.free_delivery && <div style={cs.freeTag}>+🚚 Free</div>}
                    </>
                  )}
                </div>

                {/* Perforated divider */}
                <div style={cs.perfWrap}>
                  <div style={{ ...cs.notch, top: -10 }} />
                  <div style={cs.dash} />
                  <div style={{ ...cs.notch, bottom: -10 }} />
                </div>

                {/* RIGHT body */}
                <div style={cs.body}>
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
                    {!freeOnly && (
                      <span style={{ ...cs.tag, background: pal.tag, color: pal.tagText }}>
                        <Percent size={9} /> {discPct}% OFF
                      </span>
                    )}
                    {c.free_delivery && (
                      <span style={{ ...cs.tag, background: '#f0fdf4', color: '#16a34a' }}>🚚 Free Delivery</span>
                    )}
                    {c.max_discount && !freeOnly && (
                      <span style={{ ...cs.tag, background: '#f8fafc', color: '#64748b' }}>
                        Max {formatPrice(c.max_discount)}
                      </span>
                    )}
                  </div>

                  {/* Code */}
                  <div style={cs.codeRow}>
                    <Tag size={12} color="#94a3b8" />
                    <span style={cs.codeText}>{c.code}</span>
                  </div>

                  {/* Min order */}
                  {minAmt > 0 && (
                    <div style={cs.minOrder}>
                      Min order: {formatPrice(minAmt)}
                    </div>
                  )}

                  {/* Remaining uses progress bar */}
                  {(() => {
                    const rawRemaining = c.usage_limit - c.used_count;
                    const remaining = Math.max(0, rawRemaining - (localDecrements[c.code] ? 1 : 0));
                    const pct = Math.max(0, Math.min(100, (remaining / c.usage_limit) * 100));
                    const urgency = remaining <= 5;
                    return (
                      <div style={{ marginTop: 5 }}>
                        {/* Pool bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontSize: 9, color: urgency ? '#ef4444' : '#94a3b8', fontWeight: urgency ? 700 : 400 }}>
                            {urgency ? `⚡ Only ${remaining} left!` : `${remaining} store uses left`}
                          </span>
                        </div>
                        <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: urgency ? '#ef4444' : pal.left, borderRadius: 2, transition: 'width .4s' }} />
                        </div>
                        {/* Per-customer usage indicator */}
                        {perLimit > 1 && (
                          <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 9, color: isAlreadyUsed ? '#ef4444' : '#94a3b8', fontWeight: isAlreadyUsed ? 700 : 400 }}>
                              Your uses: {customerUsed} / {perLimit}
                            </span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {Array.from({ length: perLimit }).map((_, idx) => (
                                <div key={idx} style={{
                                  width: 6, height: 6, borderRadius: '50%',
                                  background: idx < customerUsed ? '#ef4444' : '#e2e8f0',
                                  border: `1px solid ${idx < customerUsed ? '#ef4444' : '#cbd5e1'}`,
                                }} />
                              ))}
                            </div>
                          </div>
                        )}
                        {isAlreadyUsed && (
                          <div style={{ marginTop: 3, fontSize: 9, color: '#ef4444', fontWeight: 700 }}>
                            ✕ You've used this coupon {customerUsed}× (limit reached)
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Footer — expiry + Copy + Claim */}
                  <div style={cs.bodyFooter}>
                    {hoursLeft !== null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} color={hoursLeft <= 24 ? '#ef4444' : '#94a3b8'} />
                        <span style={{ fontSize: 10, color: hoursLeft <= 24 ? '#ef4444' : '#94a3b8', fontWeight: hoursLeft <= 24 ? 700 : 400 }}>
                          {hoursLeft <= 0 ? 'Expires soon' : hoursLeft < 24 ? `${hoursLeft}h left` : `${daysLeft}d left`}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
                      <button
                        onClick={() => copy(c.code)}
                        className="cc-copy"
                        style={{
                          ...cs.copyBtn,
                          background: isCopied ? '#dcfce7' : '#f8fafc',
                          color: isCopied ? '#16a34a' : '#64748b',
                          borderColor: isCopied ? '#86efac' : '#e2e8f0',
                        }}
                      >
                        {isCopied ? '✓ Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => !isClaimed && !isAlreadyUsed && claim(c.code)}
                        disabled={isClaimed || isAlreadyUsed}
                        className="cc-claim"
                        style={{
                          ...cs.copyBtn,
                          background: isAlreadyUsed ? '#f1f5f9' : isClaimed ? '#fff7ed' : pal.left,
                          color: isAlreadyUsed ? '#94a3b8' : isClaimed ? '#F97316' : '#fff',
                          borderColor: isAlreadyUsed ? '#e2e8f0' : isClaimed ? '#fed7aa' : pal.left,
                          fontWeight: 800,
                          cursor: (isClaimed || isAlreadyUsed) ? 'default' : 'pointer',
                          opacity: 1,
                        }}
                      >
                        {isAlreadyUsed ? '✕ Used' : isClaimed ? '✓ Claimed' : 'Claim'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll fades */}
      {canLeft  && <div style={{ ...cs.fade, left: 0,  background: 'linear-gradient(to right,  #fff7ed, transparent)' }} />}
      {canRight && <div style={{ ...cs.fade, right: 0, background: 'linear-gradient(to left, #fff7ed, transparent)' }} />}
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────── */
export default function ProductDetail({ addToCart, toggleWishlist, wishlistItems = [] }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const MAX_QTY = 6;
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const alsoRef = useRef(null);
  const [alsoIndex, setAlsoIndex] = useState(0);

  const scrollAlso = (dir) => {
    const el = alsoRef.current;
    if (!el || relatedProducts.length === 0) return;
    const n = relatedProducts.length;
    const newIdx = (alsoIndex + dir + n) % n;
    setAlsoIndex(newIdx);
    // Use actual rendered card width + gap for pixel-perfect positioning
    const firstCard = el.firstElementChild;
    const step = firstCard ? firstCard.offsetWidth + 16 : el.clientWidth / 4;
    el.scrollTo({ left: newIdx * step, behavior: 'smooth' });
  };

  useEffect(() => { setAlsoIndex(0); }, [relatedProducts]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setReviewsLoading(true);
      try {
        const [productRes, reviewsRes] = await Promise.all([
          customerAPI.getProduct(id),
          customerAPI.getReviews(id),
        ]);
        setProduct(normalize(productRes.data));
        setReviews(reviewsRes.data?.results || reviewsRes.data || []);
      } catch (err) {
        console.error('Failed to load product:', err);
        setProduct(null);
        setReviews([]);
      } finally {
        setLoading(false);
        setReviewsLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    // Pass ownerName so backend returns store-specific + platform-wide coupons.
    // Even if ownerName is empty, still fetch platform-wide coupons.
    customerAPI.getCoupons(product.ownerName || undefined)
      .then((res) => setCoupons(res.data?.results || res.data || []))
      .catch(() => setCoupons([]));
  }, [product?.id]);

  // Fetch same-category products for "You May Also Like" (least sold first)
  useEffect(() => {
    if (!product?.categoryId) return;
    customerAPI.getProducts({ category: product.categoryId, page_size: 20 })
      .then((res) => {
        const all = (res.data?.results || res.data || []).map(normalize);
        // Exclude the current product, sort by unitsSold ascending (least sold first)
        const filtered = all
          .filter((p) => p.id !== product.id)
          .sort((a, b) => a.unitsSold - b.unitsSold)
          .slice(0, 8);
        setRelatedProducts(filtered);
      })
      .catch(() => setRelatedProducts([]));
  }, [product?.id, product?.categoryId]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <HeaderSkeleton titleWidth={240} subtitleWidth={180} showAction={false} />
          <CardGridSkeleton cards={2} columns="repeat(auto-fit, minmax(260px, 1fr))" minHeight={320} />
          <div style={{ marginTop: 18 }}>
            <CardGridSkeleton cards={2} columns="1fr" minHeight={120} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={s.loaderWrap}>
        <Package size={48} style={{ color: '#cbd5e1', marginBottom: 16 }} />
        <h2 style={{ color: '#334155', marginBottom: 8 }}>Product Not Found</h2>
        <p style={{ color: '#64748b', marginBottom: 24 }}>The product you're looking for doesn't exist.</p>
        <Link to="/" style={s.backBtn}><ArrowLeft size={16} /> Back to Home</Link>
      </div>
    );
  }

  const isInWishlist = wishlistItems.some(i => i.id === product.id);
  const fillMainImage = shouldFillContainerImage(product.category);

  // Parse specifications — supports JSON objects or pipe-delimited plain text
  let specEntries = [];
  if (product.specifications) {
    try {
      const parsed = JSON.parse(product.specifications);
      const flatten = (obj, prefix = '') => {
        const entries = [];
        for (const [key, value] of Object.entries(obj)) {
          const label = prefix ? `${prefix} - ${key}` : key;
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            entries.push(...flatten(value, label));
          } else {
            entries.push({ icon: Cpu, label, value: Array.isArray(value) ? value.join(', ') : String(value) });
          }
        }
        return entries;
      };
      if (typeof parsed === 'object' && parsed !== null) {
        specEntries = flatten(parsed);
      }
    } catch {
      const parts = product.specifications.split('|').map(s => s.trim()).filter(Boolean);
      specEntries = parts.map(part => {
        const colonIdx = part.indexOf(':');
        if (colonIdx > 0) {
          return { icon: Cpu, label: part.substring(0, colonIdx).trim(), value: part.substring(colonIdx + 1).trim() };
        }
        return { icon: Cpu, label: 'Info', value: part };
      });
    }
  }

  return (
    <div style={s.page}>
      <div style={s.container}>

        <div style={s.grid} className="pd-grid">
          {/* Image */}
          <div style={s.imageCard} className="pd-image-card">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                style={{ ...s.img, objectFit: fillMainImage ? 'cover' : 'contain' }}
                loading="eager"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{ ...s.img, display: product.image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', background: '#F3F4F6', color: '#9CA3AF' }}>
              <Package size={64} />
            </div>
          </div>

          {/* Info */}
          <div style={s.infoCol}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {product.category && <span style={s.category}>{product.category}</span>}
              {product.brand && <span style={{ ...s.category, background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: 4 }}>{product.brand}</span>}
            </div>
            <h1 style={s.title}>{product.name}</h1>

            {product.ownerName && (
              <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
                Sold by: <strong style={{ color: '#F97316' }}>{product.ownerName}</strong>
              </p>
            )}

            {/* Rating */}
            <div style={s.ratingRow}>
              <StarRow rating={product.rating} size={16} />
              <span style={{ marginLeft: 8, fontSize: 14, color: '#64748b' }}>{product.rating} / 5</span>
              {product.unitsSold > 0 && <span style={{ marginLeft: 12, fontSize: 13, color: '#9CA3AF' }}>({product.unitsSold} sold)</span>}
            </div>

            {/* Price */}
            <div style={s.priceRow}>
              <span style={s.price}>{formatPrice(product.price)}</span>
              {product.onSale && product.origPrice && (
                <span style={{ fontSize: 16, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 500 }}>
                  {formatPrice(product.origPrice)}
                </span>
              )}
              {product.onSale && product.origPrice && (
                <span style={{ fontSize: 13, fontWeight: 700, background: '#fff7ed', color: '#F97316', border: '1px solid #fed7aa', borderRadius: 6, padding: '2px 8px' }}>
                  Save {formatPrice(product.origPrice - product.price)}
                </span>
              )}
            </div>

            {/* Stock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: product.stock > 0 ? '#16A34A' : '#EF4444' }}>
                {product.stock > 0 ? `✓ In Stock (${product.stock} units)` : '✕ Out of Stock'}
              </span>
              {product.sku && <span style={{ fontSize: 12, color: '#9CA3AF' }}>SKU: {product.sku}</span>}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <StarRow rating={product.rating} size={14} />
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                  {product.rating.toFixed(1)} ({product.reviewCount})
                </span>
              </div>
            </div>

            {product.description && <p style={s.desc}>{product.description}</p>}

            {/* Quantity + Actions */}
            <div style={s.actionsRow}>
              <div style={s.qtyWrap}>
                <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span style={s.qtyVal}>{qty}</span>
                <button style={{ ...s.qtyBtn, ...(qty >= MAX_QTY || qty >= product.stock ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={() => setQty(q => Math.min(Math.min(product.stock, MAX_QTY), q + 1))} disabled={qty >= MAX_QTY || qty >= product.stock}>+</button>
              </div>
              {qty >= MAX_QTY && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Max 6 per order</span>}
              <button style={{ ...s.cartBtn, ...(product.stock <= 0 ? { background: '#d1d5db', cursor: 'not-allowed' } : {}) }} onClick={() => { if (product.stock > 0) addToCart({ ...product, quantity: qty }); }} disabled={product.stock <= 0}>
                <ShoppingCart size={18} /> {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button style={{ ...s.wishBtn, ...(isInWishlist ? { background: '#fef2f2', borderColor: '#fecaca', color: '#ef4444' } : {}) }} onClick={() => toggleWishlist(product)}>
                <Heart size={18} fill={isInWishlist ? '#ef4444' : 'none'} />
              </button>
            </div>

            {/* Trust badges */}
            <div style={s.trustRow}>
              <div style={s.trustItem}><Truck size={16} style={{ color: '#16a34a' }} /><span>Delivery Available</span></div>
              <div style={s.trustItem}><ShieldCheck size={16} style={{ color: '#2563eb' }} /><span>Secure Payment</span></div>
              <div style={s.trustItem}><RotateCcw size={16} style={{ color: '#F97316' }} /><span>Easy Returns</span></div>
            </div>
          </div>
        </div>

        {/* ── Coupon Carousel (above specs) ── */}
        <CouponCarousel coupons={coupons} storeName={product.ownerName} />

        {/* Specs */}
        {specEntries.length > 0 && (
          <div style={s.specsCard}>
            <h2 style={s.specsTitle}>Specifications</h2>
            <div style={s.specsGrid}>
              {specEntries.map((sp, i) => (
                <div key={i} style={s.specItem}>
                  <div style={s.specIcon}><sp.icon size={20} /></div>
                  <div>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{sp.label}</div>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{sp.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={s.reviewsCard}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ ...s.specsTitle, margin: 0 }}>Customer Reviews</h2>
            {reviews.length > 3 && (
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>
                {reviews.length} reviews · scroll to see all
              </span>
            )}
          </div>
          {reviewsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <SkeletonText lines={3} lineHeight={12} lastWidth="70%" />
              <SkeletonText lines={2} lineHeight={12} lastWidth="55%" />
            </div>
          ) : reviews.length === 0 ? (
            <p style={{ color: '#64748b', margin: 0 }}>No reviews yet for this product.</p>
          ) : (
            <div className="reviews-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 340, overflowY: 'auto', paddingRight: 4 }}>
              {reviews.map((r) => (
                <div key={r.id} style={s.reviewRow}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <strong style={{ fontSize: 14, color: '#1e293b' }}>{r.customer_name || 'Customer'}</strong>
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleDateString('en-NP') : ''}
                    </span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <StarRow rating={Number(r.rating || 0)} size={14} />
                    <span style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>{Number(r.rating || 0).toFixed(1)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6 }}>{r.comment || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── You May Also Like ── */}
        {relatedProducts.length > 0 && (
          <div style={s.alsoLikeSection}>
            <h2 style={s.alsoLikeTitle}>You May Also Like</h2>
            <p style={s.alsoLikeSub}>Discover more from <strong>{product.category}</strong></p>
            <div style={{ position: 'relative' }}>
              <button onClick={() => scrollAlso(-1)} style={s.alsoArrowLeft}>
                <ChevronLeft size={20} />
              </button>
              <div style={s.alsoLikeGrid} className="also-grid" ref={alsoRef}>
                {relatedProducts.map((p) => (
                  <Link key={p.id} to={`/product/${p.id}`} style={s.alsoCard}>
                    <div style={s.alsoImgWrap}>
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{ ...s.alsoImg, objectFit: shouldFillContainerImage(p.category) ? 'cover' : 'contain' }}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{ ...s.alsoImg, display: p.image ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#9ca3af' }}>
                        <Package size={32} />
                      </div>
                    </div>
                    <div style={s.alsoBody}>
                      <span style={s.alsoBrand}>{p.brand}</span>
                      <h3 style={s.alsoName}>{p.name}</h3>
                      <div style={s.alsoRatingRow}>
                        <StarRow rating={p.rating} size={12} />
                        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 4 }}>{p.rating.toFixed(1)}</span>
                      </div>
                      <div style={s.alsoPriceRow}>
                        <span style={s.alsoPrice}>{formatPrice(p.price)}</span>
                        {p.stock > 0 ? (
                          <span style={{ fontSize: 10, color: '#16a34a', fontWeight: 600 }}>In Stock</span>
                        ) : (
                          <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600 }}>Out of Stock</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <button onClick={() => scrollAlso(1)} style={s.alsoArrowRight}>
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{spinnerCSS}</style>
    </div>
  );
}

/* ── Coupon styles ── */
const cs = {
  /* container */
  wrap: {
    position: 'relative',
    marginTop: 36,
    background: 'linear-gradient(135deg, #fff7ed 0%, #ffffff 60%)',
    border: '1.5px solid #fed7aa',
    borderRadius: 20,
    padding: '18px 20px 22px',
    boxShadow: '0 4px 24px rgba(249,115,22,0.10)',
    overflow: 'hidden',
  },
  /* header */
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  headerIcon: {
    width: 30, height: 30, borderRadius: 8,
    background: '#fff7ed', border: '1px solid #fed7aa',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  headerTitle: { fontSize: 14, fontWeight: 700, color: '#1e293b' },
  headerSub:   { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  countPill: {
    padding: '2px 8px', borderRadius: 999,
    background: '#F97316', color: '#fff',
    fontSize: 11, fontWeight: 700, marginLeft: 6,
  },
  storeBadge: {
    fontSize: 11, fontWeight: 600,
    color: '#92400e', background: '#fef3c7',
    border: '1px solid #fde68a',
    borderRadius: 6, padding: '3px 10px',
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
  },
  /* centered overlay nav arrow */
  navBtn: {
    position: 'absolute', top: '50%', left: 0,
    transform: 'translateY(-50%)',
    width: 30, height: 30, borderRadius: '50%',
    border: '1.5px solid #fed7aa',
    background: 'rgba(255,255,255,0.95)',
    boxShadow: '0 2px 8px rgba(249,115,22,0.18)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#F97316', zIndex: 5,
    transition: 'all .15s',
  },
  /* scrolling track */
  track: {
    display: 'flex', gap: 12, overflowX: 'auto',
    scrollbarWidth: 'none', msOverflowStyle: 'none',
    paddingBottom: 2,
  },
  /* ticket card */
  ticket: {
    flexShrink: 0,
    width: 290,
    display: 'flex',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
    transition: 'transform .2s, box-shadow .2s',
    background: 'linear-gradient(135deg, var(--lc) 0%, var(--rc) 100%)',
  },
  /* left stub */
  stub: {
    width: 72,
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '14px 6px',
    gap: 2,
  },
  stubPercent: {
    fontSize: 26, fontWeight: 900, color: '#fff',
    lineHeight: 1, letterSpacing: '-0.02em',
  },
  stubOff: {
    fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.85)',
    letterSpacing: '0.12em',
  },
  freeTag: {
    marginTop: 6, fontSize: 8, fontWeight: 700,
    color: '#fff', background: 'rgba(255,255,255,0.2)',
    borderRadius: 4, padding: '2px 5px', textAlign: 'center',
    letterSpacing: '0.04em',
  },
  /* perforated divider */
  perfWrap: {
    width: 1, flexShrink: 0, position: 'relative',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  notch: {
    position: 'absolute', width: 14, height: 14,
    borderRadius: '50%', background: '#f3f4f6',
    left: '50%', transform: 'translateX(-50%)',
  },
  dash: {
    flex: 1, width: 0,
    borderLeft: '1.5px dashed rgba(255,255,255,0.4)',
    margin: '6px 0',
  },
  /* right body */
  body: {
    flex: 1,
    background: '#fff',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  tag: {
    display: 'inline-flex', alignItems: 'center', gap: 3,
    padding: '2px 7px', borderRadius: 5,
    fontSize: 10, fontWeight: 700,
  },
  codeRow: { display: 'flex', alignItems: 'center', gap: 5, margin: '4px 0' },
  codeText: {
    fontSize: 16, fontWeight: 800, color: '#1e293b',
    letterSpacing: '0.12em', fontFamily: 'monospace',
  },
  minOrder: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  bodyFooter: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8,
  },
  copyBtn: {
    fontSize: 10, fontWeight: 700,
    border: '1.5px solid', borderRadius: 6, padding: '4px 10px',
    cursor: 'pointer', transition: 'all .15s',
  },
  /* edge fades */
  fade: {
    position: 'absolute', top: 56, bottom: 0,
    width: 48, pointerEvents: 'none', zIndex: 2,
  },
};

const couponCSS = `
  .cc-track::-webkit-scrollbar { display: none; }
  @keyframes cc-in {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes cc-pulse {
    0%, 100% { box-shadow: 0 6px 20px rgba(239,68,68,0.25); }
    50%       { box-shadow: 0 6px 28px rgba(239,68,68,0.55); }
  }
  .cc-card { animation: cc-in .35s ease both; }
  .cc-card:nth-child(2) { animation-delay: .07s; }
  .cc-card:nth-child(3) { animation-delay: .14s; }
  .cc-card:nth-child(4) { animation-delay: .21s; }
  .cc-card:hover        { transform: translateY(-4px) !important; box-shadow: 0 12px 28px rgba(0,0,0,0.18) !important; }
  .cc-urgent            { animation: cc-in .35s ease both, cc-pulse 2s ease-in-out 0.4s infinite; }
  .cc-copy:hover  { filter: brightness(0.92); }
  .cc-claim:hover { filter: brightness(1.08); transform: scale(1.04); }
  .cc-nav:hover   { background: #F97316 !important; color: #fff !important; border-color: #F97316 !important; }
`;

/* ── Product styles ── */
const s = {
  page: { minHeight: '100vh', background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 35%)', padding: '32px 24px 64px', overflowX: 'hidden' },
  container: { maxWidth: 1100, margin: '0 auto', width: '100%' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' },
  imageCard: { position: 'relative', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' },
  img: { width: '100%', height: 420, objectFit: 'contain', display: 'block', background: '#fff' },
  infoCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  category: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1.2, margin: 0 },
  ratingRow: { display: 'flex', alignItems: 'center' },
  priceRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  price: { fontSize: 28, fontWeight: 800, color: '#16a34a' },
  desc: { fontSize: 15, color: '#475569', lineHeight: 1.7 },
  actionsRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  qtyWrap: { display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' },
  qtyBtn: { width: 36, height: 38, background: '#f8fafc', border: 'none', fontSize: 18, cursor: 'pointer', color: '#334155', fontWeight: 600 },
  qtyVal: { width: 40, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#1e293b' },
  cartBtn: { display: 'flex', alignItems: 'center', gap: 8, background: '#F97316', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background .2s' },
  wishBtn: { width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', color: '#64748b', transition: 'all .2s' },
  trustRow: { display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' },
  trustItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', fontWeight: 500 },
  specsCard: { marginTop: 28, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  specsTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20, margin: '0 0 20px' },
  specsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  specItem: { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' },
  specIcon: { width: 40, height: 40, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316', flexShrink: 0 },
  reviewsCard: { marginTop: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  reviewRow: { border: '1px solid #f1f5f9', borderRadius: 12, padding: '12px 14px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 8 },
  /* "You May Also Like" styles */
  alsoLikeSection: { marginTop: 28, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '28px 40px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  alsoLikeTitle: { fontSize: 20, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' },
  alsoLikeSub: { fontSize: 13, color: '#94a3b8', margin: '0 0 22px', fontWeight: 400 },
  alsoLikeGrid: { display: 'flex', gap: 16, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 6, scrollSnapType: 'x mandatory' },
  alsoCard: {
    textDecoration: 'none', color: 'inherit',
    background: '#fff', border: '1.5px solid #f1f5f9', borderRadius: 14,
    overflow: 'hidden', transition: 'all .2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    flex: '0 0 calc(25% - 12px)', scrollSnapAlign: 'start',
  },
  alsoArrow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: '50%',
    border: '1.5px solid #e2e8f0', background: '#fff',
    color: '#374151', transition: 'all .15s', flexShrink: 0,
  },
  alsoArrowLeft: {
    position: 'absolute', left: -17, top: '50%', transform: 'translateY(-50%)',
    zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: '50%',
    border: '1.5px solid #e2e8f0', background: '#fff',
    color: '#374151', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  alsoArrowRight: {
    position: 'absolute', right: -17, top: '50%', transform: 'translateY(-50%)',
    zIndex: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: '50%',
    border: '1.5px solid #e2e8f0', background: '#fff',
    color: '#374151', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
  alsoImgWrap: { width: '100%', height: 200, overflow: 'hidden', background: '#f8fafc', position: 'relative' },
  alsoImg: { width: '100%', height: '100%', objectFit: 'contain', display: 'block', transition: 'transform .3s ease', background: '#fff' },
  alsoBody: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 },
  alsoBrand: { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#F97316' },
  alsoName: { fontSize: 15, fontWeight: 600, color: '#1e293b', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  alsoRatingRow: { display: 'flex', alignItems: 'center', gap: 2 },
  alsoPriceRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 },
  alsoPrice: { fontSize: 16, fontWeight: 800, color: '#16a34a' },
  loaderWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' },
  spinner: { width: 40, height: 40, border: '4px solid #e2e8f0', borderTop: '4px solid #F97316', borderRadius: '50%', animation: 'pd-spin 0.8s linear infinite' },
  backBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#F97316', fontWeight: 600, textDecoration: 'none', fontSize: 14 },
};

const spinnerCSS = `
  @keyframes pd-spin { to { transform: rotate(360deg); } }
  a[style]:has(> div):hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; border-color: #F97316 !important; }
  a[style]:has(> div):hover img { transform: scale(1.06); }
  .also-grid::-webkit-scrollbar { display: none; }
  .reviews-scroll::-webkit-scrollbar { width: 5px; }
  .reviews-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  .reviews-scroll::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 4px; }
  .reviews-scroll::-webkit-scrollbar-thumb:hover { background: #F97316; }
  .reviews-scroll { scrollbar-width: thin; scrollbar-color: #fed7aa #f1f5f9; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .pd-grid {
      grid-template-columns: 1fr !important;
      gap: 20px !important;
    }
    .pd-image-card img {
      height: 280px !important;
    }
  }
  @media (max-width: 480px) {
    .pd-image-card img {
      height: 220px !important;
    }
  }
  @media (max-width: 640px) {
    .also-grid > a {
      flex: 0 0 calc(50% - 8px) !important;
    }
  }
`;
