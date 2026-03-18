# ElectroNest: A Full-Stack E-Commerce Platform with Multi-Role Access and Intelligent Analytics
### Advanced Python Programming for Data Science — Project Presentation
**Duration:** 15 Minutes Presentation + 5 Minutes Q&A

---

---

## SLIDE 1 — Title Slide

# ElectroNest
### A Full-Stack E-Commerce Platform with Multi-Role Access and Intelligent Analytics

**Course:** Advanced Python Programming for Data Science
**Team Members:** [Your Names]
**Date:** March 2026

> *"Bridging the gap between retail operations and intelligent data-driven decision-making for electronics commerce in Nepal."*

---

---

## SLIDE 2 — Problem Definition & Objective

### Problem Definition

Small-to-mid-sized electronics retailers in Nepal operate with fragmented systems:
- Inventory managed in spreadsheets
- Orders tracked manually or in disconnected tools
- No customer behaviour intelligence
- No predictive analytics for demand or pricing

**Result:** Stock-outs, over-ordering, lost customers, and missed revenue opportunities.

### Core Objective

> Build a unified, role-based, data-driven e-commerce platform that integrates operations management, real-time analytics, and machine learning in a single web application.

### Why This Problem Matters

| Challenge | Real-World Impact |
|---|---|
| No demand forecasting | Dead stock and revenue loss |
| No customer segmentation | Blanket discounts with no targeting |
| No audit trail | Accountability gaps in multi-user systems |
| No inventory automation | Manual errors and delayed restocking |

### Expected Outcomes

- Automated restock decisions based on 7-day demand forecasts
- RFM-based customer segmentation enabling targeted retention strategies
- A complete operational dashboard accessible by four distinct user roles
- A churn prediction model to identify at-risk customers proactively

---

---

## SLIDE 3 — Dataset Description & Data Source

### Data Source

Datasets were sourced from **Kaggle** and **Google Datasets** in CSV format and adapted to represent a Nepal-based electronics retail context.

### Dataset Inventory

| File | Rows (approx.) | Type | Source |
|---|---|---|---|
| `Customers_raw.csv` | 1,611 | Categorical + Date | Kaggle |
| `Products_raw.csv` | 500+ | Numerical + Categorical | Kaggle |
| `Orders_raw.csv` | 3,000+ | Numerical + Date | Kaggle |
| `OrderDetails_raw.csv` | 8,000+ | Numerical | Derived |
| `Reviews_raw.csv` | 2,500+ | Numerical + Text | Kaggle |
| `Customer_Address.csv` | 1,611+ | Categorical | Google |
| `Suppliers.csv` | 30+ | Categorical | Manual |
| `Categories.csv` | 15 | Categorical | Manual |
| `Brands.csv` | 30+ | Categorical | Manual |
| `OrderStatus.csv` | 5 | Categorical | Manual |
| `PaymentMethods.csv` | 4 | Categorical | Manual |

**Total Tables in Production Database:** 20

### Data Types Present

- **Numerical:** Prices, quantities, ratings (1–5), monetary values (NPR)
- **Categorical:** Names, emails, statuses, roles, regions, genders
- **Time-Series:** Order dates, registration dates, review dates
- **Text:** Product descriptions, review comments, supplier details

### Data Limitations

- Customer phone numbers were inconsistently formatted (mixed `+977` and `+91` prefixes)
- Missing product descriptions in approximately 8–12% of product records
- No real transactional payment gateway data — `PaymentMethods` are simulated
- Review dataset contained duplicate (CustomerID, ProductID) pairs that needed deduplication

---

---

## SLIDE 4 — Data Collection & Ingestion Method

### Collection Strategy

Data was collected from two external sources and assembled into a structured ingestion pipeline:

```
Kaggle / Google Datasets
        │
        ▼
  Raw CSV Files (raw/)
        │
        ▼
  SimpleDataCleaner (Python OOP class)
        │
        ▼
  Cleaned CSV Files (cleaned/)
        │
        ▼
  SQL Server Express (ElectroNestDB)
        │
        ▼
  Django ORM / Raw SQL Queries
```

### Tools and Libraries Used

