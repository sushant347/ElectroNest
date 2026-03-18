# ElectroNest - Complete Project Documentation

## Project Title

**ElectroNest: A Full-Stack E-Commerce Platform with Multi-Role Access and Intelligent Analytics**

---

## 1. Introduction

ElectroNest is a comprehensive, full-stack e-commerce web application designed for an electronics retail business. The platform supports **four distinct user roles** — Customer, Owner, Warehouse Staff, and Admin — each with their own dedicated dashboards and functionalities. The system goes beyond basic CRUD operations by incorporating **Machine Learning-based analytics** such as demand forecasting, customer segmentation (RFM Analysis), and product recommendations.

### 1.1 Problem Statement

Traditional e-commerce systems often lack role-based access control, intelligent analytics, and integrated inventory management. Small to mid-sized electronics retailers need a unified platform that handles:

- Multi-vendor product management
- Order lifecycle tracking
- Inventory and warehouse operations
- Sales analytics with predictive insights
- Customer relationship management

ElectroNest solves all of these problems in a single, unified application.

### 1.2 Objectives

1. Build a secure, role-based e-commerce platform with separate dashboards for each user type
2. Implement a RESTful API backend using Django REST Framework
3. Create a modern, responsive Single Page Application (SPA) frontend using React
4. Integrate Machine Learning models for demand forecasting, customer segmentation, and product recommendations
5. Provide real-time notifications, audit logging, and comprehensive analytics

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, Vite 7 | Single Page Application with fast HMR |
| **Styling** | Tailwind CSS 4 | Utility-first responsive CSS framework |
| **Charts** | Plotly.js, Recharts | Interactive data visualization and graphs |
| **Icons** | Lucide React | Modern SVG icon library |
| **HTTP Client** | Axios | API communication with JWT interceptors |
| **Routing** | React Router DOM 7 | Client-side navigation and protected routes |
| **Backend** | Django 5.2, Python 3.10+ | Web framework and REST API |
| **API Framework** | Django REST Framework (DRF) | Serialization, viewsets, permissions |
| **Authentication** | SimpleJWT | JSON Web Token based authentication |
| **Database** | Microsoft SQL Server Express | Relational database with ODBC Driver 17 |
| **ORM Connector** | mssql-django | Django ORM support for SQL Server |
| **ML Libraries** | Pandas, Scikit-learn, Statsmodels | Data analysis and machine learning |
| **Image Handling** | Pillow | Product image processing |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                 │
│                   http://localhost:5173                      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ Customer  │ │  Owner   │ │ Warehouse │ │    Admin     │  │
│  │  Pages   │ │  Pages   │ │   Pages   │ │    Pages     │  │
│  └────┬─────┘ └────┬─────┘ └─────┬─────┘ └──────┬───────┘  │
│       └─────────────┴─────────────┴──────────────┘          │
│                          │ Axios (JWT)                      │
└──────────────────────────┼──────────────────────────────────┘
                           │ REST API Calls
┌──────────────────────────┼──────────────────────────────────┐
│                     BACKEND (Django DRF)                     │
│                   http://localhost:8000                      │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐  │
│  │ Accounts │ │ Products │ │  Orders   │ │  Warehouse   │  │
│  │   App    │ │   App    │ │   App     │ │    App       │  │
│  └──────────┘ └──────────┘ └───────────┘ └──────────────┘  │
│  ┌──────────┐ ┌──────────┐                                  │
│  │Analytics │ │  Admin   │                                  │
│  │   App    │ │  Panel   │                                  │
│  └──────────┘ └──────────┘                                  │
│                          │ ORM (mssql-django)               │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│              DATABASE (SQL Server Express)                   │
│                   ElectroNestDB                              │
│                                                             │
│   20 Tables: Products, Orders, Customers, Cart, Payments,   │
│   Reviews, Wishlist, PurchaseOrders, AuditLog, etc.         │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Database Design

### 4.1 Entity-Relationship Overview

The database contains **20 tables** organized into logical groups:

#### Product Management Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| **Categories** | Product categories | CategoryID, CategoryName |
| **Suppliers** | Vendor/supplier information | SupplierID, SupplierName, ContactEmail, Phone, City, Country |
| **Products** | Product catalog | ProductID, SKU, ProductName, Brand, SellingPrice, CostPrice, Stock, ReorderLevel |
| **Reviews** | Product ratings and reviews | ReviewID, ProductID, CustomerID, Rating (1-5), Comment |

