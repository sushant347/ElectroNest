import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { ownerAPI } from '../../services/api';
import SalesOverviewCards from '../../components/Owner/SalesOverviewCards';
import RevenueChart from '../../components/Owner/RevenueChart';
import TopProductsTable from '../../components/Owner/TopProductsTable';
import CategoryChart from '../../components/Owner/CategoryChart';

// ── Inline: FilterButtons ──
function FilterButtons({ selectedRange, onRangeChange }) {
  const ranges = [
    { label: 'Last 7 Days', value: 7 },
    { label: 'Last 30 Days', value: 30 },
    { label: 'Last 90 Days', value: 90 },
    { label: 'Last 365 Days', value: 365 },
  ];
  return (
    <div className="owner-filter-btns">
      {ranges.map((r) => (
        <button key={r.value} className={`owner-filter-btn ${selectedRange === r.value ? 'active' : ''}`} onClick={() => onRangeChange(r.value)}>
          {r.label}
        </button>
      ))}
    </div>
  );
}

// ── Inline: useDashboardData hook ──
function useDashboardData(timeRange) {
  const [salesData, setSalesData] = useState(null);
  const [revenueTrend, setRevenueTrend] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [salesRes, trendRes, topRes, catRes] = await Promise.all([
        ownerAPI.getSalesOverview({ days: timeRange }),
        ownerAPI.getRevenueTrend({ days: timeRange }),
        ownerAPI.getTopProducts({ days: timeRange }),
        ownerAPI.getCategoryPerformance({ days: timeRange }),
      ]);
      setSalesData(salesRes.data);
      setRevenueTrend(trendRes.data);
      setTopProducts(topRes.data);
      setCategoryData(catRes.data);
    } catch (err) {
      const msg = !err.response ? 'Network error. Please check your connection.'
        : err.response.status === 403 ? 'You do not have permission to view this data'
        : err.response.status === 500 ? 'Server error. Please try again later.'
        : 'An error occurred. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { salesData, revenueTrend, topProducts, categoryData, loading, error, refetch: fetchData };
}

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState(30);
  const { salesData, revenueTrend, topProducts, categoryData, loading, error, refetch } = useDashboardData(timeRange);

  // ── Interactive filter states ──
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minRevenue, setMinRevenue] = useState(0);
  const maxRevenueValue = useMemo(() => {
    if (!topProducts || !topProducts.length) return 100;
    return Math.max(...topProducts.map((p) => p.total_revenue));
  }, [topProducts]);

  // Derive unique categories from top products
  const categoryOptions = useMemo(() => {
    if (!topProducts) return [];
    return [...new Set(topProducts.map((p) => p.category))].filter(Boolean);
  }, [topProducts]);

  // Filtered products for the table
  const filteredTopProducts = useMemo(() => {
    if (!topProducts) return null;
    return topProducts.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (p.total_revenue < minRevenue) return false;
      return true;
    });
  }, [topProducts, selectedCategory, minRevenue]);

  const fmtShort = (v) => { if (v >= 100000) return `Rs.${(v / 100000).toFixed(1)}L`; if (v >= 1000) return `Rs.${(v / 1000).toFixed(0)}K`; return `Rs.${v}`; };

  return (
    <div className="owner-dash">
      {/* Header */}
      <div className="owner-dash-header">
        <div>
          <h1 className="owner-dash-title">Store Dashboard</h1>
          <p className="owner-dash-sub">Welcome back! Here's what's happening with your store.</p>
        </div>
        <div className="owner-dash-controls">
          <FilterButtons selectedRange={timeRange} onRangeChange={setTimeRange} />
          <button className="owner-refresh-btn" onClick={refetch} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="owner-dash-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={refetch} className="owner-retry-btn">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <section className="owner-dash-section">
        <SalesOverviewCards data={salesData} loading={loading} />
      </section>

      {/* Revenue Chart */}
      <section className="owner-dash-section">
        <RevenueChart data={revenueTrend} loading={loading} />
      </section>

      {/* Bottom Row: Products + Category */}
      <section className="owner-dash-section">
        {/* ── Interactive Filters: Dropdown + Slider ── */}
        <div className="dash-filters-bar">
          <SlidersHorizontal size={16} color="#6b7280" />
          <span className="dash-filters-label">Product Filters:</span>

          {/* Category Dropdown */}
          <div className="dash-filter-group">
            <label className="dash-filter-lbl">Category</label>
            <select className="dash-filter-select" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Revenue Slider */}
          <div className="dash-filter-group dash-slider-group">
            <label className="dash-filter-lbl">Min Revenue: {fmtShort(minRevenue)}</label>
            <input type="range" className="dash-filter-slider" min={0} max={maxRevenueValue} step={Math.max(1, Math.round(maxRevenueValue / 100))} value={minRevenue} onChange={(e) => setMinRevenue(Number(e.target.value))} />
          </div>

          <button className="dash-filter-reset" onClick={() => { setSelectedCategory('all'); setMinRevenue(0); }}>Reset</button>
        </div>
      </section>

      <section className="owner-dash-bottom">
        <div className="owner-dash-bottom-left">
          <TopProductsTable data={filteredTopProducts} loading={loading} />
        </div>
        <div className="owner-dash-bottom-right">
          <CategoryChart data={categoryData} loading={loading} />
        </div>
      </section>

      <style>{`
        .owner-dash {
          min-height: calc(100vh - 120px);
          background: #F3F4F6;
          padding: 2rem 2rem 3rem;
        }
        .owner-dash-header {
          max-width: 1280px; margin: 0 auto 1.5rem;
          display: flex; align-items: flex-start; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
        }
        .owner-dash-title { font-size: 1.65rem; font-weight: 800; color: #1e293b; margin: 0; }
        .owner-dash-sub { font-size: 0.88rem; color: #6b7280; margin-top: 0.2rem; }
        .owner-dash-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .owner-refresh-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 0.5rem 1rem; border-radius: 8px;
          background: #232F3E; color: #fff; font-weight: 600;
          font-size: 0.82rem; cursor: pointer; border: none;
          font-family: inherit; transition: background 0.15s;
        }
        .owner-refresh-btn:hover { background: #37475A; }
        .owner-refresh-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .spin { animation: spinAnim 1s linear infinite; }
        @keyframes spinAnim { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        .owner-dash-error {
          max-width: 1280px; margin: 0 auto 1.25rem;
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.85rem 1.25rem; border-radius: 10px;
          background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626;
          font-size: 0.85rem; font-weight: 500;
        }
        .owner-retry-btn {
          margin-left: auto; padding: 0.35rem 0.85rem; border-radius: 6px;
          background: #DC2626; color: #fff; font-weight: 600; font-size: 0.78rem;
          border: none; cursor: pointer; font-family: inherit;
        }
        .owner-retry-btn:hover { background: #b91c1c; }

        .owner-dash-section { max-width: 1280px; margin: 0 auto 1.5rem; }

        .owner-dash-bottom {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: 1.5fr 1fr; gap: 1.25rem;
        }
        .owner-dash-bottom-left { min-width: 0; }
        .owner-dash-bottom-right { min-width: 0; }

        @media (max-width: 900px) {
          .owner-dash { padding: 1.25rem; }
          .owner-dash-bottom { grid-template-columns: 1fr; }
          .owner-dash-header { flex-direction: column; }
        }

        /* FilterButtons */
        .owner-filter-btns { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .owner-filter-btn {
          padding: 0.45rem 1rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; border: 1.5px solid #d1d5db; background: #fff; color: #4b5563;
          font-family: inherit; transition: all 0.15s;
        }
        .owner-filter-btn:hover { background: #f3f4f6; border-color: #9ca3af; }
        .owner-filter-btn.active { background: #F97316; color: #fff; border-color: #F97316; }
        .owner-filter-btn.active:hover { background: #ea580c; border-color: #ea580c; }
        @media (max-width: 480px) { .owner-filter-btns { display: grid; grid-template-columns: 1fr 1fr; } }

        /* Dashboard Filters */
        .dash-filters-bar {
          display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
          background: #fff; padding: 0.85rem 1.25rem; border-radius: 12px;
          border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }
        .dash-filters-label { font-size: 0.82rem; font-weight: 700; color: #374151; }
        .dash-filter-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .dash-filter-lbl { font-size: 0.7rem; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.03em; }
        .dash-filter-select {
          padding: 0.4rem 0.75rem; border-radius: 8px; border: 1.5px solid #d1d5db;
          font-size: 0.82rem; font-family: inherit; color: #1e293b; background: #fff;
          cursor: pointer; min-width: 160px;
        }
        .dash-filter-select:focus { outline: none; border-color: #F97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .dash-slider-group { min-width: 180px; }
        .dash-filter-slider {
          width: 100%; height: 6px; border-radius: 3px; -webkit-appearance: none; appearance: none;
          background: linear-gradient(to right, #F97316, #3B82F6); outline: none; cursor: pointer;
        }
        .dash-filter-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
          background: #fff; border: 2px solid #F97316; cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .dash-filter-slider::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: #fff; border: 2px solid #F97316; cursor: pointer;
          box-shadow: 0 1px 4px rgba(0,0,0,0.15);
        }
        .dash-filter-reset {
          padding: 0.4rem 0.85rem; border-radius: 8px; font-size: 0.78rem; font-weight: 600;
          border: 1.5px solid #d1d5db; background: #fff; color: #6b7280; cursor: pointer;
          font-family: inherit; transition: all 0.15s; margin-left: auto;
        }
        .dash-filter-reset:hover { border-color: #F97316; color: #F97316; background: #FFF7ED; }
      `}</style>
    </div>
  );
}
