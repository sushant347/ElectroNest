import { useState, useEffect, useRef, useId } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, ShoppingCart, Heart, Truck, ShieldCheck,
  RotateCcw, Package, Cpu, ChevronLeft, ChevronRight, Tag,
  Percent, Clock, Zap, ChevronDown, ChevronUp, MessageSquare, Send, Bell,
  X,
} from 'lucide-react';

import { customerAPI } from '../../services/api';
import config from '../../Config/Config';
import { HeaderSkeleton, CardGridSkeleton, SkeletonText } from '../../components/Common/SkeletonLoader';
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

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

/* ── Price Comparison Chart ── */
function PriceComparisonChart({ productId }) {
  const [priceState, setPriceState] = useState({ productId: null, data: null, loading: false });
  const [isOpen, setIsOpen] = useState(false);

  const data = priceState.productId === productId ? priceState.data : null;
  const loading = priceState.productId === productId && priceState.loading;

  const loadPriceHistory = () => {
    if (loading || data) return;
    setPriceState({ productId, data: null, loading: true });
    customerAPI.getPriceHistory(productId)
      .then(res => setPriceState({ productId, data: res.data, loading: false }))
      .catch(() => setPriceState({ productId, data: null, loading: false }));
  };

  const toggleOpen = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) loadPriceHistory();
  };

  const priceHistory = Array.isArray(data?.price_history) ? data.price_history : [];
  const hasLiveMarketData = ['gadgetbyte_api', 'live_market_api', 'international_market_api'].includes(data?.market_source) && priceHistory.length > 0;
  const savings = Number(data?.savings_percent || 0);
  const marketPrice = Number(data?.market_price || 0);
  const yourPrice = Number(data?.current_selling_price || 0);
  const spread = Math.max(0, marketPrice - yourPrice);
  const marketOffers = Array.isArray(data?.market_offers) ? data.market_offers : [];
  const isLiveMarket = data?.market_source === 'live_market_api';
  const isInternationalMarket = data?.market_source === 'international_market_api';
  const isGadgetByteMarket = data?.market_source === 'gadgetbyte_api';
  const volatility = Number(data?.market_volatility_percent || 0);
  const advantage = Number(data?.price_advantage_percent || savings || 0);

  return (
    <div className="price-insights-wrap" style={{
      background: '#fff',
      border: '1px solid #fed7aa',
      borderRadius: 20,
      padding: '20px',
      marginTop: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <button
        onClick={toggleOpen}
        style={{
          width: '100%',
          border: '1px solid #f97316',
          borderRadius: 14,
          background: '#f97316',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, background: '#fff7ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', textAlign: 'left' }}>Smart Price Insights</div>
            <div style={{ fontSize: 12, color: '#ffedd5', textAlign: 'left' }}>
              {loading ? 'Loading live market comparison...' : isOpen ? 'Hide comparison dashboard' : 'Open market trend dashboard'}
            </div>
          </div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          {spread > 0 && (
            <span style={{
              fontSize: 12,
              fontWeight: 800,
              color: '#166534',
              background: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: 999,
              padding: '4px 10px',
            }}>
              You save {formatPrice(spread)}
            </span>
          )}
          {isOpen ? <ChevronUp size={18} color="#fff" /> : <ChevronDown size={18} color="#fff" />}
        </div>
      </button>

      {isOpen && (
        <>
      {loading ? (
        <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
          <SkeletonText lines={3} />
          <div style={{ height: 220, borderRadius: 14, background: 'linear-gradient(90deg,#fff7ed 25%,#ffedd5 37%,#fff7ed 63%)', backgroundSize: '400% 100%', animation: 'pd-shimmer 1.4s ease infinite' }} />
        </div>
      ) : !data ? null : !hasLiveMarketData ? (
        <div style={{
          marginTop: 14,
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          background: '#f8fafc',
          color: '#475569',
          fontSize: 13,
          fontWeight: 600,
        }}>
          Live market price is unavailable for this product right now.
        </div>
      ) : (
        <>
      <div style={{ display: 'grid', gap: 10, marginTop: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div style={{ background: '#fff', border: '1px solid #fed7aa', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#9a3412', marginBottom: 4 }}>Your Price</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#c2410c' }}>{formatPrice(yourPrice)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#b91c1c', marginBottom: 4 }}>Market Price</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{formatPrice(marketPrice)}</div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{isGadgetByteMarket ? 'Fetched from GadgetByte' : isInternationalMarket ? 'International market converted' : isLiveMarket ? 'Fetched from Nepal market' : 'Live data unavailable'}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#166534', marginBottom: 4 }}>You Save</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>{formatPrice(spread)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '10px 12px' }}>
          <div style={{ fontSize: 11, color: '#3730a3', marginBottom: 4 }}>Price Advantage</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#4338ca' }}>{Math.max(0, advantage).toFixed(1)}%</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>Market vs Platform Trend</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {isGadgetByteMarket
              ? `Using GadgetByte Nepal as the 3-month market baseline with ${volatility.toFixed(1)}% market spread.`
              : isInternationalMarket
              ? `Using nearest international offer${marketOffers.length === 1 ? '' : 's'} converted at $1 = NPR 140.`
              : isLiveMarket
                ? `Using ${marketOffers.length} Nepal market offer${marketOffers.length === 1 ? '' : 's'} with ${volatility.toFixed(1)}% market spread.`
                : 'Live market providers did not return a same-product match.'}
          </div>
          {data?.market_currency_note && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{data.market_currency_note}</div>}
        </div>
      </div>

      {marketOffers.length > 0 && (
        <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
          {marketOffers.slice(0, 4).map((offer, idx) => (
            <a
              key={`${offer.store}-${offer.name}-${idx}`}
              href={offer.url || undefined}
              target={offer.url ? '_blank' : undefined}
              rel={offer.url ? 'noreferrer' : undefined}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                textDecoration: 'none',
                color: 'inherit',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '8px 10px',
                background: '#fff',
              }}
            >
              <span style={{ fontSize: 12, color: '#475569', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {offer.store}: {offer.name}
              </span>
              <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 800, whiteSpace: 'nowrap' }}>
                {formatPrice(offer.price)}
                {offer.currency === 'USD' && offer.original_price ? ` ($${Number(offer.original_price).toLocaleString()})` : ''}
              </span>
            </a>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 3, borderRadius: 2, background: '#ef4444' }} />
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Market Price</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 3, borderRadius: 2, background: '#0ea5e9' }} />
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Platform Price</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(249,115,22,0.18)', border: '1px solid rgba(249,115,22,0.35)' }} />
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>Market Volatility</span>
        </div>
      </div>

      <div className="price-chart-box" style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <ComposedChart data={priceHistory} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="marketFillNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.28}/>
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.04}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(val) => {
                const d = new Date(val);
                return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
              }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickFormatter={(val) => `${Math.round(val / 1000)}k`}
              domain={['auto', 'auto']}
            />
            <RechartsTooltip
              contentStyle={{ borderRadius: 12, border: '1px solid #fdba74', boxShadow: '0 8px 20px rgba(249,115,22,0.15)' }}
              labelStyle={{ fontWeight: 700, color: '#1e293b', marginBottom: 4 }}
              itemStyle={{ fontSize: 13, fontWeight: 600 }}
              formatter={(value, name) => {
                if (name === 'our_price') return [formatPrice(value), 'Platform Price'];
                if (name === 'market_band') return [value.map(formatPrice).join(' - '), 'Market Volatility'];
                return [formatPrice(value), 'Market Price'];
              }}
              labelFormatter={(label) => {
                const d = new Date(label);
                return `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}, ${d.getFullYear()}`;
              }}
            />
            <Area type="monotone" dataKey="market_band" fill="url(#marketFillNew)" stroke="none" dot={false} activeDot={false} />
            <Line type="monotone" dataKey="market_price" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2, fill: '#ef4444' }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="our_price" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        marginTop: 12, padding: '10px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Current: <strong style={{ color: '#0ea5e9' }}>{formatPrice(data.current_selling_price)}</strong>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Market Price: <strong style={{ color: '#ef4444' }}>{formatPrice(data.market_price)}</strong>
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Volatility: <strong style={{ color: '#f97316' }}>{volatility.toFixed(1)}%</strong>
        </div>
        {data.current_discount_price && (
          <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>
            🏷️ Sale: {formatPrice(data.current_discount_price)}
          </div>
        )}
      </div>
      </>
      )}
      </>
      )}
    </div>
  );
}

function ProductQASection({ productId, ownerName }) {
  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const qRes = await customerAPI.getProductQuestions(productId);
      setItems(qRes.data?.results || qRes.data || []);
      const hasCustomerToken = Boolean(localStorage.getItem(config.AUTH_TOKEN_KEY));
      if (hasCustomerToken) {
        try {
          const nRes = await customerAPI.getCustomerNotifications();
          setNotifications(nRes.data?.results || nRes.data || []);
        } catch {
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    } catch {
      setItems([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const unreadProductReplies = notifications.filter((n) => !n.is_read && n.product_id === productId);

  const askQuestion = async () => {
    const text = question.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await customerAPI.askProductQuestion(productId, text);
      setQuestion('');
      await load();
    } catch {
      alert('Please login as customer to ask a question.');
    } finally {
      setSubmitting(false);
    }
  };

  const markNotifRead = async (notifId) => {
    try {
      await customerAPI.markCustomerNotificationRead(notifId);
      setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, is_read: true } : n)));
    } catch {
      // no-op
    }
  };

  return (
    <div style={s.qaCard}>
      <div style={s.qaHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={18} color="#F97316" />
          <h2 style={{ ...s.specsTitle, margin: 0 }}>Q&A</h2>
        </div>
        <span style={s.qaCount}>{items.length} discussions</span>
      </div>

      {unreadProductReplies.length > 0 && (
        <div style={s.qaNotif}>
          <Bell size={15} color="#16a34a" />
          <span>You have {unreadProductReplies.length} new owner repl{unreadProductReplies.length > 1 ? 'ies' : 'y'} for this product.</span>
        </div>
      )}

      <div className="qa-scroll" style={s.qaList}>
        {loading ? (
          <div style={{ fontSize: 13, color: '#64748b' }}>Loading questions...</div>
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: '#64748b' }}>No questions yet. Be the first to ask.</div>
        ) : (
          items.map((q) => {
            const replyNotif = unreadProductReplies.find((n) => n.question === q.id);
            return (
              <div key={q.id} style={s.qaItem}>
                <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 600 }}>{q.customer_name || 'Customer'} asked:</div>
                <div style={{ fontSize: 14, color: '#334155', lineHeight: 1.55 }}>{q.question}</div>
                {q.status === 'answered' && q.answer ? (
                  <div style={s.qaAnswer}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: '#2563eb', fontWeight: 700 }}>
                        {q.owner_name || q.owner || ownerName || 'Store Owner'}
                      </span>
                      {replyNotif && (
                        <button
                          onClick={() => markNotifRead(replyNotif.id)}
                          style={{ border: 'none', background: 'transparent', color: '#2563eb', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                    <div>{q.answer}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#f97316', fontWeight: 700 }}>Waiting for store owner response</div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div style={s.qaAskBox}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about warranty, compatibility, delivery time, or specifications..."
          style={s.qaInput}
        />
        <button onClick={askQuestion} disabled={submitting || !question.trim()} style={s.qaAskBtn}>
          <Send size={14} /> {submitting ? 'Sending...' : 'Ask Question'}
        </button>
      </div>
    </div>
  );
}

const normalize = (p) => {
  const selling = parseFloat(p.selling_price || 0);
  const disc = p.discount_price != null && p.discount_price !== '' ? parseFloat(p.discount_price) : null;
  const onSale = disc !== null && disc > 0 && disc < selling;
  let fullDescription = '';
  try {
    const parsedSpecs = typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications;
    fullDescription = parsedSpecs?._full_description || '';
  } catch {
    fullDescription = '';
  }
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
    ratingCount: Number(p.rating_count ?? p.review_count ?? 0),
    brand: p.brand || '',
    ownerName: p.owner_name || '',
    stock: p.stock || 0,
    description: p.description || '',
    fullDescription,
    specifications: p.specifications || '',
    sku: p.sku || '',
    reorderLevel: p.reorder_level || 10,
    unitsSold: p.units_sold || 0,
    variants: Array.isArray(p.variants) ? p.variants.map(v => {
      const vPrice = parseFloat(v.price || 0);
      const vDisc = v.discount_price != null && v.discount_price !== '' ? parseFloat(v.discount_price) : null;
      const vOnSale = vDisc !== null && vDisc > 0 && vDisc < vPrice;
      return {
        id: v.id,
        title: v.title || 'Standard',
        sku: v.sku || '',
        color: v.color || '',
        specs: v.specs || '',
        price: vOnSale ? vDisc : vPrice,
        origPrice: vOnSale ? vPrice : null,
        onSale: vOnSale,
        stock: Number(v.stock || 0),
        isDefault: Boolean(v.is_default),
      };
    }) : [],
  };
};

const shouldFillContainerImage = (categoryName = '', productName = '') => {
  const hay = `${categoryName} ${productName}`.toLowerCase();
  return /dji\s+mavic\s+3\s+pro/.test(hay)
    || /\b(cameras?|gaming consoles?)\b/.test(hay);
};

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
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const MAX_QTY = 6;
  const [qty, setQty] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [isMobileSpecs, setIsMobileSpecs] = useState(false);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const alsoRef = useRef(null);
  const descriptionRef = useRef(null);
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

  const openDescription = () => {
    setIsDescriptionOpen(true);
    setTimeout(() => {
      descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  useEffect(() => {
    const syncSpecsPanel = () => {
      const isMobile = window.innerWidth <= 768;
      setIsMobileSpecs(isMobile);
      setIsSpecsOpen(!isMobile);
    };
    syncSpecsPanel();
    window.addEventListener('resize', syncSpecsPanel);
    return () => window.removeEventListener('resize', syncSpecsPanel);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const productRes = await customerAPI.getProduct(id);
        const normalized = normalize(productRes.data);
        setProduct(normalized);
        setSelectedVariantId((normalized.variants.find(v => v.isDefault) || normalized.variants[0] || null)?.id || null);
      } catch (err) {
        console.error('Failed to load product:', err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    setReviews([]);
    setReviewsLoading(true);
    customerAPI.getReviews(id)
      .then((res) => {
        if (!cancelled) setReviews(res.data?.results || res.data || []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!product) return;
    // Pass ownerName so backend returns store-specific + platform-wide coupons.
    // Even if ownerName is empty, still fetch platform-wide coupons.
    customerAPI.getCoupons(product.ownerName || undefined)
      .then((res) => setCoupons(res.data?.results || res.data || []))
      .catch(() => setCoupons([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Fetch same-category products for "You May Also Like" (least sold first)
  useEffect(() => {
    if (!product?.categoryId) return;
    customerAPI.getProducts({ category: product.categoryId, page_size: 20, compact: 1 })
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
  const fillMainImage = shouldFillContainerImage(product.category, product.name);
  const selectedVariant = product.variants.find(v => v.id === selectedVariantId) || product.variants[0] || null;
  const activePrice = selectedVariant ? selectedVariant.price : product.price;
  const activeOrigPrice = selectedVariant ? selectedVariant.origPrice : product.origPrice;
  const activeOnSale = selectedVariant ? selectedVariant.onSale : product.onSale;
  const activeStock = selectedVariant ? Math.min(product.stock, selectedVariant.stock) : product.stock;
  const activeSku = selectedVariant?.sku || product.sku;
  const displayDescription = product.fullDescription || product.description;
  const cartProduct = {
    ...product,
    cartKey: `${product.id}:${selectedVariant?.id || 'base'}`,
    variantId: selectedVariant?.id || null,
    variantLabel: selectedVariant?.title || '',
    price: activePrice,
    origPrice: activeOrigPrice,
    onSale: activeOnSale,
    stock: activeStock,
    sku: activeSku,
  };

  // Parse specifications — supports JSON objects or pipe-delimited plain text
  let specEntries = [];
  if (product.specifications) {
    try {
      const parsed = JSON.parse(product.specifications);
      const flatten = (obj, prefix = '') => {
        const entries = [];
        for (const [key, value] of Object.entries(obj)) {
          if (key === '_full_description') continue;
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
              <span style={{ marginLeft: 8, fontSize: 14, color: '#64748b' }}>
                {product.rating.toFixed(1)} /5
                {product.ratingCount > 0 ? ` (${product.ratingCount})` : ''}
                {Number(product.unitsSold || 0) > 0 ? ` ${Number(product.unitsSold).toLocaleString('en-NP')} solds` : ''}
              </span>
            </div>

            {/* Price */}
            <div style={s.priceRow}>
              <span style={s.price}>{formatPrice(activePrice)}</span>
              {activeOnSale && activeOrigPrice && (
                <span style={{ fontSize: 16, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 500 }}>
                  {formatPrice(activeOrigPrice)}
                </span>
              )}
              {activeOnSale && activeOrigPrice && (
                <span style={{ fontSize: 13, fontWeight: 700, background: '#fff7ed', color: '#F97316', border: '1px solid #fed7aa', borderRadius: 6, padding: '2px 8px' }}>
                  Save {formatPrice(activeOrigPrice - activePrice)}
                </span>
              )}
            </div>

            {/* Stock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: activeStock > 0 ? '#16A34A' : '#EF4444' }}>
                {activeStock > 0 ? '✓ Available' : '✕ Out of Stock'}
              </span>
              {activeSku && <span style={{ fontSize: 12, color: '#9CA3AF' }}>SKU: {activeSku}</span>}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <StarRow rating={product.rating} size={14} />
                <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>
                  {product.rating.toFixed(1)} /5
                  {Number(product.unitsSold || 0) > 0 ? ` ${Number(product.unitsSold).toLocaleString('en-NP')} solds` : ''}
                </span>
              </div>
            </div>

            {displayDescription && (
              <button type="button" style={s.descriptionBtn} onClick={openDescription}>
                View Full Description <ChevronDown size={16} />
              </button>
            )}

            {/* Quantity + Actions */}
            <div style={s.actionsRow}>
              <div style={s.qtyWrap}>
                <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span style={s.qtyVal}>{qty}</span>
                <button style={{ ...s.qtyBtn, ...(qty >= MAX_QTY || qty >= activeStock ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={() => setQty(q => Math.min(Math.min(activeStock, MAX_QTY), q + 1))} disabled={qty >= MAX_QTY || qty >= activeStock}>+</button>
              </div>
              {qty >= MAX_QTY && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Max 6 per order</span>}
              <button style={{ ...s.cartBtn, ...(activeStock <= 0 ? { background: '#d1d5db', cursor: 'not-allowed' } : {}) }} onClick={() => { if (activeStock > 0) setCartModalOpen(true); }} disabled={activeStock <= 0}>
                <ShoppingCart size={18} /> {activeStock > 0 ? 'Add to Cart' : 'Out of Stock'}
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

        {/* ── Price Comparison Graph ── */}
        <PriceComparisonChart productId={product.id} />

        {displayDescription && isDescriptionOpen && (
          <section ref={descriptionRef} style={s.descriptionBanner}>
            <div style={s.descriptionBannerHeader}>
              <div>
                <span style={s.descriptionEyebrow}>Product Description</span>
                <h2 style={s.descriptionTitle}>{product.name}</h2>
              </div>
              <button type="button" style={s.descriptionCloseBtn} onClick={() => setIsDescriptionOpen(false)}>
                <ChevronUp size={16} /> Collapse
              </button>
            </div>
            <p style={s.descriptionFullText}>{displayDescription}</p>
          </section>
        )}

        <ProductQASection productId={product.id} ownerName={product.ownerName} />

        {/* Specs */}
        {specEntries.length > 0 && (
          <div style={s.specsCard}>
            {isMobileSpecs ? (
              <>
                <button
                  onClick={() => setIsSpecsOpen((prev) => !prev)}
                  style={s.specsBannerBtn}
                >
                  <span>Specifications</span>
                  {isSpecsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
                <div
                  style={{
                    ...s.specsSlideWrap,
                    maxHeight: isSpecsOpen ? 1500 : 0,
                    opacity: isSpecsOpen ? 1 : 0,
                    marginTop: isSpecsOpen ? 16 : 0,
                  }}
                >
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
              </>
            ) : (
              <>
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
              </>
            )}
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
                          style={{ ...s.alsoImg, objectFit: shouldFillContainerImage(p.category, p.name) ? 'cover' : 'contain' }}
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

      {cartModalOpen && (
        <div style={s.cartModalOverlay} onClick={() => setCartModalOpen(false)}>
          <div className="pd-cart-modal" style={s.cartModal} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={s.cartModalClose} onClick={() => setCartModalOpen(false)}>
              <X size={18} />
            </button>
            <div className="pd-cart-modal-top" style={s.cartModalTop}>
              <div style={s.cartModalImgWrap}>
                {product.image ? (
                  <img src={product.image} alt={product.name} style={{ ...s.cartModalImg, objectFit: fillMainImage ? 'cover' : 'contain' }} referrerPolicy="no-referrer" />
                ) : (
                  <Package size={42} color="#94a3b8" />
                )}
              </div>
              <div style={s.cartModalInfo}>
                {product.brand && <span style={s.cartModalBrand}>{product.brand}</span>}
                <h3 style={s.cartModalTitle}>{product.name}</h3>
                <div style={s.cartModalPriceRow}>
                  <span style={s.cartModalPrice}>{formatPrice(activePrice)}</span>
                  {activeOnSale && activeOrigPrice && <span style={s.cartModalOrig}>{formatPrice(activeOrigPrice)}</span>}
                </div>
                <div style={s.cartModalMeta}>
                  <span style={s.cartModalStars}><StarRow rating={product.rating} size={14} /></span>
                  <span>
                    {product.rating.toFixed(1)} /5
                    {product.ratingCount > 0 ? ` (${product.ratingCount})` : ''}
                  </span>
                  {Number(product.unitsSold || 0) > 0 && (
                    <span>{Number(product.unitsSold || 0).toLocaleString('en-NP')} solds</span>
                  )}
                </div>
              </div>
            </div>

            <div style={s.cartModalConfig}>
              <div style={s.variantHead}>
                <span>Choose configuration</span>
                {selectedVariant && <strong>{formatPrice(activePrice)}</strong>}
              </div>
              {product.variants.length > 0 ? (
                <div style={s.variantGrid}>
                  {product.variants.map((variant) => {
                    const active = variant.id === selectedVariant?.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => { setSelectedVariantId(variant.id); setQty(1); }}
                        style={{
                          ...s.variantBtn,
                          ...(active ? s.variantBtnActive : {}),
                          ...(variant.stock <= 0 ? s.variantBtnDisabled : {}),
                        }}
                        disabled={variant.stock <= 0}
                      >
                        <span style={s.variantTitle}>{variant.title}</span>
                        {variant.specs && <span style={s.variantSpecs}>{variant.specs}</span>}
                        <span style={s.variantMeta}>{variant.stock > 0 ? 'Available' : 'Out of stock'} · {formatPrice(variant.price)}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div style={s.singleConfig}>Standard configuration · {activeStock > 0 ? 'Available' : 'Out of stock'}</div>
              )}
            </div>

            <div className="pd-cart-modal-footer" style={s.cartModalFooter}>
              <div style={s.qtyWrap}>
                <button style={s.qtyBtn} onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span style={s.qtyVal}>{qty}</span>
                <button style={{ ...s.qtyBtn, ...(qty >= MAX_QTY || qty >= activeStock ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }} onClick={() => setQty(q => Math.min(Math.min(activeStock, MAX_QTY), q + 1))} disabled={qty >= MAX_QTY || qty >= activeStock}>+</button>
              </div>
              <button
                type="button"
                style={{ ...s.cartBtn, justifyContent: 'center', flex: 1, ...(activeStock <= 0 ? { background: '#d1d5db', cursor: 'not-allowed' } : {}) }}
                disabled={activeStock <= 0}
                onClick={() => {
                  addToCart({ ...cartProduct, quantity: qty });
                  setCartModalOpen(false);
                }}
              >
                <ShoppingCart size={18} /> Add Selected Item
              </button>
            </div>
          </div>
        </div>
      )}
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
  imageCard: { position: 'relative', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, boxSizing: 'border-box' },
  img: { width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', background: '#fff' },
  infoCol: { display: 'flex', flexDirection: 'column', gap: 16 },
  category: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' },
  title: { fontSize: 28, fontWeight: 800, color: '#1e293b', lineHeight: 1.2, margin: 0 },
  ratingRow: { display: 'flex', alignItems: 'center' },
  priceRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  price: { fontSize: 28, fontWeight: 800, color: '#16a34a' },
  descriptionBtn: { width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 7, border: '1.5px solid #fed7aa', background: '#fff7ed', color: '#c2410c', borderRadius: 10, padding: '9px 13px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },
  descriptionBanner: { scrollMarginTop: 18, marginTop: 28, borderRadius: 16, border: '1.5px solid #fed7aa', background: 'linear-gradient(135deg,#fff7ed 0%,#ffffff 70%)', padding: '24px 28px', boxShadow: '0 8px 28px rgba(249,115,22,0.10)' },
  descriptionBannerHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 },
  descriptionEyebrow: { display: 'block', fontSize: 11, fontWeight: 900, color: '#F97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 },
  descriptionTitle: { fontSize: 20, lineHeight: 1.25, fontWeight: 800, color: '#1e293b', margin: 0 },
  descriptionCloseBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', borderRadius: 9, padding: '8px 11px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' },
  descriptionFullText: { margin: 0, fontSize: 15, color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-line' },
  variantBox: { border: '1px solid #e2e8f0', borderRadius: 12, padding: 14, background: '#f8fafc', display: 'grid', gap: 12 },
  variantHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, fontWeight: 800, color: '#334155' },
  variantGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 },
  variantBtn: { border: '1.5px solid #cbd5e1', background: '#fff', borderRadius: 10, padding: '10px 12px', textAlign: 'left', cursor: 'pointer', display: 'grid', gap: 4, minHeight: 76, fontFamily: 'inherit' },
  variantBtnActive: { borderColor: '#F97316', boxShadow: '0 0 0 3px rgba(249,115,22,0.12)', background: '#fff7ed' },
  variantBtnDisabled: { opacity: 0.45, cursor: 'not-allowed' },
  variantTitle: { fontSize: 13, color: '#1e293b', fontWeight: 800 },
  variantSpecs: { fontSize: 11, color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  variantMeta: { fontSize: 11, color: '#F97316', fontWeight: 700 },
  actionsRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 4 },
  qtyWrap: { display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' },
  qtyBtn: { width: 36, height: 38, background: '#f8fafc', border: 'none', fontSize: 18, cursor: 'pointer', color: '#334155', fontWeight: 600 },
  qtyVal: { width: 40, textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#1e293b' },
  cartBtn: { display: 'flex', alignItems: 'center', gap: 8, background: '#F97316', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'background .2s' },
  cartModalOverlay: { position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18, backdropFilter: 'blur(2px)' },
  cartModal: { position: 'relative', width: 'min(760px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 24px 70px rgba(15,23,42,0.28)', padding: 20 },
  cartModalClose: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  cartModalTop: { display: 'grid', gridTemplateColumns: '210px 1fr', gap: 18, alignItems: 'center', paddingRight: 28 },
  cartModalImgWrap: { height: 190, borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, overflow: 'hidden' },
  cartModalImg: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  cartModalInfo: { minWidth: 0, display: 'grid', gap: 8 },
  cartModalBrand: { width: 'fit-content', fontSize: 11, fontWeight: 900, color: '#2563eb', background: '#eff6ff', borderRadius: 5, padding: '3px 8px', textTransform: 'uppercase' },
  cartModalTitle: { fontSize: 20, lineHeight: 1.25, color: '#1e293b', margin: 0, fontWeight: 800 },
  cartModalPriceRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  cartModalPrice: { fontSize: 24, fontWeight: 900, color: '#16a34a' },
  cartModalOrig: { fontSize: 14, color: '#94a3b8', textDecoration: 'line-through', fontWeight: 700 },
  cartModalMeta: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#64748b', fontWeight: 700 },
  cartModalStars: { display: 'inline-flex', alignItems: 'center', gap: 2 },
  cartModalConfig: { marginTop: 18, borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'grid', gap: 12 },
  singleConfig: { border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', color: '#334155', padding: '12px 14px', fontSize: 13, fontWeight: 700 },
  cartModalFooter: { marginTop: 18, display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #f1f5f9', paddingTop: 16 },
  wishBtn: { width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', color: '#64748b', transition: 'all .2s' },
  trustRow: { display: 'flex', gap: 20, marginTop: 8, flexWrap: 'wrap' },
  trustItem: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#475569', fontWeight: 500 },
  specsCard: {
    marginTop: 28,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
  },
  specsTitle: { fontSize: 18, fontWeight: 700, color: '#1e293b', marginBottom: 20, margin: '0 0 20px' },
  specsBannerBtn: {
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '11px 14px',
    background: '#f8fafc',
    color: '#1e293b',
    fontSize: 18,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
  },
  specsSlideWrap: {
    overflow: 'hidden',
    transition: 'max-height 0.35s ease, opacity 0.25s ease, margin-top 0.25s ease',
  },
  specsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  specItem: { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' },
  specIcon: { width: 40, height: 40, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F97316', flexShrink: 0 },
  reviewsCard: { marginTop: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  qaCard: { marginTop: 20, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 22, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  qaHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  qaCount: { fontSize: 12, fontWeight: 700, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 999, padding: '4px 10px' },
  qaNotif: { display: 'flex', alignItems: 'center', gap: 7, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '8px 10px', borderRadius: 10, marginBottom: 10, fontSize: 12, fontWeight: 600 },
  qaAskBox: { display: 'grid', gap: 8, marginTop: 12 },
  qaInput: { width: '100%', minHeight: 92, border: '1.5px solid #d1d5db', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical' },
  qaAskBtn: { width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 9, background: '#F97316', color: '#fff', fontWeight: 700, padding: '9px 14px', cursor: 'pointer' },
  qaItem: { border: '1px solid #f1f5f9', background: '#f8fafc', borderRadius: 10, padding: '10px 12px', display: 'grid', gap: 5 },
  qaAnswer: { borderLeft: '3px solid #2563eb', background: '#eff6ff', padding: '8px 10px', borderRadius: 8, color: '#111827', fontSize: 13, lineHeight: 1.55, display: 'grid', gap: 4, marginTop: 6 },
  qaList: { display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto', paddingRight: 4 },
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
  alsoImgWrap: { width: '100%', height: 200, overflow: 'hidden', background: '#fff', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, boxSizing: 'border-box' },
  alsoImg: { width: '100%', height: '100%', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', transition: 'transform .3s ease', background: '#fff' },
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
  @keyframes pd-shimmer { 0% { background-position: 100% 0; } 100% { background-position: 0 0; } }
  a[style]:has(> div):hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.10) !important; border-color: #F97316 !important; }
  a[style]:has(> div):hover img { transform: scale(1.06); }
  .also-grid::-webkit-scrollbar { display: none; }
  .reviews-scroll::-webkit-scrollbar { width: 5px; }
  .reviews-scroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px; }
  .reviews-scroll::-webkit-scrollbar-thumb { background: #fed7aa; border-radius: 4px; }
  .reviews-scroll::-webkit-scrollbar-thumb:hover { background: #F97316; }
  .reviews-scroll { scrollbar-width: thin; scrollbar-color: #fed7aa #f1f5f9; }
  .qa-scroll::-webkit-scrollbar { width: 5px; }
  .qa-scroll::-webkit-scrollbar-track { background: #e2e8f0; border-radius: 4px; }
  .qa-scroll::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 4px; }
  .qa-scroll::-webkit-scrollbar-thumb:hover { background: #60a5fa; }
  .qa-scroll { scrollbar-width: thin; scrollbar-color: #bfdbfe #e2e8f0; }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .pd-grid {
      grid-template-columns: 1fr !important;
      gap: 20px !important;
    }
    .pd-image-card {
      height: 300px !important;
      padding: 14px !important;
    }
    .pd-image-card img {
      height: 100% !important;
      width: 100% !important;
      object-fit: contain !important;
    }
    .price-insights-wrap {
      padding: 14px !important;
      border-radius: 14px !important;
    }
    .price-chart-box {
      height: 220px !important;
    }
  }
  @media (max-width: 480px) {
    .pd-image-card {
      height: 240px !important;
      padding: 10px !important;
    }
    .pd-image-card img {
      height: 100% !important;
      width: 100% !important;
      object-fit: contain !important;
    }
    .price-insights-wrap {
      margin-top: 18px !important;
    }
    .price-chart-box {
      height: 200px !important;
    }
  }
  @media (max-width: 640px) {
    .also-grid > a {
      flex: 0 0 calc(50% - 8px) !important;
    }
    .pd-cart-modal {
      padding: 16px !important;
    }
    .pd-cart-modal-top {
      grid-template-columns: 1fr !important;
      padding-right: 0 !important;
    }
    .pd-cart-modal-footer {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .price-insights-wrap button {
      padding: 10px 12px !important;
    }
  }
`;