#### Customer & User Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| **Customers** | Legacy customer records (1,611 pre-existing) | CustomerID, FirstName, LastName, Email, Phone, Gender |
| **accounts_customuser** | System staff users (Django-managed) | ID, Email, Role (admin/owner/warehouse), Password |
| **Customer_Address** | Delivery and billing addresses | AddressID, CustomerID, Street, City, Province, PostalCode, AddressType |

#### Order & Payment Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| **Orders** | Customer orders | OrderID, OrderNumber, CustomerID, OrderStatusID, TotalAmount, TrackingNumber |
| **OrderDetails** | Line items in each order | OrderDetailID, OrderID, ProductID, Quantity, UnitPrice |
| **OrderStatus** | Status types | OrderStatusID, StatusName (Pending, Processing, Shipped, Delivered, Cancelled) |
| **Cart** | Shopping cart items | CartID, CustomerID, ProductID, OrderCount |
| **Wishlist** | Customer wishlists | WishlistID, CustomerID, ProductID |
| **CompareList** | Product comparison list (Django-managed, max 3 per customer) | ID, CustomerID, ProductID, AddedAt |
| **PaymentMethods** | Payment types | MethodID, MethodName |
| **Payments** | Payment records | PaymentID, OrderID, MethodID, DiscountPercent, PayableAmount |

#### Warehouse Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| **PurchaseOrders** | Orders to suppliers for restocking | PurchaseOrderID, SupplierID, TotalAmount, ExpectedDeliveryDate, OrderStatusID |
| **PurchaseOrderDetails** | Items in purchase orders | PurchaseOrderDetailID, PurchaseOrderID, ProductID, Quantity, UnitCost |

#### System Tables
| Table | Description | Key Fields |
|-------|-------------|------------|
| **AuditLog** | Activity audit trail (Django-managed) | ID, Action, TableName, RecordID, UserID, OldValues, NewValues |
| **Notifications** | In-app notifications (Django-managed) | ID, RecipientID, Title, Message, Type, IsRead |

### 4.2 Key Relationships

- **Products** belong to a **Category** and a **Supplier**
- **Orders** belong to a **Customer** and have an **OrderStatus**
- **OrderDetails** link **Orders** to **Products** (many-to-many through table)
- **Reviews** link **Customers** to **Products** (one review per customer per product)
- **Cart**, **Wishlist**, and **CompareList** link **Customers** to **Products**
- **Payments** link to **Orders** and **PaymentMethods**
- **PurchaseOrders** link to **Suppliers** and contain **PurchaseOrderDetails** referencing **Products**

---

## 5. Backend Architecture (Django REST Framework)

### 5.1 App Structure

The backend is organized into **6 Django apps**, each handling a specific domain:

#### 5.1.1 Accounts App (`accounts/`)
**Purpose:** Authentication and user management

- **Dual Authentication System:** Supports both staff users (CustomUser table with roles) and legacy customers (Customers table) using JWT tokens
- **Login:** Authenticates via email, returns access and refresh JWT tokens
- **Registration:** Creates new customer accounts with hashed passwords
- **Profile Management:** View and update profile information
- **Address Management:** CRUD operations for billing and shipping addresses (max 2 billing, 4 shipping)

#### 5.1.2 Products App (`products/`)
**Purpose:** Product catalog management

- **Category Management:** List all categories (public), create/update/delete (authenticated)
- **Supplier Management:** Full CRUD for supplier records
- **Product Management:** Full CRUD with advanced filtering (by category, brand, owner), search (name, SKU, brand), and ordering (price, stock, date)
- **Review System:** Customers can write reviews with 1-5 star ratings; prevents duplicate reviews per product per customer
- **Computed Fields:** Average rating and review count are calculated dynamically using database annotations

#### 5.1.3 Orders App (`orders/`)
**Purpose:** Order lifecycle, cart, wishlist, compare, payments, and notifications

- **Order Creation:** Supports cart-based checkout or direct item list; automatically groups items by product owner (multi-store support)
- **Stock Management:** Deducts stock on order creation, restores on cancellation
- **Order Status Tracking:** Supports transitions: Pending → Processing → Shipped → Delivered (or Cancelled)
- **Cart:** Add/remove items with quantity cap (max 6 per product)
- **Wishlist:** Save products for later
- **Compare List:** Database-backed product comparison (max 3 products per customer); each user sees only their own compare list, stored server-side for cross-device and multi-user support
- **Notifications:** In-app notification system for order updates, low stock alerts, and purchase order updates
- **Payments:** Payment records linked to orders with discount support

