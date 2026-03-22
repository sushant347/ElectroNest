import { useEffect, useState, useCallback } from 'react'
import { Routes, Route, useLocation, Link, Navigate } from 'react-router-dom'
import { X } from 'lucide-react'
import './App.css'
import Navbar from './components/Common/Navbar'
import Footer from './components/Common/Footer'
import ProtectedRoute from './components/Common/ProtectedRoute'
import { useAuth } from './context/AuthContext'
import { customerAPI } from './services/api'
import Home from './pages/Home'
import AboutUs from './pages/AboutUs'
import Wishlist from './pages/Customer/Wishlist'
import Cart from './pages/Customer/Cart'
import Login from './pages/Customer/Login'
import Checkout from './pages/Customer/Checkout'
import Compare from './pages/Customer/Compare'
import Profile from './pages/Customer/Profile'
import MyOrders from './pages/Customer/MyOrders'
import MyReviews from './pages/Customer/MyReviews'
import ProductDetail from './pages/Customer/ProductDetail'

// Owner Pages
import OwnerDashboard from './pages/Owner/Dashboard'
import ProductManagement from './pages/Owner/ProductManagement'
import OrderManagement from './pages/Owner/OrderManagement'
import Analytics from './pages/Owner/Analytics'
import CouponManagement from './pages/Owner/CouponManagement'
import OwnerLayout from './components/Owner/OwnerLayout'

// Warehouse Pages
import WarehouseDashboard from './pages/Warehouse/Dashboard'
import InventoryManagement from './pages/Warehouse/InventoryManagement'
import StockMovements from './pages/Warehouse/StockMovements'
import LowStockAlerts from './pages/Warehouse/LowStockAlerts'
import WarehouseLayout from './components/warehouse/WarehouseLayout'

// Admin Pages
import AdminDashboard from './pages/Admin/Dashboard'
import UserManagement from './pages/Admin/UserManagement'
import StoreManagement from './pages/Admin/StoreManagement'
import AdminCoupons from './pages/Admin/AdminCoupons'
import SystemLogs from './pages/Admin/SystemLogs'
import AnalyticsSummary from './pages/Admin/AnalyticsSummary'
import UserQueries from './pages/Admin/UserQueries'
import AdminLayout from './components/admin/AdminLayout'

// Support Pages
import ContactUs from './pages/Support/ContactUs'
import FAQ from './pages/Support/FAQ'
import ShippingInfo from './pages/Support/ShippingInfo'
import ReturnsExchanges from './pages/Support/ReturnsExchanges'
import Warranty from './pages/Support/Warranty'
import PrivacyPolicy from './pages/Support/PrivacyPolicy'
import TermsOfService from './pages/Support/TermsOfService'

/** Redirect already-logged-in users away from /login to their role dashboard */
function LoginRoute() {
  const { user, initialized } = useAuth()
  if (!initialized) return null
  if (user) {
    const roleHome = {
      customer: '/',
      owner: '/owner/dashboard',
      warehouse: '/warehouse/dashboard',
      admin: '/admin/dashboard',
    }
    return <Navigate to={roleHome[user.role] || '/'} replace />
  }
  return <Login />
}

/** Redirect non-customer logged-in users away from Home to their role dashboard */
function HomeRoute(props) {
  const { user, initialized } = useAuth()
  if (!initialized) return null
  if (user && user.role !== 'customer') {
    const roleHome = {
      owner: '/owner/dashboard',
      warehouse: '/warehouse/dashboard',
      admin: '/admin/dashboard',
    }
    if (roleHome[user.role]) {
      return <Navigate to={roleHome[user.role]} replace />
    }
  }
  return <Home {...props} />
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname])

  return null
}

