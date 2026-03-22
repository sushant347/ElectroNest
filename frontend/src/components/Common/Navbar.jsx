import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiSearch, FiHeart, FiShoppingCart, FiUser, FiChevronDown, FiBarChart2, FiGrid, FiPackage, FiStar, FiLogOut, FiMenu } from 'react-icons/fi'
import electronestLogo from '../images/Electronest.png'
import { useAuth } from '../../context/AuthContext'
import { customerAPI } from '../../services/api'

const NAV_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'About Us', path: '/about' },
  { label: 'Contact Us', path: '/support/contact' },
]

export default function Navbar({ cartCount = 0, wishlistCount = 0, compareCount = 0, user = null }) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg] = useState(false)
  const [activeSugg, setActiveSugg] = useState(-1)
  const [categories, setCategories] = useState([])
  const [hovCat, setHovCat] = useState(null)
  const [catProds, setCatProds] = useState([])
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const catRef = useRef(null)
  const debouncRef = useRef(null)
  const catDbRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  useEffect(() => {
    customerAPI.getCategories().then(res => {
      const data = res.data?.results || res.data || []
      setCategories(data)
      if (data.length > 0) setHovCat(data[0])
    }).catch(() => { })
  }, [])

  useEffect(() => {
    if (!hovCat) return
    if (catDbRef.current) clearTimeout(catDbRef.current)
    catDbRef.current = setTimeout(async () => {
      try {
        const res = await customerAPI.getProducts({ category: hovCat.id, page_size: 6 })
        setCatProds((res.data?.results || res.data || []).slice(0, 6))
      } catch { setCatProds([]) }
    }, 200)
  }, [hovCat])

  useEffect(() => {
    const h = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSugg(false)
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => { setProfileOpen(false); setShowSugg(false); setCatOpen(false) }, [location.pathname])

  const fetchSugg = useCallback((query) => {
    if (debouncRef.current) clearTimeout(debouncRef.current)
    const trimmed = query.trim()
    if (!trimmed || trimmed.length < 2) { setSuggestions([]); setShowSugg(false); return }
    debouncRef.current = setTimeout(async () => {
      try {
        const res = await customerAPI.getProducts({ search: trimmed, page_size: 10 })
        const all = res.data?.results || res.data || []
        // sort: exact name starts-with first, then contains, then rest
        const q = trimmed.toLowerCase()
        const sorted = [...all].sort((a, b) => {
          const na = (a.name || a.ProductName || '').toLowerCase()
          const nb = (b.name || b.ProductName || '').toLowerCase()
          const aStarts = na.startsWith(q)
          const bStarts = nb.startsWith(q)
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return 0
        })
        const items = sorted.slice(0, 8).map(p => ({
          id: p.id,
          name: p.name || p.ProductName,
          brand: p.brand || p.Brand || '',
          category: p.category_name || '',
          image: p.image_url || p.ProductImageURL || '',
          price: parseFloat(p.selling_price || p.SellingPrice || 0),
        }))
        setSuggestions(items); setShowSugg(items.length > 0); setActiveSugg(-1)
      } catch { setSuggestions([]); setShowSugg(false) }
    }, 220)
  }, [])

  const fmt = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p)

  // Highlight matching text in suggestions
  const highlight = (text, query) => {
    if (!text || !query) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: '#FFF7ED', color: '#F97316', fontWeight: 700, padding: 0 }}>
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    )
  }

  const isActive = (item) => {
    if (item.path === '/') return location.pathname === '/' && !new URLSearchParams(location.search).get('cat')
    if (item.path === '/about') return location.pathname === '/about'
    if (item.path === '/support/contact') return location.pathname === '/support/contact'
    if (item.path === '/compare') return location.pathname === '/compare'
    return false
  }

  const handleLogout = () => { setProfileOpen(false); logout(); navigate('/login') }

  const handleSearch = (e) => {
    e.preventDefault(); setShowSugg(false)
    if (searchVal.trim()) { navigate(`/?search=${encodeURIComponent(searchVal.trim())}`); setSearchVal(''); setSuggestions([]) }
  }

  const onSuggClick = (p) => { setSearchVal(''); setSuggestions([]); setShowSugg(false); navigate(`/product/${p.id}`) }

  const onKey = (e) => {
    if (!showSugg || !suggestions.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSugg(s => Math.min(s + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSugg(s => Math.max(s - 1, -1)) }
    else if (e.key === 'Enter' && activeSugg >= 0) { e.preventDefault(); onSuggClick(suggestions[activeSugg]) }
  }

  return (
    <>
      <nav className="nb">

        {/* TOP ROW */}
        <div className="nb-top">
          {/* Logo */}
          <Link to="/" className="nb-logo">
            <img src={electronestLogo} alt="ElectroNest" className="nb-logo-img" />
            <div className="nb-logo-text">
              <span className="nb-logo-name">Electro<span style={{ color: '#F97316' }}>Nest</span></span>
              <span className="nb-logo-tag">Premium Electronics</span>
            </div>
          </Link>

          {/* Search — full row on mobile via CSS order */}
          <div className="nb-srch-wrap" ref={searchRef}>
            <form className={`nb-srch${searchFocused ? ' focused' : ''}`} onSubmit={handleSearch}>
              <input
                type="text"
                value={searchVal}
                onChange={e => { setSearchVal(e.target.value); fetchSugg(e.target.value) }}
                onKeyDown={onKey}
                placeholder="Search products, brands and more..."
                onFocus={() => { setSearchFocused(true); if (suggestions.length > 0) setShowSugg(true) }}
                onBlur={() => setSearchFocused(false)}
              />
              {searchVal && (
                <button type="button" className="nb-srch-clr" onClick={() => { setSearchVal(''); setSuggestions([]); setShowSugg(false) }}>✕</button>
              )}
              <button type="submit" className="nb-srch-btn"><FiSearch size={18} /></button>
            </form>
            {showSugg && suggestions.length > 0 && (
              <div className="nb-suggs">
                {suggestions.map((p, i) => (
                  <div key={p.id} className={`nb-sugg${i === activeSugg ? ' hi' : ''}`} onMouseDown={() => onSuggClick(p)} onMouseEnter={() => setActiveSugg(i)}>
                    <div className="nb-sugg-img">{p.image ? <img src={p.image} alt={p.name} /> : <FiSearch size={13} />}</div>
                    <div className="nb-sugg-info">
                      <span className="nb-sugg-nm">{highlight(p.name, searchVal)}</span>
                      <span className="nb-sugg-meta">
                        {p.brand && highlight(p.brand, searchVal)}
                        {p.brand && p.category && ' · '}
                        {p.category}
                      </span>
                    </div>
                    <span className="nb-sugg-price">{fmt(p.price)}</span>
                  </div>
                ))}
                <div className="nb-sugg-footer" onMouseDown={() => { setShowSugg(false); if (searchVal.trim()) { navigate(`/?search=${encodeURIComponent(searchVal.trim())}`); setSearchVal(''); setSuggestions([]) } }}>
                  <FiSearch size={12} /> View all results for "{searchVal}"
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="nb-acts">
            {/* Compare icon — mobile: always visible left of wishlist */}
            <Link to="/compare" className={`nb-act nb-cmp-mobile${compareCount > 0 ? ' on' : ''}`}>
              <FiBarChart2 size={20} />
              {compareCount > 0 && <span className="nb-bdg">{compareCount}</span>}
            </Link>
            {/* Compare — desktop only, logged-in only */}
            {user && (
              <Link to="/compare" className={`nb-act nb-cmp-desktop${compareCount > 0 ? ' on' : ''}`}>
                <FiBarChart2 size={20} />
                <span className="nb-act-lbl">Compare</span>
                {compareCount > 0 && <span className="nb-bdg">{compareCount}</span>}
              </Link>
            )}
            <Link to="/wishlist" className={`nb-act${wishlistCount > 0 ? ' on' : ''}`}>
              <FiHeart size={20} style={wishlistCount > 0 ? { fill: '#fff', stroke: '#fff' } : {}} />
              <span className="nb-act-lbl">Wishlist</span>
              {wishlistCount > 0 && <span className="nb-bdg">{wishlistCount}</span>}
            </Link>
            <Link to="/cart" className="nb-act">
              <FiShoppingCart size={20} />
              <span className="nb-act-lbl">Cart</span>
              {cartCount > 0 && <span className="nb-bdg">{cartCount}</span>}
            </Link>
            <div className="nb-div" />
            {user ? (
              <>
                {(user.role === 'owner' || user.role === 'warehouse' || user.role === 'admin') && (
                  <Link to={user.role === 'owner' ? '/owner/dashboard' : user.role === 'warehouse' ? '/warehouse/dashboard' : '/admin/dashboard'} className="nb-act nb-dash">
                    <FiGrid size={18} /><span className="nb-act-lbl">Dashboard</span>
                  </Link>
                )}
                <div className="nb-prof" ref={profileRef}>
                  <button className="nb-sign-btn nb-sign-icon" onClick={() => setProfileOpen(p => !p)}>
                    <FiUser size={18} />
                  </button>
                  {profileOpen && (
                    <div className="nb-dd">
                      <div className="nb-dd-greet">Hi, {user.firstName || user.first_name || 'User'} 👋</div>
                      <div className="nb-dd-sep" />
                      <Link to="/profile" className="nb-dd-item" onClick={() => setProfileOpen(false)}><FiUser size={14} /> My Profile</Link>
                      <Link to="/orders" className="nb-dd-item" onClick={() => setProfileOpen(false)}><FiPackage size={14} /> My Orders</Link>
                      <Link to="/reviews" className="nb-dd-item" onClick={() => setProfileOpen(false)}><FiStar size={14} /> My Reviews</Link>
                      <div className="nb-dd-sep" />
                      <button className="nb-dd-item nb-dd-out" onClick={handleLogout}><FiLogOut size={14} /> Sign Out</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="nb-sign-btn">
                <FiUser size={17} />
                <span className="nb-sign-txt">Sign In</span>
                <span className="nb-sign-chev"><FiChevronDown size={13} /></span>
              </Link>
            )}
          </div>
        </div>

        {/* STRIP */}
        <div className="nb-strip">

          {/* Categories Mega Dropdown */}
          <div className="nb-cat-wrap" ref={catRef} onMouseEnter={() => setCatOpen(true)} onMouseLeave={() => setCatOpen(false)}>
            <button className={`nb-cat-btn${catOpen ? ' open' : ''}`} onClick={() => setCatOpen(p => !p)}>
              <FiMenu size={16} />
              <span>Categories</span>
              <FiChevronDown size={13} style={{ transition: 'transform .2s', transform: catOpen ? 'rotate(180deg)' : '' }} />
            </button>

            {catOpen && (
              <div className="nb-mega">
                {/* Left: scrollable category list */}
                <div className="nb-mega-left">
                  {categories.map(cat => (
                    <div key={cat.id} className={`nb-mega-cat${hovCat?.id === cat.id ? ' hi' : ''}`}
                      onMouseEnter={() => setHovCat(cat)}
                      onClick={() => setHovCat(cat)}>
                      <span>{cat.name}</span>
                      <span className="nb-mega-arr">›</span>
                    </div>
                  ))}
                </div>
                {/* Right: products */}
                <div className="nb-mega-right">
                  {hovCat && (
                    <>
                      <div className="nb-mega-rhdr">
                        <span className="nb-mega-rtitle">{hovCat.name}</span>
                        <button className="nb-mega-vall" onClick={() => { navigate(`/?cat=${encodeURIComponent(hovCat.name)}`); setCatOpen(false) }}>View All →</button>
                      </div>
                      <div className="nb-mega-pgrid">
                        {catProds.length > 0 ? catProds.map(p => (
                          <div key={p.id} className="nb-mega-pcard" onClick={() => { navigate(`/product/${p.id}`); setCatOpen(false) }}>
                            <div className="nb-mega-pimg">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <div className="nb-mega-pph" />}</div>
                            <span className="nb-mega-pnm">{p.name}</span>
                            {p.brand && <span className="nb-mega-pbrand">{p.brand}</span>}
                            <span className="nb-mega-pprice">{fmt(parseFloat(p.selling_price || 0))}</span>
                          </div>
                        )) : <div className="nb-mega-empty">Loading…</div>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nav links — Compare link shown only on mobile via CSS */}
          <div className="nb-strip-in">
            {NAV_LINKS.map(item => (
              <Link key={item.label} to={item.path}
                className={`nb-link${isActive(item) ? ' act' : ''}${item.mobileOnly ? ' nb-mobile-only' : ''}`}>
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <style>{NB_CSS}</style>
    </>
  )
}

const NB_CSS = `
.nb{background:#232F3E;box-shadow:0 2px 8px rgba(0,0,0,.18);position:sticky;top:0;z-index:200;width:100%;}
/* TOP ROW */
.nb-top{display:flex;align-items:center;padding:.55rem 1.5rem;gap:1.1rem;width:100%;box-sizing:border-box;}
/* Logo */
.nb-logo{display:flex;align-items:center;gap:.55rem;text-decoration:none;flex-shrink:0;}
.nb-logo-img{height:38px;width:auto;object-fit:contain;}
.nb-logo-text{display:flex;flex-direction:column;line-height:1.15;}
.nb-logo-name{font-size:1.12rem;font-weight:700;color:#fff;letter-spacing:-.02em;}
.nb-logo-tag{font-size:.58rem;font-weight:400;color:rgba(255,255,255,.42);letter-spacing:.05em;text-transform:uppercase;}
/* Search */
.nb-srch-wrap{flex:1;position:relative;min-width:0;}
.nb-srch{display:flex;align-items:center;background:#fff;border:2px solid transparent;border-radius:6px;height:40px;overflow:hidden;transition:border-color .15s;padding:0 0 0 .85rem;}
.nb-srch.focused{border-color:#F97316;}
.nb-srch input{flex:1;border:none;background:transparent;font-size:.87rem;font-family:inherit;color:#1e293b;outline:none;min-width:0;height:100%;}
.nb-srch input::placeholder{color:#94a3b8;}
.nb-srch-clr{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:.73rem;padding:.2rem .5rem;flex-shrink:0;}
.nb-srch-btn{background:#F97316;color:#fff;border:none;border-radius:0 4px 4px 0;padding:0 1rem;height:100%;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.nb-srch-btn:hover{background:#ea580c;}
/* Suggestions */
.nb-suggs{position:absolute;top:calc(100% + 4px);left:0;right:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.14);z-index:500;max-height:380px;overflow-y:auto;animation:nbFd .15s ease;}
@keyframes nbFd{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
.nb-sugg{display:flex;align-items:center;gap:10px;padding:8px 14px;cursor:pointer;transition:background .1s;border-bottom:1px solid #f3f4f6;}
.nb-sugg:hover,.nb-sugg.hi{background:#FFF7ED;}
.nb-sugg-img{width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;background:#f3f4f6;display:flex;align-items:center;justify-content:center;color:#9ca3af;}
.nb-sugg-img img{width:100%;height:100%;object-fit:cover;}
.nb-sugg-info{flex:1;min-width:0;}
.nb-sugg-nm{display:block;font-size:.82rem;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.nb-sugg-meta{display:block;font-size:.68rem;color:#9ca3af;margin-top:1px;}
.nb-sugg-price{font-size:.8rem;font-weight:700;color:#16A34A;white-space:nowrap;flex-shrink:0;}
.nb-sugg-footer{display:flex;align-items:center;gap:6px;padding:10px 14px;font-size:.78rem;font-weight:600;color:#F97316;cursor:pointer;border-top:1px solid #e5e7eb;background:#fafbfc;border-radius:0 0 10px 10px;transition:background .1s;}
.nb-sugg-footer:hover{background:#FFF7ED;}
/* Actions */
.nb-acts{display:flex;align-items:center;gap:.05rem;flex-shrink:0;}
.nb-act{position:relative;display:flex;flex-direction:column;align-items:center;gap:.1rem;padding:.35rem .65rem;background:transparent;border:none;border-radius:6px;color:rgba(255,255,255,.72);cursor:pointer;transition:color .15s,background .15s;text-decoration:none;font-family:inherit;}
.nb-act:hover{background:rgba(255,255,255,.08);color:#fff;}
.nb-act.on{color:#fff;}
.nb-act-lbl{font-size:.61rem;font-weight:500;color:inherit;line-height:1;}
.nb-bdg{position:absolute;top:0;right:4px;background:#F97316;color:#fff;font-size:.54rem;font-weight:700;min-width:16px;height:16px;border-radius:50px;display:flex;align-items:center;justify-content:center;padding:0 3px;border:1.5px solid #232F3E;}
.nb-div{width:1px;height:26px;background:rgba(255,255,255,.12);margin:0 .25rem;flex-shrink:0;}
.nb-dash{background:rgba(249,115,22,.1);border:1px solid rgba(249,115,22,.22);border-radius:8px;}
.nb-dash:hover{background:rgba(249,115,22,.22)!important;}
/* Profile */
.nb-prof{position:relative;}
.nb-sign-btn{display:flex;align-items:center;gap:.35rem;padding:.42rem .85rem;background:transparent;color:rgba(255,255,255,.82);border:1px solid rgba(255,255,255,.2);border-radius:6px;font-size:.82rem;font-weight:500;font-family:inherit;cursor:pointer;transition:all .15s;white-space:nowrap;text-decoration:none;}
.nb-sign-btn:hover{border-color:rgba(255,255,255,.4);color:#fff;background:rgba(255,255,255,.06);}
.nb-avatar{width:22px;height:22px;border-radius:50%;background:#F97316;display:flex;align-items:center;justify-content:center;color:white;font-size:.7rem;font-weight:bold;flex-shrink:0;}
.nb-sign-icon{padding:.42rem .6rem;}
.nb-dd-greet{padding:11px 16px;font-size:.88rem;font-weight:700;color:#1e293b;background:#f8fafc;border-radius:10px 10px 0 0;}
.nb-dd{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.14);min-width:180px;padding:6px 0;z-index:400;animation:nbFd .15s ease;}
.nb-dd-item{display:flex;align-items:center;gap:10px;padding:10px 16px;font-size:.84rem;font-weight:500;color:#334155;text-decoration:none;cursor:pointer;transition:background .12s;border:none;background:none;width:100%;font-family:inherit;}
.nb-dd-item:hover{background:#f8fafc;}
.nb-dd-sep{height:1px;background:#e2e8f0;margin:4px 0;}
.nb-dd-out{color:#ef4444;}
.nb-dd-out:hover{background:#fef2f2;}
/* Strip */
.nb-strip{background:#37475A;width:100%;display:flex;align-items:stretch;}
.nb-strip-in{display:flex;align-items:center;padding:0 1rem;flex:1;overflow-x:auto;scrollbar-width:none;box-sizing:border-box;}
.nb-strip-in::-webkit-scrollbar{display:none;}
/* Categories button */
.nb-cat-wrap{position:relative;flex-shrink:0;}
.nb-cat-btn{display:flex;align-items:center;gap:.5rem;padding:.58rem 1.15rem;background:#F97316;color:#fff;border:none;font-size:.86rem;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s;white-space:nowrap;}
.nb-cat-btn:hover,.nb-cat-btn.open{background:#ea580c;}
/* Mega dropdown */
.nb-mega{position:absolute;top:100%;left:0;display:flex;background:#fff;border:1px solid #e2e8f0;border-radius:0 8px 8px 8px;box-shadow:0 16px 48px rgba(0,0,0,.18);z-index:600;width:720px;max-height:440px;animation:nbFd .18s ease;overflow:hidden;}
.nb-mega-left{width:210px;min-width:210px;border-right:1px solid #f0f0f0;overflow-y:auto;background:#fafafa;scrollbar-width:thin;flex-shrink:0;scrollbar-gutter:stable;}
.nb-mega-left::-webkit-scrollbar{width:3px;}
.nb-mega-left::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px;}
.nb-mega-left::-webkit-scrollbar-track{background:transparent;}
.nb-mega-cat{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;font-size:.87rem;font-weight:500;color:#374151;cursor:pointer;transition:background .12s,color .12s;border-bottom:1px solid #f3f4f6;white-space:nowrap;}
.nb-mega-cat:hover,.nb-mega-cat.hi{background:#FFF7ED;color:#F97316;}
.nb-mega-arr{color:#d1d5db;font-size:1rem;}
.nb-mega-cat.hi .nb-mega-arr{color:#F97316;}
.nb-mega-right{flex:1;padding:1rem;overflow-y:auto;background:#fff;}
.nb-mega-rhdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.85rem;}
.nb-mega-rtitle{font-size:1rem;font-weight:700;color:#1e293b;}
.nb-mega-vall{font-size:.78rem;font-weight:600;color:#F97316;background:none;border:none;cursor:pointer;font-family:inherit;padding:0;}
.nb-mega-vall:hover{color:#ea580c;}
.nb-mega-pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem;}
.nb-mega-pcard{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.6rem .45rem;background:#f9fafb;border:1px solid #f0f0f0;border-radius:8px;cursor:pointer;transition:box-shadow .15s,border-color .15s;text-align:center;}
.nb-mega-pcard:hover{box-shadow:0 4px 12px rgba(249,115,22,.12);border-color:#fed7aa;}
.nb-mega-pimg{width:58px;height:58px;border-radius:8px;overflow:hidden;background:#fff;flex-shrink:0;border:1px solid #f0f0f0;display:flex;align-items:center;justify-content:center;}
.nb-mega-pimg img{width:100%;height:100%;object-fit:cover;}
.nb-mega-pph{width:100%;height:100%;background:#e5e7eb;}
.nb-mega-pnm{font-size:.7rem;font-weight:600;color:#374151;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-height:2.6rem;}
.nb-mega-pbrand{font-size:.63rem;font-weight:500;color:#fff;background:#F97316;border-radius:3px;padding:1px 5px;}
.nb-mega-pprice{font-size:.7rem;font-weight:700;color:#16a34a;}
.nb-mega-empty{grid-column:1/-1;text-align:center;color:#9ca3af;font-size:.85rem;padding:2rem 0;}
/* Nav links */
.nb-link{position:relative;padding:.6rem 1rem;color:rgba(255,255,255,.75);text-decoration:none;font-size:.85rem;font-weight:400;white-space:nowrap;transition:color .15s;}
.nb-link:hover{color:#fff;}
.nb-link.act{color:#fff;font-weight:600;background:rgba(249,115,22,.25);border-radius:4px;}
.nb-link.act::after{content:'';position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:75%;height:2.5px;background:#F97316;border-radius:2px 2px 0 0;}
/* Compare: mobile icon hidden on desktop, desktop version always visible when rendered */
.nb-cmp-mobile{display:none!important;}
.nb-cmp-desktop{display:flex;}
/* Responsive ≤900px */
@media(max-width:900px){
  .nb-top{padding:.5rem 1rem;gap:.65rem;}
  .nb-act-lbl{display:none;}
  .nb-act{padding:.4rem;}
  .nb-logo-tag{display:none;}
  .nb-mega{width:380px;}
  .nb-mega-pgrid{grid-template-columns:repeat(2,1fr);}
}
/* Responsive ≤640px — mobile layout */
@media(max-width:640px){
  /* Flex wrap: logo + actions on row 1, search full-width on row 2 */
  .nb-top{
    flex-wrap:wrap;
    padding:.45rem .75rem .4rem;
    gap:.4rem;
    align-items:center;
  }
  .nb-logo{order:1;flex-shrink:0;}
  .nb-acts{order:2;flex:1;justify-content:flex-end;gap:0;}
  .nb-srch-wrap{
    order:3;
    width:100%;
    flex:1 1 100%;
    min-width:0;
    box-sizing:border-box;
  }
  /* Search bar full width, no overflow */
  .nb-srch{height:38px;}
  .nb-srch input{font-size:16px;}
  /* Suggestions dropdown: full width, correct z-index */
  .nb-suggs{
    position:absolute;
    top:calc(100% + 4px);
    left:0;
    right:0;
    width:100%;
    max-height:60vh;
    z-index:9999;
    box-sizing:border-box;
  }
  /* Strip */
  .nb-strip-in{padding:0 .5rem;}
  /* Mega dropdown */
  .nb-mega{width:calc(100vw - 16px);max-height:340px;}
  .nb-mega-left{width:140px;min-width:140px;}
  .nb-mega-pgrid{grid-template-columns:repeat(2,1fr);}
  /* Hide desktop compare label version, show mobile icon */
  .nb-cmp-desktop{display:none!important;}
  .nb-cmp-mobile{display:flex!important;}
  /* Sign in: hide text, show only icon */
  .nb-sign-txt,.nb-sign-chev{display:none;}
  .nb-sign-btn{padding:.42rem .55rem;}
  /* Logo name smaller on mobile */
  .nb-logo-name{font-size:.88rem;}
  .nb-logo-img{height:30px;}
  /* Categories button smaller on mobile */
  .nb-cat-btn{padding:.42rem .7rem;font-size:.75rem;gap:.35rem;}
}
`
