import axios from 'axios';
import config from '../Config/Config';

const GET_CACHE_TTL = 90_000;
const GET_CACHE_VERSION = 'sqlserver-local-v1';
const GET_CACHE_PREFIX = `api:${GET_CACHE_VERSION}:`;
const LEGACY_GET_CACHE_PREFIX = 'api:';
const getCache = new Map();
const inflightGet = new Map();

const pruneLegacyGetCache = () => {
  const prune = (storage) => {
    try {
      Object.keys(storage)
        .filter(key => key.startsWith(LEGACY_GET_CACHE_PREFIX) && !key.startsWith(GET_CACHE_PREFIX))
        .forEach(key => storage.removeItem(key));
    } catch { /* ignore storage access errors */ }
  };
  if (typeof sessionStorage !== 'undefined') prune(sessionStorage);
  if (typeof localStorage !== 'undefined') prune(localStorage);
};

pruneLegacyGetCache();

const stableStringify = (value) => {
  if (!value || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
};

const getAuthCachePart = () => {
  const token = localStorage.getItem(config.AUTH_TOKEN_KEY) || '';
  return token ? token.slice(-16) : 'public';
};

const makeGetCacheKey = (url, params) => `${getAuthCachePart()}|${url}|${stableStringify(params || {})}`;

const readStoredGet = (key) => {
  const memory = getCache.get(key);
  const now = Date.now();
  if (memory && memory.expiresAt > now) return memory.data;
  if (memory) getCache.delete(key);

  try {
    const storageKey = `${GET_CACHE_PREFIX}${key}`;
    const raw = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt <= now) {
      sessionStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey);
      return null;
    }
    getCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
};

const writeStoredGet = (key, data, ttl = GET_CACHE_TTL) => {
  const entry = { data, expiresAt: Date.now() + ttl };
  getCache.set(key, entry);
  try { sessionStorage.setItem(`${GET_CACHE_PREFIX}${key}`, JSON.stringify(entry)); } catch { /* storage can be full/private */ }
  try { localStorage.setItem(`${GET_CACHE_PREFIX}${key}`, JSON.stringify(entry)); } catch { /* storage can be full/private */ }
};

export const peekCachedGet = (url, params) => readStoredGet(makeGetCacheKey(url, params));

export const findCachedProduct = (id) => {
  const targetId = Number(id);
  const findInPayload = (payload) => {
    const rows = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
    return rows.find(product => Number(product?.id) === targetId) || null;
  };
  for (const entry of getCache.values()) {
    const found = findInPayload(entry.data);
    if (found) return found;
  }
  try {
    for (const key of Object.keys(sessionStorage)) {
      if (!key.startsWith(GET_CACHE_PREFIX) || !key.includes('/products/')) continue;
      const parsed = JSON.parse(sessionStorage.getItem(key) || '{}');
      if (parsed.expiresAt <= Date.now()) continue;
      const found = findInPayload(parsed.data);
      if (found) return found;
    }
  } catch { /* ignore storage access errors */ }
  return null;
};


