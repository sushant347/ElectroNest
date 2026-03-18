import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiSearch, FiHeart, FiShoppingCart, FiUser, FiChevronDown, FiBarChart2, FiGrid, FiPackage, FiStar, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { customerAPI } from '../../services/api'

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Laptops', path: '/?cat=Laptops' },
  { label: 'Smartphones', path: '/?cat=Smartphones' },
  {label : 'Gaming', path: '/?cat=Gaming'},
  {label : 'Tablets', path: '/?cat=Tablets'},
  { label: 'Smart Home', path: '/?cat=Smart Home' },
  { label: 'Headphones', path: '/?cat=Headphones' },
  {label : 'Display', path: '/?cat=Display'},
  { label: 'Cameras', path: '/?cat=Cameras' },
  {label : 'Drones', path: '/?cat=Drones'},
  {label : 'Smart Watches', path: '/?cat=Smart Watches'},
  {label : 'Speakers', path: '/?cat=Speakers'},
  { label: 'Accessories', path: '/?cat=Accessories' },
]

export default function Navbar({ cartCount = 0, wishlistCount = 0, compareCount = 0, user = null}) {
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchVal, setSearchVal] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const profileRef = useRef(null)
  const searchRef = useRef(null)
  const debounceRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on route change
  useEffect(() => { setProfileOpen(false); setShowSuggestions(false) }, [location.pathname])

  // Fetch search suggestions with debounce
  const fetchSuggestions = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await customerAPI.getProducts({ search: query.trim(), page_size: 8 })
        const products = res.data?.results || res.data || []
        const mapped = products.slice(0, 8).map(p => ({
          id: p.id,
          name: p.name || p.ProductName,
          brand: p.brand || p.Brand || '',
          category: p.category_name || '',
          image: p.image_url || p.ProductImageURL || '',
          price: parseFloat(p.selling_price || p.SellingPrice || 0),
        }))
        setSuggestions(mapped)
        setShowSuggestions(mapped.length > 0)
        setActiveSuggestion(-1)
      } catch {
        setSuggestions([])
        setShowSuggestions(false)
      }
    }, 300)
  }, [])

  const handleSearchInput = (e) => {
    const val = e.target.value
    setSearchVal(val)
    fetchSuggestions(val)
  }

  const handleSuggestionClick = (product) => {
    setSearchVal('')
    setSuggestions([])
    setShowSuggestions(false)
    navigate(`/product/${product.id}`)
  }

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[activeSuggestion])
    }
  }

  const handleLogout = () => {
    setProfileOpen(false)
    logout()
    navigate('/login')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setShowSuggestions(false)
    if (searchVal.trim()) {
      navigate(`/?search=${encodeURIComponent(searchVal.trim())}`)
      setSearchVal('')
      setSuggestions([])
    }
  }

  const formatSuggestionPrice = (price) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(price)

  return (
    <>
      {/* Announcement Bar */}
      <div className="announce-bar">
        Free shipping on orders over Rs.5000 · Use code <strong>TECH20</strong> for 20% off
      </div>

      <nav className="navbar">
        {/* Main Top Row */}
        <div className="navbar-top">

          {/* Logo */}
          <Link to="/" className="logo">
            <div className="logo-icon">
              <span>EN</span>
            </div>
            <div className="logo-text">
              <span className="logo-name">Electro<span className="logo-accent">Nest</span></span>
              <span className="logo-tagline">Premium Electronics</span>
            </div>
          </Link>

          {/* Search */}
          <div className="search-container" ref={searchRef}>
            <form className={`search-wrap ${searchFocused ? 'active' : ''}`} onSubmit={handleSearch}>
              <input
                type="text"
                value={searchVal}
                onChange={handleSearchInput}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search laptops, phones, accessories..."
                onFocus={() => { setSearchFocused(true); if (suggestions.length > 0) setShowSuggestions(true) }}
                onBlur={() => setSearchFocused(false)}
              />
              {searchVal && (
                <button type="button" className="search-clear" onClick={() => { setSearchVal(''); setSuggestions([]); setShowSuggestions(false) }}>✕</button>
              )}
              <button type="submit" className="search-btn"><FiSearch size={18} /></button>
            </form>
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((product, idx) => (
                  <div
                    key={product.id}
                    className={`search-suggestion-item ${idx === activeSuggestion ? 'active' : ''}`}
                    onMouseDown={() => handleSuggestionClick(product)}
                    onMouseEnter={() => setActiveSuggestion(idx)}
                  >
                    <div className="suggestion-img-wrap">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="suggestion-img" />
                      ) : (
                        <div className="suggestion-img-placeholder"><FiSearch size={14} /></div>
                      )}
                    </div>
                    <div className="suggestion-info">
                      <span className="suggestion-name">{product.name}</span>
                      <span className="suggestion-meta">
                        {product.brand && <span>{product.brand}</span>}
                        {product.category && <span> · {product.category}</span>}
                      </span>
                    </div>
                    <span className="suggestion-price">{formatSuggestionPrice(product.price)}</span>
                  </div>
                ))}
                <div className="search-suggestion-footer" onMouseDown={() => { setShowSuggestions(false); if (searchVal.trim()) { navigate(`/?search=${encodeURIComponent(searchVal.trim())}`); setSearchVal(''); setSuggestions([]) } }}>
                  <FiSearch size={13} /> View all results for "{searchVal}"
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="nav-actions">
            <Link to="/compare" className="action-btn" aria-label="Compare">
              <FiBarChart2 size={20} />
              <span className="action-label">Compare</span>
              {compareCount > 0 && <span className="action-badge">{compareCount}</span>}
            </Link>
            <Link to="/wishlist" className="action-btn" aria-label="Wishlist">
              <FiHeart size={20} />
              <span className="action-label">Wishlist</span>
              {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
            </Link>
            <Link to="/cart" className="action-btn" aria-label="Cart">
              <FiShoppingCart size={20} />
              <span className="action-label">Cart</span>
              {cartCount > 0 && <span className="action-badge">{cartCount}</span>}
            </Link>
            <div className="divider" />
            {user ? (
              <>
                {(user.role === 'owner' || user.role === 'warehouse' || user.role === 'admin') && (
                  <Link
                    to={user.role === 'owner' ? '/owner/dashboard' : user.role === 'warehouse' ? '/warehouse/dashboard' : '/admin/dashboard'}
                    className="action-btn owner-link"
                    aria-label="Dashboard"
                  >
                    <FiGrid size={18} />
                    <span className="action-label">Dashboard</span>
                  </Link>
                )}
                <div className="profile-dropdown-wrap" ref={profileRef}>
                  <button className="signin-btn" onClick={() => setProfileOpen(p => !p)}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {(user.firstName || user.first_name || '')?.charAt(0)}
                    </div>
                    <span>{user.firstName || user.first_name || 'User'}</span>
                    <FiChevronDown size={14} style={{ transition: 'transform 0.2s', transform: profileOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
                  </button>
                  {profileOpen && (
                    <div className="profile-dropdown">
                      <Link to="/profile" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                        <FiUser size={15} /> My Profile
                      </Link>
                      <Link to="/orders" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                        <FiPackage size={15} /> My Orders
                      </Link>
                      <Link to="/reviews" className="profile-dropdown-item" onClick={() => setProfileOpen(false)}>
                        <FiStar size={15} /> My Reviews
                      </Link>
                      <div className="profile-dropdown-divider" />
                      <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
                        <FiLogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link to="/login" className="signin-btn">
                <FiUser size={17} />
                <span>Sign In</span>
                <FiChevronDown size={14} />
              </Link>
            )}
          </div>
        </div>

        {/* Category Nav */}
        <div className="nav-strip">
          <div className="nav-strip-inner">
            {navItems.map((item) => {
              const urlCat = new URLSearchParams(location.search).get('cat')
              const itemCat = new URLSearchParams(item.path.split('?')[1] || '').get('cat')
              const isActive = item.path === '/' 
                ? (location.pathname === '/' && !urlCat)
                : (urlCat === itemCat)
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                  onClick={() => { if (item.path === '/') window.scrollTo({ top: 0, left: 0, behavior: 'smooth' }) }}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      <style>{`
        /* ── Announcement Bar ── */
        .announce-bar {
          background: #F97316;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 500;
          text-align: center;
          padding: 0.4rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          letter-spacing: 0.01em;
          width: 100%;
          box-sizing: border-box;
          overflow: hidden;
        }

        /* ── Navbar Shell ── */
        .navbar {
          background: #232F3E;
          border-bottom: 1px solid rgba(0,0,0,0.1);
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          position: sticky;
          top: 0;
          z-index: 100;
          width: 100%;
          max-width: 100%;
          /* NO overflow:hidden — it clips absolutely-positioned dropdowns */
        }

        /* ── Top Row ── */
        .navbar-top {
          display: flex;
          align-items: center;
          padding: 0.6rem 2rem;
          gap: 1.25rem;
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Logo ── */
        .logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          text-decoration: none;
          flex-shrink: 0;
        }

        .logo-icon {
          width: 38px;
          height: 38px;
          background: #F97316;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .logo-icon span {
          color: #fff;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .logo-name {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .logo-accent {
          color: #F97316;
        }

        .logo-tagline {
          font-size: 0.62rem;
          font-weight: 400;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        /* ── Search Container ── */
        .search-container {
          flex: 1;
          position: relative;
        }

        /* ── Search (Amazon-style) ── */
        .search-wrap {
          display: flex;
          align-items: center;
          background: #fff;
          border: 2px solid transparent;
          border-radius: 6px;
          padding: 0 0 0 0.85rem;
          transition: border-color 0.15s;
          height: 40px;
          overflow: hidden;
        }

        .search-wrap.active {
          border-color: #F97316;
        }

        .search-wrap input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.88rem;
          font-family: inherit;
          color: #1e293b;
          outline: none;
          min-width: 0;
          height: 100%;
        }

        .search-wrap input::placeholder {
          color: #94a3b8;
        }

        .search-clear {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          line-height: 1;
          flex-shrink: 0;
        }

        .search-clear:hover {
          color: #475569;
        }

        .search-btn {
          background: #F97316;
          color: #fff;
          border: none;
          border-radius: 0 4px 4px 0;
          padding: 0 1rem;
          height: 100%;
          cursor: pointer;
          flex-shrink: 0;
          transition: background 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-btn:hover {
          background: #ea580c;
        }

        /* ── Actions ── */
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.15rem;
          flex-shrink: 0;
          /* Don't let actions overflow — shrink if needed below 600px */
        }
        @media (max-width: 600px) {
          .nav-actions { flex-shrink: 1; min-width: 0; }
        }

        .action-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.1rem;
          padding: 0.35rem 0.7rem;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: rgba(255,255,255,0.8);
          cursor: pointer;
          transition: color 0.15s, background 0.15s;
          font-family: inherit;
        }

        .action-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .action-label {
          font-size: 0.65rem;
          font-weight: 500;
          color: inherit;
          line-height: 1;
        }

        .action-badge {
          position: absolute;
          top: 0;
          right: 4px;
          background: #F97316;
          color: #fff;
          font-size: 0.58rem;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 3px;
          border: 1.5px solid #232F3E;
        }

        .divider {
          width: 1px;
          height: 26px;
          background: rgba(255,255,255,0.15);
          margin: 0 0.4rem;
          flex-shrink: 0;
        }

        .owner-link {
          background: rgba(249,115,22,0.12);
          border-radius: 8px;
          padding: 6px 10px !important;
          border: 1px solid rgba(249,115,22,0.25);
        }
        .owner-link:hover {
          background: rgba(249,115,22,0.22) !important;
          border-color: rgba(249,115,22,0.4);
        }

        .profile-dropdown-wrap {
          position: relative;
        }

        .signin-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.9rem;
          background: transparent;
          color: rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
          white-space: nowrap;
          text-decoration: none;
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          min-width: 180px;
          padding: 6px 0;
          z-index: 200;
          animation: dropdownFade 0.15s ease;
        }

        @keyframes dropdownFade {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .profile-dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 16px;
          font-size: 0.85rem;
          font-weight: 500;
          color: #334155;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.12s;
          border: none;
          background: none;
          width: 100%;
          font-family: inherit;
        }

        .profile-dropdown-item:hover {
          background: #f8fafc;
        }

        .profile-dropdown-logout {
          color: #ef4444;
        }
        .profile-dropdown-logout:hover {
          background: #fef2f2;
        }

        .profile-dropdown-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 4px 0;
        }

        .signin-btn:hover {
          border-color: rgba(255,255,255,0.4);
          color: #fff;
          background: rgba(255,255,255,0.06);
        }

        /* ── Search Suggestions Dropdown ── */
        .search-suggestions {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.15);
          z-index: 300;
          max-height: 420px;
          overflow-y: auto;
          animation: suggestFade 0.15s ease;
        }

        @keyframes suggestFade {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .search-suggestion-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          cursor: pointer;
          transition: background 0.1s;
          border-bottom: 1px solid #f3f4f6;
        }

        .search-suggestion-item:last-of-type {
          border-bottom: none;
        }

        .search-suggestion-item:hover,
        .search-suggestion-item.active {
          background: #FFF7ED;
        }

        .suggestion-img-wrap {
          width: 40px;
          height: 40px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: #f3f4f6;
        }

        .suggestion-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .suggestion-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
        }

        .suggestion-info {
          flex: 1;
          min-width: 0;
        }

        .suggestion-name {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .suggestion-meta {
          display: block;
          font-size: 0.68rem;
          color: #9ca3af;
          margin-top: 1px;
        }

        .suggestion-price {
          font-size: 0.8rem;
          font-weight: 700;
          color: #16A34A;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .search-suggestion-footer {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #F97316;
          cursor: pointer;
          border-top: 1px solid #e5e7eb;
          background: #fafbfc;
          border-radius: 0 0 10px 10px;
          transition: background 0.1s;
        }

        .search-suggestion-footer:hover {
          background: #FFF7ED;
        }

        /* ── Category Strip ── */
        .nav-strip {
          background: #37475A;
          width: 100%;
          /* overflow:hidden here is safe — no absolutely-positioned children inside */
          overflow: hidden;
        }

        .nav-strip-inner {
          display: flex;
          align-items: center;
          padding: 0 2rem;
          overflow-x: auto;     /* scroll within the strip */
          scrollbar-width: none;
          gap: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .nav-strip-inner::-webkit-scrollbar {
          display: none;
        }

        .nav-link {
          position: relative;
          padding: 0.55rem 0.9rem;
          color: rgba(255,255,255,0.8);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 400;
          white-space: nowrap;
          transition: color 0.15s;
        }

        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) scaleX(0);
          width: 80%;
          height: 2px;
          background: #F97316;
          transition: transform 0.15s ease;
        }

        .nav-link:hover {
          color: #fff;
        }

        .nav-link:hover::after {
          transform: translateX(-50%) scaleX(1);
        }

        .nav-link-active {
          color: #fff;
          font-weight: 600;
        }

        .nav-link-active::after {
          transform: translateX(-50%) scaleX(1);
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .navbar-top {
            padding: 0.6rem 1rem;
            gap: 0.75rem;
          }
          .logo-tagline { display: none; }
          .action-label { display: none; }
          .action-btn { padding: 0.4rem; }
        }

        @media (max-width: 640px) {
          .logo-text { display: none; }
          .search-wrap { flex: 1; min-width: 0; }
          .search-container { min-width: 0; }
          .signin-btn span:not(:first-child) { display: none; }
          .navbar-top { gap: 0.5rem; padding: 0.5rem 0.75rem; }
          .announce-bar { font-size: 0.7rem; padding: 0.3rem 0.5rem; }
        }

        @media (max-width: 480px) {
          /* Hide Compare button — too many icons on tiny screens */
          .action-btn[aria-label="Compare"] { display: none; }
          .nav-actions { gap: 0; }
          .action-btn { padding: 0.35rem; }
          .signin-btn { padding: 0.35rem 0.6rem; font-size: 0.75rem; }
          .logo-icon { width: 32px; height: 32px; border-radius: 6px; }
          .logo-icon span { font-size: 0.78rem; }
          /* Notification dropdown: don't overflow viewport */
          .search-suggestions { left: 0; right: 0; width: auto; }
        }

        /* Profile dropdown: keep within viewport on mobile */
        @media (max-width: 400px) {
          .profile-dropdown { right: -40px; min-width: 160px; }
        }
      `}</style>
    </>
  )
}