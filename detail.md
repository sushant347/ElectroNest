# ElectroNest — Complete Project Documentation

> **Written for Grade 10 students.** Every file, every feature, every database connection — explained step by step in plain English.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [How the Project Is Organized (Folder Structure)](#2-how-the-project-is-organized)
3. [The Database — Where All Data Lives](#3-the-database)
4. [Backend — The Brain of the Application](#4-backend)
   - [Settings & Configuration](#41-settings--configuration)
   - [Accounts App (Users & Authentication)](#42-accounts-app)
   - [Products App (Catalog)](#43-products-app)
   - [Orders App (Cart, Checkout, Coupons, Notifications)](#44-orders-app)
   - [Warehouse App (Inventory & Purchase Orders)](#45-warehouse-app)
   - [Admin Panel App (System Management & Audit Logs)](#46-admin-panel-app)
   - [Analytics App (Data Analysis & ML Services)](#47-analytics-app)
5. [Frontend — The User Interface](#5-frontend)
   - [Core Files (App, Auth, API)](#51-core-files)
   - [Customer Pages](#52-customer-pages)
   - [Owner Pages](#53-owner-pages)
   - [Admin Pages](#54-admin-pages)
   - [Warehouse Pages](#55-warehouse-pages)
   - [Reusable Components](#56-reusable-components)
6. [Data Analysis & Machine Learning (ML Services) — Deep Dive](#6-data-analysis--machine-learning)
7. [How Frontend ↔ Backend ↔ Database Are Linked](#7-how-everything-is-linked)
8. [Feature Summary Table](#8-feature-summary-table)

---

## 1. What Is This Project?

**ElectroNest** is a full e-commerce website for buying and selling electronics. Think of it like a mini version of Amazon or Daraz, but specifically for electronic gadgets in Nepal.

### Who uses it?

There are **4 types of users** (called "roles"):

| Role | What They Do | Example |
|------|-------------|---------|
| **Customer** | Browse products, add to cart, place orders, write reviews | Someone buying a phone |
| **Owner** (Store Owner) | Add products, manage their store, view analytics, create coupons | "TechStore Nepal" selling laptops |
| **Warehouse** | Manage inventory, track stock levels, receive purchase orders, deliver products | Warehouse worker checking stock |
| **Admin** | Manage everything: users, suppliers, view system logs, see platform analytics | The website manager |

### What technologies are used?

| Part | Technology | What It Does |
|------|-----------|--------------|
| **Backend** (Server) | Python + Django REST Framework | Handles all the logic, saves data, protects user accounts |
| **Frontend** (Website) | React + Vite | What users see and interact with in their browser |
| **Database** | Microsoft SQL Server (MSSQL) | Stores all the data (products, orders, users, etc.) |
| **Machine Learning** | Python (Pandas, NumPy, scikit-learn, Prophet) | Predicts future sales, segments customers, suggests prices |

---

## 2. How the Project Is Organized

```
Debug/
├── backend/                    ← Server code (Python/Django)
│   ├── manage.py               ← Django's command-line tool
│   ├── requirements.txt        ← List of Python packages needed
│   ├── db.sqlite3              ← Unused (we use MSSQL instead)
│   ├── page/                   ← Main project settings
│   │   ├── settings.py         ← Configuration (database, apps, auth)
│   │   ├── urls.py             ← Master URL router
│   │   ├── pagination.py       ← Custom pagination class
│   │   ├── wsgi.py             ← Production server entry
│   │   └── asgi.py             ← Async server entry
│   ├── accounts/               ← User authentication & profiles
│   ├── products/               ← Product catalog & reviews
│   ├── orders/                 ← Cart, orders, wishlist, coupons, notifications
│   ├── warehouse/              ← Inventory & purchase orders
│   ├── admin_panel/            ← Admin dashboard, user/supplier management, audit logs
│   ├── analytics/              ← Data analysis & ML predictions
│   └── myenv/                  ← Python virtual environment (packages)
│
├── frontend/                   ← Website UI code (React)
│   ├── package.json            ← List of JavaScript packages needed
│   ├── vite.config.js          ← Vite build tool configuration
│   ├── index.html              ← The single HTML page (React fills it)
│   └── src/                    ← All React source code
│       ├── App.jsx             ← Root component & route definitions
│       ├── main.jsx            ← Entry point (starts the app)
│       ├── Config/Config.js    ← API URL & constants
│       ├── context/AuthContext.jsx  ← Global login state
│       ├── services/api.js     ← All API calls to backend
│       ├── pages/              ← Full-page views
│       │   ├── Home.jsx        ← Homepage
│       │   ├── Customer/       ← Customer pages (Cart, Checkout, etc.)
│       │   ├── Owner/          ← Store owner pages
│       │   ├── Admin/          ← Admin pages
│       │   └── Warehouse/      ← Warehouse pages
│       └── components/         ← Reusable building blocks
│           ├── Common/         ← Navbar, Footer, ProtectedRoute
│           ├── admin/          ← Admin-specific components
│           ├── Owner/          ← Owner-specific components
│           └── warehouse/      ← Warehouse-specific components
│
├── ProjectBuild.md             ← Step-by-step setup guide
├── detail.md                   ← This file!
├── database.md                 ← Database schema documentation
└── Full.md                     ← Full project reference
```

---

## 3. The Database

### What is a database?

Think of a database as a very organized filing cabinet. Instead of paper folders, you have **tables** (like Excel spreadsheets). Each table stores a specific type of information.

### Our Database: ElectroNestDB (Microsoft SQL Server)

We use **Microsoft SQL Server Express** — a free, professional database. Our database name is `ElectroNestDB`.

### All Tables Explained

#### Core Tables (created manually in SQL Server)

| Table Name | What It Stores | Example Data |
|-----------|---------------|-------------|
| **Categories** | Product categories | "Laptops", "Smartphones", "Gaming" |
| **Suppliers** | Companies that supply products | "TechSupply Nepal", "RAM@techsupply.com" |
| **Products** | Every product in the store | "Dell Inspiron 15", NPR 75,000, 50 in stock |
| **Customers** | People who buy things | "Sushant", "sushant@gmail.com", "Kathmandu" |
| **OrderStatus** | Possible order states | "Pending", "Processing", "Shipped", "Delivered", "Cancelled" |
| **Orders** | Every order placed | Order #ORD-001, Customer #5, Total NPR 85,000 |
| **OrderDetails** | Items inside each order | Order #1 contains 2× iPhone at NPR 42,500 each |
| **Customer_Address** | Shipping/billing addresses | "Sankhamul, Kathmandu, Bagmati, 44600" |
| **Reviews** | Product ratings & comments | 4.5 stars, "Great phone, fast delivery!" |
| **Cart** | Temporary shopping cart items | Customer #5 has 3× AirPods in cart |
| **Whishlist** | Saved-for-later items | Customer #5 saved MacBook Pro |
| **PaymentMethods** | How customers can pay | "Cash on Delivery", "Credit Card", "UPI" |
| **Payments** | Payment records for orders | Order #1 paid NPR 42,500 via Credit Card |
| **PurchaseOrders** | Warehouse orders from suppliers | Ordered 100 units from TechSupply Nepal |
| **PurchaseOrderDetails** | Items in each purchase order | 50× Dell Inspiron at NPR 60,000 cost |

#### Tables Created by Django (automatically)

| Table Name | What It Stores | Why |
|-----------|---------------|-----|
| **accounts_customuser** | Staff users (admin, owner, warehouse) | Separate from customers — staff have different permissions |
| **CompareList** | Products being compared side-by-side | Customer comparing iPhone 15 vs Samsung S24 |
| **Coupons** | Discount codes created by store owners | "SAVE10" — 10% off, max NPR 500 discount |
| **CouponUsage** | Tracks who used which coupon | Customer #5 used "SAVE10" on March 1st |
| **Notifications** | In-app notification messages | "New order received for iPhone 15!" |
| **AuditLog** | System activity trail | "Admin deleted user #42 at 2:30 PM" |

### How Tables Connect (Foreign Keys)

Imagine tables as puzzle pieces that fit together:

```
Categories ──────┐
                 ↓
Suppliers ──→ Products ←── Reviews ←── Customers
                 ↓                        ↓
              OrderDetails ──→ Orders ←── Customer_Address
                                ↓
                             Payments ──→ PaymentMethods
```

**Example:** When someone places an order:
1. The `Orders` table gets a new row (OrderID, CustomerID, Total)
2. The `OrderDetails` table gets rows for each product (OrderID, ProductID, Quantity, Price)
3. The `Payments` table records the payment (OrderID, PaymentMethodID, Amount)
4. The `Products` table is updated (Stock decreases, UnitsSold increases)

### Managed vs Unmanaged Tables

- **Unmanaged** (`managed = False`) — We created these tables in SQL Server manually. Django reads/writes to them but doesn't create or destroy them.
- **Managed** (`managed = True`) — Django creates these tables automatically when you run `python manage.py migrate`.

---

## 4. Backend

The backend is like the **kitchen of a restaurant**. The customer (frontend) places an order, and the kitchen (backend) prepares it, checks if ingredients (data) are available, and sends the ready meal (response) back.

### 4.1 Settings & Configuration

#### `backend/page/settings.py` — The Heart of Configuration

**What it does:** Contains ALL settings for the Django project.

**Key settings explained:**

```python
INSTALLED_APPS = [
    'accounts',          # User login/registration
    'products',          # Product catalog
    'orders',            # Cart, orders, wishlist
    'analytics',         # Data analysis & ML
    'warehouse',         # Inventory management
    'admin_panel',       # Admin features
    'rest_framework',    # Turns Django into an API server
    'corsheaders',       # Allows frontend to talk to backend
    'django_filters',    # Smart filtering on lists
]
```

**Database connection:**
```python
DATABASES = {
    'default': {
        'ENGINE': 'mssql',           # Use Microsoft SQL Server
        'NAME': 'ElectroNestDB',     # Our database name
        'HOST': '.\\SQLEXPRESS',     # SQL Server running locally
    }
}
```

**Authentication:**
- Staff users (admin, owner, warehouse) use **SimpleJWT** — Django's built-in JWT system
- Customers use a **custom JWT** — hand-made tokens because customers are stored in a different table
- Access tokens last **1 day**, refresh tokens last **30 days**

**Why two auth systems?** Because staff users live in `accounts_customuser` (Django's built-in user system) while customers live in the legacy `Customers` table (created in SQL Server before Django). We needed both to work seamlessly.

#### `backend/page/urls.py` — The Master Router

**What it does:** Maps URLs to the correct app.

```
http://localhost:8000/api/auth/     → accounts app (login, register, profile)
http://localhost:8000/api/products/ → products app (browse catalog)
http://localhost:8000/api/orders/   → orders app (cart, checkout)
http://localhost:8000/api/warehouse/→ warehouse app (inventory)
http://localhost:8000/api/analytics/→ analytics app (charts, ML)
http://localhost:8000/api/admin/    → admin_panel app (user management)
```

Think of it as a **reception desk** that directs visitors to the right department.

#### `backend/page/pagination.py` — Flexible Pagination

**What it does:** When there are 1,000 products, you don't want to send all 1,000 at once. This splits them into pages of 50.

**How:** The frontend can request `?page=2&page_size=20` to get the 2nd page with 20 items.

---

### 4.2 Accounts App

This app handles **who you are** — logging in, registering, managing your profile and addresses.

#### `accounts/models.py` — User Data Models

**What:** Defines the shape of user data in the database.

**Two types of users:**

1. **`CustomUser`** (Staff users) — stored in `accounts_customuser` table
   - Fields: `email`, `first_name`, `last_name`, `role` (owner/warehouse/admin), `phone`, `gender`, `dob`
   - Created by admin using `createsuperuser` or the admin panel
   - Extends Django's built-in AbstractUser (gets password hashing, permissions for free)

2. **`CustomerAddress`** — stored in `Customer_Address` table
   - Links to a Customer via `CustomerID`
   - Fields: `street`, `city`, `province`, `postal_code`, `country` (default: Nepal), `address_type` (Billing or Shipping)

**Why separate?** The `Customers` table existed before we built the Django backend (it was created directly in SQL Server). Staff users needed Django's permission system, so they got their own table.

#### `accounts/authentication.py` — Custom Login Checker

**What:** A custom authentication class that Django REST Framework uses to verify "is this person logged in?"

**How it works:**
1. When a request comes in, it checks if the JWT token is a **customer token** (has `user_type: 'customer'`)
2. If yes → finds the Customer from the `Customers` table and returns them as `request.user`
3. If no → falls through to SimpleJWT which handles staff tokens

**Why we built this:** Django's built-in auth only knows about `CustomUser`. Our customers are in a totally different table, so we needed custom code to authenticate them.

#### `accounts/serializers.py` — Data Converters

**What:** Converts database objects to JSON (for sending to frontend) and JSON back to database objects (for saving).

**Key serializers:**

| Serializer | What It Does |
|-----------|-------------|
| `LoginSerializer` | Validates email + password from login form |
| `RegisterSerializer` | Validates registration data, creates customer in `Customers` table using **raw SQL**, optionally creates an address |
| `UserSerializer` | Converts `CustomUser` to JSON (for staff profiles) |
| `CustomerUserSerializer` | Converts `Customer` to JSON (for customer profiles) |
| `CustomerAddressSerializer` | Converts `CustomerAddress` to JSON |

**Why raw SQL for registration?** The `Customers` table is unmanaged — Django's ORM can create records but using raw SQL with `OUTPUT INSERTED.*` (MSSQL syntax) gives us the newly created ID immediately.

#### `accounts/views.py` — The Action Handlers

**What:** Contains the actual logic for login, register, profile, etc.

**Key views:**

| View | URL | What It Does |
|------|-----|-------------|
| `LoginView` | `POST /api/auth/login/` | Checks email/password against both `CustomUser` and `Customers` tables. Returns JWT tokens. |
| `RegisterView` | `POST /api/auth/register/` | Creates a new customer account. Validates email uniqueness across both tables. |
| `ProfileView` | `GET/PATCH /api/auth/profile/` | View or update your profile (works for both staff and customers). |
| `ChangePasswordView` | `POST /api/auth/change-password/` | Updates password. Checks old password first. |
| `LogoutView` | `POST /api/auth/logout/` | Invalidates the session. |
| `CustomerAddressViewSet` | `/api/auth/addresses/` | Full CRUD (Create, Read, Update, Delete) for customer addresses. |

**How login works step by step:**
1. Frontend sends `{ email: "john@gmail.com", password: "abc123" }`
2. Backend first checks `CustomUser` table (for staff)
3. If not found, checks `Customers` table
4. If password matches → generates JWT tokens (access + refresh)
5. Returns tokens + user info as JSON

#### `accounts/urls.py` — Route Map

```
/api/auth/login/            → LoginView
/api/auth/register/         → RegisterView
/api/auth/refresh/          → TokenRefreshView (gets new access token)
/api/auth/logout/           → LogoutView
/api/auth/profile/          → ProfileView
/api/auth/change-password/  → ChangePasswordView
/api/auth/addresses/        → CustomerAddressViewSet (CRUD)
```

**Database tables touched:** `Customers`, `accounts_customuser`, `Customer_Address`, `Orders`

---

### 4.3 Products App

This app manages the **product catalog** — all the items you can browse, buy, and review.

#### `products/models.py` — Product Data Models

| Model | Table | Key Fields | Notes |
|-------|-------|-----------|-------|
| `Category` | `Categories` | `CategoryID`, `CategoryName` | Unmanaged. "Laptops", "Smartphones", etc. |
| `Supplier` | `Suppliers` | `SupplierID`, `SupplierName`, `ContactEmail`, `Phone`, `City`, `Country`, `IsActive` | Who supplies the products |
| `Product` | `Products` | `ProductID`, `SKU`, `ProductName`, `CategoryID`, `Brand`, `OwnerName`, `SupplierID`, `SellingPrice`, `CostPrice`, `Stock`, `ReorderLevel`, `UnitsSold`, `ProductDescription`, `ProductImageURL`, `Specifications` | The main product table |
| `Customer` | `Customers` | `CustomerID`, `FirstName`, `LastName`, `Email`, `Password`, `Phone`, `Gender`, `DateOfBirth` | Also used by accounts app |
| `Review` | `Reviews` | `ReviewID`, `ProductID`, `CustomerID`, `Rating` (1–5), `Comment`, `ReviewDate` | One review per customer per product |

**Important field: `OwnerName`**
This is a text field that stores which store owner sells this product (e.g., "Ram Sharma"). It links products to owners by matching against `CustomUser.first_name + ' ' + CustomUser.last_name`.

#### `products/serializers.py` — Data Converters

| Serializer | Extra Fields | Purpose |
|-----------|-------------|---------|
| `ProductSerializer` | `category_name`, `supplier_name`, `average_rating`, `review_count` | Sends product + computed data |
| `ReviewSerializer` | `customer_name`, `product_name` | Shows who wrote the review |
| `CategorySerializer` | — | Simple category data |
| `SupplierSerializer` | — | Supplier details |

**Why `average_rating` is computed:** The Products table doesn't store ratings directly. The serializer calculates it by averaging all Review ratings for that product using Django's `Avg()` aggregation.

#### `products/views.py` — Action Handlers

| View | URL | What It Does |
|------|-----|-------------|
| `CategoryViewSet` | `/api/categories/` | List/create/update/delete categories. Anyone can browse; only admin can edit. |
| `SupplierViewSet` | `/api/suppliers/` | CRUD for suppliers. Only authenticated users. |
| `ProductViewSet` | `/api/products/` | CRUD for products. Supports filtering by category, brand, owner. `?my_products=true` shows only the logged-in owner's products. |
| `ReviewViewSet` | `/api/reviews/` | GET reviews for a product, POST a new review. Prevents duplicate reviews (one per customer per product). |
| `BulkImportProductsView` | `POST /api/products/bulk-import/` | Upload a CSV file to add many products at once. Auto-creates categories if they don't exist. |

**Filtering example:**
- `/api/products/?category=1` → Only laptops
- `/api/products/?brand=Dell` → Only Dell products
- `/api/products/?search=iphone` → Search for "iphone"
- `/api/products/?ordering=-selling_price` → Most expensive first

**Audit logging:** Every create/update/delete on products, categories, and suppliers is automatically recorded in the `AuditLog` table using the `AuditMixin`.

**Database tables touched:** `Categories`, `Suppliers`, `Products`, `Reviews`, `Customers`, `AuditLog`

---

### 4.4 Orders App

This is the **biggest and most complex app**. It handles everything related to buying things — cart, checkout, orders, wishlist, compare list, coupons, and notifications.

#### `orders/models.py` — Data Models

| Model | Table | What It Stores |
|-------|-------|---------------|
| `OrderStatus` | `OrderStatus` | 5 statuses: Pending, Processing, Shipped, Delivered, Cancelled |
| `Order` | `Orders` | Each customer order (OrderNumber, CustomerID, TotalAmount, AddressID, TrackingNumber) |
| `OrderDetail` | `OrderDetails` | Items inside each order (ProductID, Quantity, UnitPrice) |
| `Cart` | `Cart` | Customer's shopping cart (ProductID, OrderCount) — max 6 per product |
| `Wishlist` | `Whishlist` | Saved items (note: typo in table name is from original SQL schema) |
| `PaymentMethod` | `PaymentMethods` | Payment options (COD, Credit Card, Debit Card, UPI, Net Banking) |
| `Payment` | `Payments` | Payment records (OrderID, MethodID, DiscountPercent, PayableAmount) |
| `CompareList` | `CompareList` | Products being compared (max 3 at a time) |
| `Coupon` | `Coupons` | Discount codes with: code, discount_percent, max_discount, min_order_amount, usage_limit, per_customer_limit, free_delivery, valid_from, valid_until |
| `CouponUsage` | `CouponUsage` | Tracks each time a customer uses a coupon |
| `Notification` | `Notifications` | System messages (low_stock, order_update, purchase_order, general) |

#### `orders/serializers.py` — Data Converters

**Key serializers:**

| Serializer | Special Features |
|-----------|-----------------|
| `OrderSerializer` | Nested `details` (products in order), `status_name`, `customer_name`, `items_count`, `payment_method`, `shipping_address` (formatted nicely), deduplicates order details |
| `CartSerializer` | Nested full `ProductSerializer` so frontend gets product images, names, prices |
| `CouponSerializer` | `is_valid` (computed: checks active + date + usage limit), `owner_name` (which store created it), `customer_used_count` (how many times THIS customer already used this coupon) |
| `NotificationSerializer` | `sender_name`, `product_name` — extra context for the notification bell |

**Why deduplication in OrderSerializer?** Sometimes the database returns duplicate OrderDetail rows (due to joins). The serializer removes duplicates by checking OrderDetailID uniqueness.

#### `orders/views.py` — Action Handlers

This is the most complex file (~800+ lines). Here's what each view does:

##### OrderViewSet — The Core of E-Commerce

**Creating an order (`POST /api/orders/`):**
1. Receives: list of cart item IDs, address ID, payment method, optional coupon code
2. **Splits orders by store** — if you buy from 2 different stores, it creates 2 separate orders
3. For each order:
   - Generates a unique order number (e.g., `ORD-20260301-ABC123`)
   - Deducts stock from each product
   - Increases `units_sold` on each product
   - Creates `OrderDetail` rows for each item
   - Creates `Payment` record with coupon discount applied
   - If coupon used: records `CouponUsage` and increments `used_count`
   - Sends `Notification` to the product owner ("New order received!")
4. Empties the customer's cart

**Cancelling an order (`PATCH /api/orders/{id}/cancel/`):**
- Only works if order is "Pending" or "Processing"
- Restores stock to each product
- Sets status to "Cancelled"
- Logs the cancellation in `AuditLog`

**Updating status (`PATCH /api/orders/{id}/update-status/`):**
- Owner/admin can change status (e.g., Pending → Processing → Shipped)
- When set to "Shipped": sends notification to warehouse staff

##### CartViewSet — Shopping Cart

| Action | What It Does |
|--------|-------------|
| `GET /api/cart/` | List all cart items for logged-in customer |
| `POST /api/cart/` | Add product to cart (max 6 per product) |
| `PATCH /api/cart/{id}/` | Update quantity |
| `DELETE /api/cart/{id}/` | Remove item |
| `DELETE /api/cart/clear/` | Empty entire cart |

##### WishlistViewSet — Saved Items

Same pattern as cart — add, remove, list items you want to buy later.

##### CompareListViewSet — Product Comparison

- Maximum 3 products at a time
- Add, remove, clear, list products being compared

##### CouponViewSet — Discount Codes

| Action | What It Does |
|--------|-------------|
| `GET /api/coupons/` | List coupons. Admins see all, owners see their own, customers see active valid coupons |
| `POST /api/coupons/` | Create coupon (owners/admins only) |
| `POST /api/coupons/validate/` | Check if a coupon code is valid. Returns discount details |
| `GET /api/coupons/my-usage/` | Customer sees their coupon usage history |

**Store-scoped coupons:** When a customer passes `?owner_name=Ram Sharma`, they only see coupons from Ram Sharma's store. The coupon discount also only applies to that store's products at checkout.

##### NotificationViewSet — System Notifications

- List notifications, mark as read, mark all read, clear all
- Only for staff users (owners see order notifications, warehouse sees shipping notifications)

##### SendLowStockAlertView — Warehouse → Owner Alerts

When warehouse staff sees a product running low, they can send an alert to the product's owner. The system matches `OwnerName` to `CustomUser` by concatenating `first_name + ' ' + last_name`.

**Database tables touched:** `Orders`, `OrderDetails`, `OrderStatus`, `Cart`, `Whishlist`, `Reviews`, `PaymentMethods`, `Payments`, `Products`, `Customers`, `Customer_Address`, `CompareList`, `Coupons`, `CouponUsage`, `Notifications`, `AuditLog`, `accounts_customuser`

---

### 4.5 Warehouse App

This app manages **inventory** — tracking what's in the warehouse, ordering from suppliers, and receiving deliveries.

#### `warehouse/models.py` — Purchase Order Models

| Model | Table | Fields |
|-------|-------|--------|
| `PurchaseOrder` | `PurchaseOrders` | SupplierID, OrderDate, TotalAmount, ExpectedDeliveryDate, OrderStatusID |
| `PurchaseOrderDetail` | `PurchaseOrderDetails` | PurchaseOrderID, ProductID, Quantity, UnitCost |

**What is a Purchase Order?** It's an order placed by the warehouse to a supplier. For example: "Order 100 Dell Laptops from TechSupply Nepal at NPR 60,000 each."

#### `warehouse/views.py` — Action Handlers

| View | URL | What It Does |
|------|-----|-------------|
| `PurchaseOrderViewSet` | `/api/warehouse/purchase-orders/` | Create and manage purchase orders. **Receive action**: marks PO as "Delivered" and adds the quantity to each product's stock. |
| `WarehouseDashboardView` | `/api/warehouse/dashboard/` | Overview stats: total products, total stock, low-stock count, pending purchase orders, recent customer orders, shipped orders ready to deliver |
| `StockMovementsView` | `/api/warehouse/stock-movements/` | Last 30 days of stock changes: customer orders (stock out), received POs (stock in), recently updated products |

**How "Receive" works:**
1. Warehouse clicks "Receive" on a purchase order
2. Backend marks the PO status as "Delivered"
3. For each item in the PO, adds the ordered quantity to the product's `Stock`
4. Logs each stock change to `AuditLog`

**Database tables touched:** `PurchaseOrders`, `PurchaseOrderDetails`, `Products`, `Suppliers`, `Orders`, `OrderDetails`, `OrderStatus`, `Payments`, `AuditLog`

---

### 4.6 Admin Panel App

This app gives the **system administrator** full control over the platform.

#### `admin_panel/models.py` — Audit Logging

**`AuditLog` model:**
- Records EVERY important action: who did what, when, to which table, what changed
- Fields: `action` (CREATE/UPDATE/DELETE/LOGIN/LOGOUT), `table_name`, `record_id`, `user_id`, `timestamp`, `old_values` (JSON), `new_values` (JSON)
- Has a static method `log_action()` for easy logging from anywhere

**`AuditMixin`:**
- A mixin class that automatically logs CREATE, UPDATE, and DELETE operations
- Mixed into ViewSets: when you create/edit/delete a product, category, supplier, etc., it's automatically recorded

**`LoginLogMixin`:**
- Logs login and logout events with the user's IP address

#### `admin_panel/permissions.py` — Access Control

**`IsAdminRole`:** A permission class that checks if `request.user.role == 'admin'`. Only admins can access admin endpoints.

#### `admin_panel/views.py` — Action Handlers

| View | URL | What It Does |
|------|-----|-------------|
| `UserManagementViewSet` | `/api/admin/users/` | CRUD for staff users (create owner, warehouse, admin accounts). `toggle-active` action to enable/disable users. |
| `SupplierManagementViewSet` | `/api/admin/suppliers/` | CRUD for suppliers. |
| `AuditLogViewSet` | `/api/admin/logs/` | Browse the audit trail. Filter by action type, table, date range, user. `stats` action: charts of action distribution, daily activity, most active users. |
| `AdminDashboardView` | `/api/admin/dashboard/` | Comprehensive platform stats: total users, orders, revenue, active suppliers, customer demographics (gender pie chart), registration trends, top products by revenue, category revenue, role distribution, recent audit logs. |
| `CustomerListView` | `/api/admin/customers/` | List all customers with search and filter (name, email, phone, gender, active status). |
| `CustomerDetailView` | `/api/admin/customers/{id}/` | View, update, or delete a specific customer. All changes are audit-logged. |

**Database tables touched:** `accounts_customuser`, `Suppliers`, `AuditLog`, `Customers`, `Orders`, `OrderDetails`, `Products`, `Categories`

---

### 4.7 Analytics App

This app provides **business intelligence and machine learning** features. It reads data from other apps' tables (it has no models of its own).

#### `analytics/views.py` — Analytics Endpoints

| View | URL | What It Shows |
|------|-----|-------------|
| `SalesOverviewView` | `/api/analytics/sales-overview/` | Total revenue, profit, orders, customers with period-over-period % change. Owner-scoped. |
| `RevenueTrendView` | `/api/analytics/revenue-trend/` | Daily or monthly revenue + profit trend line |
| `TopProductsView` | `/api/analytics/top-products/` | Top 10 best-selling products by revenue |
| `CategoryPerformanceView` | `/api/analytics/category-performance/` | Revenue, orders, product count per category |
| `PaymentMethodsView` | `/api/analytics/payment-methods/` | Which payment methods are most popular |
| `OrderStatusView` | `/api/analytics/order-status/` | How many orders in each status (Pending, Shipped, etc.) |
| `LowStockView` | `/api/analytics/low-stock/` | Products where stock ≤ reorder level (needs restocking) |
| `CustomerSegmentationView` | `/api/analytics/segmentation/` | RFM customer segmentation (uses ML) |
| `DemandForecastView` | `/api/analytics/forecast/{id}/` | Simple 3-day moving average forecast (uses ML) |
| `ProductRecommendationsView` | `/api/analytics/recommendations/{id}/` | Products frequently bought together (uses ML) |
| `ComprehensiveForecastView` | `/api/analytics/comprehensive-forecast/{id}/` | Prophet-based multi-metric forecast (uses ML) |
| `ProductGrowthView` | `/api/analytics/product-growth/{id}/` | Day-by-day units, revenue, profit for one product |
| `ChurnPredictionView` | `/api/analytics/churn-prediction/` | Predicts which customers might stop buying (uses ML) |
| `DynamicPricingView` | `/api/analytics/dynamic-pricing/{id}/` | Suggests price adjustments based on demand trends (uses ML) |

The ML-powered endpoints are detailed in [Section 6](#6-data-analysis--machine-learning).

---

## 5. Frontend

The frontend is what users **see and interact with** in their web browser. It's built with **React** — a JavaScript library that creates interactive user interfaces.

### 5.1 Core Files

#### `src/main.jsx` — The Starting Point

**What:** The very first file that runs. It:
1. Wraps the app in `BrowserRouter` (enables page navigation without reloading)
2. Wraps in `AuthProvider` (makes login state available everywhere)
3. Renders `<App />` into the HTML page

```
index.html → main.jsx → AuthProvider → BrowserRouter → App.jsx
```

#### `src/App.jsx` — The Root Component & Router

**What:** The central hub of the entire frontend. It:

1. **Manages global state** for cart, wishlist, compare list, and toast notifications
2. **Defines ALL routes** — which URL shows which page:
   - `/` → Home page
   - `/login` → Login/Register page
   - `/product/:id` → Product detail page
   - `/cart` → Shopping cart
   - `/checkout` → Checkout page
   - `/orders` → My orders
   - `/reviews` → My reviews
   - `/profile` → Profile page
   - `/wishlist` → Wishlist
   - `/compare` → Compare products
   - `/owner/*` → Owner dashboard (protected)
   - `/admin/*` → Admin dashboard (protected)
   - `/warehouse/*` → Warehouse dashboard (protected)
3. **Normalizes data** — different API responses use different field names (e.g., `ProductName` vs `name`). App.jsx has normalizer functions that convert everything to a consistent format.
4. **Passes props** — cart items, wishlist items, and action functions (`addToCart`, `toggleWishlist`, `toggleCompare`) flow down to child components.

**How state flows:**
```
App.jsx (holds cartItems, wishlistItems, compareItems)
  ├── passes to → Home.jsx (addToCart, toggleWishlist, toggleCompare)
  ├── passes to → Cart.jsx (cartItems, updateQuantity, removeItem)
  ├── passes to → Checkout.jsx (checkoutItems, removeFromCart)
  └── passes to → ProductDetail.jsx (addToCart, toggleWishlist)
```

#### `src/Config/Config.js` — Constants

**What:** Stores configuration values used throughout the app:
- `API_BASE_URL` = `http://localhost:8000/api` — where the backend lives
- `API_TIMEOUT` = 10,000 ms (10 seconds)
- `AUTH_TOKEN_KEY` = key name for storing JWT in localStorage
- `REFRESH_TOKEN_KEY` = key name for refresh token
- `MAX_FILE_SIZE` = 5 MB

#### `src/context/AuthContext.jsx` — Global Login State

**What:** A React Context that makes login information available to EVERY component without passing props.

**How it works:**
1. On page load, checks localStorage for existing JWT tokens
2. If found→ silently refreshes the access token (in case it expired)
3. Provides: `user` object, `login()` function, `logout()` function, role booleans (`isCustomer`, `isOwner`, `isAdmin`, `isWarehouse`)
4. Listens for `auth:logout` events (dispatched by api.js when token refresh fails)

**Why this matters:** Without AuthContext, every component would need to check tokens manually. AuthContext centralizes this into one place.

#### `src/services/api.js` — The API Communication Layer

**What:** Contains EVERY API call the frontend makes to the backend. Think of it as a **phone directory** — when a component needs data, it calls a function here.

**How it works:**

1. **Creates an Axios instance** with base URL and timeout
2. **Request interceptor:** Automatically attaches the JWT token to every outgoing request
3. **Response interceptor:** If a request fails with 401 (unauthorized):
   - Tries to refresh the token using the refresh token
   - If refresh succeeds → retries the failed request with new token
   - If refresh fails → logs the user out
   - Multiple failed requests are **queued** and retried after refresh (prevents race conditions)
4. **Exports 5 API groups:**

| Group | # of Functions | Used By |
|-------|---------------|---------|
| `customerAPI` | 25+ | Customer pages (browse, cart, orders, reviews, coupons) |
| `ownerAPI` | 32+ | Owner pages (products, analytics, coupons, notifications) |
| `warehouseAPI` | 15+ | Warehouse pages (inventory, purchase orders, alerts) |
| `adminAPI` | 20+ | Admin pages (users, suppliers, logs, analytics) |
| `authAPI` | 4 | Login, register, logout, refresh |

**Example API call chain:**
```
User clicks "Add to Cart" 
  → Cart.jsx calls customerAPI.addToCart(productId, 1)
    → api.js sends POST /api/cart/ with JWT header
      → Backend CartViewSet.create() adds record to Cart table
        → Returns the new cart item as JSON
          → Cart.jsx updates its state
```

---

### 5.2 Customer Pages

These are the pages a regular customer sees when browsing and shopping.

#### `pages/Home.jsx` — The Storefront

**What:** The main landing page with hero section, category grid, and product grid.

**Features:**
- **Hero section:** Announcement bar ("New Arrivals 2026"), product/category/store counts
- **Category grid:** 12 category cards with icons (Smartphones, Laptops, Gaming, etc.). Clicking filters products.
- **Product grid:** Shows products as cards with image, name, price, brand, owner, rating
- **Featured Products:** When no filter is active, shows top 3 best-sellers per category
- **Search:** URL parameter `?search=iphone` filters products by name/brand/category/description
- **Category filter:** URL parameter `?cat=Laptops` shows only laptops

**How it connects:**
- Calls `customerAPI.getCategories()` and `customerAPI.getProducts()` on page load
- Receives `addToCart`, `toggleWishlist`, `toggleCompare` as props from App.jsx
- Each product card links to `/product/{id}` for the detail page

**What the user sees:**
```
┌──────────────────────────────────────┐
│  🔥 Your One-Stop Electronics Store  │
│  [180 Products] [12 Categories]      │
├──────────────────────────────────────┤
│  [📱 Phones] [💻 Laptops] [🎮 Gaming]│
│  [📷 Cameras] [⌚ Watches] [🔊 Audio]│
├──────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ img │ │ img │ │ img │ │ img │   │
│  │ $500│ │ $800│ │ $200│ │ $150│   │
│  │[Add]│ │[Add]│ │[Add]│ │[Add]│   │
│  └─────┘ └─────┘ └─────┘ └─────┘   │
└──────────────────────────────────────┘
```

#### `pages/Customer/Login.jsx` — Login & Registration

**What:** Dual-mode page — login OR register with tabs.

**Validation rules:**
- Email: Must be `@gmail.com` or `.edu.np` domain
- Password: Minimum 8 characters
- Phone: Must be Nepal (+977) or India (+91) format
- All fields required for registration (first name, last name, email, phone, password + confirm)

**How it works:**
1. Login: Calls `authAPI.login({ email, password })`
2. Register: Calls `authAPI.register({ first_name, last_name, email, phone, password, ... })`
3. On success: Stores tokens in localStorage, redirects to role-appropriate dashboard

#### `pages/Customer/Cart.jsx` — Shopping Cart

**What:** Shows all items in the customer's cart with quantity controls.

**Features:**
- List all cart items with product image, name, price, quantity
- **Quantity controls:** + and − buttons (max 6 per product)
- **Select items** for checkout (checkbox per item)
- **Subtotal** calculation for selected items
- **Remove item** button
- **Proceed to Checkout** sends selected items to the Checkout page

**State:** Cart items are managed in App.jsx and passed down as props. Changes sync with backend via `customerAPI.updateCartItem()` and `customerAPI.removeCartItem()`.

#### `pages/Customer/Checkout.jsx` — The Checkout Process

**What:** Multi-step checkout page (~1500 lines — the largest frontend file).

**Steps:**
1. **Address selection/creation** — Pick from saved addresses or add new one
2. **Payment method** — Cash on Delivery, Credit Card, Debit Card, UPI, Net Banking
3. **Coupon application** — Enter a code, validates with backend, shows discount
4. **Order summary** — Review items, see calculations
5. **Place order** — Confirms and creates the order

**Coupon system (store-scoped):**
- When a coupon belongs to store "Ram Sharma", it only applies to Ram Sharma's products
- `storeSubtotal` — filters checkout items by `owner_name`, sums only matching products
- `min_order_amount` check uses the store subtotal, not the full cart total
- Discount label shows "on {storeName} items only"

**Price calculation:**
```
Store Subtotal (matching items only)     NPR 50,000
Coupon Discount (10% on store items)   - NPR  5,000
Full Subtotal (all items)                NPR 80,000
Shipping (NPR 200, free above 3500)    + NPR     0
VAT (13%)                             + NPR 10,400
──────────────────────────────────────
Total                                    NPR 85,400
```

**localStorage integration:**
- On mount, checks for `claimedCouponCode` (auto-applies saved coupon)
- On consume, removes the code from `claimedCoupons` array so the Claim button resets on ProductDetail

#### `pages/Customer/ProductDetail.jsx` — Product Detail Page

**What:** Shows full details of a single product with reviews and coupons.

**Sections:**
1. **Product image** (full size)
2. **Product info:** Name, category, brand, seller, rating stars, price, stock status, SKU
3. **Quantity selector + Add to Cart + Wishlist buttons**
4. **Trust badges:** Delivery Available, Secure Payment, Easy Returns
5. **Coupon Carousel** (sub-component) — Scrollable coupon cards from the product's store
6. **Specifications** — Parsed from JSON or pipe-delimited text into a nice grid
7. **Customer Reviews** — Star ratings and comments
8. **You May Also Like** — Least-sold products from the same category

**CouponCarousel sub-component:**
- Fetches store-specific coupons via `customerAPI.getCoupons(ownerName)`
- Each coupon is a ticket-style card with: discount %, code, min order, remaining uses bar, per-customer usage dots
- **3-state Claim button:**
  - "Claim" (orange filled) → saves code to localStorage
  - "✓ Claimed" (orange outline, disabled) → already claimed, waiting for checkout
  - "✕ Used" (grey, disabled) → customer has used all their allowed uses (tracked via `customer_used_count` from backend)
- **Optimistic bar decrease:** When you click Claim, the "uses remaining" bar decreases by 1 immediately (without waiting for server)
- Persistent via localStorage — if you refresh the page, claimed state remains

**How it loads data:**
```
useEffect → Promise.all([
  customerAPI.getProduct(id),
  customerAPI.getReviews(id),
])
useEffect → customerAPI.getCoupons(product.ownerName)
useEffect → customerAPI.getProducts({ category: product.categoryId }) // for "You May Also Like"
```

#### `pages/Customer/Compare.jsx` — Product Comparison

**What:** Side-by-side comparison of up to 3 products.

**Features:**
- Shows products in columns
- Compares: price, brand, category, rating, specifications
- Parses JSON and pipe-delimited specs into comparable rows
- Remove individual products from comparison

#### `pages/Customer/MyOrders.jsx` — Order History

**What:** Shows all orders placed by the customer.

**Features:**
- **Filter tabs:** All, Pending, Processing, Shipped, Delivered, Cancelled
- **Order details:** Order number, date, items, total, status
- **4-step status tracker:** Pending → Processing → Shipped → Delivered
  - Steps turn **green** when the order is delivered (`stepIndex >= 3`)
  - Orange gradient for in-progress orders
- **Cancel order** button (only for Pending/Processing)
- **Print Invoice** modal for delivered orders

#### `pages/Customer/MyReviews.jsx` — Write Reviews

**What:** Shows products from delivered orders that the customer can review.

**Features:**
- Lists products from delivered orders
- `StarPicker` sub-component — click to select 1-5 stars
- Write comment, submit review
- Can only review once per product (checked by backend)

#### `pages/Customer/Profile.jsx` — User Profile

**What:** View and edit customer profile + manage addresses.

**Features:**
- View: Name, email, phone, gender, date of birth
- Edit profile fields
- **Address management** (CRUD):
  - Maximum 2 billing addresses + 4 shipping addresses
  - Each address: street, city, province, postal code, country, type

#### `pages/Customer/Wishlist.jsx` — Saved Items

**What:** Products saved for later purchase.

**Features:**
- List saved products with images, prices, stock status
- **Filter:** By category or search
- **Sort:** By price, name, date added
- **Bulk actions:** Move all to cart, clear wishlist
- Remove individual items
- Add to cart directly from wishlist

---

### 5.3 Owner Pages

These pages are for store owners who sell products on the platform.

#### `pages/Owner/Dashboard.jsx` — Owner Dashboard

**What:** Overview of the store's performance.

**Features:**
- 4 KPI cards: Total Revenue, Orders, Customers, Average Order Value (with % change)
- Revenue chart (bar + line combo)
- Top products table
- Category distribution chart
- Custom `useDashboardData(timeRange)` hook fetches all data in parallel
- Time range selector: 7 days, 30 days, 90 days, 1 year

#### `pages/Owner/ProductManagement.jsx` — Manage Products

**What:** Full CRUD for the owner's products.

**Features:**
- List all products with search, filter by category, pagination
- **Add product** modal (name, SKU, category, brand, prices, stock, image URL, description, specs)
- **Edit product** modal
- **Delete product** with confirmation
- **Increase stock** quick action (for restocking)
- **CSV bulk import** — upload a CSV file to add many products at once

#### `pages/Owner/OrderManagement.jsx` — Manage Orders

**What:** View and manage orders containing the owner's products.

**Features:**
- List orders with status badges
- Filter by status (Pending, Processing, Shipped, Delivered, Cancelled)
- Search by order number or customer name
- **Update order status** (Pending → Processing → Shipped)
- **Order detail modal** with item list, customer info, payment info
- **CSV export** — download order data

#### `pages/Owner/Analytics.jsx` — Store Analytics

**What:** Rich data visualizations using Plotly charts.

**3 tabs:**
1. **Revenue:** Revenue trend (daily/monthly), profit overlay
2. **Products:** Top products table with ComprehensiveForecastModal, category performance chart
3. **Orders:** Order status distribution, payment method breakdown

**ComprehensiveForecastModal** (1210 lines — the most complex component):
- Opens when clicking the 👁 (eye) button on a product in the Top Products table
- Shows a **professional-grade ML forecast dashboard**:
  - 3 synchronized Plotly charts (Revenue, Profit, Units) with historical + forecast + 95% confidence intervals
  - KPI cards with sparklines
  - Stock gauge showing days of inventory left
  - Decision banner: "INCREASE STOCK" / "MAINTAIN" / "REDUCE"
  - Weekday pattern analysis
  - 7-day daily forecast table
  - Performance metrics (growth rates, efficiency, moving averages)
- Uses module-level caching to avoid re-fetching

#### `pages/Owner/CouponManagement.jsx` — Create & Manage Coupons

**What:** CRUD for store discount coupons.

**Features:**
- List coupons as cards with orange/amber/red usage bar
- **Create coupon** form:
  - Code (auto-generated or custom)
  - Discount percentage
  - Max discount amount
  - Minimum order amount
  - "Total Usage Limit (all customers)" — how many times the coupon can be used in total
  - "Per-Customer Limit (times one customer can use)" — how many times ONE customer can use it
  - Free delivery toggle
  - Valid from / until dates (minimum 6 hours duration)
- **Edit/Delete** existing coupons
- **Usage bar:** Shows remaining uses with color: orange (healthy) → amber (getting low) → red (almost gone)

---

### 5.4 Admin Pages

These pages give the system administrator full platform control.

#### `pages/Admin/Dashboard.jsx` — Platform Dashboard

**What:** Comprehensive platform overview.

**Features:**
- KPI cards: Total Users, Orders, Revenue, Active Suppliers
- Plotly charts: Customer demographics (gender pie), registration trends, top products, category revenue
- System health indicator
- Customer table (recent registrations)
- **Auto-refresh** every 30 seconds

#### `pages/Admin/UserManagement.jsx` — Manage Users

**What:** Two tabs — System Users (staff) and Customers.

**System Users tab:**
- List all staff users (admin, owner, warehouse) with role badges
- **Create user** (name, email, phone, role, company, password)
- **Edit user**
- **Toggle active/inactive**
- **Reset password**
- **Delete user**

**Customers tab:**
- Read-only list of all customers
- Search by name, email, phone
- Filter by gender, active status

#### `pages/Admin/SupplierManagement.jsx` — Manage Suppliers

**What:** CRUD for product suppliers.

**Features:**
- List suppliers with status (active/inactive)
- Search by name
- **Add/Edit supplier** modal
- **Toggle status** (active/inactive)
- Pagination

#### `pages/Admin/SystemLogs.jsx` — Audit Trail

**What:** Browse every action taken in the system.

**Features:**
- List all audit log entries
- **Color-coded action badges:** CREATE (green), UPDATE (blue), DELETE (red), LOGIN (purple), LOGOUT (gray)
- **Expandable details** — click to see old vs new values (what changed)
- **Filter by:** Action type, table name, date range, user
- Pagination

#### `pages/Admin/AnalyticsSummary.jsx` — Platform Analytics

**What:** Platform-wide analytics (not store-specific like Owner Analytics).

**Features:**
- KPI cards: Revenue, profit, orders, customers
- Revenue trend chart
- Category pie chart
- **RFM Customer Segmentation** chart — shows Champions, Loyal, Regulars, At Risk, Lost segments
- Order status distribution
- Payment method breakdown
- 8 parallel API fetches for fast loading

---

### 5.5 Warehouse Pages

These pages help warehouse staff manage inventory and deliveries.

#### `pages/Warehouse/Dashboard.jsx` — Warehouse Overview

**What:** Real-time warehouse status.

**Features:**
- 4 stat cards: Total Products, Total Stock, Low Stock Alerts, Pending Orders
- Ready-to-deliver orders list (orders with "Shipped" status)
- Low stock alerts (products below reorder level)
- **60-second polling** — auto-refreshes every minute

#### `pages/Warehouse/InventoryManagement.jsx` — Browse Inventory

**What:** View all products with stock levels.

**Features:**
- Product table with: name, SKU, category, brand, stock, reorder level
- Color-coded stock status: Green (healthy), Yellow (warning), Red (critical)
- Search and pagination
- Click a row to see product details

#### `pages/Warehouse/LowStockAlerts.jsx` — Low Stock Warnings

**What:** Products that need restocking.

**Features:**
- Cards for each low-stock product
- **Critical** (red) — stock ≤ 25% of reorder level
- **Warning** (yellow) — stock ≤ reorder level
- **"Notify Store Owner"** button — sends a notification to the product's owner
- Shows: product name, current stock, reorder level, last sold date

#### `pages/Warehouse/StockMovements.jsx` — Track Stock Changes

**What:** History of all stock movements.

**3 tabs:**
1. **Purchase Orders:** List all POs from suppliers. Click "Receive" to accept delivery and add stock. Print invoice.
2. **Customer Orders:** List shipped orders. Click "Mark Delivered" to complete delivery.
3. **Product Updates:** Recently updated products (stock changes, price changes).

---

### 5.6 Reusable Components

These are smaller building blocks used by multiple pages.

#### Common Components

| Component | What It Does |
|-----------|-------------|
| **Navbar.jsx** | The customer navigation bar at the top of every page. Sticky dark header, Amazon-style search bar with debounced autocomplete (300ms delay, 8 results), 13-category strip, cart/wishlist/compare badges with item counts, profile dropdown. |
| **Footer.jsx** | Site footer with 4-feature bar (Free Delivery, Secure Payments, 24/7 Support, Easy Returns), 4-column grid (Brand info, Quick Links, Support, Contact at Sankhamul KTM), social media links. |
| **ProtectedRoute.jsx** | Route guard that checks if the user has the right role to access a page. Shows a spinner during initialization. Redirects to `/login` if not logged in, or to role-appropriate home if wrong role. |

#### Admin Components

| Component | What It Does |
|-----------|-------------|
| **AdminLayout.jsx** | Layout wrapper with collapsible sidebar (240px → 64px), 5 navigation links, "System Online" status pill, mobile overlay menu. |
| **AdminNavbar.jsx** | Alternative horizontal nav bar (dark #1C1917 + red #DC2626 theme), user dropdown. |
| **LogTable.jsx** | Audit log table with color-coded action badges and expandable change details. |
| **RoleBadge.jsx** | Colored label for user roles: customer=gray, owner=blue, warehouse=orange, admin=red. |
| **SystemStatsCard.jsx** | KPI card with currency/percentage/number formatting and trend indicator (up/down/neutral arrows). |
| **UserModal.jsx** | Form modal for creating/editing system users. |
| **UserTable.jsx** | Staff user table with avatar initials, role badge, and action buttons. |
| **SupplierModal.jsx** | Form modal for creating/editing suppliers. |
| **SupplierTable.jsx** | Supplier table with on-time rate bar, star rating, product count. |

#### Owner Components

| Component | What It Does |
|-----------|-------------|
| **OwnerLayout.jsx** | Layout wrapper that checks owner role and renders OwnerNavbar + page content. |
| **OwnerNavbar.jsx** | Horizontal nav (orange theme) with 5 links + **notification bell** (polls every 30 seconds, shows unread count, 4 notification types, mark read/clear). |
| **ProductModal.jsx** | Form for creating/editing products (all fields). |
| **ProductDetailModal.jsx** | Read-only product overlay with sales KPIs, stock progress bar, specs table. |
| **OrderDetailsModal.jsx** | Full order detail view with 4-step timeline, items table, customer/payment info, quick actions (Accept/Cancel/Ship), print invoice. |
| **SalesOverviewCards.jsx** | 4 KPI cards for dashboard (Revenue, Orders, Customers, Avg Order Value). |
| **RevenueChart.jsx** | Plotly dual Y-axis chart: Orders (bar) + Revenue (line) + Profit (line). |
| **TopProductsTable.jsx** | Top 10 products with sortable columns, medal icons, forecast button. |
| **CategoryChart.jsx** | Plotly donut pie chart showing category revenue distribution. |
| **ComprehensiveForecastModal.jsx** | The advanced Prophet ML forecast dashboard (see Owner Analytics section). |

#### Warehouse Components

| Component | What It Does |
|-----------|-------------|
| **WarehouseLayout.jsx** | Layout wrapper for warehouse role. |
| **WarehouseNavbar.jsx** | Horizontal nav (orange theme) with notification bell (same pattern as OwnerNavbar). |
| **InventoryTable.jsx** | Reusable table for product inventory: search, sort, pagination (10/page), stock bar, status badges. |
| **StockLevelCard.jsx** | Dashboard stat card with icon, trend indicator. |
| **AlertBadge.jsx** | Severity badge: critical (red), warning (yellow), info (blue), low (green). 3 sizes. |
| **OwnerFilter.jsx** | Dropdown to filter by store owner. Fetches owners list from API. |
| **MovementModal.jsx** | Dual-mode modal for viewing or creating stock movements (stock_in, stock_out, damaged, returned, transferred). |
| **SupplierPanel.jsx** | Supplier directory with search, type filter, expandable cards with contact details. |

---

## 6. Data Analysis & Machine Learning

This is the most technically advanced part of the project, located in `backend/analytics/ml_services.py`. It uses real data science techniques to provide business intelligence.

### Libraries Used

| Library | What It Does | Why We Use It |
|---------|-------------|--------------|
| **Pandas** | Data manipulation and analysis | Load SQL data into DataFrames, group/aggregate/transform |
| **NumPy** | Numerical computing | Array math, statistics, random number generation |
| **scikit-learn** | Machine learning algorithms | Logistic Regression for churn prediction, StandardScaler for feature scaling |
| **Prophet** (by Meta/Facebook) | Time series forecasting | Predict future sales with seasonality and trend detection |
| **Raw SQL** | Direct database queries | Complex joins and aggregations that Django ORM can't handle efficiently |

### Feature 1: RFM Customer Segmentation

**File:** `ml_services.py` → `get_customer_rfm()`

**What is RFM?**
RFM stands for **Recency, Frequency, Monetary** — three factors that describe how valuable a customer is:

| Factor | Meaning | Example |
|--------|---------|---------|
| **Recency** | How recently did they buy? | 2 days ago (good) vs 90 days ago (bad) |
| **Frequency** | How often do they buy? | 15 orders (loyal) vs 1 order (one-time) |
| **Monetary** | How much do they spend? | NPR 500,000 (big spender) vs NPR 1,000 (small) |

**How the algorithm works:**

1. **Data Collection:** Runs a SQL query joining `Orders` and `accounts_customuser` tables. Gets all orders from the last 90 days (excluding cancelled ones).

2. **Feature Engineering:**
   - Calculates `days_since` for each order (today's date minus order date)
   - Groups by customer, computes:
     - `recency` = minimum days since last order (how recently they ordered)
     - `frequency` = count of orders
     - `monetary` = sum of order amounts

3. **Scoring (Quantile-based):**
   - Uses Pandas `qcut()` to split each metric into 4 equal groups (quartiles)
   - Each customer gets a score 1-4 for R, F, and M
   - **Note:** Recency is inverted — lower days = higher score (recent buyers are better)

4. **Segmentation:**
   - Combines R, F, M scores into a string like "444" or "112"
   - Maps to segments:
     - `"444"` → **Champions** (recent, frequent, big spenders)
     - Starts with "4" or "3" → **Loyal Customers**
     - `"111"` → **Lost** (haven't bought recently, rarely buy, low spend)
     - Starts with "1" → **At Risk**
     - Everything else → **Regulars**

5. **Output:** Returns a list of customers with their RFM scores and segments.

### Feature 2: Churn Prediction

**File:** `ml_services.py` → `get_churn_prediction()`

**What is Churn?**
When a customer stops buying from your store — they "churn" (leave). Predicting this helps stores take action (send discounts, special offers) before they leave.

**How the algorithm works:**

1. **Data Collection:** Gets all orders from last 90 days with customer info from `Customers` table.

2. **Feature Engineering:** Same RFM calculation as above — recency, frequency, monetary.

3. **Labeling (Creating the target variable):**
   - If a customer hasn't ordered in 30+ days → label them as `churned = 1` (Yes, they churned)
   - If they ordered within 30 days → `churned = 0` (No, still active)

4. **Machine Learning Model:**
   - Uses **Logistic Regression** from scikit-learn
   - Features: recency, frequency, monetary (scaled using StandardScaler)
   - Target: churned (0 or 1)
   - `StandardScaler` normalizes features to mean=0, std=1 (important because monetary values are much larger than recency values)

5. **Prediction:**
   - `model.predict_proba(X)[:, 1]` → gives probability of churn (0.0 to 1.0)
   - Risk segments:
     - ≥ 0.7 → **High Risk** (very likely to leave)
     - ≥ 0.4 → **Medium Risk** (might leave)
     - < 0.4 → **Low Risk** (probably staying)

6. **Fallback:** If all customers are the same class (all active or all churned), uses a simple heuristic: `recency / (days * 0.8)` as churn probability.

7. **Output:** Returns per-customer churn probability and a summary (total, high/medium/low risk counts, average probability, churn rate).

### Feature 3: Dynamic Pricing

**File:** `ml_services.py` → `get_dynamic_pricing()`

**What is Dynamic Pricing?**
Automatically adjusting product prices based on demand, stock levels, and margins — like how airline tickets change price based on demand.

**How the algorithm works:**

1. **Data Collection:**
   - Gets product info (current price, cost price, stock, reorder level)
   - Gets 60 days of order data for this product

2. **Factor Analysis:**

   **Factor 1 — Demand Trend:**
   - Compares sales in last 30 days vs previous 30 days
   - If demand grew > 30% → suggest price increase (up to +8%)
   - If demand dropped > 30% → suggest price decrease (up to -7%)

   **Factor 2 — Stock Pressure:**
   - `stock_ratio = stock / reorder_level`
   - If ratio < 0.5 (low stock) and demand exists → +3% (scarcity pricing)
   - If ratio > 5 (overstocked) and demand is falling → -3% (clearance)

   **Factor 3 — Margin Health:**
   - If profit margin < 15% → +2% (need more margin)
   - If profit margin > 60% → -1% (room for competitive pricing)

3. **Clamping:** Total adjustment is clamped between -10% and +10%. Price never goes below `cost_price × 1.05` (5% minimum margin).

4. **Output:** Returns current price, suggested price, adjustment %, direction (increase/decrease/maintain), and list of factors.

### Feature 4: Simple Demand Forecast

**File:** `ml_services.py` → `get_demand_forecast()`

**What:** A simple 7-day demand prediction using Moving Average.

**How:**
1. Gets daily sales for the product (last 30 days)
2. Fills missing days with 0 (creates a complete time series)
3. Calculates **3-day Simple Moving Average (SMA)** — average of the last 3 days
4. Projects this average forward for 7 days

**Limitation:** Very simple — assumes the future will be like the recent past. Good for stable products, not great for trending or seasonal products. That's why we also have the comprehensive forecast.

### Feature 5: Product Recommendations (Market Basket Analysis)

**File:** `ml_services.py` → `get_product_recommendations()`

**What:** "Customers who bought this also bought…" feature.

**How:**
1. Runs a SQL query that finds all orders containing the given product
2. From those same orders, finds OTHER products that were also ordered
3. Counts how many times each product was co-purchased
4. Returns the top 5 most frequently co-purchased products

**Example:** If many people buy a laptop case when they buy a Dell laptop, the case will be recommended on the Dell laptop page.

### Feature 6: Comprehensive Prophet Forecast (Most Advanced)

**File:** `ml_services.py` → `get_comprehensive_forecast()`

**What:** Professional-grade multi-metric forecasting using Facebook Prophet — the most sophisticated ML feature in the project.

**How it works step by step:**

1. **Data Collection:**
   ```sql
   SELECT OrderDate, Quantity, UnitPrice, CostPrice, SellingPrice, Stock, ReorderLevel
   FROM OrderDetails JOIN Orders JOIN Products
   WHERE ProductID = ? AND OrderDate >= ?
   ```

2. **Feature Engineering:**
   - Calculates `line_revenue = quantity × unit_price` per order item
   - Aggregates to daily: `units`, `revenue`, `profit` per day
   - Fills missing days with 0 (complete time series)
   - `profit = revenue × margin_ratio` where `margin_ratio = (selling_price - cost_price) / selling_price`

3. **Helper Functions (Feature Engineering for Sparse Data):**

   **`_smart_daily_avg()`** — Frequency-adjusted daily average:
   - Problem: If a product sells 3 units on 3 out of 30 days, simple average = 0.1/day (too low!)
   - Solution: `avg_nonzero × purchase_frequency` = 1.0 × 0.1 = 0.3/day (more realistic)

   **`_ewma_forecast_base()`** — Exponential Weighted Moving Average:
   - Gives more weight to recent values (captures momentum)
   - If 6 units sold today, EWMA stays high (unlike simple average which dilutes it)

   **`_compute_moving_avg()`** — 7-day rolling average for trend lines

4. **Prophet Forecasting (`_prophet_forecast_metric()`):**
   - Facebook Prophet is a time series model that handles:
     - **Trend:** Is the metric going up or down over time?
     - **Seasonality:** Weekly patterns (more sales on Friday/Saturday)
     - **Holidays/events:** (configured for yearly seasonality)
   - Runs separately for Units, Revenue, and Profit
   - Produces **95% confidence intervals** (upper and lower bounds)

5. **Smart Fallback (when Prophet fails or under-predicts):**
   - If Prophet predicts near-zero but actual sales exist → uses EWMA + mean reversion
   - **Mean reversion:** Start from recent EWMA, gradually drift toward long-term average
   - **Day-of-week pattern:** Friday/Saturday get 15% boost, Monday gets 10% reduction
   - **Controlled noise:** Small random variation for realistic-looking forecasts

6. **Stock Decision Logic:**
   - Compares forecasted avg units vs historical avg units
   - Also checks profit margin
   - **INCREASE STOCK:** Forecast > 120% of historical AND margin > 50%
   - **REDUCE STOCK:** Forecast < 80% of historical OR margin < 45%
   - **MAINTAIN STOCK:** Everything else

7. **Output (comprehensive!):**
   ```json
   {
     "product_id": 42,
     "product_name": "Dell Inspiron 15",
     "current_stock": 50,
     "selling_price": 75000,
     "cost_price": 60000,
     "margin_ratio": 0.2,
     "historical": {
       "dates": ["2026-01-30", ...],
       "units": [3, 0, 5, ...],
       "revenue": [225000, 0, 375000, ...],
       "profit": [45000, 0, 75000, ...],
       "units_ma7": [2.5, 2.8, ...],  // 7-day moving averages
       "totals": { "units": 120, "revenue": 9000000, "profit": 1800000 },
       "peak_day": { "date": "2026-02-15", "units": 12, "revenue": 900000 }
     },
     "forecast_dates": ["2026-03-02", "2026-03-03", ...],
     "forecasts": {
       "units": { "prophet": [4.2, 3.8, ...], "ci_95": { "upper": [...], "lower": [...] } },
       "revenue": { "prophet": [...], "ci_95": { "upper": [...], "lower": [...] } },
       "profit": { "prophet": [...], "ci_95": { "upper": [...], "lower": [...] } }
     },
     "trend_indicators": { "revenue": { "growth_rate_pct": 12.5, "ma_7": 350000 }, ... },
     "metrics": {
       "profit_margin_pct": 20.0,
       "inventory_turnover": 2.4,
       "break_even_units": 200,
       "avg_daily_units": 4.0
     },
     "decision": { "action": "MAINTAIN STOCK", "color": "yellow", "reason": "..." },
     "summary_table": {
       "next_3_days": { "units": 12, "revenue": 900000, "profit": 180000 },
       "next_7_days": { "units": 28, "revenue": 2100000, "profit": 420000 }
     },
     "key_insights": { "historical_avg_units": 4.0, "forecasted_avg_units": 4.2, "growth_vs_historical_pct": 5.0 }
   }
   ```

**This is displayed in the ComprehensiveForecastModal component** on the frontend with:
- 3 synchronized Plotly charts (zoom one → all zoom)
- KPI cards with sparkline mini-charts
- Stock gauge (% remaining, days of inventory left)
- Decision banner with color-coded recommendation
- Weekday pattern analysis
- 7-day daily forecast table

---

## 7. How Everything Is Linked

### The Full Request Cycle

When a customer clicks "Add to Cart" on a product, here's what happens:

```
1. BROWSER (Frontend)
   └── ProductDetail.jsx → addToCart(product)
       └── App.jsx → calls customerAPI.addToCart(productId, qty)
           └── api.js → POST http://localhost:8000/api/cart/
               Headers: { Authorization: "Bearer eyJhbG..." }

2. INTERNET (HTTP Request travels)

3. SERVER (Backend)
   └── page/urls.py matches /api/ → orders/urls.py
       └── orders/urls.py matches /cart/ → CartViewSet
           └── authentication.py checks JWT token → identifies Customer #5
               └── orders/views.py CartViewSet.create()
                   ├── Validates: product exists, stock > 0, qty ≤ 6
                   ├── Checks: not already in cart (if yes, updates qty)
                   └── Saves to Cart table in database

4. DATABASE (SQL Server)
   └── INSERT INTO Cart (CustomerID, ProductID, OrderCount)
       VALUES (5, 42, 1)

5. RESPONSE (travels back)
   └── JSON: { id: 123, product: {...}, order_count: 1 }

6. BROWSER (Frontend receives)
   └── App.jsx updates cartItems state
       └── Navbar.jsx re-renders with updated cart count badge
```

### Authentication Flow

```
Customer Login:
Frontend ──POST /api/auth/login/──→ Backend
  ├── Checks CustomUser table (not found — it's a customer)
  ├── Checks Customers table (found!)
  ├── Verifies password (bcrypt hash)
  ├── Creates custom HS256 JWT: { customer_id: 5, user_type: "customer" }
  └── Returns: { access: "eyJ...", refresh: "eyK...", user: {...} }

Staff Login:
Frontend ──POST /api/auth/login/──→ Backend
  ├── Checks CustomUser table (found! role: "owner")
  ├── Verifies password
  ├── Creates SimpleJWT token: { user_id: 1 }
  └── Returns: { access: "eyX...", refresh: "eyY...", user: {...} }

Every subsequent request:
Frontend ──GET /api/products/ + Bearer token──→ Backend
  └── authentication.py:
      ├── Is it a customer token? (user_type: "customer")
      │   └── Yes → request.user = Customer object from Customers table
      └── Is it a staff token?
          └── Yes → request.user = CustomUser object from accounts_customuser
```

### Database Connection Map

```
Frontend Page          → API Call              → Backend View         → Database Table(s)
──────────────────────────────────────────────────────────────────────────────────────
Home.jsx               → getProducts()         → ProductViewSet      → Products, Categories, Reviews
Login.jsx              → login()               → LoginView           → Customers, accounts_customuser
Cart.jsx               → getCart()             → CartViewSet         → Cart, Products
Checkout.jsx           → placeOrder()          → OrderViewSet        → Orders, OrderDetails, Payments, Products, Cart, CouponUsage
ProductDetail.jsx      → getProduct()          → ProductViewSet      → Products, Reviews
                       → getCoupons()          → CouponViewSet       → Coupons, CouponUsage
MyOrders.jsx           → getMyOrders()         → OrderViewSet        → Orders, OrderDetails, OrderStatus
Wishlist.jsx           → getWishlist()         → WishlistViewSet     → Whishlist, Products
Compare.jsx            → getCompareList()      → CompareListViewSet  → CompareList, Products
Owner/Dashboard.jsx    → getSalesOverview()    → SalesOverviewView   → Orders, OrderDetails, Products
Owner/Analytics.jsx    → getComprehensive...() → ComprehensiveForecastView → OrderDetails, Orders, Products (via ml_services)
Admin/Dashboard.jsx    → getDashboard()        → AdminDashboardView  → accounts_customuser, Orders, Products, Customers, Categories
Warehouse/Dashboard    → getDashboard()        → WarehouseDashView   → Products, PurchaseOrders, Orders
LowStockAlerts.jsx     → sendLowStockAlert()   → SendLowStockAlert   → Products, Notifications, accounts_customuser
```

---

## 8. Feature Summary Table

| # | Feature | Frontend | Backend | Database Tables | ML? |
|---|---------|----------|---------|----------------|-----|
| 1 | User Registration | Login.jsx | RegisterView | Customers, Customer_Address | No |
| 2 | JWT Authentication | AuthContext.jsx, api.js | LoginView, CustomerJWTAuthentication | Customers, accounts_customuser | No |
| 3 | Product Browsing | Home.jsx | ProductViewSet | Products, Categories, Reviews | No |
| 4 | Product Search | Navbar.jsx (autocomplete) | ProductViewSet (SearchFilter) | Products | No |
| 5 | Product Detail | ProductDetail.jsx | ProductViewSet, ReviewViewSet | Products, Reviews | No |
| 6 | Shopping Cart | Cart.jsx | CartViewSet | Cart, Products | No |
| 7 | Wishlist | Wishlist.jsx | WishlistViewSet | Whishlist, Products | No |
| 8 | Product Comparison | Compare.jsx | CompareListViewSet | CompareList, Products | No |
| 9 | Checkout & Orders | Checkout.jsx | OrderViewSet | Orders, OrderDetails, Payments, Products, Cart | No |
| 10 | Store-Scoped Coupons | ProductDetail.jsx, Checkout.jsx | CouponViewSet | Coupons, CouponUsage | No |
| 11 | Order Tracking | MyOrders.jsx | OrderViewSet | Orders, OrderStatus | No |
| 12 | Product Reviews | MyReviews.jsx | ReviewViewSet | Reviews, Products, Customers | No |
| 13 | Profile & Addresses | Profile.jsx | ProfileView, AddressViewSet | Customers, Customer_Address | No |
| 14 | Owner Product CRUD | ProductManagement.jsx | ProductViewSet + AuditMixin | Products, Categories, AuditLog | No |
| 15 | Owner Order Management | OrderManagement.jsx | OrderViewSet | Orders, OrderDetails | No |
| 16 | Owner Analytics (Charts) | Analytics.jsx | Analytics views | Orders, OrderDetails, Products | No |
| 17 | Owner Forecast (Prophet) | ComprehensiveForecastModal.jsx | ComprehensiveForecastView | OrderDetails, Orders, Products | **Yes** |
| 18 | Coupon Management | CouponManagement.jsx | CouponViewSet | Coupons | No |
| 19 | Notification System | OwnerNavbar.jsx, WarehouseNavbar.jsx | NotificationViewSet | Notifications | No |
| 20 | Admin Dashboard | Admin/Dashboard.jsx | AdminDashboardView | All tables | No |
| 21 | User Management | UserManagement.jsx | UserManagementViewSet | accounts_customuser, Customers | No |
| 22 | Supplier Management | SupplierManagement.jsx | SupplierManagementViewSet | Suppliers, AuditLog | No |
| 23 | Audit Logging | SystemLogs.jsx | AuditLogViewSet + AuditMixin | AuditLog | No |
| 24 | Inventory Management | InventoryManagement.jsx | ProductViewSet | Products | No |
| 25 | Purchase Orders | StockMovements.jsx | PurchaseOrderViewSet | PurchaseOrders, PurchaseOrderDetails, Products | No |
| 26 | Low Stock Alerts | LowStockAlerts.jsx | LowStockView, SendLowStockAlert | Products, Notifications | No |
| 27 | RFM Segmentation | AnalyticsSummary.jsx | CustomerSegmentationView | Orders, Customers | **Yes** |
| 28 | Churn Prediction | Admin analytics | ChurnPredictionView | Orders, Customers | **Yes** |
| 29 | Dynamic Pricing | Analytics.jsx | DynamicPricingView | Products, OrderDetails | **Yes** |
| 30 | Product Recommendations | ProductDetail.jsx | ProductRecommendationsView | OrderDetails, Products | **Yes** |
| 31 | Demand Forecast (SMA) | Analytics.jsx | DemandForecastView | OrderDetails, Orders | **Yes** |
| 32 | CSV Bulk Import | ProductManagement.jsx | BulkImportProductsView | Products, Categories, AuditLog | No |
| 33 | "You May Also Like" | ProductDetail.jsx | ProductViewSet | Products | No |

---

*This documentation covers every file, every feature, every database connection, and every ML algorithm used in the ElectroNest project. For setup instructions, see `ProjectBuild.md`.*