const clearGetCache = () => {
  getCache.clear();
  inflightGet.clear();
  try {
    Object.keys(sessionStorage)
      .filter(key => key.startsWith(LEGACY_GET_CACHE_PREFIX))
      .forEach(key => sessionStorage.removeItem(key));
  } catch { /* ignore storage access errors */ }
  try {
    Object.keys(localStorage)
      .filter(key => key.startsWith(LEGACY_GET_CACHE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  } catch { /* ignore storage access errors */ }
};

const decodeJwtPayload = (token) => {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

// ── Axios Instance ──
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

const cachedGet = (url, options = {}, ttl = GET_CACHE_TTL) => {
  const params = options.params || undefined;
  const key = makeGetCacheKey(url, params);
  const cached = readStoredGet(key);
  if (cached) return Promise.resolve({ data: cached, status: 200, statusText: 'OK', headers: {}, config: options, cached: true });
  if (inflightGet.has(key)) return inflightGet.get(key);

  const request = api.get(url, options)
    .then((response) => {
      writeStoredGet(key, response.data, ttl);
      return response;
    })
    .finally(() => inflightGet.delete(key));
  inflightGet.set(key, request);
  return request;
};

// ── Request Interceptor (attach JWT) ──
api.interceptors.request.use(
  (cfg) => {
    const token = localStorage.getItem(config.AUTH_TOKEN_KEY);
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    if (cfg.method && cfg.method.toLowerCase() !== 'get') clearGetCache();
    return cfg;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor (handle 401/403 + auto-refresh) ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

function clearAuthAndRedirect() {
  localStorage.removeItem(config.AUTH_TOKEN_KEY);
  localStorage.removeItem(config.REFRESH_TOKEN_KEY);
  localStorage.removeItem('customer_user');
  window.dispatchEvent(new CustomEvent('auth:logout'));
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    const requestUrl = originalRequest?.url || '';
    const isAuthEndpoint = requestUrl.includes('/auth/login/') || requestUrl.includes('/auth/register/') || requestUrl.includes('/auth/refresh/');
    const isCustomerRefreshEndpoint = requestUrl.includes('/auth/refresh-customer/');
    const isAlreadyOnLogin = window.location.pathname === '/login';
    const status = error.response?.status;

    // ── Skip auth endpoints and login page ──
    if (isAuthEndpoint || isCustomerRefreshEndpoint || isAlreadyOnLogin) {
      return Promise.reject(error);
    }

    // ── 401: Try to refresh the token ──
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(config.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        clearAuthAndRedirect();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshPayload = decodeJwtPayload(refreshToken);
        const isCustomer = refreshPayload?.user_type === 'customer';
        const refreshUrl = isCustomer
          ? `${config.API_BASE_URL}/auth/refresh-customer/`
          : `${config.API_BASE_URL}/auth/refresh/`;
        const { data } = await axios.post(refreshUrl, { refresh: refreshToken });
        const newAccessToken = data.access;
        localStorage.setItem(config.AUTH_TOKEN_KEY, newAccessToken);
        if (data.refresh) {
          localStorage.setItem(config.REFRESH_TOKEN_KEY, data.refresh);
        }
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearAuthAndRedirect();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ── 403: Auth data stale (token removed but user persists) → clear & redirect ──
    if (status === 403) {
      const token = localStorage.getItem(config.AUTH_TOKEN_KEY);
      if (!token) {
        // No token at all — stale session, clear everything
        clearAuthAndRedirect();
      }
    }

    return Promise.reject(error);
  }
);

// ── Owner API Endpoints ──
export const ownerAPI = {
  // Dashboard Analytics
  getSalesOverview: (params) => cachedGet('/analytics/sales-overview/', { params }),
  getRevenueTrend: (params) => cachedGet('/analytics/revenue-trend/', { params }),
  getTopProducts: (params) => cachedGet('/analytics/top-products/', { params }),
  getCategoryPerformance: (params) => cachedGet('/analytics/category-performance/', { params }),
  getPaymentMethodStats: (params) => cachedGet('/analytics/payment-methods/', { params }),
  getOrderStatusStats: (params) => cachedGet('/analytics/order-status/', { params }),
  getLowStockProducts: (params) => cachedGet('/analytics/low-stock/', { params }),

  // Product Management
  getAllProducts: (params) => cachedGet('/products/', { params }),
  getProduct: (id) => cachedGet(`/products/${id}/`),
  createProduct: (data) => api.post('/products/', data),
  updateProduct: (id, data) => api.patch(`/products/${id}/`, data),
  deleteProduct: (id) => api.delete(`/products/${id}/`),

  // Order Management
  getAllOrders: (params) => cachedGet('/orders/', { params }),
  getOrderDetails: (id) => cachedGet(`/orders/${id}/`),
  updateOrderStatus: (id, statusData) => api.patch(`/orders/${id}/update-status/`, statusData),
  getOrderStatuses: () => cachedGet('/order-statuses/'),

  // Categories, Brands & Owners (for dropdowns)
  getCategories: () => cachedGet('/categories/'),
  getBrands: () => cachedGet('/brands/'),
  getSuppliers: () => cachedGet('/suppliers/'),
  getOwners: () => cachedGet('/auth/owners/'),

  // Notifications
  getNotifications: () => cachedGet('/notifications/', {}, 15_000),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllNotificationsRead: () => api.patch('/notifications/read-all/'),
  clearAllNotifications: () => api.delete('/notifications/clear-all/'),
  getProductQuestions: (params) => cachedGet('/product-questions/', { params }),
  answerProductQuestion: (id, answer) => api.patch(`/product-questions/${id}/answer/`, { answer }),

  // Analytics — Product Growth
  getProductGrowth: (productId, days = 90) => cachedGet(`/analytics/product-growth/${productId}/`, { params: { days } }),

  // Analytics — Demand Forecast
  getDemandForecast: (productId, history = 30, forecast = 7) => cachedGet(`/analytics/forecast/${productId}/`, { params: { history, forecast } }),

  // Analytics — Comprehensive Forecast (multi-model)
  getComprehensiveForecast: (productId, days = 30, forecastDays = 7) => cachedGet(`/analytics/comprehensive-forecast/${productId}/`, { params: { days, forecast_days: forecastDays } }),

  // Stock increase for existing product
  increaseStock: (id, stock) => api.patch(`/products/${id}/`, { stock }),

  // CSV Bulk Import
  bulkImportProducts: (formData) => api.post('/products/bulk-import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Coupon Management (owner sees only their own coupons, backend enforced)
  getCoupons: (params) => cachedGet('/coupons/', { params }),
  createCoupon: (data) => api.post('/coupons/', data),
  updateCoupon: (id, data) => api.patch(`/coupons/${id}/`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}/`),
};

const warehouseMovementParams = (params) => ({ limit: 120, ...(params || {}) });

// ── Warehouse API Endpoints ──
export const warehouseAPI = {
  // Dashboard
  getDashboard: () => cachedGet('/warehouse/dashboard/', {}, 300_000),
  peekDashboard: () => peekCachedGet('/warehouse/dashboard/'),

  // Stock Movements (detailed: shipped orders, received POs, product updates)
  getStockMovements: (params) => cachedGet('/warehouse/stock-movements/', { params: warehouseMovementParams(params) }, 300_000),
  peekStockMovements: (params) => peekCachedGet('/warehouse/stock-movements/', warehouseMovementParams(params)),

  // Purchase Orders
  getPurchaseOrders: (params) => cachedGet('/warehouse/purchase-orders/', { params }),
  getPurchaseOrder: (id) => cachedGet(`/warehouse/purchase-orders/${id}/`),
  createPurchaseOrder: (data) => api.post('/warehouse/purchase-orders/', data),
  receivePurchaseOrder: (id) => api.patch(`/warehouse/purchase-orders/${id}/receive/`),

  // Low Stock (from analytics)
  getLowStockProducts: (params) => cachedGet('/analytics/low-stock/', { params }, 300_000),
  peekLowStockProducts: (params) => peekCachedGet('/analytics/low-stock/', params),

  // Suppliers & Products (for dropdowns)
  getSuppliers: (params) => cachedGet('/suppliers/', { params }),
  getProducts: (params) => cachedGet('/products/', { params }, 300_000),
  peekProducts: (params) => peekCachedGet('/products/', params),

  // Inventory items (alias for products with stock info)
  getInventoryItems: (params) => cachedGet('/products/', { params }, 300_000),

  // Owners (users with owner role)
  getOwners: () => cachedGet('/admin/users/', { params: { role: 'owner' } }),

  // Notifications
  getNotifications: () => cachedGet('/notifications/', {}, 15_000),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllNotificationsRead: () => api.patch('/notifications/read-all/'),
  clearAllNotifications: () => api.delete('/notifications/clear-all/'),
  sendLowStockAlert: (productId) => api.post('/notifications/send-low-stock/', { product_id: productId }),

  // Shipped orders (for warehouse delivery) — load all then filter client-side
  getShippedOrders: () => cachedGet('/orders/', { params: { page_size: 500 } }),
  getOrderDetails: (id) => cachedGet(`/orders/${id}/`),
  markOrderDelivered: (id) => api.patch(`/orders/${id}/update-status/`, { order_status: 'Delivered' }),
};

// ── Customer API Endpoints ──
export const customerAPI = {
  // Browsing
  getProducts: (params) => cachedGet('/products/', { params }),
  peekProducts: (params) => peekCachedGet('/products/', params),
  getProduct: (id) => cachedGet(`/products/${id}/`),
  peekProduct: (id) => peekCachedGet(`/products/${id}/`),
  peekProductFromLists: (id) => findCachedProduct(id),
  getCategories: () => cachedGet('/categories/'),
  peekCategories: () => peekCachedGet('/categories/'),
  getBrands: () => cachedGet('/brands/'),
  searchProducts: (query) => cachedGet('/products/', { params: { search: query } }),
  getPriceHistory: (productId) => cachedGet(`/products/${productId}/price-history/`, {}, 300_000),
  peekPriceHistory: (productId) => peekCachedGet(`/products/${productId}/price-history/`),
  getProductQuestions: (productId) => cachedGet('/product-questions/', { params: { product: productId } }),
  askProductQuestion: (productId, question) => api.post('/product-questions/', { product: productId, question }),
  getCustomerNotifications: () => cachedGet('/customer-notifications/', {}, 15_000),
  markCustomerNotificationRead: (id) => api.patch(`/customer-notifications/${id}/read/`),
  markAllCustomerNotificationsRead: () => api.patch('/customer-notifications/read-all/'),

  // Cart
  getCart: () => cachedGet('/cart/', {}, 20_000),
  addToCart: (productId, orderCount = 1, variantId = null) => api.post('/cart/', { product: productId, variant: variantId, order_count: orderCount }),
  updateCartItem: (itemId, orderCount) => api.patch(`/cart/${itemId}/`, { order_count: orderCount }),
  removeCartItem: (itemId) => api.delete(`/cart/${itemId}/`),
  clearCart: () => api.delete('/cart/clear/'),

  // Wishlist
  getWishlist: () => cachedGet('/wishlist/', {}, 20_000),
  addToWishlist: (productId) => api.post('/wishlist/', { product: productId }),
  removeFromWishlist: (itemId) => api.delete(`/wishlist/${itemId}/`),

  // Compare List
  getCompareList: () => cachedGet('/compare/', {}, 20_000),
  addToCompare: (productId) => api.post('/compare/', { product: productId }),
  removeFromCompare: (itemId) => api.delete(`/compare/${itemId}/`),
  clearCompare: () => api.delete('/compare/clear/'),

  // Orders
  placeOrder: (data) => api.post('/orders/', data),
  getMyOrders: (params) => cachedGet('/orders/', { params }),
  getOrderDetails: (id) => cachedGet(`/orders/${id}/`),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel/`),

  // Profile & Addresses
  getProfile: () => cachedGet('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  getAddresses: () => cachedGet('/auth/addresses/'),
  addAddress: (data) => api.post('/auth/addresses/', data),
  updateAddress: (id, data) => api.patch(`/auth/addresses/${id}/`, data),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}/`),

  // Reviews
  addReview: (data) => api.post('/reviews/', data),
  getReviews: (productId) => cachedGet('/reviews/', { params: { product: productId } }),
  getMyReview: (productId) => cachedGet('/reviews/', { params: { product: productId, mine: 'true' } }),

  // Coupons — pass ownerName to scope results to a specific store
  validateCoupon: (code, ownerName) => api.post('/coupons/validate/', { code, ...(ownerName ? { owner_name: ownerName } : {}) }),
  getCoupons: (ownerName) => cachedGet('/coupons/', { params: ownerName ? { owner_name: ownerName } : {} }),

  // Payment Methods
  getPaymentMethods: () => cachedGet('/payment-methods/'),

  // Payments
  getPayments: () => cachedGet('/payments/'),

  // Support / Contact
  submitContactQuery: (data) => api.post('/admin/user-queries/submit/', data),
};

// ── Admin API Endpoints ──
export const adminAPI = {
  // Dashboard
  getDashboard: () => cachedGet('/admin/dashboard/', {}, 180_000),
  peekDashboard: () => peekCachedGet('/admin/dashboard/'),

  // User Management
  getUsers: (params) => cachedGet('/admin/users/', { params }),
  peekUsers: (params) => peekCachedGet('/admin/users/', params),
  getUser: (id) => cachedGet(`/admin/users/${id}/`),
  createUser: (data) => api.post('/admin/users/', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle-active/`),

  // Supplier Management
  getSuppliers: (params) => cachedGet('/admin/suppliers/', { params }),
  getSupplier: (id) => cachedGet(`/admin/suppliers/${id}/`),
  createSupplier: (data) => api.post('/admin/suppliers/', data),
  updateSupplier: (id, data) => api.patch(`/admin/suppliers/${id}/`, data),
  deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}/`),

  // Audit Logs
  getLogs: (params) => cachedGet('/admin/logs/', { params }),
  peekLogs: (params) => peekCachedGet('/admin/logs/', params),
  getAuditLog: (id) => cachedGet(`/admin/logs/${id}/`),
  getAuditStatistics: () => cachedGet('/admin/logs/stats/'),

  // Customers
  getCustomers: (params) => cachedGet('/admin/customers/', { params }),
  peekCustomers: (params) => peekCachedGet('/admin/customers/', params),
  getCustomer: (id) => cachedGet(`/admin/customers/${id}/`),
  deleteCustomer: (id) => api.delete(`/admin/customers/${id}/`),
  toggleCustomerStatus: (id, isActive) => api.patch(`/admin/customers/${id}/`, { is_active: isActive }),

  // User Queries
  getUserQueries: (params) => cachedGet('/admin/user-queries/', { params }),
  getUserQuery: (id) => cachedGet(`/admin/user-queries/${id}/`),
  updateUserQuery: (id, data) => api.patch(`/admin/user-queries/${id}/`, data),
  markUserQueryRead: (id) => api.patch(`/admin/user-queries/${id}/mark-read/`),

  // Analytics (reuse owner analytics endpoints)
  getSalesOverview: (params) => cachedGet('/analytics/sales-overview/', { params }),
  getRevenueTrend: (params) => cachedGet('/analytics/revenue-trend/', { params }),
  getCategoryPerformance: (params) => cachedGet('/analytics/category-performance/', { params }),
  getTopProducts: (params) => cachedGet('/analytics/top-products/', { params }),
  getLowStockProducts: (params) => cachedGet('/analytics/low-stock/', { params }),

  // ML / BI Features
  getCustomerSegmentation: (params) => cachedGet('/analytics/segmentation/', { params }),
  getChurnPrediction: (params) => cachedGet('/analytics/churn-prediction/', { params }),
  getDemandForecast: (productId, params) => cachedGet(`/analytics/forecast/${productId}/`, { params }),
  getProductRecommendations: (productId, params) => cachedGet(`/analytics/recommendations/${productId}/`, { params }),
  getPaymentMethodStats: (params) => cachedGet('/analytics/payment-methods/', { params }),
  getOrderStatusStats: (params) => cachedGet('/analytics/order-status/', { params }),
};

// ── Auth API ──
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  refreshToken: (refreshToken) => api.post('/auth/refresh/', { refresh: refreshToken }),
  register: (data) => api.post('/auth/register/', data),
};

export default api;