| Library | Version | Role |
|---|---|---|
| `pandas` | ≥ 2.0.0 | DataFrame I/O, transformation, aggregation |
| `numpy` | ≥ 1.24.0 | Vectorised computation, IQR outlier capping |
| `pathlib.Path` | stdlib | OS-agnostic file path resolution |
| `pyodbc` | 5.3.0 | ODBC connection to SQL Server |
| `mssql-django` | 1.6 | Django ORM adapter for Microsoft SQL Server |

### Ingestion Design Decisions

1. **Dynamic file loading** — The class attempts `_raw.csv` suffix first, then plain `.csv`, then falls back to an empty DataFrame with a warning. This avoids hard crashes during partial data loads.
2. **Separation of concerns** — Files are classified as either `files_to_clean` (requiring transformations) or `pass_through_files` (reference tables loaded unchanged), keeping the pipeline predictable and auditable.
3. **Referential integrity enforcement** — Before saving, all foreign key relationships (CustomerID → Customers, OrderID → Orders, ProductID → Products) are validated programmatically using Pandas `.isin()` checks.

### Data Extraction Challenges

- **Phone normalisation:** Regex pattern matching with `np.where` was used to standardise phone numbers to `+977-XXX-XXXXXXX` format
- **Date boundary validation:** Customer registration and order dates outside the range `[2020-01-01, today]` were dropped to remove synthetic outliers
- **SQL Server unmanaged tables:** Because the core tables exist as pre-created SQL Server objects, Django's ORM read/writes to them but does not manage their schema — requiring careful column name alignment between the CSV headers and the SQL table definitions

---

---

## SLIDE 5 — Data Cleaning & Feature Engineering

### Cleaning Architecture: `SimpleDataCleaner` Class

The entire pipeline is encapsulated in a single OOP class with one public method (`run_and_save()`) and five private domain-specific methods:

```python
class SimpleDataCleaner:
    def __init__(self):          # Load all raw CSVs dynamically
    def clean_customers(self)    # Phone, email, date validation
    def clean_products(self)     # Price/stock validation, IQR capping
    def clean_orders(self)       # Referential integrity, amount filtering
    def clean_order_details(self)# Quantity/price checks, TotalPrice computation
    def clean_reviews(self)      # Rating range, deduplication
    def run_and_save(self)       # Orchestrates the pipeline, saves outputs
```

### Handling Missing Values

| Table | Column | Strategy |
|---|---|---|
| Products | `ProductDescription` | Fill with `'No description available'` |
| Reviews | `Comment` | Fill with `'No comment provided'` |
| Orders | `OrderStatusID` | Fill NaN with `1000` (Unknown Status) then cast to `int` |
| Customers | `FirstName`, `LastName`, `Email` | Drop rows where any critical field is null |
| Products | `ProductName`, `SellingPrice`, `CategoryID`, `Brand` | Drop rows with null in any required field |

### Handling Outliers — IQR Clipping

Rather than dropping rows with outlier prices or stock values (which would remove real products), we applied **IQR-based upper-bound clipping**:

```python
for col in ['SellingPrice', 'Stock']:
    upper_bound = df[col].quantile(0.75) + 3 * (df[col].quantile(0.75) - df[col].quantile(0.25))
    df[col] = df[col].clip(upper=upper_bound)
```

**Justification:** A `3×IQR` multiplier (more conservative than the standard `1.5×IQR`) preserves premium-priced electronics while capping extreme synthetic values.

### Feature Engineering

| Feature | Method | Rationale |
|---|---|---|
| `TotalPrice` (OrderDetails) | `Quantity × UnitPrice` | Always computed to ensure column exists for downstream analytics regardless of source data quality |
| Phone standardisation | `np.where` + regex | Normalise to `+977-XXX-XXXXXXX` for consistent display and search |
| Email validation | `str.match(r'^[\w\.-]+@[\w\.-]+\.\w+$')` | Reject malformed addresses before they enter the database |
| `registrationDate` | `pd.to_datetime(errors='coerce')` + date filter | Parse flexibly, then discard future dates and pre-2020 records |
| `Rating` range | `.between(0, 5)` | Remove reviews with impossible ratings |

### Preprocessing Justifications

