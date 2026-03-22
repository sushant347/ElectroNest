import axios from 'axios';
import config from '../Config/Config';

// ── Axios Instance ──
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor (attach JWT) ──
api.interceptors.request.use(
  (cfg) => {
    const token = localStorage.getItem(config.AUTH_TOKEN_KEY);
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
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
    const isAlreadyOnLogin = window.location.pathname === '/login';
    const status = error.response?.status;

    // ── Skip auth endpoints and login page ──
    if (isAuthEndpoint || isAlreadyOnLogin) {
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
        const { data } = await axios.post(`${config.API_BASE_URL}/auth/refresh/`, { refresh: refreshToken });
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
  getSalesOverview: (params) => api.get('/analytics/sales-overview/', { params }),
  getRevenueTrend: (params) => api.get('/analytics/revenue-trend/', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products/', { params }),
  getCategoryPerformance: (params) => api.get('/analytics/category-performance/', { params }),
  getPaymentMethodStats: (params) => api.get('/analytics/payment-methods/', { params }),
  getOrderStatusStats: (params) => api.get('/analytics/order-status/', { params }),
  getLowStockProducts: (params) => api.get('/analytics/low-stock/', { params }),

  // Product Management
  getAllProducts: (params) => api.get('/products/', { params }),
  getProduct: (id) => api.get(`/products/${id}/`),
  createProduct: (data) => api.post('/products/', data),
  updateProduct: (id, data) => api.patch(`/products/${id}/`, data),
  deleteProduct: (id) => api.delete(`/products/${id}/`),

  // Order Management
  getAllOrders: (params) => api.get('/orders/', { params }),
  getOrderDetails: (id) => api.get(`/orders/${id}/`),
  updateOrderStatus: (id, statusData) => api.patch(`/orders/${id}/update-status/`, statusData),
  getOrderStatuses: () => api.get('/order-statuses/'),

  // Categories, Brands & Owners (for dropdowns)
  getCategories: () => api.get('/categories/'),
  getBrands: () => api.get('/brands/'),
  getSuppliers: () => api.get('/suppliers/'),
  getOwners: () => api.get('/auth/owners/'),

  // Notifications
  getNotifications: () => api.get('/notifications/'),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllNotificationsRead: () => api.patch('/notifications/read-all/'),
  clearAllNotifications: () => api.delete('/notifications/clear-all/'),

  // Analytics — Product Growth
  getProductGrowth: (productId, days = 90) => api.get(`/analytics/product-growth/${productId}/`, { params: { days } }),

  // Analytics — Demand Forecast
  getDemandForecast: (productId, history = 30, forecast = 7) => api.get(`/analytics/forecast/${productId}/`, { params: { history, forecast } }),

  // Analytics — Comprehensive Forecast (multi-model)
  getComprehensiveForecast: (productId, days = 30, forecastDays = 7) => api.get(`/analytics/comprehensive-forecast/${productId}/`, { params: { days, forecast_days: forecastDays } }),

  // Stock increase for existing product
  increaseStock: (id, stock) => api.patch(`/products/${id}/`, { stock }),

  // CSV Bulk Import
  bulkImportProducts: (formData) => api.post('/products/bulk-import/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Coupon Management (owner sees only their own coupons, backend enforced)
  getCoupons: (params) => api.get('/coupons/', { params }),
  createCoupon: (data) => api.post('/coupons/', data),
  updateCoupon: (id, data) => api.patch(`/coupons/${id}/`, data),
  deleteCoupon: (id) => api.delete(`/coupons/${id}/`),
};

// ── Warehouse API Endpoints ──
export const warehouseAPI = {
  // Dashboard
  getDashboard: () => api.get('/warehouse/dashboard/'),

  // Stock Movements (detailed: shipped orders, received POs, product updates)
  getStockMovements: (params) => api.get('/warehouse/stock-movements/', { params }),

  // Purchase Orders
  getPurchaseOrders: (params) => api.get('/warehouse/purchase-orders/', { params }),
  getPurchaseOrder: (id) => api.get(`/warehouse/purchase-orders/${id}/`),
  createPurchaseOrder: (data) => api.post('/warehouse/purchase-orders/', data),
  receivePurchaseOrder: (id) => api.patch(`/warehouse/purchase-orders/${id}/receive/`),

  // Low Stock (from analytics)
  getLowStockProducts: (params) => api.get('/analytics/low-stock/', { params }),

  // Suppliers & Products (for dropdowns)
  getSuppliers: (params) => api.get('/suppliers/', { params }),
  getProducts: (params) => api.get('/products/', { params }),

  // Inventory items (alias for products with stock info)
  getInventoryItems: (params) => api.get('/products/', { params }),

  // Owners (users with owner role)
  getOwners: () => api.get('/admin/users/', { params: { role: 'owner' } }),

  // Notifications
  getNotifications: () => api.get('/notifications/'),
  markNotificationRead: (id) => api.patch(`/notifications/${id}/read/`),
  markAllNotificationsRead: () => api.patch('/notifications/read-all/'),
  clearAllNotifications: () => api.delete('/notifications/clear-all/'),
  sendLowStockAlert: (productId) => api.post('/notifications/send-low-stock/', { product_id: productId }),

  // Shipped orders (for warehouse delivery) — load all then filter client-side
  getShippedOrders: () => api.get('/orders/', { params: { page_size: 500 } }),
  getOrderDetails: (id) => api.get(`/orders/${id}/`),
  markOrderDelivered: (id) => api.patch(`/orders/${id}/update-status/`, { order_status: 'Delivered' }),
};

// ── Customer API Endpoints ──
export const customerAPI = {
  // Browsing
  getProducts: (params) => api.get('/products/', { params }),
  getProduct: (id) => api.get(`/products/${id}/`),
  getCategories: () => api.get('/categories/'),
  getBrands: () => api.get('/brands/'),
  searchProducts: (query) => api.get('/products/', { params: { search: query } }),

  // Cart
  getCart: () => api.get('/cart/'),
  addToCart: (productId, orderCount = 1) => api.post('/cart/', { product: productId, order_count: orderCount }),
  updateCartItem: (itemId, orderCount) => api.patch(`/cart/${itemId}/`, { order_count: orderCount }),
  removeCartItem: (itemId) => api.delete(`/cart/${itemId}/`),
  clearCart: () => api.delete('/cart/clear/'),

  // Wishlist
  getWishlist: () => api.get('/wishlist/'),
  addToWishlist: (productId) => api.post('/wishlist/', { product: productId }),
  removeFromWishlist: (itemId) => api.delete(`/wishlist/${itemId}/`),

  // Compare List
  getCompareList: () => api.get('/compare/'),
  addToCompare: (productId) => api.post('/compare/', { product: productId }),
  removeFromCompare: (itemId) => api.delete(`/compare/${itemId}/`),
  clearCompare: () => api.delete('/compare/clear/'),

  // Orders
  placeOrder: (data) => api.post('/orders/', data),
  getMyOrders: (params) => api.get('/orders/', { params }),
  getOrderDetails: (id) => api.get(`/orders/${id}/`),
  cancelOrder: (id) => api.patch(`/orders/${id}/cancel/`),

  // Profile & Addresses
  getProfile: () => api.get('/auth/profile/'),
  updateProfile: (data) => api.patch('/auth/profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
  getAddresses: () => api.get('/auth/addresses/'),
  addAddress: (data) => api.post('/auth/addresses/', data),
  updateAddress: (id, data) => api.patch(`/auth/addresses/${id}/`, data),
  deleteAddress: (id) => api.delete(`/auth/addresses/${id}/`),

  // Reviews
  addReview: (data) => api.post('/reviews/', data),
  getReviews: (productId) => api.get('/reviews/', { params: { product: productId } }),
  getMyReview: (productId) => api.get('/reviews/', { params: { product: productId, mine: 'true' } }),

  // Coupons — pass ownerName to scope results to a specific store
  validateCoupon: (code, ownerName) => api.post('/coupons/validate/', { code, ...(ownerName ? { owner_name: ownerName } : {}) }),
  getCoupons: (ownerName) => api.get('/coupons/', { params: ownerName ? { owner_name: ownerName } : {} }),

  // Payment Methods
  getPaymentMethods: () => api.get('/payment-methods/'),

  // Payments
  getPayments: () => api.get('/payments/'),

  // Support / Contact
  submitContactQuery: (data) => api.post('/admin/user-queries/submit/', data),
};

// ── Admin API Endpoints ──
export const adminAPI = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard/'),

  // User Management
  getUsers: (params) => api.get('/admin/users/', { params }),
  getUser: (id) => api.get(`/admin/users/${id}/`),
  createUser: (data) => api.post('/admin/users/', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  toggleUserStatus: (id) => api.patch(`/admin/users/${id}/toggle-active/`),

  // Supplier Management
  getSuppliers: (params) => api.get('/admin/suppliers/', { params }),
  getSupplier: (id) => api.get(`/admin/suppliers/${id}/`),
  createSupplier: (data) => api.post('/admin/suppliers/', data),
  updateSupplier: (id, data) => api.patch(`/admin/suppliers/${id}/`, data),
  deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}/`),

  // Audit Logs
  getLogs: (params) => api.get('/admin/logs/', { params }),
  getAuditLog: (id) => api.get(`/admin/logs/${id}/`),
  getAuditStatistics: () => api.get('/admin/logs/stats/'),

  // Customers
  getCustomers: (params) => api.get('/admin/customers/', { params }),
  getCustomer: (id) => api.get(`/admin/customers/${id}/`),
  deleteCustomer: (id) => api.delete(`/admin/customers/${id}/`),
  toggleCustomerStatus: (id, isActive) => api.patch(`/admin/customers/${id}/`, { is_active: isActive }),

  // User Queries
  getUserQueries: (params) => api.get('/admin/user-queries/', { params }),
  getUserQuery: (id) => api.get(`/admin/user-queries/${id}/`),
  updateUserQuery: (id, data) => api.patch(`/admin/user-queries/${id}/`, data),
  markUserQueryRead: (id) => api.patch(`/admin/user-queries/${id}/mark-read/`),

  // Analytics (reuse owner analytics endpoints)
  getSalesOverview: (params) => api.get('/analytics/sales-overview/', { params }),
  getRevenueTrend: (params) => api.get('/analytics/revenue-trend/', { params }),
  getCategoryPerformance: (params) => api.get('/analytics/category-performance/', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products/', { params }),
  getLowStockProducts: (params) => api.get('/analytics/low-stock/', { params }),

  // ML / BI Features
  getCustomerSegmentation: (params) => api.get('/analytics/segmentation/', { params }),
  getChurnPrediction: (params) => api.get('/analytics/churn-prediction/', { params }),
  getDemandForecast: (productId, params) => api.get(`/analytics/forecast/${productId}/`, { params }),
  getProductRecommendations: (productId, params) => api.get(`/analytics/recommendations/${productId}/`, { params }),
  getPaymentMethodStats: (params) => api.get('/analytics/payment-methods/', { params }),
  getOrderStatusStats: (params) => api.get('/analytics/order-status/', { params }),
};

// ── Auth API ──
export const authAPI = {
  login: (credentials) => api.post('/auth/login/', credentials),
  logout: () => api.post('/auth/logout/'),
  refreshToken: (refreshToken) => api.post('/auth/refresh/', { refresh: refreshToken }),
  register: (data) => api.post('/auth/register/', data),
};

export default api;
