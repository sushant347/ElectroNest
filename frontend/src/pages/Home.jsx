import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiMonitor, FiHeart, FiBarChart2, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { customerAPI } from '../services/api'
import imgWatch from '../components/images/smart watches.png'
import imgCamera from '../components/images/camera.png'
import imgDrone from '../components/images/drone.png'
import imgGaming from '../components/images/Gaming Console.png'

const fmt = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p)

const HERO_SLIDES = [
  { badge: '🎮 Trending', title: 'Level Up Your Gaming Setup', sub: 'Consoles, accessories and gaming peripherals', cat: 'Gaming', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', img: imgGaming },
  { badge: '⌚ Most Popular', title: 'Wear the Future on Your Wrist', sub: 'Smart watches for fitness, work and everyday style', cat: 'Smart Watches', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', img: imgWatch },
  { badge: '📷 New Arrival', title: 'Capture Every Moment', sub: 'Professional cameras & lenses for every photographer', cat: 'Cameras', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', img: imgCamera },
  { badge: '🚁 Trending Now', title: 'Take Flight With Drones', sub: 'Aerial photography & racing drones at best prices', cat: 'Drones', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', img: imgDrone },
]

const SIDE = [
  { eyebrow: 'Trend Devices', title: 'Latest Laptops', cat: 'Laptops', bg: 'linear-gradient(135deg,#eef2ff,#dbeafe)', emoji: '💻' },
  { eyebrow: 'Best', title: 'Gaming Console', cat: 'Gaming', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', ec: '#16a34a', emoji: '🎮' },
  { eyebrow: 'Most Popular', title: 'Popular Watches', cat: 'Smart Watches', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', ec: '#F97316', emoji: '⌚' },
]

function getCatEmoji(n) { return { Smartphones: '📱', Laptops: '💻', Gaming: '🎮', Tablets: '📟', 'Smart Home': '🏠', Headphones: '🎧', Display: '🖥️', Cameras: '📷', Drones: '🚁', 'Smart Watches': '⌚', Speakers: '🔊', Accessories: '🔌' }[n] || '📦' }

export default function Home({ addToCart, toggleWishlist, wishlistItems = [], toggleCompare, compareItems = [] }) {
  const [cats, setCats] = useState([])
  const [prods, setProds] = useState([])
  const [allProds, setAllProds] = useState([])
  const [sideImgs, setSideImgs] = useState({})
  const [loading, setLoading] = useState(true)
  const [selCat, setSelCat] = useState(null)
  const [slide, setSlide] = useState(0)
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const prodRef = useRef(null)
  const timerRef = useRef(null)
  const catParam = sp.get('cat') || ''
  const searchQ = sp.get('search') || ''

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 2000)
  }
  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current) }, [])
  useEffect(() => { if ((catParam || searchQ) && prodRef.current) prodRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [catParam, searchQ])
  useEffect(() => { setSelCat(catParam || null) }, [catParam])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [catRes, allRes] = await Promise.all([customerAPI.getCategories(), customerAPI.getProducts({ page_size: 500 })])
        const catData = catRes.data?.results || catRes.data || []
        const allData = allRes.data?.results || allRes.data || []
        setCats(catData)
        // Always store the full product list for category circle images & side banners
        setAllProds(allData)

        let filtered = [...allData]
        if (catParam) { filtered = allData.filter(p => (p.category_name || '') === catParam) }
        if (searchQ) { const q = searchQ.toLowerCase(); filtered = filtered.filter(p => (p.name || p.ProductName || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)) }
        setProds(filtered)

        // side banner images — always from all products, only set once
        setSideImgs(prev => {
          if (Object.keys(prev).length > 0) return prev
          const imgs = {}
          SIDE.forEach(({ cat }) => {
            const p = allData.find(x => (x.category_name || '') === cat && (x.image_url || x.ProductImageURL))
            if (p) imgs[cat] = p.image_url || p.ProductImageURL
          })
          return imgs
        })
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [catParam, searchQ])

  const norm = p => ({
    id: p.id, name: p.name || p.ProductName,
    category: p.category_name || '',
    price: parseFloat(p.selling_price || p.SellingPrice || 0),
    oldPrice: Math.round(parseFloat(p.selling_price || p.SellingPrice || 0) * 1.15),
    image: p.image_url || p.ProductImageURL || '',
    brand: p.brand || p.Brand || '',
    ownerName: p.owner_name || p.OwnerName || '',
    stock: p.stock || p.Stock || 0,
    sold: parseInt(p.units_sold || p.UnitsSold || 0),
  })

  const displayProds = (() => {
    let f = prods
    if (searchQ) { const q = searchQ.toLowerCase(); f = f.filter(p => norm(p).name.toLowerCase().includes(q) || norm(p).brand.toLowerCase().includes(q) || norm(p).category.toLowerCase().includes(q)) }
    if (selCat) f = f.filter(p => norm(p).category === selCat)
    if (selCat || searchQ) return f.map(norm)
    const n = f.map(norm)
    const by = {}
    n.forEach(p => { if (!by[p.category]) by[p.category] = []; by[p.category].push(p) })
    const out = []
    Object.values(by).forEach(g => {
      // Group by brand within this category
      const byBrand = {}
      g.forEach(p => {
        const brand = (p.brand || 'Other').toLowerCase()
        if (!byBrand[brand]) byBrand[brand] = []
        byBrand[brand].push(p)
      })
      // Pick the best-selling product from each brand (one per brand, no repeats)
      const perBrand = Object.values(byBrand).map(bg => [...bg].sort((a, b) => b.sold - a.sold)[0])
      out.push(...perBrand)
    })
    return out
  })()

  const handleCat = (name) => { if (selCat === name) { setSelCat(null); nav('/') } else { setSelCat(name); nav(`/?cat=${encodeURIComponent(name)}`) } }
  const s = HERO_SLIDES[slide]

  return (
    <div className="hm">

      {/* HERO + SIDE BANNERS */}
      <section className="hm-hero-sec">
        <div className="hm-layout">

          {/* Hero Slider */}
          <div className="hm-hero" style={{ background: s.bg }}>
            {s.img
              ? <img src={s.img} alt={s.cat} className="hm-banner-img" />
              : <span className="hm-emoji-fall">{s.emoji}</span>
            }
            <div className="hm-banner-cta">
              <button className="hm-shopbtn" onClick={() => nav(`/?cat=${encodeURIComponent(s.cat)}`)}>Shop Now!</button>
            </div>
            <div className="hm-controls">
              <button className="hm-arr" onClick={() => { setSlide(x => (x - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); resetTimer() }}><FiChevronLeft size={15} /></button>
              <div className="hm-dots">{HERO_SLIDES.map((_, i) => <button key={i} className={`hm-dot${i === slide ? ' on' : ''}`} onClick={() => { setSlide(i); resetTimer() }} />)}</div>
              <button className="hm-arr" onClick={() => { setSlide(x => (x + 1) % HERO_SLIDES.length); resetTimer() }}><FiChevronRight size={15} /></button>
            </div>
          </div>

          {/* Side Banners */}
          <div className="hm-side-col">
            <div className="hm-side hm-side-lg" style={{ background: SIDE[0].bg }} onClick={() => nav(`/?cat=${encodeURIComponent(SIDE[0].cat)}`)}>
              <div className="hm-side-txt">
                <span className="hm-s-eye">{SIDE[0].eyebrow}</span>
                <span className="hm-s-ttl">{SIDE[0].title}</span>
                <button className="hm-s-btn" onClick={e => { e.stopPropagation(); nav(`/?cat=${encodeURIComponent(SIDE[0].cat)}`) }}>View More</button>
              </div>
              <div className="hm-s-imgbox lg">{sideImgs[SIDE[0].cat] ? <img src={sideImgs[SIDE[0].cat]} alt={SIDE[0].title} className="hm-s-img" /> : <span className="hm-s-em">{SIDE[0].emoji}</span>}</div>
            </div>
            <div className="hm-side-row">
              {SIDE.slice(1).map((b, i) => (
                <div key={i} className="hm-side hm-side-sm" style={{ background: b.bg }} onClick={() => nav(`/?cat=${encodeURIComponent(b.cat)}`)}>
                  <div className="hm-side-txt">
                    <span className="hm-s-eye" style={b.ec ? { color: b.ec } : {}}>{b.eyebrow}</span>
                    <span className="hm-s-ttl sm">{b.title}</span>
                    <button className="hm-s-btn sm" onClick={e => { e.stopPropagation(); nav(`/?cat=${encodeURIComponent(b.cat)}`) }}>View More</button>
                  </div>
                  <div className="hm-s-imgbox sm">{sideImgs[b.cat] ? <img src={sideImgs[b.cat]} alt={b.title} className="hm-s-img" /> : <span className="hm-s-em sm">{b.emoji}</span>}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* TOP CATEGORIES */}
      <section className="hm-cats-sec">
        <div className="hm-cats-hdr">
          <h2 className="hm-cats-title">Meet Our <span className="hm-acc">Top Categories</span></h2>
        </div>
        <div className="hm-cats-strip">
          {cats.map(cat => {
            const active = selCat === cat.name
            const p = allProds.find(x => (x.category_name || '') === cat.name && (x.image_url || x.ProductImageURL))
            return (
              <div key={cat.id || cat.name} className={`hm-cat${active ? ' act' : ''}`} onClick={() => handleCat(cat.name)}>
                <div className="hm-cat-circle">
                  {p ? <img src={p.image_url || p.ProductImageURL} alt={cat.name} className="hm-cat-img" /> : <span className="hm-cat-em">{getCatEmoji(cat.name)}</span>}
                </div>
                <span className="hm-cat-nm">{cat.name}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="hm-prods-sec" ref={prodRef}>
        <h2 className="hm-prods-ttl">
          {searchQ ? `Results for "${searchQ}"` : selCat ? selCat : 'Featured Products'}
          {(selCat || searchQ) && <button className="hm-clr" onClick={() => { setSelCat(null); nav('/') }}>✕ Clear</button>}
        </h2>
        {loading ? (
          <div className="hm-ld"><div className="hm-spin" /><p>Loading…</p></div>
        ) : displayProds.length === 0 ? (
          <div className="hm-ld"><p style={{ color: '#64748b' }}>No products found.</p></div>
        ) : (
          <div className="hm-grid">
            {displayProds.map(product => {
              const inW = wishlistItems.some(i => i.id === product.id)
              const inC = compareItems.some(i => i.id === product.id)
              return (
                <div key={product.id} className="hm-card">
                  <div className="hm-card-img">
                    <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                      {product.image && <img src={product.image} alt={product.name} className="hm-pimg" onError={e => e.target.style.display = 'none'} />}
                      <div className="hm-piph" style={{ display: product.image ? 'none' : 'flex' }}><FiMonitor size={30} /></div>
                    </Link>
                    <div className="hm-pacts">
                      <button className={`hm-pact${inW ? ' wact' : ''}`} onClick={() => toggleWishlist(product)}>
                        <FiHeart size={16} style={inW ? { fill: '#ef4444', stroke: '#ef4444' } : {}} />
                      </button>
                      <button className={`hm-pact${inC ? ' cact' : ''}`} onClick={() => toggleCompare(product)}>
                        <FiBarChart2 size={16} />
                      </button>
                    </div>
                    {product.stock <= 0 && <span className="hm-oos">Out of Stock</span>}
                  </div>
                  <div className="hm-pinfo">
                    <span className="hm-pcat">{product.category}</span>
                    <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <h3 className="hm-pnm">{product.name}</h3>
                    </Link>
                    <div className="hm-pmeta">
                      {product.brand && <span className="hm-pbrand">{product.brand}</span>}
                      {product.ownerName && <span className="hm-pown">{product.ownerName}</span>}
                    </div>
                    <div className="hm-pprice">
                      <span className="hm-price">{fmt(product.price)}</span>
                      {product.oldPrice && <span className="hm-old">{fmt(product.oldPrice)}</span>}
                    </div>
                    <button className="hm-abtn" onClick={() => addToCart(product)} disabled={product.stock <= 0}>
                      {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <style>{STYLES}</style>
    </div>
  )
}

const STYLES = `
.hm{min-height:60vh;background:#F3F4F6;}
/* HERO */
.hm-hero-sec{background:#F3F4F6;padding:1.25rem 1.5rem;}
.hm-layout{display:grid;grid-template-columns:1fr 370px;gap:1rem;width:100%;}
.hm-hero{border-radius:14px;position:relative;overflow:hidden;display:block;transition:background .5s;}
.hm-banner-img{position:relative;width:100%;height:auto;display:block;z-index:0;}
.hm-hero:hover .hm-banner-img{transform:scale(1.03);transition:transform .5s ease;}
.hm-emoji-fall{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:12rem;opacity:.15;z-index:0;}
.hm-banner-cta{position:absolute;bottom:2rem;left:2rem;z-index:2;}
.hm-shopbtn{background:#F97316;color:#fff;border:none;border-radius:8px;padding:.7rem 1.75rem;font-size:.9rem;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s,transform .15s;box-shadow:0 4px 16px rgba(249,115,22,.4);}
.hm-shopbtn:hover{background:#ea580c;transform:translateY(-1px);}
.hm-controls{position:absolute;bottom:1.2rem;right:2rem;display:flex;align-items:center;gap:7px;z-index:3;}
.hm-arr{background:rgba(255,255,255,.85);backdrop-filter:blur(4px);border:none;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#374151;transition:background .15s;flex-shrink:0;}
.hm-arr:hover{background:#fff;}
.hm-dots{display:flex;gap:5px;}
.hm-dot{width:8px;height:8px;border-radius:50%;border:none;background:rgba(255,255,255,.55);cursor:pointer;padding:0;transition:all .2s;}
.hm-dot.on{background:#F97316;width:22px;border-radius:4px;}
/* SIDE */
.hm-side-col{display:flex;flex-direction:column;gap:.85rem;}
.hm-side{border-radius:12px;padding:1.25rem 1rem;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:transform .15s,box-shadow .15s;overflow:hidden;gap:.75rem;}
.hm-side:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.1);}
.hm-side-lg{flex:1;min-height:0;}
.hm-side-row{display:grid;grid-template-columns:1fr 1fr;gap:.85rem;}
.hm-side-sm{min-height:130px;}
.hm-side-txt{display:flex;flex-direction:column;gap:.28rem;z-index:2;flex:1;min-width:0;}
.hm-s-eye{font-size:.68rem;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;}
.hm-s-ttl{font-size:1rem;font-weight:700;color:#1e293b;line-height:1.25;}
.hm-s-ttl.sm{font-size:.84rem;}
.hm-s-btn{background:#F97316;color:#fff;border:none;border-radius:6px;padding:.38rem .85rem;font-size:.74rem;font-weight:700;font-family:inherit;cursor:pointer;margin-top:.3rem;width:fit-content;transition:background .15s;white-space:nowrap;}
.hm-s-btn:hover{background:#ea580c;}
.hm-s-btn.sm{padding:.28rem .65rem;font-size:.7rem;}
/* Side images fully fill the box */
.hm-s-imgbox{flex-shrink:0;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.45);display:flex;align-items:center;justify-content:center;}
.hm-s-imgbox.lg{width:140px;height:140px;}
.hm-s-imgbox.sm{width:80px;height:80px;}
.hm-s-img{width:100%;height:100%;object-fit:cover;display:block;}
.hm-s-em{font-size:3rem;opacity:.45;}
.hm-s-em.sm{font-size:2rem;}
/* CATEGORIES */
.hm-cats-sec{width:100%;background:#fff;padding:1.25rem 2.5rem .75rem;}
.hm-cats-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem;}
.hm-cats-title{font-size:1.3rem;font-weight:700;color:#1e293b;}
.hm-acc{color:#F97316;}
.hm-cats-strip{display:flex;gap:1.1rem;overflow-x:auto;padding:.45rem .1rem .9rem;scrollbar-width:none;}
.hm-cats-strip::-webkit-scrollbar{display:none;}
.hm-cat{display:flex;flex-direction:column;align-items:center;gap:.5rem;cursor:pointer;flex-shrink:0;transition:transform .2s;}
.hm-cat:hover{transform:translateY(-3px);}
.hm-cat-circle{width:92px;height:92px;border-radius:50%;border:2.5px solid #e5e7eb;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#f3f4f6;transition:border-color .2s,box-shadow .2s;}
.hm-cat:hover .hm-cat-circle,.hm-cat.act .hm-cat-circle{border-color:#F97316;box-shadow:0 0 0 3px rgba(249,115,22,.14);}
.hm-cat-img{width:100%;height:100%;object-fit:cover;display:block;}
.hm-cat-em{font-size:2.3rem;}
.hm-cat-nm{font-size:.78rem;font-weight:600;color:#374151;text-align:center;max-width:92px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.hm-cat.act .hm-cat-nm{color:#F97316;}
/* PRODUCTS */
.hm-prods-sec{background:#F3F4F6;padding:1.5rem 2.5rem;width:100%;}
.hm-prods-ttl{font-size:1.3rem;font-weight:700;color:#232F3E;margin-bottom:1.2rem;text-align:center;display:flex;align-items:center;justify-content:center;gap:.5rem;}
.hm-clr{font-size:.77rem;color:#F97316;background:none;border:1px solid #fed7aa;border-radius:4px;cursor:pointer;font-weight:600;padding:3px 10px;}
.hm-ld{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;gap:10px;color:#64748b;}
.hm-spin{width:32px;height:32px;border:4px solid #e2e8f0;border-top:4px solid #F97316;border-radius:50%;animation:hmSpin .8s linear infinite;}
@keyframes hmSpin{to{transform:rotate(360deg);}}
.hm-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:1.1rem;width:100%;}
.hm-card{background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;transition:box-shadow .2s,transform .2s;}
.hm-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.09);}
.hm-card-img{position:relative;height:152px;background:#f9fafb;overflow:hidden;}
.hm-pimg{width:100%;height:100%;object-fit:cover;transition:transform .3s;}
.hm-card:hover .hm-pimg{transform:scale(1.05);}
.hm-piph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#9ca3af;background:#f3f4f6;}
.hm-pacts{position:absolute;top:9px;right:9px;display:flex;flex-direction:column;gap:7px;z-index:2;}
.hm-pact{background:white;border:none;border-radius:50%;width:33px;height:33px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transform:translateX(8px);transition:all .25s;color:#64748b;box-shadow:0 2px 8px rgba(0,0,0,.12);}
.hm-card:hover .hm-pact{opacity:1;transform:translateX(0);}
.hm-pact:hover{background:#F97316;color:#fff;}
.hm-pact.wact{color:#ef4444;opacity:1;transform:translateX(0);}
.hm-pact.wact svg{fill:#ef4444;stroke:#ef4444;}
.hm-pact.wact:hover{background:#ef4444;color:#fff;}
.hm-pact.cact{background:#F97316;color:#fff;opacity:1;transform:translateX(0);}
.hm-oos{position:absolute;top:8px;left:8px;background:#ef4444;color:#fff;font-size:.65rem;font-weight:700;padding:3px 8px;border-radius:4px;z-index:2;}
.hm-pinfo{padding:.8rem .9rem .9rem;}
.hm-pcat{font-size:.67rem;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;font-weight:600;}
.hm-pnm{font-size:.9rem;font-weight:600;color:#1e293b;margin:.28rem 0 .32rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.hm-pmeta{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px;}
.hm-pbrand{font-size:.65rem;padding:2px 6px;border-radius:4px;font-weight:500;background:#EFF6FF;color:#2563EB;}
.hm-pown{font-size:.65rem;padding:2px 6px;border-radius:4px;font-weight:500;background:#FFF7ED;color:#EA580C;}
.hm-pprice{display:flex;align-items:center;gap:.45rem;}
.hm-price{font-size:1rem;font-weight:700;color:#16A34A;}
.hm-old{font-size:.77rem;color:#9ca3af;text-decoration:line-through;}
.hm-abtn{width:100%;margin-top:.55rem;padding:.42rem 0;background:#F97316;color:#fff;border:none;border-radius:6px;font-size:.79rem;font-weight:600;font-family:inherit;cursor:pointer;transition:background .15s;}
.hm-abtn:hover{background:#ea580c;}
.hm-abtn:disabled{background:#d1d5db;cursor:not-allowed;}
@media(max-width:1024px){.hm-layout{grid-template-columns:1fr 300px;}.hm-grid{grid-template-columns:repeat(4,1fr);}}
@media(max-width:768px){.hm-layout{grid-template-columns:1fr;}.hm-side-col{flex-direction:row;}.hm-side-lg{flex:2;}.hm-side-row{flex:1;flex-direction:column;gap:.85rem;}.hm-side-sm{min-height:0;flex:1;}.hm-grid{grid-template-columns:repeat(3,1fr);}}
@media(max-width:640px){.hm-hero-sec{padding:.85rem;}.hm-controls{display:none;}.hm-banner-cta{bottom:.6rem;left:.75rem;}.hm-shopbtn{padding:.45rem 1rem;font-size:.75rem;}.hm-s-btn{padding:.28rem .6rem;font-size:.68rem;}.hm-s-btn.sm{padding:.22rem .5rem;font-size:.64rem;}.hm-layout{grid-template-columns:1fr;}.hm-side-col{flex-direction:column;}.hm-side-row{grid-template-columns:1fr 1fr;}.hm-cats-sec{padding:1rem .85rem .5rem;}.hm-prods-sec{padding:1.25rem .85rem;}.hm-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:.75rem;width:100%;}.hm-cat-circle{width:76px;height:76px;}.hm-cat-nm{max-width:76px;font-size:.71rem;}}
`