- **Drop over fill for identity fields (name, email):** A customer record without a name or valid email is unusable for any downstream process — CRM, notifications, segmentation — so deletion is more appropriate than imputation.
- **Clip over drop for price/stock outliers:** Electronics genuinely span large price ranges; imputation would distort market distribution, while clipping preserves relative ordering.
- **Referential integrity as a final step:** Applying FK checks after individual table cleaning ensures that only valid cross-table relationships survive, simulating the constraint enforcement of a production RDBMS.

---

---

## SLIDE 6 — Data Analysis & Statistical Exploration

### Analytical Operations Implemented

The analytics module (`analytics/views.py` + `analytics/ml_services.py`) executes the following classes of operations against the cleaned data in SQL Server:

#### Aggregations & Grouping

| Analysis | Technique | Outcome |
|---|---|---|
| Sales Overview | `GROUP BY` period, `SUM(TotalAmount)`, `SUM(Profit)` | Total revenue, profit, order count with period-over-period % change |
| Top Products | `GROUP BY ProductID`, `SUM(Quantity)` | Top 10 best-selling products by units sold |
| Category Performance | `GROUP BY CategoryName`, `SUM`, `COUNT` | Revenue, order volume, and product count per category |
| Payment Methods | `GROUP BY MethodName`, `SUM(PayableAmount)` | Most-used payment channels by monetary volume |
| Order Status Distribution | `GROUP BY StatusName`, `COUNT(OrderID)` | Pipeline health: Pending, Processing, Shipped, Delivered, Cancelled counts |

#### Revenue Trend Analysis

- **Daily granularity:** Aggregated by `CAST(OrderDate AS DATE)`, showing day-over-day revenue and profit
- **Monthly granularity:** Aggregated by `YEAR(OrderDate), MONTH(OrderDate)` for trend identification
- Configurable lookback periods (7, 30, 90 days) via query parameter

#### RFM Statistical Computation (via Pandas)

For each customer, three metrics are computed from order history:

| Metric | Definition | Pandas Method |
|---|---|---|
| **Recency** | Days since the customer's last non-cancelled order | `groupby().agg({'days_since': 'min'})` |
| **Frequency** | Total number of orders placed | `groupby().agg(count)` |
| **Monetary** | Total amount spent (NPR) | `groupby().agg({'TotalAmount': 'sum'})` |

Scores are computed using **quartile-based binning** (`pd.qcut`) with `rank(method='first')` to handle ties:

```python
rfm['r_score'] = pd.qcut(rfm['recency'].rank(method='first'), 4, labels=[4, 3, 2, 1])
rfm['f_score'] = pd.qcut(rfm['frequency'].rank(method='first'), 4, labels=[1, 2, 3, 4])
rfm['m_score'] = pd.qcut(rfm['monetary'].rank(method='first'), 4, labels=[1, 2, 3, 4])
```

#### Key Statistical Observations

- **Skewed price distribution** in Products required IQR capping rather than Z-score removal
- **Temporal concentration** of orders around weekends and month-ends (visible in daily revenue trends)
- **Category imbalance:** A few categories (e.g., Smartphones, Laptops) dominate revenue, while accessories have high volume but low monetary value
- **Review sparsity:** Many products have fewer than 3 reviews, making simple average ratings unreliable — the platform mitigates this by also showing review count alongside the star rating
- **Customer order frequency follows a power-law distribution:** A small percentage of customers account for a disproportionate share of revenue, motivating the RFM segmentation approach

---

---

## SLIDE 7 — Key Insights & Interpretation

### Insight 1 — Demand Forecasting Identifies Stock Risk Before It Occurs

The demand forecasting model (Prophet / EWMA with 95% confidence intervals) generates 7-day forward projections for each product's units sold, revenue, and profit. The model automatically issues stock recommendations:

- **INCREASE** — Forecast demand exceeds current stock within the horizon
- **MAINTAIN** — Stock is adequate relative to projected demand
- **REDUCE** — Demand is declining; over-stocking is likely

**Real-World Impact:** Warehouse staff can initiate purchase orders proactively rather than reactively, reducing stock-out events and excess inventory carrying costs.

---

### Insight 2 — RFM Segmentation Reveals the 20/80 Revenue Concentration

RFM analysis consistently identifies that a small cohort of **Champions** (score `444`) and **Loyal Customers** (high recency + frequency) generate the majority of platform revenue. Customers classified as **At Risk** (low recency, historically high frequency) represent retention opportunities.

