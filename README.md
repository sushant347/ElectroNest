# ElectroNest

ElectroNest is a full-stack e-commerce platform for electronics retail, with role-based dashboards for customers, store owners, warehouse staff, and administrators.

It combines:
- A Django REST backend for commerce operations, analytics, and admin tools
- A React + Vite frontend for web UI and dashboards
- PostgreSQL (cloud) and SQL Server Express (local) compatibility in backend settings
- Deployment-ready configuration for Render (backend) and Vercel (frontend)

## Table of Contents
- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [Backend Setup (Local)](#backend-setup-local)
- [Frontend Setup (Local)](#frontend-setup-local)
- [Environment Variables](#environment-variables)
- [API Overview](#api-overview)
- [Database Notes](#database-notes)
- [Seed and Utility Commands](#seed-and-utility-commands)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security Checklist](#security-checklist)

## Project Overview
ElectroNest supports end-to-end e-commerce workflows:
- Product catalog, suppliers, categories, reviews
- Cart, wishlist, compare list, checkout/order lifecycle
- Coupons, payment methods, and notification flows
- Warehouse purchase orders and stock movement insights
- Admin audit logs, customer management, user query handling
- Analytics and ML endpoints (segmentation, forecasting, churn, dynamic pricing)

## Tech Stack
### Backend
- Python, Django 5, Django REST Framework
- JWT authentication with SimpleJWT
- django-filter, django-cors-headers
- Analytics/ML: pandas, numpy, scipy, statsmodels, scikit-learn
- Deployment: gunicorn, whitenoise, dj-database-url

### Frontend
- React 19 + Vite
- React Router
- Axios
- Tailwind CSS
- Recharts and Plotly for charts

### Data Layer
- Cloud database: PostgreSQL (via DATABASE_URL)
- Local fallback in settings: SQL Server Express (ODBC Driver 17)

## Repository Structure

- backend/
  - page/ (Django project config: settings, urls, wsgi, pagination)
  - accounts/ (auth, users, addresses)
  - products/ (catalog, suppliers, reviews, seed commands)
  - orders/ (orders, cart, wishlist, compare, coupons, notifications)
  - warehouse/ (purchase orders, stock operations)
  - admin_panel/ (audit logs, user/admin management, user queries)
  - analytics/ (dashboards + ML services)
- frontend/
  - src/pages/ (customer, owner, warehouse, admin, support pages)
  - src/components/ (shared and role-based layouts/components)
  - src/services/ (API clients, token refresh/interceptors)
  - src/context/ (authentication context)
- Database.sql (core relational schema and seed-oriented SQL)
- render.yaml (Render service definition)

## Core Features
### Customer
- Browse products with category/brand filtering
- View product details and reviews
- Manage cart, wishlist, compare list
- Place orders and track order history
- Manage profile and addresses

### Owner
- Dashboard metrics
- Product and order management
- Coupon management
- Advanced analytics and forecasts

### Warehouse
- Warehouse dashboard
- Purchase order handling
- Stock movement tracking and low-stock awareness

### Admin
- User and supplier administration
- Audit log access
- Customer records view
- User query handling and dashboard summaries

## Architecture
### Backend API Pattern
- Django apps split by bounded domain (accounts, products, orders, warehouse, admin, analytics)
- REST endpoints under prefixed namespaces:
  - /api/auth/
  - /api/
  - /api/warehouse/
  - /api/analytics/
  - /api/admin/
- JWT auth for stateless API access
- Global pagination and filter/search/ordering support in DRF settings

### Frontend Pattern
- Role-aware route segmentation in React Router
- Protected route gates by user role
- Axios interceptors for:
  - attaching access token
  - automatic refresh-token flow on 401
  - session cleanup on auth failure

## Backend Setup (Local)
### Prerequisites
- Python 3.11+
- pip
- Virtual environment tool (venv recommended)
- Database:
  - Option A: PostgreSQL (recommended)
  - Option B: SQL Server Express (default local fallback in settings)

### Steps
1. Open terminal at backend directory:
   - cd backend
2. Create and activate virtual environment:
   - python -m venv .venv
   - Windows PowerShell: .\\.venv\\Scripts\\Activate.ps1
3. Install dependencies:
   - pip install -r requirements.txt
4. Configure environment variables (see Environment Variables section)
5. Apply migrations:
   - python manage.py migrate
6. Optional seed data:
   - python manage.py seed_products
   - python manage.py seed_all_data
7. Run server:
   - python manage.py runserver 8000

Backend health endpoints:
- GET /
- GET /ping/

## Frontend Setup (Local)
### Prerequisites
- Node.js 18+ (recommended)
- npm

### Steps
1. Open terminal at frontend directory:
   - cd frontend
2. Install dependencies:
   - npm install
3. Configure environment variables:
   - Create frontend/.env
   - Add VITE_API_BASE_URL (example below)
4. Start development server:
   - npm run dev
5. Build for production:
   - npm run build
6. Preview production build locally:
   - npm run preview

## Environment Variables

### Backend (.env or platform env vars)
- SECRET_KEY
- DEBUG (True/False)
- ALLOWED_HOSTS (comma-separated)
- DATABASE_URL (required for cloud Postgres)
- DIRECT_URL (optional direct DB URL for migration when pooling is used)
- CORS_ORIGINS (comma-separated frontend origins)

Example:
SECRET_KEY=replace_with_secure_key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://user:password@host:5432/dbname
DIRECT_URL=postgresql://user:password@host:5432/dbname
CORS_ORIGINS=http://localhost:5173

### Frontend (.env)
- VITE_API_BASE_URL

Example:
VITE_API_BASE_URL=http://localhost:8000/api

Important:
- In production, VITE_API_BASE_URL must point to your deployed backend API (for example https://your-backend.onrender.com/api).
- If missing, frontend falls back to localhost and deployed API calls will fail.

## API Overview

### Auth and Profile
- /api/auth/login/
- /api/auth/register/
- /api/auth/refresh/
- /api/auth/logout/
- /api/auth/profile/
- /api/auth/change-password/
- /api/auth/addresses/

### Catalog and Reviews
- /api/categories/
- /api/suppliers/
- /api/products/
- /api/reviews/
- /api/brands/
- /api/products/bulk-import/

### Orders and Commerce
- /api/orders/
- /api/order-statuses/
- /api/cart/
- /api/wishlist/
- /api/compare/
- /api/payment-methods/
- /api/payments/
- /api/coupons/
- /api/notifications/
- /api/notifications/send-low-stock/

### Warehouse
- /api/warehouse/purchase-orders/
- /api/warehouse/dashboard/
- /api/warehouse/stock-movements/

### Analytics
- /api/analytics/sales-overview/
- /api/analytics/revenue-trend/
- /api/analytics/top-products/
- /api/analytics/category-performance/
- /api/analytics/payment-methods/
- /api/analytics/order-status/
- /api/analytics/low-stock/
- /api/analytics/product-growth/{product_id}/
- /api/analytics/comprehensive-forecast/{product_id}/
- /api/analytics/segmentation/
- /api/analytics/forecast/{product_id}/
- /api/analytics/recommendations/{product_id}/
- /api/analytics/churn-prediction/
- /api/analytics/dynamic-pricing/{product_id}/

### Admin
- /api/admin/users/
- /api/admin/suppliers/
- /api/admin/logs/
- /api/admin/user-queries/
- /api/admin/user-queries/submit/
- /api/admin/dashboard/
- /api/admin/customers/
- /api/admin/customers/{id}/

## Database Notes
- Most domain models map to existing tables with managed = False, indicating an existing/legacy schema.
- Some newer modules (for example compare list, coupons, notifications) use managed models and migrations.
- Keep schema changes deliberate: validate migration impact against existing SQL tables.

## Seed and Utility Commands
Run from backend directory:
- python manage.py seed_users
- python manage.py seed_products
- python manage.py seed_all_data
- python manage.py update_image_urls
- python manage.py export_local_data

Deployment build script (backend/build.sh) also runs:
- pip install -r requirements.txt
- migrate
- collectstatic
- seed_products
- seed_all_data

## Deployment
### Backend on Render
Configured in render.yaml:
- Runtime: Python 3.11
- Build: ./build.sh
- Start: gunicorn page.wsgi:application --timeout 120 --workers 2 --keep-alive 5
- Environment variables provided through Render dashboard

### Frontend on Vercel
- vercel.json rewrites all routes to index.html for SPA routing
- Configure VITE_API_BASE_URL in Vercel project settings

## Troubleshooting
- CORS errors from browser:
  - verify CORS_ORIGINS includes your frontend URL exactly
- Frontend works locally but not in production:
  - check VITE_API_BASE_URL in hosting env vars
- Migration issues with pooled DB:
  - use DIRECT_URL for migrate command (already handled in build.sh)
- No data visible after startup:
  - run seed_products and seed_all_data
- Token refresh issues:
  - verify refresh token storage and refresh endpoint availability

## Security Checklist
- Set DEBUG=False in production
- Use a strong SECRET_KEY and keep it outside source control
- Restrict ALLOWED_HOSTS and CORS_ORIGINS to known domains
- Use HTTPS-only deployment URLs for frontend and backend
- Review bulk import and upload validation controls before launch
- Consider JWT blacklist/revocation strategy for stricter logout semantics

## License
This repository currently has no explicit license file. Add one if you plan to distribute or open-source the project.