export default function App() {
  const [cartItems, setCartItems] = useState([])
  const [wishlistItems, setWishlistItems] = useState([])
  const [checkoutSelection, setCheckoutSelection] = useState([])
  const [pendingWishlistCheckoutIds, setPendingWishlistCheckoutIds] = useState([])
  const [compareItems, setCompareItems] = useState([])
  const [toasts, setToasts] = useState([])
  const { user } = useAuth()
  const location = useLocation()

  /* ── Normalize backend cart item to frontend format ── */
  const normalizeCartItem = (item) => {
    const p = item.product_detail || item.product || {}
    const selling = parseFloat(p.selling_price || 0)
    const disc = p.discount_price != null && p.discount_price !== '' ? parseFloat(p.discount_price) : null
    const onSale = disc !== null && disc > 0 && disc < selling
    return {
      id: p.id || item.product,
      cartItemId: item.id,
      name: p.name || p.ProductName || '',
      category: p.category_name || '',
      price: onSale ? disc : selling,
      origPrice: onSale ? selling : null,
      onSale,
      image: p.image_url || '',
      brand: p.brand || '',
      stock: p.stock || 0,
      quantity: item.order_count || 1,
      owner_name: p.owner_name || '',
    }
  }

  /* ── Normalize backend wishlist item to frontend format ── */
  const normalizeWishlistItem = (item) => {
    const p = item.product_detail || item.product || {}
    const selling = parseFloat(p.selling_price || 0)
    const disc = p.discount_price != null && p.discount_price !== '' ? parseFloat(p.discount_price) : null
    const onSale = disc !== null && disc > 0 && disc < selling
    return {
      id: p.id || item.product,
      wishlistItemId: item.id,
      name: p.name || p.ProductName || '',
      category: p.category_name || '',
      price: onSale ? disc : selling,
      origPrice: onSale ? selling : null,
      onSale,
      image: p.image_url || '',
      brand: p.brand || '',
      stock: p.stock || 0,
      rating: 4.5,
      inStock: (p.stock || 0) > 0,
      addedDaysAgo: 0,
    }
  }

  /* ── Normalize backend compare item to frontend format ── */
  const normalizeCompareItem = (item) => {
    const p = item.product_detail || item.product || {}
    return {
      id: p.id || item.product,
      compareItemId: item.id,
      name: p.name || p.ProductName || '',
      category: p.category_name || '',
      price: parseFloat(p.selling_price || 0),
      image: p.image_url || '',
      brand: p.brand || '',
      stock: p.stock || 0,
      specifications: p.specifications || '',
      rating: parseFloat(p.average_rating || 0) || 4.5,
      reviewCount: Number(p.review_count ?? 0),
      inStock: (p.stock || 0) > 0,
    }
  }

  /* ── Load cart & wishlist & compare from backend when user logs in ── */
  const loadCartFromAPI = useCallback(async () => {
    if (!user || user.role !== 'customer') return
    try {
      const res = await customerAPI.getCart()
      const items = res.data?.results || res.data || []
      // Deduplicate: if backend has multiple rows for same product, merge them
      const normalized = items.map(normalizeCartItem)
      const merged = []
      const seen = new Map()
      for (const item of normalized) {
        if (seen.has(item.id)) {
          // Keep earliest entry; accumulate quantity (capped at 6)
          const existing = merged[seen.get(item.id)]
          existing.quantity = Math.min(6, existing.quantity + item.quantity)
        } else {
          seen.set(item.id, merged.length)
          merged.push({ ...item, quantity: Math.min(6, item.quantity) })
        }
      }
      setCartItems(merged)
    } catch (err) {
      console.error('Failed to load cart:', err)
    }
  }, [user])

  const loadWishlistFromAPI = useCallback(async () => {
    if (!user || user.role !== 'customer') return
    try {
      const res = await customerAPI.getWishlist()
      const items = res.data?.results || res.data || []
      setWishlistItems(items.map(normalizeWishlistItem))
    } catch (err) {
      console.error('Failed to load wishlist:', err)
    }
  }, [user])

  const loadCompareFromAPI = useCallback(async () => {
    if (!user || user.role !== 'customer') return
    try {
      const res = await customerAPI.getCompareList()
      const items = res.data?.results || res.data || []
      setCompareItems(items.map(normalizeCompareItem))
    } catch (err) {
      console.error('Failed to load compare list:', err)
    }
  }, [user])

  useEffect(() => {
    if (user && user.role === 'customer') {
      loadCartFromAPI()
      loadWishlistFromAPI()
      loadCompareFromAPI()
    } else {
      setCartItems([])
      setWishlistItems([])
      setCompareItems([])
    }
  }, [user, loadCartFromAPI, loadWishlistFromAPI, loadCompareFromAPI])

  const addToast = (data) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, ...data }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const addToCart = async (product) => {
    const qty = Math.min(product.quantity || 1, 6)
    // Optimistic local update
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + qty, 6) }
            : item
        )
      }
      return [...prev, { ...product, quantity: qty }]
    })
    addToast({ type: 'cart', product })
    // Sync with backend
    if (user && user.role === 'customer') {
      try {
        await customerAPI.addToCart(product.id, qty)
        await loadCartFromAPI()
      } catch (err) {
        console.error('Failed to add to cart:', err)
      }
    }
  }

  const removeFromCart = async (id) => {
    const item = cartItems.find(i => i.id === id)
    setCartItems(prev => prev.filter(item => item.id !== id))
    setCheckoutSelection(prev => prev.filter(itemId => itemId !== id))
    setPendingWishlistCheckoutIds(prev => prev.filter(itemId => itemId !== id))
    if (user && user.role === 'customer' && item?.cartItemId) {
      try {
        await customerAPI.removeCartItem(item.cartItemId)
      } catch (err) {
        console.error('Failed to remove cart item:', err)
      }
    }
  }

  const updateCartQuantity = async (id, quantity) => {
    if (quantity < 1) return
    const clampedQty = Math.min(quantity, 6)
    const item = cartItems.find(i => i.id === id)
    setCartItems(prev => prev.map(item => item.id === id ? { ...item, quantity: clampedQty } : item))
    if (user && user.role === 'customer' && item?.cartItemId) {
      try {
        await customerAPI.updateCartItem(item.cartItemId, clampedQty)
      } catch (err) {
        console.error('Failed to update cart quantity:', err)
      }
    }
  }

  const toggleWishlist = async (product) => {
    const exists = wishlistItems.find(item => item.id === product.id)
    if (exists) {
      setWishlistItems(prev => prev.filter(item => item.id !== product.id))
      addToast({ type: 'wishlist-remove', product })
      if (user && user.role === 'customer' && exists.wishlistItemId) {
        try {
          await customerAPI.removeFromWishlist(exists.wishlistItemId)
        } catch (err) {
          console.error('Failed to remove from wishlist:', err)
        }
      }
    } else {
      setWishlistItems(prev => [...prev, { ...product, addedDaysAgo: 0, inStock: true, rating: product.rating || 4.5 }])
      addToast({ type: 'wishlist-add', product })
      if (user && user.role === 'customer') {
        try {
          await customerAPI.addToWishlist(product.id)
          await loadWishlistFromAPI()
        } catch (err) {
          console.error('Failed to add to wishlist:', err)
        }
      }
    }
  }

  const removeFromWishlist = async (id) => {
    const item = wishlistItems.find(i => i.id === id)
    setWishlistItems(prev => prev.filter(item => item.id !== id))
    setPendingWishlistCheckoutIds(prev => prev.filter(itemId => itemId !== id))
    if (user && user.role === 'customer' && item?.wishlistItemId) {
      try {
        await customerAPI.removeFromWishlist(item.wishlistItemId)
      } catch (err) {
        console.error('Failed to remove from wishlist:', err)
      }
    }
  }

  const clearWishlist = async () => {
    // Remove each wishlist item from backend
    if (user && user.role === 'customer') {
      for (const item of wishlistItems) {
        if (item.wishlistItemId) {
          try { await customerAPI.removeFromWishlist(item.wishlistItemId) } catch (err) { /* ignore */ }
        }
      }
    }
    setWishlistItems([])
    setPendingWishlistCheckoutIds([])
  }

  const clearCart = async () => {
    if (user && user.role === 'customer') {
      try {
        await customerAPI.clearCart()
      } catch (err) {
        console.error('Failed to clear cart:', err)
      }
    }
    setCartItems([])
    setCheckoutSelection([])
  }

  const setCheckoutItems = (itemIds) => {
    setCheckoutSelection(itemIds)
    setPendingWishlistCheckoutIds([])
  }

  const buyNowFromWishlist = (product) => {
    addToCart(product)
    setCheckoutSelection([product.id])
    setPendingWishlistCheckoutIds([product.id])
  }

  const removePurchasedFromCart = async (purchasedIds) => {
    if (!Array.isArray(purchasedIds) || purchasedIds.length === 0) return
    setCartItems(prev => prev.filter(item => !purchasedIds.includes(item.id)))
    setCheckoutSelection([])
    if (pendingWishlistCheckoutIds.length > 0) {
      setWishlistItems(prev => prev.filter(item => !(pendingWishlistCheckoutIds.includes(item.id) && purchasedIds.includes(item.id))))
    }
    setPendingWishlistCheckoutIds([])
    // Reload cart from backend to sync
    if (user && user.role === 'customer') {
      setTimeout(() => loadCartFromAPI(), 500)
    }
  }

  const moveAllToCart = () => {
    setCartItems(prev => {
      const newCart = [...prev]
      wishlistItems.forEach(item => {
        const existingIndex = newCart.findIndex(ci => ci.id === item.id)
        if (existingIndex >= 0) {
          newCart[existingIndex] = { ...newCart[existingIndex], quantity: newCart[existingIndex].quantity + 1 }
        } else {
          newCart.push({ ...item, quantity: 1 })
        }
      })
      return newCart
    })
    setWishlistItems([])
    setPendingWishlistCheckoutIds([])
  }

  const toggleCompare = async (product) => {
    const exists = compareItems.find(item => item.id === product.id)

    if (exists) {
      setCompareItems(prev => prev.filter(item => item.id !== product.id))
      addToast({ type: 'remove', product })
      if (user && user.role === 'customer' && exists.compareItemId) {
        try {
          await customerAPI.removeFromCompare(exists.compareItemId)
        } catch (err) {
          console.error('Failed to remove from compare:', err)
        }
      }
    } else {
      if (compareItems.length >= 3) {
        addToast({ type: 'warning', message: "You can compare up to 3 products only." })
      } else {
        setCompareItems(prev => [...prev, { ...product, specifications: product.specifications || '', rating: product.rating || 4.5, inStock: true }])
        addToast({ type: 'add', product })
        if (user && user.role === 'customer') {
          try {
            await customerAPI.addToCompare(product.id)
            await loadCompareFromAPI()
          } catch (err) {
            console.error('Failed to add to compare:', err)
          }
        }
      }
    }
  }

  const removeFromCompare = async (id) => {
    const item = compareItems.find(i => i.id === id)
    setCompareItems(prev => prev.filter(item => item.id !== id))
    if (user && user.role === 'customer' && item?.compareItemId) {
      try {
        await customerAPI.removeFromCompare(item.compareItemId)
      } catch (err) {
        console.error('Failed to remove from compare:', err)
      }
    }
  }

  const isOwnerRoute = location.pathname.startsWith('/owner');
  const isWarehouseRoute = location.pathname.startsWith('/warehouse');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const hideCustomerChrome = isOwnerRoute || isWarehouseRoute || isAdminRoute;

  return (
    <div className="App">
      <ScrollToTop />
      {!hideCustomerChrome && (
        <Navbar cartCount={cartItems.reduce((acc, item) => acc + item.quantity, 0)} wishlistCount={wishlistItems.length} compareCount={compareItems.length} user={user} />
      )}
      <main className={hideCustomerChrome ? '' : 'main-content'}>
        <Routes>
          {/* Public routes — accessible to everyone (including non-logged-in) */}
          <Route path="/" element={<HomeRoute addToCart={addToCart} toggleWishlist={toggleWishlist} wishlistItems={wishlistItems} toggleCompare={toggleCompare} compareItems={compareItems} />} />
          <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} toggleWishlist={toggleWishlist} wishlistItems={wishlistItems} />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/about" element={<AboutUs />} />

          {/* Customer-only routes */}
          <Route path="/wishlist" element={<ProtectedRoute allowedRoles={['customer']}><Wishlist items={wishlistItems} removeFromWishlist={removeFromWishlist} addToCart={addToCart} clearWishlist={clearWishlist} moveAllToCart={moveAllToCart} buyNowFromWishlist={buyNowFromWishlist} /></ProtectedRoute>} />
          <Route path="/cart" element={<ProtectedRoute allowedRoles={['customer']}><Cart cartItems={cartItems} updateCartQuantity={updateCartQuantity} removeFromCart={removeFromCart} clearCart={clearCart} checkoutSelection={checkoutSelection} setCheckoutItems={setCheckoutItems} /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute allowedRoles={['customer']}><Compare items={compareItems} removeFromCompare={removeFromCompare} addToCart={addToCart} /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute allowedRoles={['customer']}><Checkout cartItems={cartItems} selectedIds={checkoutSelection} onPaymentSuccess={removePurchasedFromCart} /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute allowedRoles={['customer', 'owner', 'warehouse', 'admin']}><Profile /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute allowedRoles={['customer']}><MyOrders /></ProtectedRoute>} />
          <Route path="/reviews" element={<ProtectedRoute allowedRoles={['customer']}><MyReviews /></ProtectedRoute>} />

          {/* Support Routes */}
          <Route path="/support/contact" element={<ContactUs />} />
          <Route path="/support/faq" element={<FAQ />} />
          <Route path="/support/shipping" element={<ShippingInfo />} />
          <Route path="/support/returns" element={<ReturnsExchanges />} />
          <Route path="/support/warranty" element={<Warranty />} />
          <Route path="/support/privacy" element={<PrivacyPolicy />} />
          <Route path="/support/terms" element={<TermsOfService />} />

          {/* Owner Routes */}
          <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']}><OwnerLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<OwnerDashboard />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="coupons" element={<CouponManagement />} />
          </Route>

          {/* Warehouse Routes */}
          <Route path="/warehouse" element={<ProtectedRoute allowedRoles={['warehouse']}><WarehouseLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<WarehouseDashboard />} />
            <Route path="inventory" element={<InventoryManagement />} />
            <Route path="stock-movements" element={<StockMovements />} />
            <Route path="low-stock-alerts" element={<LowStockAlerts />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="stores" element={<StoreManagement />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="logs" element={<SystemLogs />} />
            <Route path="queries" element={<UserQueries />} />
            <Route path="analytics" element={<AnalyticsSummary />} />
          </Route>

          {/* Catch-all — redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideCustomerChrome && <Footer />}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast-message${t.type === 'cart' ? ' toast-cart' : ''}${t.type === 'wishlist-add' || t.type === 'wishlist-remove' ? ' toast-wishlist' : ''}`}>
            {t.type === 'warning' ? (
              <span style={{ flex: 1, padding: '0 8px' }}>{t.message}</span>
            ) : t.type === 'wishlist-add' || t.type === 'wishlist-remove' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', lineHeight: 1, textShadow: '0 0 0 #ef4444' }}>🤍</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#ffffff' }}>
                  {t.type === 'wishlist-add' ? 'Added to Wishlist' : 'Removed from Wishlist'}
                </span>
              </div>
            ) : (
              <>
                {t.product.image
                  ? <img src={t.product.image} alt="" className="toast-img" />
                  : <div className="toast-img toast-img-placeholder" />}
                <div className="toast-info">
                  <span className="toast-name" title={t.product.name}>{t.product.name}</span>
                  <span className="toast-price">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(t.product.price)}</span>
                </div>
                <span className={`toast-status${t.type === 'cart' ? ' toast-status-cart' : ''}`}>
                  {t.type === 'cart' ? 'Added to Cart' : t.type === 'add' ? 'Added to comparison' : 'Removed from comparison'}
                </span>
                <div className="toast-actions">
                  {t.type === 'cart' && <Link to="/cart" className="toast-link toast-link-cart">View Cart</Link>}
                  {t.type === 'add' && <Link to="/compare" className="toast-link">View Comparison</Link>}
                  <button onClick={() => removeToast(t.id)} className="toast-close">
                    <X size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 10px;
          pointer-events: none;
          max-width: 90vw;
          padding: 0 12px;
        }
        .toast-message {
          background: linear-gradient(to right, #ffffff, #f8fafc);
          color: #1e293b;
          padding: 12px 16px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          font-size: 14px;
          font-weight: 500;
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border: 1px solid rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: fit-content;
          pointer-events: auto;
          max-width: 100%;
        }
        .toast-message.toast-wishlist {
          background: #ef4444;
          color: #ffffff;
          border: none;
          padding: 14px 20px;
        }
        .toast-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .toast-info .toast-name {
          color: inherit;
        }
        .toast-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 120px;
        }
        .toast-price {
          color: #16a34a;
          font-weight: 700;
          font-size: 14px;
        }
        .toast-desc {
          font-size: 12px;
          color: #64748b;
          max-width: 140px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .toast-status {
          font-size: 13px;
          color: #F97316;
          font-weight: 600;
          white-space: nowrap;
        }
        .toast-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-left: 8px;
        }
        .toast-link {
          font-size: 13px;
          color: #F97316;
          text-decoration: none;
          font-weight: 600;
          white-space: nowrap;
        }
        .toast-img {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          object-fit: cover;
          border: 2px solid rgba(255,255,255,0.15);
          flex-shrink: 0;
        }
        .toast-close {
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .toast-close:hover {
          background: #f1f5f9;
          color: #ef4444;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Mobile responsiveness */
        @media (max-width: 640px) {
          .toast-container {
            bottom: 16px;
            left: 12px;
            right: 12px;
            transform: none;
            max-width: none;
            padding: 0;
          }
          .toast-message {
            padding: 10px 12px;
            font-size: 13px;
            gap: 10px;
            width: 100%;
          }
          .toast-message.toast-wishlist {
            padding: 12px 16px;
            font-size: 14px;
          }
          .toast-img {
            width: 40px;
            height: 40px;
          }
          .toast-name {
            max-width: 80px;
          }
          .toast-actions {
            gap: 8px;
            margin-left: auto;
            flex-shrink: 0;
          }
          .toast-link {
            font-size: 11px;
            padding: 4px 8px;
          }
          .toast-close {
            padding: 2px;
          }
        }
      `}</style>
    </div>
  )
}