| Segment | RFM Profile | Recommended Action |
|---|---|---|
| Champions | Recent, frequent, high-spend | Reward with exclusive coupons |
| Loyal Customers | Frequent, moderate recency | Upsell higher-margin products |
| Regulars | Average across all dimensions | General promotions |
| At Risk | Declining recency, was active | Targeted win-back campaign |
| Lost | Low on all three metrics | Low-cost re-engagement email |

**Real-World Impact:** Owners can use the RFM dashboard to design segment-specific coupon codes (the platform supports owner-scoped coupons with per-customer usage limits).

---

### Insight 3 — Market Basket Analysis Reveals Cross-Sell Opportunities

The product recommendations engine uses **co-occurrence frequency** across all orders to identify products frequently purchased together. For example, a customer viewing a laptop is shown accessories (mice, cases, adapters) that other customers commonly purchased alongside it.

**Real-World Impact:** Increases average order value (AOV) without requiring external recommendation infrastructure.

---

### Insight 4 — Churn Prediction Flags High-Risk Customers Early

A **Logistic Regression** model trained on RFM features assigns each customer a churn probability score. Customers inactive for more than 30 days within a 90-day window are labelled as churned in the training set.

| Risk Band | Churn Probability | Count |
|---|---|---|
| High Risk | ≥ 70% | Actionable |
| Medium Risk | 40–69% | Monitor |
| Low Risk | < 40% | Retain normally |

**Real-World Impact:** Marketing effort is concentrated on the highest-probability churners, improving the efficiency of retention campaigns.

---

### Insight 5 — Audit Logs Provide Operational Accountability

Every CREATE, UPDATE, DELETE, LOGIN, LOGOUT, and EXPORT action is recorded in the `AuditLog` table with old and new values stored as JSON. This enables administrators to reconstruct the state of any record at any point in time.

**Real-World Impact:** In regulated or multi-owner environments, audit trails are critical for resolving disputes, detecting fraud, and ensuring data integrity across concurrent users.

---

---

## SLIDE 8 — Interactive Dashboard & Visualization

### Visualization Technology Stack

| Library | Context | Purpose |
|---|---|---|
| **Plotly.js** (`plotly.js-dist-min` v3.3) | Owner Analytics page | Revenue trend line charts, demand forecast with confidence interval bands, top products bar charts |
| **Recharts** v3.7 | Admin Dashboard, Warehouse | Registration trend charts, stock level bar charts, category performance pie charts |
| **Custom CSS (Tailwind CSS v4)** | All dashboards | Responsive KPI cards, status badge components, colour-coded stock indicators |

### Interactive Elements by Dashboard Role

#### Owner Analytics Dashboard
- **Time period filter:** Dropdown (7 / 30 / 90 / 365 days) updates all KPI cards and trend charts dynamically via API calls
- **Forecast confidence bands:** Plotly area chart with upper/lower bounds computed by Prophet/EWMA — hover reveals exact predicted value and confidence interval
- **RFM Segmentation table:** Clickable customer rows showing recency, frequency, monetary values and assigned segment
- **Top Products bar chart:** Interactive tooltips showing product name, units sold, and revenue contribution

#### Customer-Facing Interface
- **Category and brand filters:** Multi-select dropdowns that dynamically re-query the product catalogue
- **Product comparison:** Up to 3 products selected concurrently from any page — stored server-side per user (not localStorage) enabling cross-device access
- **Live stock indicator:** Real-time `In Stock / Low Stock / Out of Stock` badge computed from the database on each request

#### Warehouse Dashboard
- **Stock level bars:** Visual progress bars for each product's current stock relative to reorder level
- **Purchase order status tracker:** Colour-coded status badges (Pending / Delivered)
- **Low-stock alert system:** One-click notification dispatch to the relevant product owner

### How Interaction Enhances Understanding

The static equivalent of the analytics dashboard would present a fixed snapshot of data. The interactive implementation allows:
1. **Drill-down:** From platform-wide summary → category → individual product → daily granularity
2. **Temporal comparison:** Revenue for this week vs. last week rendered by changing a single dropdown
3. **Contextual forecasting:** Each product has its own demand curve — the forecast chart is generated on-demand for the selected product rather than being pre-computed

