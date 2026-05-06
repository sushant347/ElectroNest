import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { FiHeart, FiBarChart2, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { customerAPI } from '../services/api'
import { HeaderSkeleton, CardGridSkeleton } from '../components/Common/SkeletonLoader'
import imgHeadphones from '../components/images/headphones.png'
import imgLaptops from '../components/images/laptops.png'
import imgMonitors from '../components/images/monitors.png'
import imgSmartphones from '../components/images/smartphones.png'
import imgSpeakers from '../components/images/speakers.png'
import imgTablets from '../components/images/tablets.png'
import imgWatch from '../components/images/smart watches.png'
import imgCamera from '../components/images/camera.png'
import imgDrone from '../components/images/drone.png'
import imgGaming from '../components/images/Gaming Console.png'

const fmt = (p) => new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 }).format(p)
const getArrayData = (data) => data?.results || data || []
const uniqueByName = (items) => {
  const seen = new Set()
  return items.filter(item => {
    const key = (item.name || '').trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
const productNameKey = (name = '') => name
  .replace(/\([^)]*\)/g, '')
  .replace(/\b(color|colour|grade|variant)\s*:\s*[^|,/]+/gi, '')
  .replace(/\s*[-–—]\s*(phantom silver|desert sand|volcano orange|titanium black|starlight|black|white|silver|gold|blue|red|green|orange|purple|pink|gray|grey)\b.*$/i, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase()

const CATALOG_CATEGORIES = [
  'Smartphones', 'Laptops', 'Monitors', 'Tablets', 'Drones', 'Smartwatches', 'PC Builds', 'Speakers', 'Earbuds', 'Headphones',
  'Cameras', 'Gaming Consoles',
]

const HERO_SLIDES = [
  { badge: '💻 Work Ready', title: 'Power Through With Laptops', sub: 'Portable performance for study, creative work and business', cat: 'Laptops', bg: 'linear-gradient(135deg,#eef2ff,#dbeafe)', img: imgLaptops },
  { badge: '📱 Fresh Picks', title: 'Find Your Next Smartphone', sub: 'Flagship cameras, smooth displays and all-day batteries', cat: 'Smartphones', bg: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)', img: imgSmartphones },
  { badge: '🖥️ Desk Upgrade', title: 'Sharper Monitors For Every Setup', sub: 'Gaming, creator and office displays with crisp detail', cat: 'Monitors', bg: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', img: imgMonitors },
  { badge: '📟 Portable Screens', title: 'Tablets For Work And Play', sub: 'Lightweight tablets for notes, streaming and multitasking', cat: 'Tablets', bg: 'linear-gradient(135deg,#ecfeff,#cffafe)', img: imgTablets },
  { badge: '🔊 Room-Filling Sound', title: 'Speakers That Bring The Bass', sub: 'Compact, wireless and smart speakers for every room', cat: 'Speakers', bg: 'linear-gradient(135deg,#fff7ed,#fed7aa)', img: imgSpeakers },
  { badge: '🎧 Audio Essentials', title: 'Headphones Built For Focus', sub: 'Comfortable sound for music, calls and long sessions', cat: 'Headphones', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', img: imgHeadphones },
  { badge: '🎮 Trending', title: 'Level Up Your Gaming Setup', sub: 'Consoles, accessories and gaming peripherals', cat: 'PC Builds', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', img: imgGaming },
  { badge: '⌚ Most Popular', title: 'Wear the Future on Your Wrist', sub: 'Smart watches for fitness, work and everyday style', cat: 'Smartwatches', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', img: imgWatch },
  { badge: '📷 New Arrival', title: 'Capture Every Moment', sub: 'Professional cameras & lenses for every photographer', cat: 'Cameras', bg: 'linear-gradient(135deg,#fef3c7,#fde68a)', img: imgCamera },
  { badge: '🚁 Trending Now', title: 'Take Flight With Drones', sub: 'Aerial cameras and compact drones', cat: 'Drones', bg: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', img: imgDrone },
]

const SIDE = [
  { eyebrow: 'Trend Devices', title: 'Latest Laptops', cat: 'Laptops', bg: 'linear-gradient(135deg,#eef2ff,#dbeafe)', emoji: '💻', img: 'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=600&auto=format' },
  { eyebrow: 'Desk Ready', title: 'Monitors', cat: 'Monitors', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', ec: '#16a34a', emoji: '🖥️' },
  { eyebrow: 'Most Popular', title: 'Popular Watches', cat: 'Smartwatches', bg: 'linear-gradient(135deg,#fff7ed,#ffedd5)', ec: '#F97316', emoji: '⌚' },
]

function getCatEmoji(n) { return { Smartphones: '📱', Laptops: '💻', Monitors: '🖥️', Tablets: '📟', Drones: '🚁', Smartwatches: '⌚', 'PC Builds': '🧩', Speakers: '🔊', Earbuds: '🎧', Headphones: '🎧', Cameras: '📷', 'Gaming Consoles': '🎮' }[n] || '📦' }

function shouldUseContainInCard(categoryName = '', productName = '') {
  return /smartphones|headphones|earbuds|smartwatches|tablets|pc builds|speakers/i.test(categoryName)
    || /phone|headphone|headset|earbud|earphone|airpod|buds|watch|fenix|amazfit/i.test(productName)
}

function cardObjectPosition(categoryName = '', productName = '') {
  const hay = `${categoryName} ${productName}`.toLowerCase()
  return /benq/.test(hay) ? 'center top' : 'center'
}

const CAT_IMGS = {
  Smartphones:    'https://applefun.com.ua/upload/2025-09/0-apple-iphone-17-pro-max-256gb-cosmic-orange-11757497912.webp',
  Laptops:        'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format',
  Monitors:       'https://media.us.lg.com/transform/ecomm-PDPGallery-1100x730/e64bb88d-49a1-4f54-a9dc-de6dd1b33714/md08003935-DZ-07-jpg',
  Tablets:        'https://static1.anpoimages.com/wordpress/wp-content/uploads/2023/08/samsung-galaxy-tab-s9-ultra-plants.jpg',
  Drones:         'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuLYKV8ecGw76FaI258F0yz1VSIe2e4b_H2w&s',
  Smartwatches:   'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmhDiLgjN7ncyoUlQlnhYuS2BLjDl72u_xVQ&s',
  'PC Builds':    'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=600&auto=format',
  Speakers:       'https://www.apple.com/newsroom/images/2024/07/apple-introduces-homepod-mini-in-midnight/article/Apple-HomePod-mini-midnight_inline.jpg.large_2x.jpg',
  Earbuds:         'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=600&auto=format',
  Headphones:      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format',
  Cameras:         'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format',
  'Gaming Consoles': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format',
}

/* Star rating — SVG-based filled / half / empty stars */
const STAR_PTS = "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
let _hmStarId = 0
function HmStar({ fill = 0, size = 14, color = '#F97316' }) {
  const uid = `hmst${++_hmStarId}`
  if (fill >= 1) return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      <polygon points={STAR_PTS} fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  if (fill <= 0) return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      <polygon points={STAR_PTS} fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', flexShrink: 0 }}>
      <defs><clipPath id={uid}><rect x="0" y="0" width="12" height="24" /></clipPath></defs>
      <polygon points={STAR_PTS} fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={STAR_PTS} fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${uid})`} />
    </svg>
  )
}
function Stars({ rating, count, sold }) {
  if (!rating || rating <= 0) return null
  return (
    <div className="hm-stars">
      {[1,2,3,4,5].map(n => {
        const fill = rating >= n ? 1 : rating >= n - 0.5 ? 0.5 : 0
        return <HmStar key={n} fill={fill} size={14} />
      })}
      <span className="hm-star-ct">
        {rating.toFixed(1)} /5
        {count > 0 ? ` (${count})` : ''}
        {Number(sold || 0) > 0 ? ` ${Number(sold).toLocaleString('en-NP')} sold` : ''}
      </span>
    </div>
  )
}

export default function Home({ addToCart, toggleWishlist, wishlistItems = [], toggleCompare, compareItems = [] }) {
  const [cats, setCats] = useState([])
  const [prods, setProds] = useState([])
  const [sideImgs, setSideImgs] = useState({})
  const [compactImages, setCompactImages] = useState({})
  const [loading, setLoading] = useState(true)
  const [selCat, setSelCat] = useState(null)
  const [slide, setSlide] = useState(0)
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const prodRef = useRef(null)
  const timerRef = useRef(null)
  const suppressScrollRef = useRef(false)
  const catParam = sp.get('cat') || ''
  const searchQ = sp.get('search') || ''

  /* ── Smart Filter state ── */
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [selBrands, setSelBrands] = useState([])
  const [selStores, setSelStores] = useState([])
  const allBrands = [...new Set(prods.map(p => (p.brand || p.Brand || '')).filter(Boolean))].sort()
  const allStores = [...new Set(prods.map(p => (p.owner_name || p.OwnerName || '').trim()).filter(Boolean))].sort()
  const clearFilters = () => { setMinPrice(''); setMaxPrice(''); setSortBy(''); setSelBrands([]); setSelStores([]) }
  const hasFilters = minPrice || maxPrice || sortBy || selBrands.length > 0 || selStores.length > 0

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 2000)
  }
  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current) }, [])
  useEffect(() => { if (searchQ && prodRef.current) prodRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [searchQ])
  useEffect(() => {
    if (catParam && prodRef.current) {
      if (suppressScrollRef.current) { suppressScrollRef.current = false; return }
      prodRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [catParam])
  useEffect(() => { setSelCat(catParam || null) }, [catParam])

  useEffect(() => {
    const load = async (attempt = 1) => {
      setLoading(true)
      try {
        const catRes = await customerAPI.getCategories()
        const catData = uniqueByName(getArrayData(catRes.data).filter(cat => CATALOG_CATEGORIES.includes(cat.name)))
        setCats(catData)

        const activeCategory = catParam
          ? catData.find(cat => (cat.name || '').toLowerCase() === catParam.toLowerCase())
          : null
        let loadedProducts
        if (activeCategory || searchQ) {
          const productParams = {
            page_size: 120,
            ...(activeCategory ? { category: activeCategory.id } : {}),
            ...(searchQ ? { search: searchQ } : {}),
          }
          const allRes = await customerAPI.getProducts(productParams)
          loadedProducts = getArrayData(allRes.data)
        } else {
          const categoryResults = await Promise.all(catData.map(cat =>
            customerAPI.getProducts({ category: cat.id, page_size: 40 }).then(res => getArrayData(res.data)).catch(() => [])
          ))
          const byId = new Map()
          categoryResults.flat().forEach(product => {
            if (product?.id != null) byId.set(product.id, product)
          })
          loadedProducts = [...byId.values()]
        }

        setProds(loadedProducts)

        if (Object.keys(sideImgs).length === 0) {
          const imgs = {}
          await Promise.all(SIDE.map(async ({ cat }) => {
            const sideCategory = catData.find(c => (c.name || '').toLowerCase() === cat.toLowerCase())
            if (!sideCategory) return
            try {
              const res = await customerAPI.getProducts({ category: sideCategory.id, page_size: 1 })
              const p = getArrayData(res.data).find(x => x.image_url || x.ProductImageURL)
              if (p) imgs[cat] = p.image_url || p.ProductImageURL
            } catch {
              // Side images are decorative; product loading should not fail because of them.
            }
          }))
          setSideImgs(imgs)
        }
      } catch (e) {
        console.error(e)
        if (attempt === 1) { setTimeout(() => load(2), 3000); return }
      } finally { setLoading(false) }
    }
    load()
  }, [catParam, searchQ])

  /* Per-product image variants — alternates by position: 1,3,5 → urls[0]  2,4,6 → urls[1]
     test: substring checked against product name (case-insensitive) */
  const PRODUCT_IMG_VARIANTS = [
    {
      test: 'Bose SoundLink Max',
      urls: [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRKnOXmp6zjsiVUFiIBhoIyCGVEqM9KXgWibQ&s',
        'https://cdn.mos.cms.futurecdn.net/v2/t:0,l:240,cw:1440,ch:1080,q:80,w:1440/PRQ4anjB2jE5oRS9asn4H5.jpg',
      ],
    },
    {
      test: 'Peak Design Mobile Wallet',
      urls: [
        'https://cdn.shopify.com/s/files/1/2986/1172/files/standwallet-eclipse-phone2_9f553493-c030-496e-bb4f-208e741ddba1.jpg?v=1762276031',
        'https://suburban.com.hk/cdn/shop/files/colorblocking_1024x1024_9a0527a8-de3e-434b-9bbc-8bf45a2299f4.gif?v=1709797512',
      ],
    },
    {
      test: 'Huawei Watch GT 5 Pro',
      urls: [
        'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWA8DSzeBOkzmtfR5dkDSX0HKBf8_lGGGv1g&s',
        'https://cdn.hukut.com/huawei-watch-gt-5-pro-2.png1736148189875',
      ],
    },
  ]

  /* norm: discount_price set by owner → product is on sale.
     price    = what the customer pays  (discount_price if set, else selling_price)
     origPrice= the original ticket price (selling_price), only present when on sale */
  const norm = p => {
    const selling = parseFloat(p.selling_price || p.SellingPrice || 0)
    const disc    = p.discount_price != null && p.discount_price !== '' ? parseFloat(p.discount_price) : null
    const onSale  = disc !== null && disc > 0 && disc < selling
    const pname   = p.name || p.ProductName || ''
    return {
      id:            p.id,
      name:          pname,
      category:      p.category_name || '',
      price:         onSale ? disc : selling,
      origPrice:     onSale ? selling : null,
      savings:       onSale ? Math.round(selling - disc) : null,
      discPct:       onSale ? Math.round((1 - disc / selling) * 100) : null,
      onSale,
      image:         p.image_url || p.ProductImageURL || '',
      fallbackImage: p.image_url || p.ProductImageURL || '',
      brand:         p.brand || p.Brand || '',
      ownerName:     p.owner_name || p.OwnerName || '',
      stock:         p.stock || p.Stock || 0,
      sold:          parseInt(p.units_sold || p.UnitsSold || 0),
      rating:        parseFloat(p.average_rating || 0),
      reviews:       parseInt(p.review_count || 0),
      ratingCount:   parseInt(p.rating_count || p.review_count || 0),
    }
  }

  /* Apply image variants after list is finalised so position index is stable */
  const applyImgVariants = (list) => {
    const counters = {}
    return list.map(p => {
      const entry = PRODUCT_IMG_VARIANTS.find(v => p.name.toLowerCase().includes(v.test.toLowerCase()))
      if (!entry) return p
      const key = entry.test
      const idx = counters[key] ?? 0
      counters[key] = idx + 1
      return { ...p, image: entry.urls[idx % entry.urls.length], fallbackImage: entry.urls[(idx + 1) % entry.urls.length] }
    })
  }

  const displayProds = (() => {
    let f = prods
    if (searchQ) { const q = searchQ.toLowerCase(); f = f.filter(p => norm(p).name.toLowerCase().includes(q) || norm(p).brand.toLowerCase().includes(q) || norm(p).category.toLowerCase().includes(q)) }
    if (selCat) f = f.filter(p => norm(p).category === selCat)

    let items
    if (selCat || searchQ) {
      items = f.map(norm)
    } else {
      const n = f.map(norm)
      const byStore = {}
      n.forEach(p => {
        const store = (p.ownerName || '').trim() || 'Unknown Store'
        if (!byStore[store]) byStore[store] = []
        byStore[store].push(p)
      })
      const out = []
      const featuredNames = new Set()
      Object.values(byStore)
        .sort((a, b) => ((a[0]?.ownerName || '').localeCompare(b[0]?.ownerName || '')))
        .forEach(group => {
          const storeName = (group[0]?.ownerName || '').trim()
          const usedCategories = new Set()
          let storeCount = 0
          const sortedGroup = [...group].sort((a, b) => (b.sold - a.sold) || (b.rating - a.rating) || (b.price - a.price))
          const addFeatured = (product) => {
            const key = productNameKey(product.name)
            if (!key || featuredNames.has(key) || out.length >= 50 || storeCount >= 5) return false
            featuredNames.add(key)
            out.push(product)
            storeCount += 1
            return true
          }

          for (const product of sortedGroup) {
            if (usedCategories.has(product.category)) continue
            if (addFeatured(product)) {
              usedCategories.add(product.category)
              if (usedCategories.size >= 5) break
            }
          }

          if (usedCategories.size < 5) {
            for (const product of sortedGroup) {
              addFeatured(product)
              if (storeCount >= 5) break
            }
          }
        })
      items = out
    }

    // ── Apply smart filters ──
    if (minPrice) items = items.filter(p => p.price >= parseFloat(minPrice))
    if (maxPrice) items = items.filter(p => p.price <= parseFloat(maxPrice))
    if (selBrands.length > 0) items = items.filter(p => selBrands.includes(p.brand))
    if (selStores.length > 0) items = items.filter(p => selStores.includes((p.ownerName || '').trim()))
    if (sortBy === 'price_low') items = [...items].sort((a, b) => a.price - b.price)
    else if (sortBy === 'price_high') items = [...items].sort((a, b) => b.price - a.price)
    else if (sortBy === 'best_selling') items = [...items].sort((a, b) => b.sold - a.sold)
    else if (sortBy === 'top_rated') items = [...items].sort((a, b) => b.rating - a.rating)
    else if (sortBy === 'newest') items = [...items].sort((a, b) => b.id - a.id)

    return applyImgVariants(items)
  })()

  const markCompactIfOverflowing = (event, productId) => {
    const img = event.currentTarget
    if (!img?.naturalWidth || !img?.naturalHeight) return
    const ratio = img.naturalHeight / img.naturalWidth
    const category = img.dataset.category || ''
    const categoryNeedsCare = /tablets|pc builds|speakers/i.test(category)
    const shouldCompact = ratio > (categoryNeedsCare ? 1.08 : 1.28)
    if (shouldCompact) {
      setCompactImages(prev => prev[productId] ? prev : { ...prev, [productId]: true })
    }
  }

  const handleCat = (name) => { suppressScrollRef.current = true; if (selCat === name) { setSelCat(null); nav('/') } else { setSelCat(name); nav(`/?cat=${encodeURIComponent(name)}`) } }
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
              <div className="hm-s-imgbox lg">{(SIDE[0].img || sideImgs[SIDE[0].cat]) ? <img src={SIDE[0].img || sideImgs[SIDE[0].cat]} alt={SIDE[0].title} className="hm-s-img" /> : <span className="hm-s-em">{SIDE[0].emoji}</span>}</div>
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
            return (
              <div key={cat.id || cat.name} className={`hm-cat${active ? ' act' : ''}`} onClick={() => handleCat(cat.name)}>
                <div className="hm-cat-circle">
                  {CAT_IMGS[cat.name]
                    ? <img src={CAT_IMGS[cat.name]} alt={cat.name} className="hm-cat-img" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                    : null}
                  <span className="hm-cat-em" style={{ display: CAT_IMGS[cat.name] ? 'none' : 'flex' }}>{getCatEmoji(cat.name)}</span>
                </div>
                <span className="hm-cat-nm">{cat.name}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Smart Filter Bar ── */}
      <section className="hm-filter-sec">
        <div className="hm-filter-bar">
          <div className="hm-filter-field">
            <span className="hm-filter-cap">Sort</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className={`hm-filter-select${sortBy ? ' active' : ''}`}
            >
              <option value="">Default</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
              <option value="best_selling">Best Selling</option>
              <option value="top_rated">Top Rated</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          {allStores.length > 0 && (
            <div className="hm-filter-field">
              <span className="hm-filter-cap">Store</span>
              <select
                value={selStores.length === 1 ? selStores[0] : ''}
                onChange={e => setSelStores(e.target.value ? [e.target.value] : [])}
                className={`hm-filter-select${selStores.length > 0 ? ' active' : ''}`}
              >
                <option value="">All</option>
                {allStores.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {allBrands.length > 0 && (
            <div className="hm-filter-field">
              <span className="hm-filter-cap">Brand</span>
              <select
                value={selBrands.length === 1 ? selBrands[0] : ''}
                onChange={e => setSelBrands(e.target.value ? [e.target.value] : [])}
                className={`hm-filter-select${selBrands.length > 0 ? ' active' : ''}`}
              >
                <option value="">All</option>
                {allBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          )}

          <div className="hm-filter-field price">
            <span className="hm-filter-cap">Min Price</span>
            <input
              type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
              className={`hm-filter-input${minPrice ? ' active' : ''}`}
            />
          </div>
          <div className="hm-filter-field price">
            <span className="hm-filter-cap">Max Price</span>
            <input
              type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
              className={`hm-filter-input${maxPrice ? ' active' : ''}`}
            />
          </div>

          <div className="hm-filter-actions">
            <span className="hm-filter-count">
              {displayProds.length} product{displayProds.length !== 1 ? 's' : ''}
            </span>
            {hasFilters && (
              <button className="hm-filter-clear" onClick={clearFilters}>
                ✕ Clear All
              </button>
            )}
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="hm-prods-sec" ref={prodRef}>
        <div className="hm-prods-hdr">
          <h2 className="hm-prods-ttl">
            {searchQ ? `Results for "${searchQ}"` : selCat ? selCat : <><span className="hm-fire">🔥</span> Featured Products</>}
            {(selCat || searchQ) && <button className="hm-clr" onClick={() => { setSelCat(null); nav('/') }}>✕ Clear</button>}
          </h2>
          {!selCat && !searchQ && <span className="hm-prods-sub">Handpicked deals just for you</span>}
        </div>
        {loading ? (
          <div className="hm-loading-shell">
            <HeaderSkeleton titleWidth={210} subtitleWidth={150} showAction={false} />
            <CardGridSkeleton cards={8} columns="repeat(4, minmax(0, 1fr))" minHeight={280} />
          </div>
        ) : displayProds.length === 0 ? (
          <div className="hm-ld"><p style={{ color: '#64748b' }}>No products found.</p></div>
        ) : (
          <div className="hm-grid">
            {displayProds.map(product => {
              const inW = wishlistItems.some(i => i.id === product.id)
              const inC = compareItems.some(i => i.id === product.id)
              return (
                <div key={product.id} className="hm-card">

                  {/* ── Image area (contains all overlays) ── */}
                  <div className={`hm-card-img${compactImages[product.id] ? ' compact' : ''}`}>
                    <Link to={`/product/${product.id}`} className="hm-img-link">
                      <img
                        src={product.image || product.fallbackImage}
                        alt={product.name}
                        className={`hm-pimg${compactImages[product.id] ? ' compact' : ''}`}
                        style={{
                          objectFit: compactImages[product.id] || shouldUseContainInCard(product.category, product.name) ? 'contain' : 'cover',
                          objectPosition: cardObjectPosition(product.category, product.name),
                        }}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        data-category={product.category}
                        onLoad={e => markCompactIfOverflowing(e, product.id)}
                        onError={e => {
                          if (e.currentTarget.dataset.fb === '1') {
                            e.currentTarget.style.display = 'none'
                            return
                          }
                          e.currentTarget.dataset.fb = '1'
                          e.currentTarget.src = product.fallbackImage
                        }}
                      />
                    </Link>

                    {/* ON SALE — large badge top-left */}
                    {product.onSale && product.stock > 0 && (
                      <span className="hm-on-sale">ON SALE</span>
                    )}
                    {product.stock <= 0 && (
                      <span className="hm-oos">Out of Stock</span>
                    )}

                    {/* Heart + Compare — circular buttons stacked on right (like image 2) */}
                    <div className="hm-card-icons">
                      <button className={`hm-icon-btn${inW ? ' wact' : ''}`} onClick={() => toggleWishlist(product)} title="Wishlist">
                        <FiHeart size={18} style={inW ? { fill: '#ef4444', stroke: '#ef4444' } : {}} />
                      </button>
                      <button className={`hm-icon-btn${inC ? ' cact' : ''}`} onClick={() => toggleCompare(product)} title="Compare">
                        <FiBarChart2 size={17} />
                      </button>
                    </div>
                  </div>

                  {/* ── Info area ── */}
                  <div className="hm-pinfo">
                    {/* Brand */}
                    {product.brand && <span className="hm-brand-name">{product.brand.toUpperCase()}</span>}

                    {/* Product name */}
                    <Link to={`/product/${product.id}`} className="hm-pnm-link">
                      <h3 className="hm-pnm">{product.name}</h3>
                    </Link>

                    {/* Stars */}
                    <Stars rating={product.rating} count={product.ratingCount} sold={product.sold} />

                    {/* Store */}
                    {product.ownerName && <span className="hm-pown">{product.ownerName}</span>}

                    {/* ── Sale ticket ── */}
                    {product.onSale ? (
                      <div className="hm-ticket">
                        {/* Label row */}
                        <div className="hm-ticket-label">
                          <span>SPECIAL OFFER</span>
                          <span>🔥</span>
                        </div>
                        {/* Price + icon */}
                        <div className="hm-ticket-price-row">
                          <div className="hm-ticket-price-stack">
                            <span className="hm-ticket-orig">{fmt(product.origPrice)}</span>
                            <span className="hm-ticket-price">{fmt(product.price)}</span>
                          </div>
                          <span className="hm-ticket-icon">🎫</span>
                        </div>
                        {/* Save + limited time */}
                        <div className="hm-ticket-save-row">
                          <span className="hm-ticket-save">Save {fmt(product.savings)}</span>
                          <span className="hm-ticket-ltd">⏰ Limited Time</span>
                        </div>
                      </div>
                    ) : (
                      /* ── Plain price (no sale) ── */
                      <div className="hm-plain-price">
                        <span className="hm-price">{fmt(product.price)}</span>
                      </div>
                    )}

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
.hm-s-imgbox{flex-shrink:0;border-radius:10px;overflow:hidden;background:rgba(255,255,255,.45);display:flex;align-items:center;justify-content:center;}
.hm-s-imgbox.lg{width:140px;height:140px;}
.hm-s-imgbox.sm{width:80px;height:80px;}
.hm-s-img{width:100%;height:100%;object-fit:cover;display:block;}

/* FILTER BAR */
.hm-filter-sec{max-width:1200px;margin:18px auto 0;padding:0 24px;}
.hm-filter-bar{background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:12px 14px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:end;}
.hm-filter-field{display:flex;flex-direction:column;gap:6px;}
.hm-filter-field.price{min-width:120px;}
.hm-filter-cap{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em;}
.hm-filter-select{border:1.5px solid #e2e8f0;background:#f8fafc;font-size:13px;font-weight:700;color:#334155;outline:none;cursor:pointer;border-radius:10px;padding:7px 10px;min-width:160px;transition:border-color .15s,background .15s,color .15s;}
.hm-filter-select.active{border-color:#F97316;background:#fff7ed;color:#c2410c;}
.hm-filter-input{width:120px;padding:7px 10px;border-radius:10px;border:1.5px solid #e2e8f0;background:#f8fafc;font-size:13px;outline:none;color:#334155;transition:border-color .15s,background .15s,color .15s;}
.hm-filter-input.active{border-color:#F97316;background:#fff7ed;color:#c2410c;}
.hm-filter-actions{display:flex;align-items:center;justify-content:center;gap:10px;}
.hm-filter-count{font-size:12px;color:#F97316;font-weight:800;}
.hm-filter-clear{padding:6px 14px;border-radius:999px;border:1px solid #fecaca;background:#fef2f2;color:#ef4444;font-size:12px;font-weight:800;cursor:pointer;transition:background .15s,color .15s,border-color .15s;}
.hm-filter-clear:hover{background:#b91c1c;color:#fff;border-color:#991b1b;}

@media (max-width: 900px){
  .hm-filter-bar{grid-template-columns:repeat(auto-fit,minmax(140px,1fr));}
}
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
/* PRODUCTS SECTION */
.hm-prods-sec{background:#F3F4F6;padding:1.5rem 3rem;width:100%;}
.hm-prods-hdr{display:flex;flex-direction:column;align-items:center;margin-bottom:1.4rem;gap:.2rem;}
.hm-prods-ttl{font-size:1.4rem;font-weight:800;color:#232F3E;display:flex;align-items:center;justify-content:center;gap:.5rem;margin:0;}
.hm-fire{font-size:1.2rem;}
.hm-prods-sub{font-size:.78rem;color:#64748b;font-weight:500;letter-spacing:.02em;}
.hm-clr{font-size:.77rem;color:#F97316;background:none;border:1px solid #fed7aa;border-radius:4px;cursor:pointer;font-weight:600;padding:3px 10px;}
.hm-ld{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:160px;gap:10px;color:#64748b;}
.hm-loading-shell{display:flex;flex-direction:column;gap:1rem;}
.hm-spin{width:32px;height:32px;border:4px solid #e2e8f0;border-top:4px solid #F97316;border-radius:50%;animation:hmSpin .8s linear infinite;}
@keyframes hmSpin{to{transform:rotate(360deg);}}
/* PRODUCT GRID */
.hm-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.25rem;width:100%;}

/* ── PRODUCT CARD ── */
.hm-card{background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;transition:box-shadow .22s,transform .22s;display:flex;flex-direction:column;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.hm-card:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(0,0,0,.12);}

/* ── IMAGE WRAPPER (all overlays inside) ── */
.hm-card-img{position:relative;height:210px;background:#f8fafc;overflow:hidden;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0;box-sizing:border-box;}
.hm-card-img.compact{background:#fff;padding:14px;}
.hm-img-link{display:block;width:100%;height:100%;}
.hm-pimg{width:100%;height:100%;max-width:100%;max-height:100%;background:#fff;transition:transform .35s ease;display:block;}
.hm-pimg.compact{transform:scale(.88);}
.hm-card:hover .hm-pimg{transform:scale(1.025);}
.hm-card:hover .hm-pimg.compact{transform:scale(.92);}

/* ON SALE — large, top-left of image */
.hm-on-sale{position:absolute;top:0;left:0;background:#F97316;color:#fff;font-size:.88rem;font-weight:900;padding:6px 14px;border-radius:0 0 8px 0;letter-spacing:.06em;text-transform:uppercase;box-shadow:2px 2px 8px rgba(249,115,22,.4);z-index:3;line-height:1.2;}

/* Out of stock overlay */
.hm-oos{position:absolute;top:0;left:0;background:rgba(0,0,0,.6);color:#fff;font-size:.72rem;font-weight:700;padding:6px 12px;border-radius:0 0 8px 0;z-index:3;letter-spacing:.04em;}

/* Heart + Compare — circular stacked on right side of image */
.hm-card-icons{position:absolute;top:10px;right:10px;display:flex;flex-direction:column;gap:8px;z-index:4;}
.hm-icon-btn{background:#fff;border:none;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#64748b;box-shadow:0 2px 8px rgba(0,0,0,.15);transition:all .18s;flex-shrink:0;}
.hm-icon-btn:hover{background:#F97316;color:#fff;box-shadow:0 3px 10px rgba(249,115,22,.4);}
.hm-icon-btn.wact{color:#ef4444;}
.hm-icon-btn.wact svg{fill:#ef4444;stroke:#ef4444;}
.hm-icon-btn.wact:hover{background:#ef4444;color:#fff;}
.hm-icon-btn.cact{background:#F97316;color:#fff;}
/* Desktop only: hide icons until card hover */
@media(hover:hover) and (pointer:fine){
  .hm-icon-btn{opacity:0;transform:translateX(8px);}
  .hm-card:hover .hm-icon-btn{opacity:1;transform:translateX(0);}
  .hm-icon-btn.wact{opacity:1;transform:translateX(0);}
}

/* ── INFO SECTION ── */
.hm-pinfo{padding:.75rem .95rem .9rem;display:flex;flex-direction:column;flex:1;}

/* Brand */
/* Brand — orange, bold italic like the reference */
.hm-brand-name{font-size:.82rem;font-weight:900;color:#F97316;letter-spacing:.05em;font-style:italic;line-height:1;margin-bottom:.3rem;}

/* Product name — bold, larger, matches reference image weight */
.hm-pnm-link{text-decoration:none;color:inherit;}
.hm-pnm{font-size:1rem;font-weight:700;color:#111827;margin:0 0 .4rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.38;}

/* Stars */
.hm-stars{display:flex;align-items:center;gap:2px;margin-bottom:.35rem;}
.hm-star{font-size:1.05rem;line-height:1;}
.hm-star-full{color:#F97316;}
.hm-star-half{color:#F97316;}
.hm-star-empty{color:#d1d5db;}
.hm-star-ct{font-size:.75rem;color:#64748b;margin-left:5px;font-weight:500;}

/* Store */
.hm-pown{font-size:.6rem;padding:2px 6px;border-radius:4px;font-weight:500;background:#FFF7ED;color:#EA580C;width:fit-content;margin-bottom:.45rem;}

/* ── Plain price (no sale) ── */
.hm-plain-price{margin-top:auto;padding-top:4px;}
.hm-price{font-size:1.1rem;font-weight:700;color:#16A34A;}

/* ════════════════════════════════════════
   SALE TICKET — Premium elevated card
   ════════════════════════════════════════ */
.hm-ticket{background:linear-gradient(135deg,#fff7ed,#ffe0b2);border:1px solid #fed7aa;box-shadow:0 10px 25px rgba(255,115,0,.18);border-radius:12px;padding:11px 13px 12px;margin-top:auto;transition:transform .2s ease,box-shadow .2s ease;cursor:default;}
.hm-ticket:hover{transform:scale(1.02);box-shadow:0 12px 30px rgba(255,115,0,.25);}

/* SPECIAL OFFER pill badge */
.hm-ticket-label{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.hm-ticket-label span:first-child{background:#fff;color:#F97316;padding:3px 10px;border-radius:999px;font-size:.68rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 1px 4px rgba(249,115,22,.15);}
.hm-ticket-label span:last-child{font-size:.9rem;line-height:1;}

/* Price row */
.hm-ticket-price-row{display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;}
.hm-ticket-price-stack{display:flex;flex-direction:column;gap:1px;}
.hm-ticket-orig{font-size:.78rem;font-weight:500;color:#9ca3af;text-decoration:line-through;line-height:1;}
.hm-ticket-price{font-size:1.75rem;font-weight:800;color:#1f2937;letter-spacing:-.03em;line-height:1;}
.hm-ticket-icon{font-size:1.35rem;line-height:1;flex-shrink:0;align-self:center;}

/* Save + limited time — proper flex alignment */
.hm-ticket-save-row{display:flex;align-items:center;justify-content:space-between;gap:6px;}
.hm-ticket-save{font-size:.81rem;font-weight:600;color:#16a34a;line-height:1;}
.hm-ticket-ltd{font-size:.62rem;font-weight:500;color:#94a3b8;white-space:nowrap;line-height:1;}

/* ADD TO CART */
.hm-abtn{width:100%;margin-top:.6rem;padding:.52rem 0;background:#F97316;color:#fff;border:none;border-radius:8px;font-size:.82rem;font-weight:700;font-family:inherit;cursor:pointer;transition:background .15s,transform .1s;letter-spacing:.01em;}
.hm-abtn:hover{background:#ea580c;transform:translateY(-1px);}
.hm-abtn:disabled{background:#d1d5db;cursor:not-allowed;transform:none;}

/* RESPONSIVE */
@media(max-width:1024px){.hm-layout{grid-template-columns:1fr 300px;}.hm-grid{grid-template-columns:repeat(3,1fr);}}
@media(max-width:768px){.hm-layout{grid-template-columns:1fr;}.hm-side-col{flex-direction:row;}.hm-side-lg{flex:2;}.hm-side-row{flex:1;flex-direction:column;gap:.85rem;}.hm-side-sm{min-height:0;flex:1;}.hm-grid{grid-template-columns:repeat(3,1fr);}.hm-prods-sec{padding:1.25rem 1.5rem;}.hm-card-img{height:185px;}}
@media(max-width:640px){.hm-hero-sec{padding:.85rem;}.hm-controls{display:none;}.hm-banner-cta{bottom:.6rem;left:.75rem;}.hm-shopbtn{padding:.45rem 1rem;font-size:.75rem;}.hm-s-btn{padding:.28rem .6rem;font-size:.68rem;}.hm-s-btn.sm{padding:.22rem .5rem;font-size:.64rem;}.hm-layout{grid-template-columns:1fr;}.hm-side-col{flex-direction:column;}.hm-side-row{grid-template-columns:1fr 1fr;}.hm-cats-sec{padding:1rem .85rem .5rem;}.hm-prods-sec{padding:1rem .85rem;}.hm-grid{grid-template-columns:repeat(2,1fr);gap:.75rem;}.hm-card-img{height:155px;}.hm-card-img.compact{padding:10px;}.hm-on-sale{font-size:.72rem;padding:5px 10px;}.hm-pnm{font-size:.85rem;}.hm-cat-circle{width:76px;height:76px;}.hm-cat-nm{max-width:76px;font-size:.71rem;}.hm-ticket{padding:9px 11px 10px;}.hm-ticket-price{font-size:1.25rem;}.hm-ticket-icon{font-size:1.1rem;}.hm-ticket-save{font-size:.72rem;}.hm-ticket-ltd{display:none;}.hm-icon-btn{width:32px;height:32px;}}
`