#### 5.1.4 Warehouse App (`warehouse/`)
**Purpose:** Inventory and purchase order management

- **Purchase Orders:** Create POs to suppliers, track delivery status
- **Stock Receiving:** Mark POs as delivered, automatically adds stock to products
- **Warehouse Dashboard:** Aggregated view of total products, stock levels, low stock items, pending POs, and recent customer orders
- **Stock Movements:** Track all stock changes (all customer orders including Pending/Processing/Shipped/Delivered, received POs, product updates) within the last 30 days

#### 5.1.5 Analytics App (`analytics/`)
**Purpose:** Sales analytics and ML-powered insights

- **Sales Overview:** Revenue, profit, orders, and customers with period-over-period comparison (percentage change)
- **Revenue Trends:** Daily or monthly revenue/profit trends with configurable time periods
- **Top Products:** Top 10 products ranked by quantity sold
- **Category Performance:** Revenue, order count, and product count per category
- **Payment Methods:** Breakdown of payment amounts by method
- **Order Status Distribution:** Count of orders by status

**Machine Learning Features:**

1. **Customer Segmentation (RFM Analysis):**
   - Uses Pandas for data manipulation
   - Calculates Recency, Frequency, and Monetary scores for each customer
   - Segments customers into: Champions, Loyal Customers, Regulars, At Risk, Lost
   - Uses quartile-based scoring (qcut) for fair distribution

2. **Demand Forecasting:**
   - Simple Moving Average (SMA) for basic forecasting
   - Comprehensive forecasting using Prophet/EWMA with confidence intervals
   - Generates 7-day forecasts for units sold, revenue, and profit
   - Provides stock decision recommendations (INCREASE / MAINTAIN / REDUCE)
   - Includes trend indicators, key metrics, and summary projections

3. **Product Recommendations:**
   - Market Basket Analysis: Finds products frequently bought together
   - Based on co-occurrence in the same orders
   - Returns top 5 recommended products with purchase frequency

#### 5.1.6 Admin Panel App (`admin_panel/`)
**Purpose:** System administration and monitoring

- **User Management:** Full CRUD for system users (admin, owner, warehouse roles), toggle active status
- **Supplier Management:** Administrative supplier CRUD
- **Audit Logging:** Records all system actions (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, EXPORT, IMPORT) with old/new values in JSON format
- **Admin Dashboard:** Comprehensive system overview with user counts, order totals, revenue, supplier/customer/product statistics, top products, category revenue, role distribution, and registration trends

### 5.2 API Endpoints Summary

The backend exposes **50+ REST API endpoints** organized as:

| Prefix | App | Endpoints |
|--------|-----|-----------|
| `/api/auth/` | Accounts | Login, Register, Logout, Profile, Change Password, Addresses |
| `/api/` | Products | Categories, Suppliers, Products, Reviews |
| `/api/` | Orders | Orders, Cart, Wishlist, Compare, Payments, Notifications |
| `/api/warehouse/` | Warehouse | Purchase Orders, Dashboard, Stock Movements |
| `/api/analytics/` | Analytics | Sales, Revenue Trends, Forecasts, Segmentation, Recommendations |
| `/api/admin/` | Admin Panel | Users, Suppliers, Audit Logs, Dashboard, Customers |

### 5.3 Authentication & Security

- **JWT Authentication:** Access tokens (short-lived) + Refresh tokens (long-lived)
- **Role-Based Access Control (RBAC):** Different permissions for admin, owner, warehouse, and customer roles
- **Protected Routes:** API endpoints check user role before allowing access
- **Password Hashing:** All passwords are stored as hashed values
- **CORS Configuration:** Only allows requests from frontend origins (localhost:5173-5175)
- **Owner Isolation:** Owners can only see and manage their own products and related orders/analytics

---

## 6. Frontend Architecture (React + Vite)

### 6.1 Page Structure

The frontend is a **Single Page Application (SPA)** with role-based routing:

