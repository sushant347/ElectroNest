# ElectroNest — Complete Project Audit & Feature Roadmap

> **Analyzed:** Full frontend (React/Vite), backend (Django REST Framework), and database (SQL Server/MSSQL)
> **Date:** May 2026

---

## 📊 What Already Exists (Audit Summary)

### ✅ Customer Panel — Already Implemented
| Feature | Status | File(s) |
|---|---|---|
| Product browsing, search, categories | ✅ Done | `Home.jsx`, `api.js` |
| Product detail with specs, coupons, related items | ✅ Done | `ProductDetail.jsx` |
| Cart & Checkout with address management | ✅ Done | `Cart.jsx`, `Checkout.jsx` |
| Wishlist | ✅ Done | `Wishlist.jsx`, `orders/models.py` |
| Product Compare | ✅ Done | `Compare.jsx`, `orders/models.py` |
| Reviews & Ratings (1–5 stars, per-product) | ✅ Done | `MyReviews.jsx`, `products/models.py` |
| Order history with tracking timeline | ✅ Done | `MyOrders.jsx` (4-step stepper) |
| Invoice printing (Delivered orders) | ✅ Done | `MyOrders.jsx` (PrintInvoiceModal) |
| Profile & password management | ✅ Done | `Profile.jsx` |
| Coupon claim & auto-apply at checkout | ✅ Done | `ProductDetail.jsx`, `Checkout.jsx` |
| Payment methods: eSewa, Khalti, Bank, COD | ✅ Done | `Checkout.jsx` (SVG logos) |
| Contact Us / Support pages | ✅ Done | `Support/ContactUs.jsx`, etc. |

### ✅ Owner Panel — Already Implemented
| Feature | Status | File(s) |
|---|---|---|
| Dashboard with sales KPIs | ✅ Done | `Owner/Dashboard.jsx` |
| Product CRUD (create, edit, delete) | ✅ Done | `ProductManagement.jsx` |
| CSV Bulk Import | ✅ Done | `api.js → bulkImportProducts` |
| Order management & status update | ✅ Done | `OrderManagement.jsx` |
| Coupon creation & management | ✅ Done | `CouponManagement.jsx` |
| Analytics (revenue, top products, categories) | ✅ Done | `Analytics.jsx` |
| Demand forecasting (multi-model ML) | ✅ Done | `analytics/ml_services.py` |
| Notifications (low stock alerts) | ✅ Done | `api.js → getNotifications` |

### ✅ Warehouse Panel — Already Implemented
| Feature | Status | File(s) |
|---|---|---|
| Dashboard (stock summary, pending POs) | ✅ Done | `Warehouse/Dashboard.jsx` |
| Stock Movements (orders + POs + updates) | ✅ Done | `StockMovements.jsx` |
| Inventory Management | ✅ Done | `InventoryManagement.jsx` |
| Low Stock Alerts | ✅ Done | `LowStockAlerts.jsx` |
| Purchase Order creation & receiving | ✅ Done | `warehouse/views.py` |
| Commission tracking per store | ✅ Done | `StockMovementsView` |

### ✅ Admin Panel — Already Implemented
| Feature | Status | File(s) |
|---|---|---|
| Dashboard with platform-wide KPIs | ✅ Done | `Admin/Dashboard.jsx` |
| User management (CRUD, toggle active) | ✅ Done | `UserManagement.jsx` |
| Store/Product management | ✅ Done | `StoreManagement.jsx` |
| Supplier management | ✅ Done | `SupplierManagement.jsx` |
| System Audit Logs (full diff viewer) | ✅ Done | `SystemLogs.jsx` |
| Platform-wide Coupon management | ✅ Done | `AdminCoupons.jsx` |
| User Queries / Support tickets | ✅ Done | `UserQueries.jsx` |
| Analytics Summary | ✅ Done | `AnalyticsSummary.jsx` |
| ML: Customer Segmentation (RFM) | ✅ Done | `analytics/ml_services.py` |
| ML: Churn Prediction | ✅ Done | `analytics/views.py` |
| ML: Dynamic Pricing | ✅ Done | `analytics/views.py` |