**Live Demo:** The application runs locally with the Django backend on `http://localhost:8000` and the React frontend on `http://localhost:5173`.

---

---

## SLIDE 9 — Technical Architecture & Project Structure

### System Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND  (React 19 + Vite 7)          │
│              http://localhost:5173                   │
│                                                     │
│  AuthContext  →  ProtectedRoute  →  Role-Based Pages│
│  [Customer] [Owner] [Warehouse] [Admin]             │
│               │  Axios + JWT                        │
└───────────────┼─────────────────────────────────────┘
                │ REST API (JSON)
┌───────────────┼─────────────────────────────────────┐
│           BACKEND  (Django 5.2 + DRF 3.16)          │
│           http://localhost:8000                      │
│                                                     │
│  accounts │ products │ orders │ warehouse            │
│  analytics │ admin_panel                            │
│               │  mssql-django ORM + pyodbc          │
└───────────────┼─────────────────────────────────────┘
                │ ODBC Driver 17
┌───────────────┼─────────────────────────────────────┐
│       DATABASE  (SQL Server Express)                 │
│       ElectroNestDB  —  20 tables                   │
└─────────────────────────────────────────────────────┘
```

### Backend Module Responsibilities

| Django App | Domain | Key Responsibility |
|---|---|---|
| `accounts` | Authentication | Dual JWT system: staff (SimpleJWT) + customers (custom JWT). RBAC via role field. |
| `products` | Catalogue | Product/Category/Supplier CRUD. Dynamic annotation for `avg_rating`, `review_count`. |
| `orders` | Commerce | Order creation with multi-store splitting, stock deduction, coupon validation, cart/wishlist/compare. |
| `warehouse` | Inventory | Purchase orders, stock receiving, movement tracking (30-day window). |
| `analytics` | Intelligence | Sales overview, revenue trends, RFM, demand forecast, recommendations, churn, dynamic pricing. |
| `admin_panel` | Governance | User management, audit logging (`AuditMixin`), admin dashboard. |

### Data Flow

```
Raw CSV Files (Kaggle/Google)
        │
        ▼
SimpleDataCleaner (Python OOP)
        │  — Validates, cleans, engineers features
        ▼
Cleaned CSVs  →  SQL Server ElectroNestDB
                         │
                         ▼
              Django ORM + Raw SQL Queries
                         │
                         ▼
              DRF Serializers (JSON responses)
                         │
                         ▼
              Axios API calls (React frontend)
                         │
                         ▼
          Plotly.js / Recharts visualisations
```

### Frontend Component Hierarchy

```
App.jsx  (Route definitions + ProtectedRoute guards)
  ├── AuthContext.jsx  (Global JWT state)
  ├── services/api.js  (Axios instance with auto-refresh)
  ├── pages/Home.jsx   (Public product listing)
  ├── pages/Customer/  (Cart, Checkout, Orders, Profile, Wishlist, Compare)
  ├── pages/Owner/     (Dashboard, Products, Orders, Analytics)
  ├── pages/Warehouse/ (Dashboard, Inventory, Stock Movements, Alerts)
  └── pages/Admin/     (Dashboard, Users, Suppliers, Audit Logs)
```

### API Surface

The backend exposes **50+ REST endpoints** organised under 6 URL prefixes:

```
/api/auth/        →  Login, Register, Profile, Addresses
/api/             →  Products, Categories, Suppliers, Reviews
/api/orders/      →  Orders, Cart, Wishlist, Compare, Coupons
/api/warehouse/   →  Purchase Orders, Dashboard, Stock Movements
/api/analytics/   →  Sales, Trends, Forecast, RFM, Recommendations
/api/admin/       →  Users, Suppliers, Audit Logs, Customers
```

---

---

## SLIDE 10 — Advanced Python Implementation

### 1. Object-Oriented Programming — `SimpleDataCleaner`

The data ingestion and cleaning pipeline is implemented as a cohesive class:

```python
class SimpleDataCleaner:
    def __init__(self):
        # Encapsulates all file paths, loaded DataFrames, and metadata
        self.base_path = Path(__file__).resolve().parent
        self.files_to_clean = ['Customers', 'Products', 'Orders', 'OrderDetails', 'Reviews']
        self.pass_through_files = ['Customer_Address', 'Suppliers', 'Categories', ...]
        self.data = {}      # Central state: dict of DataFrames
        self.today = pd.Timestamp.now()
