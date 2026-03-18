# ElectroNest - Setup Guide

Complete setup instructions to run the ElectroNest e-commerce project from scratch.

---

## Prerequisites

Install the following software before starting:

1. **Python 3.10+** - [python.org/downloads](https://www.python.org/downloads/)
   - During install, check "Add Python to PATH"
2. **Node.js 18+** - [nodejs.org](https://nodejs.org/)
   - Includes npm (package manager)
3. **SQL Server Express** - [Microsoft SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
   - Install with default instance name `SQLEXPRESS`
4. **ODBC Driver 17 for SQL Server** - [Microsoft ODBC Driver](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)
5. **SQL Server Management Studio (SSMS)** - [Download SSMS](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms) (optional, for managing the database)

---

## Step 1: Set Up the Database

### 1.1 Restore the Database

1. Open **SQL Server Management Studio (SSMS)**
2. Connect to your local SQL Server instance: `.\SQLEXPRESS`
3. Create a new database named **`ElectroNestDB`**:
   - Right-click **Databases** > **New Database** > Name: `ElectroNestDB` > OK

4. If you have the `.bak` backup file:
   - Right-click **Databases** > **Restore Database**
   - Select **Device** > Browse > Add the `.bak` file
   - Set destination database to `ElectroNestDB`
   - Click OK

5. If you have SQL script files (`.sql`):
   - Open each SQL file in SSMS
   - Make sure `ElectroNestDB` is selected
   - Execute the scripts in this order:
     1. Tables creation script (Categories, Suppliers, Products, Customers, etc.)
     2. Data insertion scripts

### 1.2 Verify Database Connection

The backend uses **Windows Authentication** (trusted connection). Make sure:
- SQL Server is running (check Windows Services for `SQL Server (SQLEXPRESS)`)
- Your Windows user has access to the database
- The instance name is `.\SQLEXPRESS` (default)

### 1.3 Database Configuration

The database settings are in `backend/page/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'mssql',
        'NAME': 'ElectroNestDB',
        'HOST': '.\\SQLEXPRESS',
        'PORT': '',
        'OPTIONS': {
            'driver': 'ODBC Driver 17 for SQL Server',
            'trusted_connection': 'yes',
        },
    }
}
```

If your SQL Server instance name is different, update the `HOST` value.

---

## Step 2: Set Up the Backend (Django)

### 2.1 Open Terminal in the Backend Folder

```bash
cd backend
```

### 2.2 Create a Virtual Environment

```bash
python -m venv venv
```

### 2.3 Activate the Virtual Environment

**Windows (Command Prompt):**
```bash
venv\Scripts\activate
```

**Windows (PowerShell):**
```powershell
venv\Scripts\Activate.ps1
```

**Windows (Git Bash):**
```bash
source venv/Scripts/activate
```

### 2.4 Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs: Django, Django REST Framework, django-cors-headers, mssql-django, pandas, scikit-learn, and other required packages.

### 2.5 Run Database Migrations

```bash
python manage.py migrate
```

> Note: Most tables already exist in the database (`managed = False`). This command creates Django's internal tables (auth, sessions, etc.) and the `accounts_customuser` and `Notifications` tables.

### 2.6 Create a Superuser (Admin Account)

```bash
python manage.py createsuperuser
```

Enter these details when prompted:
- **Email**: your email (e.g., `admin@electronest.com`)
- **First Name**: Admin
- **Last Name**: User
- **Role**: `admin`
- **Password**: your chosen password

### 2.7 Start the Backend Server

```bash
python manage.py runserver
```

The backend will run at: **http://localhost:8000**

You can verify it's working by visiting: `http://localhost:8000/api/products/`

---

## Step 3: Set Up the Frontend (React + Vite)

### 3.1 Open a New Terminal in the Frontend Folder

```bash
cd frontend
```

### 3.2 Install Node Dependencies

```bash
npm install
```

### 3.3 Start the Development Server

```bash
npm run dev
```

The frontend will run at: **http://localhost:5173**

---

## Step 4: Using the Application

### Login Credentials

After creating a superuser in Step 2.6, use those credentials to log in:

| Role      | Access Level                                    |
|-----------|------------------------------------------------|
| **Admin** | Full system access: users, suppliers, analytics, audit logs |
| **Owner** | Product management, order tracking, store analytics |
| **Warehouse** | Inventory, purchase orders, stock management |
| **Customer** | Browse products, cart, orders, reviews |

### Creating Additional Users

1. Log in as **Admin**
2. Go to **User Management**
3. Click **Add User** to create owner/warehouse accounts

### Customer Registration

Customers can register through the frontend login page by clicking **Register**.

---

## Database Tables

The project uses the following SQL Server tables:

| Table | Description |
|-------|-------------|
| `Categories` | Product categories |
| `Suppliers` | Product suppliers |
| `Products` | Product catalog (name, price, stock, etc.) |
| `Customers` | Legacy customer records (1,611 pre-existing) |
| `Orders` | Customer orders |
| `OrderDetails` | Individual items in each order |
| `OrderStatus` | Order status types (Pending, Processing, Shipped, etc.) |
| `Reviews` | Product reviews and ratings |
| `Cart` | Shopping cart items |
| `Wishlist` | Customer wishlists |
| `PaymentMethods` | Payment method types |
| `Payments` | Payment records |
| `Customer_Address` | Customer delivery addresses |
| `PurchaseOrders` | Warehouse purchase orders |
| `PurchaseOrderDetails` | Purchase order line items |
| `accounts_customuser` | System users (admin, owner, warehouse) - Django managed |
| `AuditLog` | System activity audit trail - Django managed |
| `Notifications` | User notifications - Django managed |

---

## Project Structure

```
ElectroNest/
├── backend/                    # Django REST Framework API
│   ├── accounts/              # Authentication & user management
│   ├── admin_panel/           # Admin dashboard, audit logs, user/supplier CRUD
│   ├── analytics/             # Sales analytics, ML features (RFM, forecasting)
│   ├── orders/                # Orders, cart, wishlist, payments, notifications
│   ├── products/              # Products, categories, suppliers, reviews
│   ├── warehouse/             # Purchase orders, stock management
│   ├── page/                  # Django settings & URL configuration
│   ├── manage.py              # Django management script
│   └── requirements.txt       # Python dependencies
│
├── frontend/                   # React + Vite SPA
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/         # Admin components
│   │   │   ├── Common/        # Shared components (Navbar, Footer)
│   │   │   ├── Owner/         # Owner dashboard components
│   │   │   └── warehouse/     # Warehouse components
│   │   ├── pages/             # Page-level components
│   │   │   ├── Admin/         # Admin pages (Dashboard, Users, Suppliers, Logs, Analytics)
│   │   │   ├── Customer/      # Customer pages (Products, Cart, Orders, Profile)
│   │   │   ├── Owner/         # Owner pages (Dashboard, Products, Orders, Analytics)
│   │   │   └── Warehouse/     # Warehouse pages (Dashboard, Inventory, Alerts)
│   │   ├── services/          # API service layer (axios)
│   │   ├── Config/            # App configuration
│   │   └── App.jsx            # Main app with routing
│   └── package.json           # Node dependencies
│
└── database.md                # This file
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, Plotly.js, Lucide Icons, Axios |
| **Backend** | Django 5.2, Django REST Framework, SimpleJWT |
| **Database** | Microsoft SQL Server Express |
| **ML/Analytics** | Pandas, Scikit-learn (RFM Segmentation, Demand Forecasting) |

---

## Troubleshooting

### "ODBC Driver 17 for SQL Server not found"
- Download and install the ODBC driver from Microsoft's website
- Restart your terminal after installation

### "Cannot connect to SQL Server"
- Make sure SQL Server Express is running (Windows Services > SQL Server (SQLEXPRESS))
- Check the instance name matches `.\SQLEXPRESS` in `backend/page/settings.py`
- Enable TCP/IP in SQL Server Configuration Manager

### "Module not found" errors (Python)
- Make sure you activated the virtual environment
- Run `pip install -r requirements.txt` again

### "npm install" fails
- Make sure Node.js 18+ is installed: `node --version`
- Delete `node_modules` folder and `package-lock.json`, then run `npm install` again

### Frontend shows "Network Error"
- Make sure the backend server is running on `http://localhost:8000`
- Check CORS settings in `backend/page/settings.py`

### "Login failed"
- Create a superuser first: `python manage.py createsuperuser`
- For customer login, use credentials from the Customers table in the database

---

## Running Both Servers

You need **two terminals** running simultaneously:

**Terminal 1 (Backend):**
```bash
cd backend
venv\Scripts\activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.