### ✅ Database — Already Implemented
| Feature | Status |
|---|---|
| Full relational schema (17+ tables) | ✅ Done |
| Performance indexes on Products, Orders, Cart, etc. | ✅ Done (`Database.sql`) |
| Audit logging table | ✅ Done |
| Coupon + CouponUsage tables | ✅ Done |
| Notification system | ✅ Done |
| CompareList table | ✅ Done |

---

## 🚀 NEW Features to Add

### 👤 Customer Panel

#### 1. Price Comparison Graph on Product Detail Page
> Show a chart comparing **Market Price vs ElectroNest Price** over time on every product page so customers can see the value they're getting.

**Frontend (`ProductDetail.jsx`):**
- Add a `PriceComparisonChart` component below the product specs section
- Use **Plotly.js** (already installed in the project) to render a dual-line chart
- X-axis: Last 6 months (or product lifetime)
- Line 1: "Market Price" (derived from `cost_price × 1.3` markup as simulated market average)
- Line 2: "Our Price" (`selling_price` or `discount_price` if on sale)
- Shaded area between lines to highlight savings
- Add annotations showing max savings percentage

**Backend (`products/views.py`):**
- Add a new endpoint `GET /products/<id>/price-history/` that returns historical price data
- Query the `AuditLog` table for UPDATE actions on `Products` where `record_id` matches, extract old/new `SellingPrice` values
- Also return current `cost_price`, `selling_price`, `discount_price` for the market-price baseline

**Database:**
- No new tables needed — use existing `AuditLog` entries for price change history

---

#### 2. Smart Search & Filtering on Home Page
> Add advanced filtering controls: price range slider, brand multi-select, sorting options.

**Frontend (`Home.jsx`):**
- Add a collapsible filter sidebar/panel with:
  - **Price range slider** (min/max with NPR labels)
  - **Brand checkboxes** (populated from `GET /brands/`)
  - **Sort dropdown**: Price Low→High, Price High→Low, Newest, Best Selling, Top Rated
- All filters update URL query params for shareable links
- Mobile: slide-in drawer for filters

**Backend (`products/views.py`):**
- Already supports `category`, `search` query params
- Add `min_price`, `max_price`, `brand`, `sort_by` query parameter handling in `ProductViewSet.get_queryset()`

---

#### 3. Payment Gateway UI Enhancement
> Improve the eSewa, Khalti, and Bank payment forms with proper input validation.

**Frontend (`Checkout.jsx`):**
- **eSewa form**: Mobile number input (exactly 10 digits, starts with 98/97) + 4-digit PIN field (masked)
- **Khalti form**: Mobile number input (10 digits) + 4-digit MPIN field (masked)
- **Bank Transfer form**: Bank name dropdown + Mobile Banking ID field + Account Number field
- All fields with real-time validation, error messages, and green checkmarks on valid input
- Payment logos already exist as SVG components ✅

---

### 🏪 Owner (Vendor) Panel

#### 4. Customer Q&A on Product Pages
> Allow customers to ask questions on product pages and owners to reply.

**Database (New Table):**
```sql
CREATE TABLE ProductQA (
    QuestionID INT PRIMARY KEY IDENTITY(1,1),
    ProductID INT NOT NULL FOREIGN KEY REFERENCES Products(ProductID),
    CustomerID INT NOT NULL FOREIGN KEY REFERENCES Customers(CustomerID),
    Question NVARCHAR(500) NOT NULL,
    Answer NVARCHAR(1000),
    AnsweredByUserID INT,
    AnsweredAt DATETIME,
    CreatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
    IsPublic BIT DEFAULT 1
);
```

**Backend:**
- New Django model `ProductQA` in `products/models.py`
- New endpoints:
  - `POST /products/<id>/questions/` — customer asks a question
  - `GET /products/<id>/questions/` — list Q&A for a product
  - `PATCH /products/questions/<id>/answer/` — owner posts an answer

**Frontend:**
- `ProductDetail.jsx` — Add Q&A accordion section below reviews
- `Owner/ProductManagement.jsx` — Add "Unanswered Questions" badge and answer modal

---