```

**OOP principles applied:**
- **Encapsulation:** All state (paths, DataFrames, date reference) held within the instance — no global variables
- **Single Responsibility:** Each `clean_*` method handles exactly one domain table
- **Modular orchestration:** `run_and_save()` calls each cleaner in the correct dependency order (Customers before Orders before OrderDetails)

---

### 2. OOP in the Django Backend — Mixins and Class-Based Views

```python
# Automatic audit logging via mixin composition
class AuditMixin:
    def perform_create(self, serializer):
        instance = serializer.save()
        AuditLog.log_action('CREATE', self.audit_table_name, instance.pk, self.request.user)

    def perform_update(self, serializer):
        old_data = ...  # capture before state
        instance = serializer.save()
        AuditLog.log_action('UPDATE', ..., old_values=old_data, new_values=...)

class ProductViewSet(AuditMixin, ModelViewSet):
    # Inherits automatic audit logging for all write operations
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
```

---

### 3. Custom Authentication — Dual JWT Strategy

```python
class CustomerJWTAuthentication(BaseAuthentication):
    """
    Authenticates customer tokens (user_type='customer') against the
    legacy Customers table, falling through to SimpleJWT for staff tokens.
    """
    def authenticate(self, request):
        token = self._extract_token(request)
        payload = PyJWT.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if payload.get('user_type') == 'customer':
            customer = Customer.objects.get(CustomerID=payload['customer_id'])
            return (customer, token)
        return None  # Delegates to SimpleJWT
```

---

### 4. Exception Handling

All view logic wraps database operations in `try/except` blocks to return structured error responses rather than HTTP 500:

```python
try:
    forecast_data = get_comprehensive_forecast(product_id)
