import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiMonitor, FiSmartphone, FiCamera, FiWatch, FiHeart, FiBarChart2 } from 'react-icons/fi'
import {MdOutlineHomeWork} from 'react-icons/md'
import { Gamepad2, TabletSmartphone,Cable } from 'lucide-react'
import { GiDeliveryDrone } from "react-icons/gi";
import { BsDisplay,BsLaptopFill,BsSpeaker } from "react-icons/bs";
import { ImHeadphones } from "react-icons/im";
import { customerAPI } from '../services/api'

const categoryIcons = {
    'Smartphones': FiSmartphone,
    'Laptops': BsLaptopFill,
    'Gaming': Gamepad2,
    'Tablets': TabletSmartphone,
    'Smart Home': MdOutlineHomeWork,
    'Headphones': ImHeadphones,
    'Display': BsDisplay,
    'Cameras': FiCamera,
    'Drones': GiDeliveryDrone,
    'Smart Watches': FiWatch,
    'Speakers': BsSpeaker,
    'Accessories': Cable,
}

const formatPrice = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p)

export default function Home({ addToCart, toggleWishlist, wishlistItems = [], toggleCompare, compareItems = [] }) {
    const [categories, setCategories] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const searchQuery = searchParams.get('search') || ''
    const catParam = searchParams.get('cat') || ''
    const productsRef = useRef(null)

    // Scroll to products section when category or search changes
    useEffect(() => {
        if ((catParam || searchQuery) && productsRef.current) {
            productsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [catParam, searchQuery])

    // Sync URL cat param with selectedCategory
    useEffect(() => {
        if (catParam) {
            setSelectedCategory(catParam)
        } else {
            setSelectedCategory(null)
        }
    }, [catParam])

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                // Always load categories
                const catRes = await customerAPI.getCategories()
                const catData = catRes.data?.results || catRes.data || []
                setCategories(catData)

                // Build product query params — use server-side category filter when possible
                const params = { page_size: 500 }
                if (catParam) {
                    // Find category ID by name for server-side filtering
                    const matchedCat = catData.find(c => c.name === catParam)
                    if (matchedCat) {
                        params.category = matchedCat.id
                    }
                }
                if (searchQuery) {
                    params.search = searchQuery
                }

                const prodRes = await customerAPI.getProducts(params)
                const prodData = prodRes.data?.results || prodRes.data || []
                setProducts(prodData)
            } catch (err) {
                console.error('Failed to fetch data:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [catParam, searchQuery])

    // Normalize product fields for display
    const normalize = (p) => ({
        id: p.id,
        name: p.name || p.ProductName,
        category: p.category_name || (p.category && p.category.name) || '',
        categoryId: p.category || p.CategoryID,
        price: parseFloat(p.selling_price || p.SellingPrice || 0),
        oldPrice: parseFloat(p.cost_price || p.CostPrice || 0) > parseFloat(p.selling_price || p.SellingPrice || 0) ? null : Math.round(parseFloat(p.selling_price || p.SellingPrice || 0) * 1.15),
        image: p.image_url || p.ProductImageURL || '',
      rating: Number(p.average_rating ?? p.rating ?? 0),
      reviewCount: Number(p.review_count ?? 0),
        brand: p.brand || p.Brand || '',
        ownerName: p.owner_name || p.OwnerName || '',
        stock: p.stock || p.Stock || 0,
        description: p.description || p.ProductDescription || '',
        specifications: p.specifications || p.ProductSpecifications || '',
        sku: p.sku || p.SKU || '',
        unitsSold: parseInt(p.units_sold || p.UnitsSold || 0),
    })

    const displayProducts = (() => {
        let filtered = products
        // Client-side search filter (backup for when server doesn't support it perfectly)
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            filtered = filtered.filter(p => {
                const n = normalize(p)
                return n.name.toLowerCase().includes(q) || n.brand.toLowerCase().includes(q) || n.category.toLowerCase().includes(q) || n.description.toLowerCase().includes(q)
            })
        }
        // Client-side category filter (backup — server-side should handle it, but keep for safety)
        if (selectedCategory) {
            filtered = filtered.filter(p => {
                const n = normalize(p)
                return n.category === selectedCategory
            })
        }
        // When filtering by category or search, return all matching results normalized
        if (selectedCategory || searchQuery) {
            return filtered.map(normalize)
        }
        // Default — Featured Products: top 3 selling products per category
        const normalized = filtered.map(normalize)
        const byCategory = {}
        normalized.forEach(p => {
            if (!byCategory[p.category]) byCategory[p.category] = []
            byCategory[p.category].push(p)
        })
        const featured = []
        Object.values(byCategory).forEach(group => {
            const top3 = [...group].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 3)
            featured.push(...top3)
        })
        return featured
    })()

    const handleAddToCart = (product) => {
        addToCart(product)
    }

    const handleCategoryClick = (catName) => {
        if (selectedCategory === catName) {
            setSelectedCategory(null)
            navigate('/')
        } else {
            setSelectedCategory(catName)
            navigate(`/?cat=${encodeURIComponent(catName)}`)
        }
    }

    return (
        <div className="home">
            {/* Hero Section */}
            <section className="hero">
                <div className="hero-content">
                    <span className="hero-badge">🔥 New Arrivals 2026</span>
                    <h1 className="hero-title">
                        Your One-Stop <span className="hero-accent">Electronics</span> Store
                    </h1>
                    <p className="hero-subtitle">
                        Discover the latest gadgets, cutting-edge technology, and premium electronics at unbeatable prices.
                    </p>
                    <div className="hero-stats">
                        <div className="hero-stat"><span className="hero-stat-num">{products.length}</span><span className="hero-stat-label">Products</span></div>
                        <div className="hero-stat"><span className="hero-stat-num">{categories.length}</span><span className="hero-stat-label">Categories</span></div>
                        <div className="hero-stat"><span className="hero-stat-num">10</span><span className="hero-stat-label">Stores</span></div>
                    </div>
                </div>
            </section>

            {/* Categories Section */}
            <section className="section">
                <h2 className="section-title">Shop by Category</h2>
                <div className="categories-grid">
                    {(categories.length > 0 ? categories : Object.keys(categoryIcons).map((name, i) => ({ id: i, name }))).map((cat) => {
                        const Icon = categoryIcons[cat.name] || FiMonitor
                        const isActive = selectedCategory === cat.name
                        return (
                            <div
                                key={cat.id || cat.name}
                                className={`category-card ${isActive ? 'active' : ''}`}
                                onClick={() => handleCategoryClick(cat.name)}
                            >
                                <div className="category-icon">
                                    <Icon size={26} />
                                </div>
                                <span className="category-name">{cat.name}</span>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* Products */}
            <section className="section section-surface" ref={productsRef}>
                <h2 className="section-title">
                    {searchQuery ? `Search results for "${searchQuery}"` : selectedCategory ? `${selectedCategory}` : 'Featured Products'}
                    {(selectedCategory || searchQuery) && <button className="clear-filter-btn" onClick={() => { setSelectedCategory(null); navigate('/'); }}>Clear Filter</button>}
                </h2>
                {loading ? (
                    <div className="loading-wrap">
                        <div className="spinner" />
                        <p style={{ color: '#64748b', marginTop: 12 }}>Loading products...</p>
                    </div>
                ) : displayProducts.length === 0 ? (
                    <div className="loading-wrap">
                        <p style={{ color: '#64748b' }}>No products found{searchQuery ? ` for "${searchQuery}"` : ' in this category'}.</p>
                    </div>
                ) : (
                    <div className="products-grid">
                        {displayProducts.map((product) => {
                            const isInWishlist = wishlistItems.some(item => item.id === product.id);
                            const isInCompare = compareItems.some(item => item.id === product.id);
                            return (
                                <div key={product.id} className="product-card group">
                                    <div className="product-image-wrap">
                                        <Link to={`/product/${product.id}`} style={{ display: 'block', height: '100%' }}>
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="product-img" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                                            ) : null}
                                            <div className="product-img-placeholder" style={{ display: product.image ? 'none' : 'flex' }}>
                                                <FiMonitor size={32} />
                                            </div>
                                        </Link>
                                        <div className="product-actions">
                                            <button
                                              className={`product-action-btn product-wishlist-btn ${isInWishlist ? 'active' : ''}`}
                                                onClick={() => toggleWishlist(product)}
                                                title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
                                            >
                                                <FiHeart size={18} className={isInWishlist ? "fill-current" : ""} />
                                            </button>
                                            <button
                                              className={`product-action-btn product-compare-btn ${isInCompare ? 'active' : ''}`}
                                                onClick={() => toggleCompare(product)}
                                                title={isInCompare ? "Remove from compare" : "Add to compare"}
                                            >
                                                <FiBarChart2 size={18} className={isInCompare ? "fill-current" : ""} />
                                            </button>
                                        </div>
                                        {product.stock <= 0 && <span className="out-of-stock-badge">Out of Stock</span>}
                                    </div>
                                    <div className="product-info">
                                        <span className="product-category">{product.category}</span>
                                        <Link to={`/product/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                            <h3 className="product-name">{product.name}</h3>
                                        </Link>
                                        <div className="product-meta">
                                            {product.brand && <span className="product-brand">{product.brand}</span>}
                                            {product.ownerName && <span className="product-owner">{product.ownerName}</span>}
                                        </div>
                                        <div className="product-pricing">
                                            <span className="product-price">{formatPrice(product.price)}</span>
                                            {product.oldPrice && <span className="product-old-price">{formatPrice(product.oldPrice)}</span>}
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={() => handleAddToCart(product)} disabled={product.stock <= 0}>
                                            {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <style>{`
        .home {
          min-height: 60vh;
          background: #fff;
        }

        /* Hero */
        .hero {
          background: #232F3E;
          padding: 4rem 2rem;
          text-align: center;
          position: relative;
        }

        .hero-content {
          max-width: 650px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-block;
          background: rgba(249,115,22,0.15);
          color: #F97316;
          padding: 0.4rem 1.1rem;
          border-radius: 50px;
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 0.85rem;
        }

        .hero-accent {
          color: #F97316;
        }

        .hero-subtitle {
          color: rgba(255,255,255,0.65);
          font-size: 1rem;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .hero-stats {
          display: flex;
          gap: 2rem;
          justify-content: center;
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .hero-stat-num {
          font-size: 1.5rem;
          font-weight: 800;
          color: #F97316;
        }

        .hero-stat-label {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
        }

        /* Buttons */
        .btn {
          padding: 0.65rem 1.5rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
          border: none;
          font-family: inherit;
        }

        .btn-primary {
          background: #F97316;
          color: white;
        }

        .btn-primary:hover {
          background: #ea580c;
        }

        .btn-primary:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .btn-sm {
          padding: 0.45rem 0.85rem;
          font-size: 0.8rem;
          width: 100%;
          margin-top: 0.6rem;
        }

        .clear-filter-btn {
          font-size: 0.85rem;
          color: #F97316;
          background: none;
          border: none;
          cursor: pointer;
          font-weight: 600;
          margin-left: 12px;
        }

        /* Loading */
        .loading-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 4px solid #e2e8f0;
          border-top: 4px solid #F97316;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Sections */
        .section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.5rem 2rem;
        }

        .section-surface {
          max-width: 100%;
          background: #F3F4F6;
          padding: 2.5rem 2rem;
        }

        .section-surface .products-grid {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #232F3E;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        /* Categories */
        .categories-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
        }

        .category-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.65rem;
          padding: 1.25rem 1rem;
          background: #fff;
          border-radius: 10px;
          cursor: pointer;
          transition: box-shadow 0.2s, transform 0.2s;
          border: 1px solid #e5e7eb;
        }

        .category-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .category-card.active {
          border-color: #F97316;
          background: #FFF7ED;
        }

        .category-card.active .category-icon {
          background: #F97316;
          color: #fff;
        }

        .category-icon {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          color: #6b7280;
          transition: background 0.2s, color 0.2s;
        }

        .category-card:hover .category-icon {
          background: #F97316;
          color: #fff;
        }

        .category-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: #374151;
        }

        /* Product Meta */
        .product-meta {
          display: flex;
          gap: 8px;
          margin-bottom: 4px;
          flex-wrap: wrap;
        }

        .product-brand, .product-owner {
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .product-brand {
          background: #EFF6FF;
          color: #2563EB;
        }

        .product-owner {
          background: #FFF7ED;
          color: #EA580C;
        }

        .out-of-stock-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          background: #ef4444;
          color: #fff;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          z-index: 2;
        }

        .product-img-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F3F4F6;
          color: #9CA3AF;
        }

        /* Products */
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 1.25rem;
        }

        .product-card {
          background: #fff;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          transition: box-shadow 0.2s, transform 0.2s;
        }

        .product-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .product-image-wrap {
          position: relative;
          height: 150px;
          background: #F9FAFB;
          overflow: hidden;
        }

        .product-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s;
        }

        .product-card:hover .product-img {
          transform: scale(1.05);
        }

        .product-actions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          z-index: 2;
        }

        .product-action-btn {
          background: white;
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transform: translateX(10px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #64748b;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          text-decoration: none;
        }

        .product-card:hover .product-action-btn {
          opacity: 1;
          transform: translateX(0);
        }

        .product-card:hover .product-action-btn:nth-child(1) { transition-delay: 0ms; }
        .product-card:hover .product-action-btn:nth-child(2) { transition-delay: 50ms; }

        .product-action-btn:hover {
          background: #F97316;
          color: white;
        }

        .product-action-btn.active {
          color: #ef4444;
        }
        .product-action-btn.active:hover {
          background: #ef4444;
          color: white;
        }

        .product-compare-btn.active {
          background: #F97316;
          color: white;
        }
        .product-compare-btn.active:hover {
          background: #ea580c;
          color: white;
        }

        .product-info {
          padding: 0.85rem 1rem 1rem;
        }

        .product-category {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9ca3af;
          font-weight: 600;
        }

        .product-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: #1e293b;
          margin: 0.3rem 0 0.4rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .product-pricing {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .product-price {
          font-size: 1.1rem;
          font-weight: 700;
          color: #16A34A;
        }

        .product-old-price {
          font-size: 0.82rem;
          color: #9ca3af;
          text-decoration: line-through;
        }

        @media (max-width: 640px) {
          .hero-title {
            font-size: 1.85rem;
          }
          .hero {
            padding: 2.5rem 1.25rem;
          }
          .products-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
          }
          .hero-stats {
            gap: 1rem;
          }
        }
      `}</style>
        </div>
    )
}