### 📦 Warehouse Panel

#### 5. Returns & Refunds Management (RMA)
> Handle product returns, refund processing, and stock re-adjustment.

**Database (New Tables):**
```sql
CREATE TABLE Returns (
    ReturnID INT PRIMARY KEY IDENTITY(1,1),
    OrderID INT NOT NULL FOREIGN KEY REFERENCES Orders(OrderID),
    CustomerID INT NOT NULL FOREIGN KEY REFERENCES Customers(CustomerID),
    Reason NVARCHAR(500) NOT NULL,
    Status NVARCHAR(30) DEFAULT 'Requested',  -- Requested, Approved, Rejected, Refunded
    RefundAmount DECIMAL(10,2),
    ProcessedByUserID INT,
    CreatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
    ProcessedAt DATETIME
);

CREATE TABLE ReturnDetails (
    ReturnDetailID INT PRIMARY KEY IDENTITY(1,1),
    ReturnID INT NOT NULL FOREIGN KEY REFERENCES Returns(ReturnID),
    ProductID INT NOT NULL FOREIGN KEY REFERENCES Products(ProductID),
    Quantity INT NOT NULL,
    Condition NVARCHAR(50) DEFAULT 'Unopened'  -- Unopened, Defective, Damaged, Wrong Item
);
```

**Backend:**
- New app `returns/` with models, serializers, views
- Endpoints: `POST /returns/` (customer requests), `GET /returns/` (warehouse lists), `PATCH /returns/<id>/approve/`, `PATCH /returns/<id>/reject/`
- On approval: auto-increase `Product.stock`, create `AuditLog` entry, update `Order.order_status` to "Returned"

**Frontend:**
- `Customer/MyOrders.jsx` — Add "Request Return" button on Delivered orders
- `Warehouse/Returns.jsx` — New page: list pending returns, approve/reject with reason, view refund history

---

#### 6. Batch Order Processing
> Select multiple orders and change their status in bulk (e.g., mark 10 orders as "Shipped" at once).

**Backend (`orders/views.py`):**
- Add endpoint `PATCH /orders/bulk-status/` accepting `{ order_ids: [1, 2, 3], status: "Shipped" }`
- Create `AuditLog` entries for each order in a single transaction

**Frontend (`Warehouse/StockMovements.jsx`):**
- Add checkbox column to order tables
- "Select All" header checkbox
- Floating action bar when items selected: "Mark as Shipped", "Mark as Delivered", "Print Labels"

---

#### 7. Logistics & Driver Assignment
> Assign delivery drivers to shipped orders.

**Database (New Table):**
```sql
CREATE TABLE DeliveryDrivers (
    DriverID INT PRIMARY KEY IDENTITY(1,1),
    FullName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(20) NOT NULL,
    VehicleType NVARCHAR(50),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT SYSDATETIME()
);

ALTER TABLE Orders ADD DriverID INT NULL FOREIGN KEY REFERENCES DeliveryDrivers(DriverID);
```

**Backend:**
- New model `DeliveryDriver` in `warehouse/models.py`
- Endpoint `GET /warehouse/drivers/`, `POST /warehouse/drivers/`
- Endpoint `PATCH /orders/<id>/assign-driver/` — assigns a driver and sets tracking info

**Frontend:**
- `Warehouse/StockMovements.jsx` — Add "Assign Driver" dropdown in shipped order rows
- New `Warehouse/Drivers.jsx` page — manage driver list

---

### 👑 Admin Panel

#### 8. Advanced Role-Based Access Control (RBAC)
> Let admin create custom roles like "Support Staff" with specific permission sets.

**Database (New Tables):**
```sql
CREATE TABLE Roles (
    RoleID INT PRIMARY KEY IDENTITY(1,1),
    RoleName NVARCHAR(50) NOT NULL UNIQUE,
    Description NVARCHAR(255),
    Permissions NVARCHAR(MAX),  -- JSON: {"can_view_orders": true, "can_delete_users": false, ...}
    CreatedAt DATETIME DEFAULT SYSDATETIME()
);
```