#### Customer Pages
| Page | Features |
|------|----------|
| **Home** | Product listing with category/brand filters, search, add to cart/wishlist |
| **Product Detail** | Full product info, reviews, ratings, related products, add to cart |
| **Cart** | View cart items, adjust quantities (max 6), remove items, proceed to checkout |
| **Checkout** | Select/add delivery address, choose payment method, place order |
| **Wishlist** | Saved items, move to cart, buy now |
| **Compare** | Side-by-side comparison of up to 3 products (stored in database per user, not localStorage) |
| **My Orders** | Order history with status tracking and order details |
| **My Reviews** | View and manage submitted reviews |
| **Profile** | View/edit personal information and manage addresses |

#### Owner Pages
| Page | Features |
|------|----------|
| **Dashboard** | Key metrics: revenue, profit, total orders, active customers with percentage changes |
| **Product Management** | Add, edit, delete products; bulk operations; image upload |
| **Order Management** | View orders containing the owner's products, update order status |
| **Analytics** | Revenue trends (Plotly charts), top products, category performance, demand forecasting with Prophet models, RFM customer segmentation |

#### Warehouse Pages
| Page | Features |
|------|----------|
| **Dashboard** | Stock overview, pending purchase orders, customer orders ready to ship |
| **Inventory Management** | Product list with stock levels, reorder levels, stock status indicators |
| **Stock Movements** | Track all customer orders (Pending/Processing/Shipped/Delivered with color-coded status), received purchase orders, recent product updates |
| **Low Stock Alerts** | View and send low stock notifications to product owners |

#### Admin Pages
| Page | Features |
|------|----------|
| **Dashboard** | System-wide metrics: users, orders, revenue, suppliers, customers, products |
| **User Management** | Create, edit, delete, toggle active status for system users; role assignment |
| **Supplier Management** | Full supplier CRUD with contact details |
| **System Logs** | Audit log viewer with filtering by action, table, date range, and user |
| **Analytics Summary** | System-wide analytics and trend visualization |

### 6.2 Key Frontend Features

- **Responsive Design:** Tailwind CSS ensures the application works on all screen sizes
- **Protected Routes:** ProtectedRoute component enforces role-based access to pages
- **Global Auth State:** React Context (AuthContext) manages login state, tokens, and user info across all components
- **API Service Layer:** Centralized Axios instance with JWT interceptors for automatic token attachment and refresh
- **Interactive Charts:** Plotly.js for demand forecasting graphs with confidence intervals; Recharts for dashboard analytics
- **Real-time Notifications:** Notification system with mark-as-read and clear-all functionality

---

## 7. Key Features and Business Logic

### 7.1 Multi-Store Order System

When a customer places an order with products from multiple owners:
1. The system groups items by `owner_name` (store)
2. Creates **one separate order per store** (each with its own order number)
3. Deducts stock from each product
4. Increments `units_sold` counter on each product
5. Sends in-app notifications to each product owner

### 7.2 Inventory Management Workflow

1. Owner/Admin creates products with stock quantities and reorder levels
2. When stock falls below reorder level, low stock alerts can be sent
3. Warehouse creates Purchase Orders to suppliers
4. When PO is received, stock is automatically added to products
5. Stock movements are tracked for the last 30 days

### 7.3 Machine Learning Pipeline

#### RFM Customer Segmentation
```
Raw SQL Query → Pandas DataFrame → Calculate R, F, M scores →
Quartile-based scoring (qcut) → Segment classification → JSON response
```

Segments:
- **Champions (444):** Highest scores in all three dimensions
- **Loyal Customers (3xx, 4xx):** High recency and frequency
- **Regulars (2xx):** Average performance
- **At Risk (1xx):** Low recency, declining engagement
- **Lost (111):** Lowest scores, inactive customers

#### Demand Forecasting
```
Historical Sales Data → Daily Aggregation → Gap filling (zero for missing days) →
Prophet/EWMA Model → 7-day Forecast with 95% Confidence Intervals →
Stock Decision (INCREASE/MAINTAIN/REDUCE)
```

#### Product Recommendations
```
Find orders containing target product → Find other products in those orders →
Count co-occurrence frequency → Sort by frequency → Return top 5
```

### 7.4 Audit Logging

Every significant action in the system is recorded:
- **Actions tracked:** CREATE, UPDATE, DELETE, LOGIN, LOGOUT, VIEW, BULK_UPDATE, EXPORT, IMPORT
- **Data captured:** Action type, table name, record ID, user ID, timestamp, old values (JSON), new values (JSON)
- **Statistics:** Distribution by action type, table, user, and daily activity trends

