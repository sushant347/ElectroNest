import { useEffect, useMemo, useState } from 'react';
import { MessageSquare, Send, Search, UserRound, Clock4, CheckCircle2, Package } from 'lucide-react';
import { ownerAPI } from '../../services/api';

const relTime = (iso) => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60000) return 'Just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)}h ago`;
  return `${Math.floor(ms / 86400000)}d ago`;
};

export default function ProductQuestions() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [groupSort, setGroupSort] = useState('count');
  const [hideAnswered, setHideAnswered] = useState(false);
  const [replyById, setReplyById] = useState({});
  const [savingId, setSavingId] = useState(null);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const res = await ownerAPI.getProductQuestions();
      setQuestions(res.data?.results || res.data || []);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    questions.forEach((q) => {
      const cat = q.category_name || q.product_category || q.product_category_name || q.category || '';
      if (cat) set.add(cat);
    });
    return Array.from(set).sort();
  }, [questions]);

  const grouped = useMemo(() => {
    const filtered = questions.filter((q) => {
      const hay = `${q.product_name || ''} ${q.customer_name || ''} ${q.question || ''}`.toLowerCase();
      const cat = q.category_name || q.product_category || q.product_category_name || q.category || '';
      if (hideAnswered && q.status === 'answered') return false;
      if (categoryFilter && cat !== categoryFilter) return false;
      return hay.includes(search.toLowerCase());
    });
    const map = new Map();
    filtered.forEach((q) => {
      const key = q.product || q.product_name;
      const cat = q.category_name || q.product_category || q.product_category_name || q.category || '';
      if (!map.has(key)) {
        map.set(key, {
          productId: q.product,
          productName: q.product_name || 'Product',
          productImage: q.product_image || '',
          category: cat,
          items: [],
        });
      }
      map.get(key).items.push(q);
    });
    return Array.from(map.values()).sort((a, b) => {
      if (groupSort === 'category') return (a.category || '').localeCompare(b.category || '');
      return b.items.length - a.items.length;
    });
  }, [questions, search, categoryFilter, groupSort, hideAnswered]);

  const submitReply = async (q) => {
    const answer = (replyById[q.id] || '').trim();
    if (!answer) return;
    setSavingId(q.id);
    try {
      await ownerAPI.answerProductQuestion(q.id, answer);
      setReplyById((prev) => ({ ...prev, [q.id]: '' }));
      await loadQuestions();
    } finally {
      setSavingId(null);
    }
  };

  const pending = questions.filter((q) => q.status !== 'answered').length;

  return (
    <div className="oq-page">
      <div className="oq-head">
        <div>
          <h1>Product Q&A</h1>
          <p>Reply to customer product questions and build buyer confidence.</p>
        </div>
        <div className="oq-pill">{pending} pending</div>
      </div>

      <div className="oq-search">
        <Search size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, customer, or question..."
        />
      </div>

      <div className="oq-filters">
        <div className="oq-filter">
          <label>Category</label>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="oq-filter">
          <label>Sort</label>
          <select value={groupSort} onChange={(e) => setGroupSort(e.target.value)}>
            <option value="count">Most Questions</option>
            <option value="category">Category A–Z</option>
          </select>
        </div>
        <label className="oq-toggle">
          <input type="checkbox" checked={hideAnswered} onChange={(e) => setHideAnswered(e.target.checked)} />
          Hide answered after reply
        </label>
      </div>

      {loading ? (
        <div className="oq-empty">Loading questions...</div>
      ) : grouped.length === 0 ? (
        <div className="oq-empty">No questions found.</div>
      ) : (
        <div className="oq-groups">
          {grouped.map((group) => (
            <section key={group.productId || group.productName} className="oq-card">
              <header className="oq-product-head">
                {group.productImage ? (
                  <img src={group.productImage} alt={group.productName} />
                ) : (
                  <div className="oq-ph"><Package size={18} /></div>
                )}
                <div>
                  <h2>{group.productName}</h2>
                  <p>
                    {group.items.length} question{group.items.length > 1 ? 's' : ''}
                    {group.category && <span className="oq-cat">{group.category}</span>}
                  </p>
                </div>
              </header>

              <div className="oq-items">
                {group.items.map((q) => (
                  <article key={q.id} className="oq-item">
                    <div className="oq-meta">
                      <span><UserRound size={13} /> {q.customer_name || 'Customer'}</span>
                      <span><Clock4 size={13} /> {relTime(q.asked_at)}</span>
                      <span className={q.status === 'answered' ? 'ok' : 'pending'}>
                        {q.status === 'answered' ? <CheckCircle2 size={13} /> : <MessageSquare size={13} />}
                        {q.status}
                      </span>
                    </div>

                    <div className="oq-question">{q.question}</div>

                    {q.status === 'answered' && q.answer ? (
                      <div className="oq-answer">
                        <strong>Your reply:</strong> {q.answer}
                      </div>
                    ) : (
                      <div className="oq-reply-row">
                        <textarea
                          value={replyById[q.id] || ''}
                          onChange={(e) => setReplyById((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          placeholder="Write a clear and helpful answer..."
                        />
                        <button onClick={() => submitReply(q)} disabled={savingId === q.id}>
                          <Send size={14} /> {savingId === q.id ? 'Sending...' : 'Send Reply'}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <style>{`
        .oq-page { min-height: calc(100vh - 120px); background: #f3f4f6; padding: 1.75rem; }
        .oq-head { max-width: 1240px; margin: 0 auto 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
        .oq-head h1 { margin: 0; font-size: 1.6rem; color: #F97316; }
        .oq-head p { margin: 4px 0 0; color: #6b7280; font-size: .88rem; }
        .oq-pill { background: #fff7ed; border: 1px solid #fdba74; color: #c2410c; padding: .38rem .75rem; border-radius: 999px; font-weight: 700; font-size: .8rem; }
        .oq-search { max-width: 1240px; margin: 0 auto 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; display: flex; align-items: center; gap: .5rem; padding: .65rem .75rem; color: #9ca3af; }
        .oq-search input { border: none; outline: none; width: 100%; font-size: .9rem; color: #1f2937; background: transparent; }
        .oq-filters { max-width: 1240px; margin: 0 auto 1rem; display: flex; gap: .8rem; flex-wrap: wrap; align-items: center; }
        .oq-filter { display: flex; flex-direction: column; gap: 4px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: .45rem .65rem; }
        .oq-filter label { font-size: .65rem; font-weight: 800; color: #F97316; text-transform: uppercase; letter-spacing: .08em; }
        .oq-filter select { border: none; outline: none; font-size: .82rem; font-weight: 800; color: #F97316; background: transparent; cursor: pointer; }
        .oq-toggle { display: inline-flex; align-items: center; gap: 8px; font-size: .8rem; font-weight: 700; color: #475569; background: #fff; border: 1px solid #e5e7eb; border-radius: 999px; padding: .45rem .8rem; }
        .oq-toggle input { accent-color: #F97316; }
        .oq-groups { max-width: 1240px; margin: 0 auto; display: grid; gap: 1rem; }
        .oq-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; padding: 1rem; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .oq-product-head { display: flex; align-items: center; gap: .8rem; padding-bottom: .8rem; border-bottom: 1px solid #f3f4f6; }
        .oq-product-head img, .oq-ph { width: 56px; height: 56px; border-radius: 10px; object-fit: cover; border: 1px solid #e5e7eb; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; }
        .oq-product-head h2 { margin: 0; font-size: 1rem; color: #111827; }
        .oq-product-head p { margin: 2px 0 0; font-size: .78rem; color: #6b7280; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .oq-cat { font-size: .68rem; font-weight: 700; color: #c2410c; background: #fff7ed; border: 1px solid #fed7aa; padding: 2px 8px; border-radius: 999px; }
        .oq-items { display: grid; gap: .8rem; padding-top: .8rem; }
        .oq-item { border: 1px solid #f1f5f9; background: #f8fafc; border-radius: 10px; padding: .8rem; }
        .oq-meta { display: flex; gap: .8rem; flex-wrap: wrap; font-size: .74rem; color: #64748b; margin-bottom: .45rem; }
        .oq-meta span { display: inline-flex; align-items: center; gap: 4px; }
        .oq-meta .ok { color: #16a34a; font-weight: 700; }
        .oq-meta .pending { color: #f97316; font-weight: 700; }
        .oq-question { font-size: .9rem; color: #1f2937; line-height: 1.55; margin-bottom: .55rem; }
        .oq-answer { border-left: 3px solid #22c55e; background: #f0fdf4; padding: .55rem .65rem; border-radius: 7px; font-size: .86rem; color: #166534; }
        .oq-reply-row { display: grid; gap: .5rem; }
        .oq-reply-row textarea { width: 100%; min-height: 92px; resize: vertical; border: 1.5px solid #d1d5db; border-radius: 8px; padding: .55rem .65rem; outline: none; font-size: .86rem; font-family: inherit; }
        .oq-reply-row textarea:focus { border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,.12); }
        .oq-reply-row button { justify-self: end; display: inline-flex; align-items: center; gap: 6px; border: none; border-radius: 8px; padding: .5rem .8rem; font-weight: 700; color: #fff; background: #f97316; cursor: pointer; }
        .oq-reply-row button:disabled { opacity: .6; cursor: not-allowed; }
        .oq-empty { max-width: 1240px; margin: 0 auto; background: #fff; border: 1px dashed #d1d5db; border-radius: 12px; color: #6b7280; text-align: center; padding: 2rem 1rem; }
      `}</style>
    </div>
  );
}