**Backend:**
- New model `Role` in `accounts/models.py`
- Add `custom_role` FK to `CustomUser`
- Permission checking middleware that reads the JSON permissions field

**Frontend:**
- `Admin/RoleManagement.jsx` — New page: create roles, toggle permission checkboxes
- `Admin/UserManagement.jsx` — Add role assignment dropdown per user

---

#### 9. Global Financial Reports (PDF/Excel Export)
> Generate downloadable reports summarizing platform revenue, commissions, and vendor payouts.

**Backend (`admin_panel/views.py`):**
- Add endpoint `GET /admin/reports/financial/?format=pdf&days=30`
- Use `openpyxl` for Excel, `reportlab` or `WeasyPrint` for PDF
- Report includes: total revenue, total profit, per-store breakdown, commission collected, top products

**Frontend (`Admin/Dashboard.jsx`):**
- Add "Export Report" button with format dropdown (PDF / Excel)
- Date range picker for the report period
- Download triggers via `window.open()` or blob download

---

## 🛠️ Technical Improvements Required

### Backend
| Issue | Fix |
|---|---|
| `DEBUG=True` hardcoded in `settings.py` | Use `python-dotenv` with `.env` file |
| SECRET_KEY exposed in settings | Move to environment variable |
| Heavy dashboard queries not cached | Add Django cache framework with Redis |
| Manual query param parsing in views | Use `django-filter` for clean filtering |
| No unit tests (`tests.py` files are empty) | Add pytest-django test suite |
| `since` variable unused after PO/product fix | Remove dead `since = timezone.now() - timedelta(days=30)` from `StockMovementsView` |

### Frontend
| Issue | Fix |
|---|---|
| `StockMovements.jsx` is 75KB / 1000+ lines | Break into sub-components: `OrderTable`, `POTable`, `CommissionPanel` |
| `Checkout.jsx` is 66KB / 1600+ lines | Extract: `AddressForm`, `PaymentSelector`, `OrderSummary`, `CouponBox` (partially done) |
| Manual `useEffect` + `useState` for data fetching | Migrate to TanStack React Query for caching + background sync |
| No TypeScript — runtime errors possible | Gradual `.jsx` → `.tsx` migration |
| `ErrorBoundary.jsx` shows generic message | Integrate Sentry for error monitoring in production |
| Duplicate `Review` model in `products/models.py` and `orders/models.py` | Remove one and keep a single source of truth |

### Database
| Issue | Fix |
|---|---|
| Typo: table name `Whishlist` | Rename to `Wishlist` (requires migration) |
| `AuditLog` missing `OldValues`/`NewValues` columns in SQL | Already added via Django migration — sync `Database.sql` |
| No `Password` column in `Customers` in original SQL | Already added via Django — sync `Database.sql` |
| No soft-delete column on Products | Add `IsDeleted BIT DEFAULT 0` + index |
| `Rating` column `DECIMAL(1,1)` limits to 0.0–0.9 | Change to `DECIMAL(2,1)` to support 0.0–5.0 (already done in Django model) |

---

## 📋 Summary: What's Done vs What's Needed

| Area | Already Done | New Features Needed |
|---|---|---|
| **Customer** | Cart, Wishlist, Compare, Reviews, Order Tracking, Coupons, Payment UI | Price Graph, Smart Filters, Payment Validation, Q&A, Returns |
| **Owner** | Dashboard, Products, Orders, Coupons, CSV Import, Analytics, ML Forecasting | Q&A Answers |
| **Warehouse** | Dashboard, Stock Movements, Inventory, Low Stock, Purchase Orders, Commission | Returns/RMA, Batch Processing, Driver Assignment |
| **Admin** | Dashboard, Users, Stores, Suppliers, Logs, Coupons, Queries, Analytics, ML | RBAC, Financial Reports (PDF/Excel) |
| **Database** | 17+ tables, indexes, audit logging | ProductQA, Returns, DeliveryDrivers, Roles |
| **Backend** | Full REST API, JWT auth, ML services | .env config, caching, tests, dead code cleanup |
| **Frontend** | 25+ pages, responsive, skeletons, lazy loading | Component refactoring, TypeScript, error monitoring |
