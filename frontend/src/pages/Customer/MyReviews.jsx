import { useState, useEffect, useId } from 'react';
import { useLocation } from 'react-router-dom';
import { Star, Send, Package, ChevronLeft } from 'lucide-react';
import { customerAPI } from '../../services/api';
import { HeaderSkeleton, CardGridSkeleton } from '../../components/Common/SkeletonLoader';

const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
const formatPrice = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p);

const STAR_PTS = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2";

function PickerStar({ size = 32, fill = 0 }) {
  const uid = useId();
  if (fill >= 1) return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points={STAR_PTS} fill="#F97316" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  if (fill <= 0) return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <polygon points={STAR_PTS} fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <defs>
        <clipPath id={uid}><rect x="0" y="0" width="12" height="24" /></clipPath>
      </defs>
      <polygon points={STAR_PTS} fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={STAR_PTS} fill="#F97316" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${uid})`} />
    </svg>
  );
}

const STAR_LABELS = {
  0.5: 'Dreadful 😖', 1: 'Terrible 😞', 1.5: 'Bad 😕',
  2: 'Poor 😐', 2.5: 'Fair 🙂', 3: 'Okay 😊',
  3.5: 'Good 😃', 4: 'Very Good 😄', 4.5: 'Great 🤩', 5: 'Excellent 🌟',
};

function StarPicker({ value, onChange, size = 32 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  const getStarFill = (n) => {
    if (display >= n) return 1;
    if (display >= n - 0.5) return 0.5;
    return 0;
  };

  const getHalfValue = (e, n) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? n - 0.5 : n;
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(n => (
        <button
          key={n} type="button"
          onMouseMove={(e) => setHovered(getHalfValue(e, n))}
          onMouseLeave={() => setHovered(0)}
          onClick={(e) => onChange(getHalfValue(e, n))}
          style={{ background:'none', border:'none', cursor:'pointer', padding:2, display:'flex', transform: n === Math.ceil(display) ? 'scale(1.2)' : 'scale(1)', transition:'transform 0.1s' }}
        >
          <PickerStar size={size} fill={getStarFill(n)} />
        </button>
      ))}
      <span style={{ fontSize:14, fontWeight:700, color:'#F97316', marginLeft:8 }}>
        {STAR_LABELS[display] || ''}
      </span>
    </div>
  );
}

export default function MyReviews() {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewForm, setReviewForm] = useState(null); // { productId, productName }
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewedProductIds, setReviewedProductIds] = useState(new Set());
  const [success, setSuccess] = useState('');  // success message after submit

  // Navigation state from MyOrders "Write Reviews" button
  const fromOrder = location.state?.order || null;

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.getMyOrders();
      const data = res.data?.results || res.data || [];
      setOrders(data);

      // Collect all product IDs from delivered orders and check which have reviews
      const deliveredProducts = [];
      data.forEach(order => {
        const statusName = order.status_name || order.status || order.order_status_name ||
          (typeof order.order_status === 'object' ? order.order_status?.name : null) || '';
        if (statusName === 'Delivered' && order.details) {
          order.details.forEach(item => {
            const pid = item.product?.id || item.product;
            if (pid) deliveredProducts.push(pid);
          });
        }
      });

      // Check if the current user already reviewed each delivered product
      const reviewed = new Set();
      for (const pid of [...new Set(deliveredProducts)]) {
        try {
          const revRes = await customerAPI.getMyReview(pid);
          const myReviews = revRes.data?.results || revRes.data || [];
          if (myReviews.length > 0) reviewed.add(pid);
        } catch { /* ignore */ }
      }
      setReviewedProductIds(reviewed);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm) return;
    if (!comment.trim()) {
      setError('Please write a comment before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await customerAPI.addReview({ product: reviewForm.productId, rating, comment });
      setReviewedProductIds(prev => new Set([...prev, reviewForm.productId]));
      setSuccess(`Review submitted for "${reviewForm.productName}"! Thank you.`);
      setReviewForm(null);
      setRating(5);
      setComment('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to submit review.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewForm = (item) => {
    setReviewForm({ productId: item.productId, productName: item.productName });
    setRating(5);
    setComment('');
    setError('');
    // Scroll to form smoothly
    setTimeout(() => document.getElementById('review-form-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  // Get delivered order items grouped
  const deliveredItems = [];
  orders.forEach(order => {
    const statusName = order.status_name || order.status || order.order_status_name ||
          (typeof order.order_status === 'object' ? order.order_status?.name : null) || '';
    if (statusName === 'Delivered' && order.details) {
      order.details.forEach(item => {
        const pid = item.product?.id || item.product;
        if (pid) {
          deliveredItems.push({
            productId: pid,
            productName: item.product_name || item.product?.name || `Product #${pid}`,
            unitPrice: item.unit_price,
            orderNumber: order.order_number,
            orderDate: order.order_date || order.created_at,
          });
        }
      });
    }
  });

  // Deduplicate — show each product once, prefer most recent order
  const productMap = new Map();
  deliveredItems.forEach(item => {
    if (!productMap.has(item.productId)) productMap.set(item.productId, item);
  });

  const toReview = [...productMap.values()].filter(item => !reviewedProductIds.has(item.productId));
  const alreadyReviewed = [...productMap.values()].filter(item => reviewedProductIds.has(item.productId));

  if (loading) return (
    <section style={s.page}>
      <div style={s.container}>
        <HeaderSkeleton titleWidth={170} subtitleWidth={120} showAction={false} />
        <CardGridSkeleton cards={2} columns="1fr" minHeight={200} />
      </div>
    </section>
  );

  return (
    <section style={s.page}>
      <div style={s.container}>
        <h1 style={s.title}><Star size={24} style={{ color: '#F97316' }} /> My Reviews</h1>

        {error && <div style={s.errBox}>{error}</div>}
        {success && <div style={{ ...s.errBox, background:'#f0fdf4', borderColor:'#bbf7d0', color:'#15803d' }}>{success}</div>}

        {/* Banner if arrived from a specific order */}
        {fromOrder && (
          <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <Star size={18} color="#F97316" fill="#F97316"/>
            <span style={{ fontSize:14, fontWeight:600, color:'#92400e' }}>
              Reviewing products from Order #{fromOrder.order_number} — select any product below to write your review
            </span>
          </div>
        )}

        {/* Review Form (inline, anchored) */}
        {reviewForm && (
          <div id="review-form-anchor" style={s.formCard}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Writing Review For</div>
                <h3 style={{ ...s.formTitle, margin:0 }}>{reviewForm.productName}</h3>
              </div>
              <button onClick={() => setReviewForm(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:4 }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:10 }}>Your Rating *</div>
                <StarPicker value={rating} onChange={setRating} size={34} />
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#475569', marginBottom:8 }}>Your Review *</div>
                <textarea
                  style={s.textarea}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your experience — what did you love or dislike about this product?"
                  rows={4}
                  required
                />
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:4, textAlign:'right' }}>{comment.length}/500</div>
              </div>
              <div style={s.formActions}>
                <button type="submit" style={s.submitBtn} disabled={submitting}>
                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
                <button type="button" style={s.cancelBtn} onClick={() => setReviewForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Products to Review */}
        <div style={s.sectionCard}>
          <h2 style={s.sectionTitle}>Products to Review</h2>
          <p style={s.sectionDesc}>You can review products from delivered orders.</p>
          {toReview.length === 0 ? (
            <div style={s.empty}>
              <Package size={32} style={{ color: '#cbd5e1' }} />
              <p style={{ color: '#94a3b8', marginTop: 8, fontSize: 14 }}>No products to review right now.</p>
            </div>
          ) : (
            <div style={s.itemsList}>
              {toReview.map(item => (
                <div key={item.productId} style={s.itemRow}>
                  <div style={{ flex:1 }}>
                    <div style={s.itemName}>{item.productName}</div>
                    <div style={s.itemMeta}>Order #{item.orderNumber} &middot; {formatDate(item.orderDate)} &middot; {formatPrice(item.unitPrice)}</div>
                  </div>
                  {reviewForm?.productId === item.productId ? (
                    <span style={{ fontSize:12, color:'#F97316', fontWeight:600 }}>✎ Writing...</span>
                  ) : (
                    <button style={s.reviewBtn} onClick={() => openReviewForm(item)}>
                      <Star size={14} /> Write Review
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Already Reviewed */}
        {alreadyReviewed.length > 0 && (
          <div style={s.sectionCard}>
            <h2 style={s.sectionTitle}>Already Reviewed</h2>
            <div style={s.itemsList}>
              {alreadyReviewed.map(item => (
                <div key={item.productId} style={s.itemRow}>
                  <div style={{ flex:1 }}>
                    <div style={s.itemName}>{item.productName}</div>
                    <div style={s.itemMeta}>Order #{item.orderNumber} &middot; {formatDate(item.orderDate)}</div>
                  </div>
                  <span style={s.reviewedBadge}>⭐ Reviewed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const s = {
  page:      { minHeight: '100vh', background: 'linear-gradient(180deg,#fff7ed 0%,#fff 35%)', padding: '40px 24px 64px' },
  container: { maxWidth: 820, margin: '0 auto' },
  title:     { fontSize: '1.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 },
  errBox:    { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 },
  center:    { minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' },
  spinner:   { width: 36, height: 36, border: '4px solid #e2e8f0', borderTop: '4px solid #F97316', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  empty:     { textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sectionCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', marginBottom: 20 },
  sectionTitle:{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' },
  sectionDesc: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  itemsList: { display: 'flex', flexDirection: 'column' },
  itemRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' },
  itemName:  { fontSize: 14, fontWeight: 600, color: '#1e293b' },
  itemMeta:  { fontSize: 12, color: '#94a3b8', marginTop: 3 },
  reviewBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#FFF7ED', color: '#F97316', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  reviewedBadge: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 999, fontSize: 12, fontWeight: 600 },
  // Form
  formCard:  { background: '#fff', border: '1px solid #fed7aa', borderRadius: 16, padding: '24px 28px', boxShadow: '0 2px 12px rgba(249,115,22,0.08)', marginBottom: 20 },
  formTitle: { fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 16 },
  starsRow:  { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 14 },
  starBtn:   { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' },
  ratingText:{ fontSize: 14, fontWeight: 700, color: '#F97316', marginLeft: 10 },
  textarea:  { width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, color: '#1e293b', resize: 'vertical', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  formActions: { display: 'flex', gap: 10, marginTop: 14 },
  submitBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#F97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  cancelBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