---

## 8. Project Structure

```
ElectroNest/
├── backend/                          # Django REST Framework API
│   ├── manage.py                     # Django management script
│   ├── requirements.txt              # Python dependencies (16 packages)
│   ├── db.sqlite3                    # SQLite backup database
│   ├── page/                         # Django project configuration
│   │   ├── settings.py               # Database, CORS, JWT, app settings
│   │   ├── urls.py                   # Root URL router
│   │   ├── pagination.py             # Custom flexible pagination
│   │   ├── wsgi.py                   # WSGI server configuration
│   │   └── asgi.py                   # ASGI server configuration
│   ├── accounts/                     # Authentication & user management
│   │   ├── models.py                 # CustomUser, CustomerAddress models
│   │   ├── views.py                  # Login, Register, Profile, Address views
│   │   ├── serializers.py            # DRF serializers
│   │   ├── authentication.py         # Custom JWT authentication
│   │   └── urls.py                   # Auth URL patterns
│   ├── products/                     # Product catalog
│   │   ├── models.py                 # Product, Category, Supplier, Customer, Review
│   │   ├── views.py                  # Product, Category, Supplier, Review ViewSets
│   │   ├── serializers.py            # DRF serializers
│   │   └── urls.py                   # Product URL patterns
│   ├── orders/                       # Orders, cart, wishlist, compare, payments
│   │   ├── models.py                 # Order, OrderDetail, Cart, Wishlist, CompareList, Payment, Notification
│   │   ├── views.py                  # Order CRUD, Cart, Wishlist, Compare, Notification views
│   │   ├── serializers.py            # DRF serializers
│   │   └── urls.py                   # Order URL patterns
│   ├── warehouse/                    # Inventory management
│   │   ├── models.py                 # PurchaseOrder, PurchaseOrderDetail
│   │   ├── views.py                  # PO CRUD, Dashboard, Stock Movements
│   │   ├── serializers.py            # DRF serializers
│   │   └── urls.py                   # Warehouse URL patterns
│   ├── analytics/                    # Analytics & ML
│   │   ├── models.py                 # (No models, uses other apps)
│   │   ├── views.py                  # Sales, forecasts, segmentation views
│   │   ├── ml_services.py            # RFM, demand forecast, recommendations
│   │   └── urls.py                   # Analytics URL patterns
│   └── admin_panel/                  # System administration
│       ├── models.py                 # AuditLog, AuditMixin
│       ├── views.py                  # User, Supplier, Audit, Dashboard views
│       ├── permissions.py            # IsAdminRole permission class
│       ├── serializers.py            # DRF serializers
│       └── urls.py                   # Admin URL patterns
│
├── frontend/                         # React + Vite SPA
│   ├── index.html                    # HTML entry point
│   ├── package.json                  # Node dependencies
│   ├── vite.config.js                # Vite build configuration
│   └── src/
│       ├── main.jsx                  # React entry point
│       ├── App.jsx                   # Main router with all routes
│       ├── App.css, index.css        # Global styles
│       ├── context/
│       │   └── AuthContext.jsx       # Global authentication state
│       ├── services/
│       │   └── api.js                # Axios API wrapper with JWT
│       ├── Config/
│       │   └── Config.js             # API base URL configuration
│       ├── components/
│       │   ├── Common/               # Navbar, Footer, ProtectedRoute
│       │   ├── admin/                # Admin UI components
│       │   ├── Owner/                # Owner dashboard components
│       │   └── warehouse/            # Warehouse UI components
│       └── pages/
│           ├── Home.jsx              # Public product listing
│           ├── Customer/             # Cart, Checkout, Orders, Profile, etc.
│           ├── Owner/                # Dashboard, Products, Orders, Analytics
│           ├── Warehouse/            # Dashboard, Inventory, Stock, Alerts
│           └── Admin/                # Dashboard, Users, Suppliers, Logs
│
└── database.md                       # Database setup documentation
```

---

## 9. Screenshots / Module Descriptions