except Exception as e:
    return Response(
        {'error': 'Forecasting failed', 'detail': str(e)},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
```

ML service functions validate input size before model training:

```python
if df.empty or len(df) < 5:
    return {'error': 'Not enough order data for churn prediction', ...}
if len(set(y)) < 2:
    # Handle degenerate case: all customers same churn label
    rfm['churn_probability'] = rfm['recency'].apply(lambda r: min(r / (days * 0.8), 1.0))
```

---

### 5. Performance & Optimisation

| Technique | Where Applied | Benefit |
|---|---|---|
| `pd.qcut` with `rank(method='first')` | RFM scoring | Handles ties without raising `ValueError` on non-unique bin edges |
| `.clip(upper=upper_bound)` in two lines | IQR outlier capping | O(n) vectorised operation via NumPy, avoids row-by-row iteration |
| Database annotations (`Avg`, `Count`) | Product `avg_rating` | Computed in SQL by the ORM rather than in Python, reducing data transfer |
| `isin()` vectorised FK check | Referential integrity in `clean_*` | Single O(n) Pandas operation replaces slow Python loop |
| Custom pagination (`PageNumberPagination`) | All list endpoints | Returns configurable page sizes; prevents large payloads on product/log list endpoints |
| JWT token caching in `AuthContext` | React frontend | localStorage-persisted tokens prevent redundant login requests across page navigations |

---

### 6. Modular and Clean Code Practices

- **No hardcoded paths:** `pathlib.Path(__file__).resolve().parent` ensures the script runs correctly regardless of execution directory
- **Warnings suppression scoped to pipeline:** `warnings.filterwarnings('ignore')` is applied at module level in the cleaning script, not globally across the Django application
- `warnings.filterwarnings('ignore')` in the data pipeline prevents noisy `FutureWarning` output during `pd.qcut` without silencing warnings across the entire application
- **Separation of ML logic:** All machine learning logic lives in `analytics/ml_services.py` (pure functions); the views file only handles HTTP concerns — request parsing, permission checking, and response formatting
- **DRY serializers:** `AuditMixin` is mixed into any ViewSet that needs automatic logging — write the logic once, apply it everywhere

---

---

## SLIDE 11 — Conclusion & Future Scope

### Summary of Major Findings

| Area | Outcome |
|---|---|
| Data Pipeline | A fully automated, class-based cleaning pipeline processes 11 CSV files, enforces referential integrity, and loads them into a production SQL Server database |
| Platform Functionality | 50+ REST API endpoints serve four user roles across 25+ frontend pages |
| Machine Learning | Five ML-powered features deployed: RFM segmentation, demand forecasting, product recommendations, churn prediction, and dynamic pricing suggestions |
| Visualisation | Interactive Plotly.js and Recharts dashboards with time-period filters, confidence interval charts, and real-time stock indicators |
| Security | JWT-based dual authentication, RBAC, CORS restriction, password hashing, and a comprehensive audit trail |

### Practical Applications

1. **For Store Owners:** The demand forecasting and RFM dashboards directly inform pricing, promotional, and inventory decisions without requiring a data analyst
2. **For Warehouse Staff:** Automated low-stock notifications and purchase order workflows reduce manual intervention in restocking operations
3. **For Platform Administrators:** The audit log provides complete accountability for all data mutations — critical in multi-tenant retail environments
4. **For Marketing:** Churn prediction scores allow precise targeting of at-risk customers with personalised coupon codes before they disengage

### Possible Improvements & Extensions

| Extension | Technical Approach |
|---|---|
| **Real-time notifications** | WebSocket integration (Django Channels) to push order updates without polling |
| **Advanced recommendation engine** | Collaborative filtering (SVD / ALS) using `scikit-surprise` or `implicit` for personalised product discovery |
| **Time-series forecasting at scale** | Replace Prophet/EWMA with LSTM-based sequential models (PyTorch / TensorFlow) for products with long sales history |
| **Payment gateway integration** | Stripe or eSewa API integration to replace simulated `PaymentMethods` with real transaction processing |
| **Multi-currency and multi-region** | Extend the data model to support USD/INR pricing and international shipping zones |
| **A/B testing framework** | Track conversion rates by product placement, price point, or coupon type to enable data-driven UX decisions |
| **Containerisation** | Docker + docker-compose to eliminate local SQL Server dependency and simplify deployment |
| **Cloud deployment** | Azure App Service (aligned with SQL Server) or Railway/Render for backend; Vercel for React frontend |

---

---

## APPENDIX — Quick Reference

### Technology Stack Summary

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 19.2.0 |
| Build Tool | Vite | 7.3.1 |
| CSS Framework | Tailwind CSS | 4.1.18 |
| Charting (Analytics) | Plotly.js | 3.3.1 |
| Charting (Dashboards) | Recharts | 3.7.0 |
| HTTP Client | Axios | 1.13.5 |
| Routing | React Router DOM | 7.13.0 |
| Backend Framework | Django | 5.2.11 |
| REST API Framework | Django REST Framework | 3.16.1 |
| Authentication | SimpleJWT + Custom JWT | 5.5.1 + PyJWT 2.11.0 |
| Database | SQL Server Express | ODBC Driver 17 |
| ORM Adapter | mssql-django | 1.6 |
| Data Manipulation | Pandas | ≥ 2.0.0 |
| Numerical Operations | NumPy | ≥ 1.24.0 |
| Machine Learning | Scikit-learn | ≥ 1.3.0 |
| Statistical Modelling | Statsmodels | ≥ 0.14.0 |
| Image Handling | Pillow | 12.1.1 |

### ML Models Deployed

| Feature | Model / Algorithm | Library |
|---|---|---|
| Customer Segmentation | RFM + Quartile Binning | Pandas |
| Demand Forecasting (simple) | Simple Moving Average (SMA) | Pandas / NumPy |
| Demand Forecasting (comprehensive) | EWMA / Prophet | Statsmodels |
| Product Recommendations | Market Basket (Co-occurrence) | Pandas |
| Churn Prediction | Logistic Regression | Scikit-learn |
| Dynamic Pricing | Demand-trend heuristic | Pandas / NumPy |

### Database Table Count: 20

**Core (SQL Server):** Categories, Suppliers, Products, Customers, OrderStatus, Orders, OrderDetails, Customer_Address, Reviews, Cart, Wishlist, PaymentMethods, Payments, PurchaseOrders, PurchaseOrderDetails

**Django-managed:** accounts_customuser, CompareList, Coupons, CouponUsage, Notifications, AuditLog

---

*Presentation prepared for Advanced Python Programming for Data Science | March 2026*