### 9.1 Customer Module
- **Product Browsing:** Grid layout with product cards showing image, name, price, rating, and quick action buttons (Add to Cart, Add to Wishlist)
- **Product Detail Page:** Full product information with description, specifications, price, stock availability, reviews section, and related product recommendations
- **Shopping Cart:** Table view of cart items with quantity controls, subtotal calculation, and checkout button
- **Checkout Flow:** Multi-step process: select address → select payment method → review order → confirm
- **Order Tracking:** Order history list with order number, date, status badge, total amount, and expandable order details

### 9.2 Owner Module
- **Dashboard:** Cards showing total revenue, profit, orders, and customers with percentage change indicators; recent orders table
- **Product Management:** Data table with inline actions (edit, delete); modal form for adding/editing products with all fields including image URL
- **Analytics Page:** Interactive Plotly.js charts for revenue trends, top products bar chart, category performance pie chart, and demand forecasting with confidence interval bands

### 9.3 Warehouse Module
- **Dashboard:** Stock level overview cards, pending purchase orders list, customer orders ready to deliver, and low stock item alerts
- **Inventory Table:** Product listing with stock level bars, reorder level indicators, and stock status badges (In Stock, Low Stock, Out of Stock)
- **Purchase Orders:** Create PO form with supplier selection and product line items; receive PO action to update stock

### 9.4 Admin Module
- **Dashboard:** System-wide statistics cards, user role distribution chart, registration trend line chart, top products, and recent activity feed
- **User Management:** User table with role badges, active/inactive status toggle, create/edit user modal
- **Audit Logs:** Searchable and filterable log table with action type, table name, user, timestamp, and old/new value comparison

---

## 10. How to Run the Project

### Prerequisites
1. Python 3.10+ with pip
2. Node.js 18+ with npm
3. SQL Server Express with ODBC Driver 17
4. SQL Server Management Studio (SSMS)

### Quick Start

**Terminal 1 (Backend):**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver     # Runs on http://localhost:8000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev                    # Runs on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 11. Challenges Faced and Solutions

| Challenge | Solution |
|-----------|----------|
| **Dual authentication** (staff vs legacy customers) | Custom JWT authentication class that checks both CustomUser and Customers tables |
| **Multi-store orders** | Order grouping logic that creates separate orders per owner while maintaining a single checkout flow |
| **Legacy database integration** | Used `managed = False` in Django models to work with pre-existing SQL Server tables without migrations |
| **Sparse sales data forecasting** | Implemented smart daily average (frequency-adjusted) and EWMA with mean reversion fallback when Prophet under-predicts |
| **Real-time stock updates** | Atomic stock deduction on order creation with automatic restoration on cancellation |
| **Cross-origin API calls** | Configured django-cors-headers to allow frontend origins |

---

## 12. Future Enhancements

1. **WebSocket Integration:** Real-time notifications using Django Channels instead of polling
2. **Payment Gateway:** Integration with Stripe/Razorpay for actual payment processing
3. **Email Notifications:** Order confirmation and shipping updates via email
4. **Mobile App:** React Native mobile application using the same API
5. **Advanced ML:** Collaborative filtering for recommendations, ARIMA/LSTM for forecasting
6. **Docker Deployment:** Containerized deployment for production environments

---

## 13. Conclusion

ElectroNest is a production-ready e-commerce platform that demonstrates expertise in:

- **Full-stack web development** using Django REST Framework and React
- **Database design** with 20 interconnected tables in SQL Server
- **Role-based access control** with four distinct user roles
- **Machine Learning integration** for business intelligence (RFM, forecasting, recommendations)
- **Modern UI/UX** with responsive design, interactive charts, and real-time notifications
- **Software engineering best practices** including RESTful API design, JWT authentication, audit logging, and modular architecture

The project successfully bridges the gap between a traditional e-commerce platform and an intelligent business management system, providing actionable insights through data-driven analytics.

---

## 14. References

- Django Documentation: https://docs.djangoproject.com/
- Django REST Framework: https://www.django-rest-framework.org/
- React Documentation: https://react.dev/
- Vite: https://vite.dev/
- Tailwind CSS: https://tailwindcss.com/
- Plotly.js: https://plotly.com/javascript/
- Scikit-learn: https://scikit-learn.org/
- Pandas: https://pandas.pydata.org/
- SQL Server Express: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
- SimpleJWT: https://django-rest-framework-simplejwt.readthedocs.io/

---

**Project developed by:** Sushant,Sachyam,Suraj,Sujal
**Technology:** Django REST Framework + React + SQL Server + Machine Learning
**Academic Year:** 2025-2026
