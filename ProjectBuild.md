# ElectroNest - Complete Setup Guide (Step-by-Step for Beginners)

This guide will walk you through **every single step** to set up and run the ElectroNest project on your computer. No prior coding experience is required. Just follow each step carefully.

---

## STEP 1: Download and Unzip the Project

### 1.1 If you received a ZIP file:

1. Find the ZIP file (e.g., `ElectroNest.zip` or `Debug.zip`) in your **Downloads** folder
2. **Right-click** on the ZIP file
3. Click **"Extract All..."**
4. Choose a location (recommended: **Desktop**)
5. Click **"Extract"**
6. You should now see a folder called `Debug` (or similar) on your Desktop
7. Open the folder — you should see two sub-folders inside:
   - `backend` (this is the server/API code)
   - `frontend` (this is the website/UI code)

### 1.2 If you received a folder:

1. Simply copy the entire folder to your **Desktop**
2. Make sure the folder contains `backend` and `frontend` sub-folders

---

## STEP 2: Install Required Software

You need to install **4 programs** before running the project. Install them one by one.

### 2.1 Install Python (version 3.10 or higher)

1. Open your web browser
2. Go to: **https://www.python.org/downloads/**
3. Click the big yellow button that says **"Download Python 3.x.x"**
4. Run the downloaded installer
5. **VERY IMPORTANT:** On the first screen of the installer, check the box that says:
   > ✅ **"Add Python to PATH"**
6. Click **"Install Now"**
7. Wait for installation to finish, then click **"Close"**

**To verify:** Open Command Prompt (search "cmd" in Start menu) and type:
```
python --version
```
You should see something like `Python 3.12.x`

### 2.2 Install Node.js (version 18 or higher)

1. Go to: **https://nodejs.org/**
2. Click the **LTS** (Long Term Support) download button
3. Run the downloaded installer
4. Click **"Next"** through all the screens (keep default settings)
5. Click **"Install"**, then **"Finish"**

**To verify:** Open a **new** Command Prompt and type:
```
node --version
```
You should see something like `v20.x.x` or `v22.x.x`

### 2.3 Install SQL Server Express

1. Go to: **https://www.microsoft.com/en-us/sql-server/sql-server-downloads**
2. Scroll down to **"Express"** edition (it's FREE)
3. Click **"Download now"**
4. Run the installer
5. Choose **"Basic"** installation type
6. Accept the license terms
7. Click **"Install"**
8. Wait for installation to complete
9. **IMPORTANT:** Note down the instance name — it should be **`.\SQLEXPRESS`** (this is the default)
10. Click **"Close"**

### 2.4 Install SQL Server Management Studio (SSMS)

1. Go to: **https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms**
2. Click **"Download SQL Server Management Studio (SSMS)"**
3. Run the downloaded installer
4. Click **"Install"**
5. Wait for it to finish (this may take a few minutes)
6. **Restart your computer** after installation

### 2.5 Install ODBC Driver 17 for SQL Server

1. Go to: **https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server**
2. Download **"ODBC Driver 17 for SQL Server"** for Windows
3. Run the installer and follow the prompts
4. Click **"Finish"**

---

## STEP 3: Set Up the Database

### 3.1 Open SQL Server Management Studio (SSMS)

1. Search for **"SQL Server Management Studio"** in the Start menu
2. Click to open it
3. A connection dialog will appear:
   - **Server type:** Database Engine
   - **Server name:** Type `.\SQLEXPRESS`
   - **Authentication:** Windows Authentication (this is the default)
4. Click **"Connect"**

### 3.2 Create the Database

1. In the left panel (called "Object Explorer"), you'll see your server name
2. **Right-click** on **"Databases"**
3. Click **"New Database..."**
4. In the **"Database name"** field, type: **`ElectroNestDB`**
5. Click **"OK"**
6. You should now see **ElectroNestDB** listed under Databases

### 3.3 Create the Tables

You need to create all the database tables. Open a **New Query** window:

1. Click on **ElectroNestDB** in the left panel to select it
2. Click **"New Query"** button at the top (or press Ctrl+N)
3. Make sure the dropdown at the top shows **ElectroNestDB** (not "master")
4. Copy and paste the following SQL code into the query window:

```sql
-- =============================================
-- CREATE ALL TABLES FOR ELECTRONEST
-- =============================================

-- 1. Categories Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Categories')
CREATE TABLE Categories (
    CategoryID INT IDENTITY(1,1) PRIMARY KEY,
    CategoryName NVARCHAR(100) NOT NULL
);

-- 2. Suppliers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Suppliers')
CREATE TABLE Suppliers (
    SupplierID INT IDENTITY(1,1) PRIMARY KEY,
    SupplierName NVARCHAR(200) NOT NULL,
    ContactPersonName NVARCHAR(200),
    ContactEmail NVARCHAR(200),
    Phone NVARCHAR(50),
    City NVARCHAR(100),
    Country NVARCHAR(100),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 3. Products Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Products')
CREATE TABLE Products (
    ProductID INT IDENTITY(1,1) PRIMARY KEY,
    SKU NVARCHAR(100) UNIQUE NOT NULL,
    ProductName NVARCHAR(300) NOT NULL,
    CategoryID INT FOREIGN KEY REFERENCES Categories(CategoryID),
    Brand NVARCHAR(200),
    OwnerName NVARCHAR(200),
    SupplierID INT FOREIGN KEY REFERENCES Suppliers(SupplierID),
    SellingPrice DECIMAL(10,2) NOT NULL,
    CostPrice DECIMAL(10,2) NOT NULL,
    Stock INT DEFAULT 0,
    ReorderLevel INT DEFAULT 10,
    ProductDescription NVARCHAR(MAX),
    ProductImageURL NVARCHAR(500),
    Specifications NVARCHAR(MAX),
    UnitsSold INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- 4. Customers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
CREATE TABLE Customers (
    CustomerID INT IDENTITY(1,1) PRIMARY KEY,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Email NVARCHAR(200) UNIQUE NOT NULL,
    Phone NVARCHAR(50),
    Gender NVARCHAR(20),
    DateOfBirth DATE,
    RegistrationDate DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1,
    Password NVARCHAR(300)
);

-- 5. Order Status Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderStatus')
CREATE TABLE OrderStatus (
    OrderStatusID INT IDENTITY(1,1) PRIMARY KEY,
    StatusName NVARCHAR(50) UNIQUE NOT NULL
);

-- Insert default order statuses
IF NOT EXISTS (SELECT * FROM OrderStatus)
BEGIN
    INSERT INTO OrderStatus (StatusName) VALUES ('Pending');
    INSERT INTO OrderStatus (StatusName) VALUES ('Processing');
    INSERT INTO OrderStatus (StatusName) VALUES ('Shipped');
    INSERT INTO OrderStatus (StatusName) VALUES ('Delivered');
    INSERT INTO OrderStatus (StatusName) VALUES ('Cancelled');
END

-- 6. Customer Address Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customer_Address')
CREATE TABLE Customer_Address (
    AddressID INT IDENTITY(1,1) PRIMARY KEY,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    Street NVARCHAR(300),
    City NVARCHAR(100),
    Province NVARCHAR(100),
    PostalCode NVARCHAR(20),
    Country NVARCHAR(100) DEFAULT 'Nepal',
    AddressType NVARCHAR(20) DEFAULT 'Shipping'
);

-- 7. Orders Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Orders')
CREATE TABLE Orders (
    OrderID INT IDENTITY(1,1) PRIMARY KEY,
    OrderNumber NVARCHAR(100) UNIQUE NOT NULL,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    OrderStatusID INT FOREIGN KEY REFERENCES OrderStatus(OrderStatusID),
    OrderDate DATETIME DEFAULT GETDATE(),
    TotalAmount DECIMAL(12,2) NOT NULL,
    AddressID INT FOREIGN KEY REFERENCES Customer_Address(AddressID),
    EstimatedDeliveryDate DATE,
    TrackingNumber NVARCHAR(100),
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE()
);

-- 8. Order Details Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'OrderDetails')
CREATE TABLE OrderDetails (
    OrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT FOREIGN KEY REFERENCES Orders(OrderID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL
);

-- 9. Reviews Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reviews')
CREATE TABLE Reviews (
    ReviewID INT IDENTITY(1,1) PRIMARY KEY,
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    Rating DECIMAL(2,1) NOT NULL CHECK (Rating >= 1 AND Rating <= 5),
    Comment NVARCHAR(MAX),
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 10. Cart Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Cart')
CREATE TABLE Cart (
    CartID INT IDENTITY(1,1) PRIMARY KEY,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    OrderCount INT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 11. Wishlist Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Whishlist')
CREATE TABLE Whishlist (
    WishlistID INT IDENTITY(1,1) PRIMARY KEY,
    CustomerID INT FOREIGN KEY REFERENCES Customers(CustomerID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    AddedAt DATETIME DEFAULT GETDATE()
);

-- 12. Payment Methods Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PaymentMethods')
CREATE TABLE PaymentMethods (
    MethodID INT IDENTITY(1,1) PRIMARY KEY,
    MethodName NVARCHAR(100) UNIQUE NOT NULL
);

-- Insert default payment methods
-- IMPORTANT: The frontend Checkout.jsx has a hardcoded payment method ID map:
--   Cash on Delivery = 1, Credit Card = 2, Debit Card = 3, eSewa = 4, Khalti = 5, Bank Transfer = 6
-- The INSERT order MUST match this numbering exactly (IDENTITY starts at 1).
IF NOT EXISTS (SELECT * FROM PaymentMethods)
BEGIN
    INSERT INTO PaymentMethods (MethodName) VALUES ('Cash on Delivery');  -- ID 1
    INSERT INTO PaymentMethods (MethodName) VALUES ('Credit Card');        -- ID 2
    INSERT INTO PaymentMethods (MethodName) VALUES ('Debit Card');         -- ID 3
    INSERT INTO PaymentMethods (MethodName) VALUES ('eSewa');              -- ID 4
    INSERT INTO PaymentMethods (MethodName) VALUES ('Khalti');             -- ID 5
    INSERT INTO PaymentMethods (MethodName) VALUES ('Bank Transfer');      -- ID 6
END

-- 13. Payments Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Payments')
CREATE TABLE Payments (
    PaymentID INT IDENTITY(1,1) PRIMARY KEY,
    OrderID INT FOREIGN KEY REFERENCES Orders(OrderID),
    MethodID INT FOREIGN KEY REFERENCES PaymentMethods(MethodID),
    DiscountPercent DECIMAL(5,2) DEFAULT 0,
    PayableAmount DECIMAL(12,2) NOT NULL,
    PaidAt DATETIME DEFAULT GETDATE()
);

-- 14. Purchase Orders Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseOrders')
CREATE TABLE PurchaseOrders (
    PurchaseOrderID INT IDENTITY(1,1) PRIMARY KEY,
    SupplierID INT FOREIGN KEY REFERENCES Suppliers(SupplierID),
    OrderDate DATETIME DEFAULT GETDATE(),
    TotalAmount DECIMAL(12,2),
    ExpectedDeliveryDate DATE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    OrderStatusID INT FOREIGN KEY REFERENCES OrderStatus(OrderStatusID)
);

-- 15. Purchase Order Details Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PurchaseOrderDetails')
CREATE TABLE PurchaseOrderDetails (
    PurchaseOrderDetailID INT IDENTITY(1,1) PRIMARY KEY,
    PurchaseOrderID INT FOREIGN KEY REFERENCES PurchaseOrders(PurchaseOrderID),
    ProductID INT FOREIGN KEY REFERENCES Products(ProductID),
    Quantity INT NOT NULL,
    UnitCost DECIMAL(10,2) NOT NULL
);

-- NOTE: The following tables are created AUTOMATICALLY by Django migrations (Step 4.5).
-- You do NOT need to create them manually:
--   - accounts_customuser (system staff users)
--   - CompareList (product comparison per customer)
--   - Coupons (discount coupons — managed=True in Django)
--   - CouponUsage (per-customer coupon usage tracking — managed=True in Django)
--   - Notifications (in-app notifications)
--   - AuditLog (system activity audit trail)
--   - Django internal tables (auth_*, django_sessions, etc.)
```

5. Click the **"Execute"** button (or press **F5**)
6. You should see **"Commands completed successfully."** at the bottom

### 3.4 Insert CSV Data into the Database

If you have CSV files with data (e.g., `Customers.csv`, `Products.csv`), here's how to import them:

#### Method 1: Using SSMS Import Wizard (Easiest - No coding needed)

1. In SSMS, **right-click** on **ElectroNestDB**
2. Go to **Tasks** > **Import Data...**
3. The "SQL Server Import and Export Wizard" will open
4. Click **"Next"**
5. **Data Source:** Choose **"Flat File Source"**
6. Click **"Browse"** and find your CSV file
7. Make sure **"Column names in the first data row"** is checked
8. Click **"Next"**
9. **Destination:** Should already show **SQL Server Native Client** and your database
10. Click **"Next"**
11. **Select Source Tables:** Map the CSV columns to the correct table
    - Click **"Edit Mappings"** to verify column names match
12. Click **"Next"**, then **"Finish"**
13. Wait for the import to complete
14. **Repeat** this process for each CSV file

#### Method 2: Using SQL INSERT Statements

If you have data in a specific format, you can insert it directly. Here's an example:

```sql
-- Example: Insert Categories
INSERT INTO Categories (CategoryName) VALUES ('Laptops');
INSERT INTO Categories (CategoryName) VALUES ('Smartphones');
INSERT INTO Categories (CategoryName) VALUES ('Tablets');
INSERT INTO Categories (CategoryName) VALUES ('Accessories');
INSERT INTO Categories (CategoryName) VALUES ('Audio');
INSERT INTO Categories (CategoryName) VALUES ('Cameras');
INSERT INTO Categories (CategoryName) VALUES ('Gaming');
INSERT INTO Categories (CategoryName) VALUES ('Networking');
INSERT INTO Categories (CategoryName) VALUES ('Storage');
INSERT INTO Categories (CategoryName) VALUES ('Wearables');

-- Example: Insert a Supplier
INSERT INTO Suppliers (SupplierName, ContactPersonName, ContactEmail, Phone, City, Country)
VALUES ('TechSupply Nepal', 'Ram Sharma', 'ram@techsupply.com', '9801234567', 'Kathmandu', 'Nepal');

-- Example: Insert a Product
INSERT INTO Products (SKU, ProductName, CategoryID, Brand, OwnerName, SupplierID, SellingPrice, CostPrice, Stock, ReorderLevel, ProductDescription)
VALUES ('LAP-001', 'Dell Inspiron 15', 1, 'Dell', 'TechStore', 1, 75000.00, 60000.00, 50, 10, 'Dell Inspiron 15 inch laptop with i5 processor');
```

#### Import Order (IMPORTANT - Follow this order):
1. **Categories** (no dependencies)
2. **Suppliers** (no dependencies)
3. **Products** (depends on Categories and Suppliers)
4. **Customers** (no dependencies)
5. **OrderStatus** (already inserted above)
6. **Customer_Address** (depends on Customers)
7. **Orders** (depends on Customers, OrderStatus, Customer_Address)
8. **OrderDetails** (depends on Orders and Products)
9. **Reviews** (depends on Products and Customers)
10. **PaymentMethods** (already inserted above)
11. **Payments** (depends on Orders and PaymentMethods)
12. **Cart** (depends on Customers and Products)
13. **Wishlist** (depends on Customers and Products)

### 3.5 Verify Your Data

After importing, run these queries to check your data:

```sql
-- Check how many records are in each table
SELECT 'Categories' AS TableName, COUNT(*) AS RecordCount FROM Categories
UNION ALL SELECT 'Suppliers', COUNT(*) FROM Suppliers
UNION ALL SELECT 'Products', COUNT(*) FROM Products
UNION ALL SELECT 'Customers', COUNT(*) FROM Customers
UNION ALL SELECT 'Orders', COUNT(*) FROM Orders
UNION ALL SELECT 'OrderDetails', COUNT(*) FROM OrderDetails
UNION ALL SELECT 'Reviews', COUNT(*) FROM Reviews
UNION ALL SELECT 'OrderStatus', COUNT(*) FROM OrderStatus
UNION ALL SELECT 'PaymentMethods', COUNT(*) FROM PaymentMethods
UNION ALL SELECT 'CompareList', COUNT(*) FROM CompareList;

-- Django-managed tables (created after running migrations in Step 4.5):
-- SELECT COUNT(*) FROM Coupons;
-- SELECT COUNT(*) FROM CouponUsage;
-- SELECT COUNT(*) FROM Notifications;
-- SELECT COUNT(*) FROM AuditLog;
```

---

## STEP 4: Set Up the Backend (Django Server)

### 4.1 Open Command Prompt

1. Press **Windows key + R**
2. Type **cmd** and press Enter
3. Navigate to the project's backend folder:

```
cd C:\Users\YourUsername\Desktop\Debug\backend
```

Replace `YourUsername` with your actual Windows username. For example:
```
cd C:\Users\Sushant\Desktop\Debug\backend
```

**TIP:** You can also open the `backend` folder in File Explorer, click on the address bar, type `cmd`, and press Enter. This opens Command Prompt directly in that folder.

### 4.2 Create a Virtual Environment

A virtual environment keeps all project packages separate from your system Python. Type:

```
python -m venv myenv
```

Wait a few seconds. A new folder called `myenv` will appear inside the `backend` folder.

### 4.3 Activate the Virtual Environment

**For Command Prompt (cmd):**
```
myenv\Scripts\activate
```

**For PowerShell:**
```
myenv\Scripts\Activate.ps1
```

**For Git Bash:**
```
source myenv/Scripts/activate
```

After activation, you should see `(myenv)` at the beginning of your command line. Like this:
```
(myenv) C:\Users\Sushant\Desktop\Debug\backend>
```

**If you get an error in PowerShell** about "execution policy", run this first:
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Then try activating again.

### 4.4 Install Python Packages

With the virtual environment activated, run:

```
pip install -r requirements.txt
```

This will download and install all required Python packages. It may take 2-5 minutes. You'll see lots of text scrolling — that's normal!

**If you see any errors**, try:
```
pip install --upgrade pip
pip install -r requirements.txt
```

#### Optional: Install Facebook Prophet (for advanced forecasting)

The analytics module uses Facebook **Prophet** for time-series forecasting. It is **optional** — the system automatically falls back to a built-in trend-based forecast if Prophet is not installed. If you want the full Prophet-powered forecasts:

```
pip install prophet
```

> **Note:** Prophet can take several minutes to install and requires a C++ compiler. On Windows, you may need to install **Visual Studio Build Tools** first. If it fails, don't worry — the app will still work perfectly using the built-in fallback forecast.

### 4.5 Run Database Migrations

This creates Django's internal tables (for login sessions, admin, etc.) and the following app-specific tables:
- **accounts_customuser** — System staff users (admin, owner, warehouse)
- **CompareList** — Product comparison list (per customer)
- **Coupons** — Discount coupons created by store owners
- **CouponUsage** — Tracks per-customer coupon usage for limit enforcement
- **Notifications** — In-app notifications
- **AuditLog** — System activity audit trail

```
python manage.py migrate
```

You should see output like:
```
Operations to perform:
  Apply all migrations: accounts, admin, auth, contenttypes, orders, sessions, ...
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying auth.0001_initial... OK
  Applying orders.0004_comparelist... OK
  ...
```

### 4.6 Create an Admin Account (Superuser)

Run this command:

```
python manage.py createsuperuser
```

It will ask you for:
- **Email:** Type an email (e.g., `admin@electronest.com`) and press Enter
- **First Name:** Type `Admin` and press Enter
- **Last Name:** Type `User` and press Enter
- **Role:** Type `admin` and press Enter
- **Password:** Type a password (e.g., `Admin@123`) and press Enter
  - Note: The password won't show as you type — that's normal for security!
- **Password (again):** Type the same password again and press Enter

**IMPORTANT:** Remember these credentials! You'll use them to log in.

### 4.7 Start the Backend Server

```
python manage.py runserver
```

You should see:
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CTRL-BREAK.
```

**DO NOT CLOSE THIS WINDOW!** The server must keep running. Minimize this window.

> **TIP — Network Access:** If you want to access the site from another device on the same Wi-Fi (e.g., a phone), run `python manage.py runserver 0.0.0.0:8000` instead, and open `http://<your-PC-IP>:8000` on the other device. Update `CORS_ALLOWED_ORIGINS` in `backend/page/settings.py` and the frontend `Config.js` API URL accordingly.

To verify it's working, open your browser and go to: **http://localhost:8000/api/products/**

You should see a page from Django REST Framework (it may show an empty list or product data).

---

## STEP 5: Set Up the Frontend (React Website)

### 5.1 Open a NEW Command Prompt

**IMPORTANT:** Do NOT close the backend terminal! Open a **new** Command Prompt window.

1. Press **Windows key + R**
2. Type **cmd** and press Enter

### 5.2 Navigate to the Frontend Folder

```
cd C:\Users\Sushant\Desktop\Debug\frontend
```

(Replace the path with your actual project location)

### 5.3 Install Node Packages

```
npm install
```

This downloads all the frontend libraries. It may take 2-5 minutes and you'll see a progress bar. Warnings are normal — errors are not.

**If you get errors**, try:
```
npm cache clean --force
npm install
```

### 5.4 Start the Frontend Server

```
npm run dev
```

You should see something like:
```
  VITE v7.3.1  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**DO NOT CLOSE THIS WINDOW EITHER!**

---

## STEP 6: Open and Use the Application

### 6.1 Open the Website

1. Open your web browser (Chrome, Edge, or Firefox)
2. Go to: **http://localhost:5173**
3. You should see the ElectroNest homepage with products

### 6.2 Login as Admin

1. Click the **Login** button on the top right
2. Enter the email and password you created in Step 4.6
3. You'll be taken to the **Admin Dashboard**

### 6.3 Create Other User Accounts

Once logged in as Admin:

**To create an Owner account:**
1. Go to **User Management**
2. Click **"Add User"**
3. Fill in: Email, First Name, Last Name, Role = `owner`, Password
4. Click **Save**

**To create a Warehouse account:**
1. Same process, but set Role = `warehouse`

**To register as a Customer:**
1. Logout from admin
2. On the login page, click **"Register"**
3. Fill in customer details
4. Click **Register**

### 6.4 Login Credentials Reference

| Role | How to Create | What They Can Do |
|------|--------------|-----------------|
| **Admin** | `python manage.py createsuperuser` (role: admin) | Manage everything: users, suppliers, analytics, logs |
| **Owner** | Admin creates from User Management (role: owner) | Manage their own products, view their orders and analytics |
| **Warehouse** | Admin creates from User Management (role: warehouse) | Manage inventory, create purchase orders, track stock |
| **Customer** | Self-register from the login page | Browse products, add to cart, place orders, write reviews |

---

## STEP 7: Adding Products and Data

### 7.1 Add Categories (if not already added)

You can add categories through the API or directly in SSMS:

**Through SSMS:**
```sql
USE ElectroNestDB;
INSERT INTO Categories (CategoryName) VALUES ('Laptops');
INSERT INTO Categories (CategoryName) VALUES ('Smartphones');
INSERT INTO Categories (CategoryName) VALUES ('Tablets');
INSERT INTO Categories (CategoryName) VALUES ('Accessories');
INSERT INTO Categories (CategoryName) VALUES ('Audio');
```

### 7.2 Add Suppliers

**Through SSMS:**
```sql
INSERT INTO Suppliers (SupplierName, ContactPersonName, ContactEmail, Phone, City, Country)
VALUES ('Nepal Electronics', 'Hari Prasad', 'hari@nepalelectronics.com', '9801234567', 'Kathmandu', 'Nepal');
```

**Or through the Admin panel** in the web application.

### 7.3 Add Products

Login as **Owner** and use the **Product Management** page to add products through the web interface. Fill in:
- Product Name
- SKU (unique code like `LAP-001`)
- Category (select from dropdown)
- Brand
- Selling Price and Cost Price
- Stock quantity
- Description
- Image URL

---

## STEP 8: Stopping and Restarting the Project

### 8.1 To Stop the Servers

- In the **backend** terminal: Press **Ctrl + C**
- In the **frontend** terminal: Press **Ctrl + C**

### 8.2 To Restart Next Time

You need to do this every time you want to run the project:

**Terminal 1 (Backend):**
```
cd C:\Users\Sushant\Desktop\Debug\backend
myenv\Scripts\activate
python manage.py runserver
```

**Terminal 2 (Frontend):**
```
cd C:\Users\Sushant\Desktop\Debug\frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

**NOTE:** You do NOT need to run `pip install`, `npm install`, or `migrate` again unless you've made changes to the packages or models.

---

## Troubleshooting Guide

### Problem: "python is not recognized as a command"
**Solution:** Python was not added to PATH during installation.
1. Uninstall Python from Settings > Apps
2. Re-install Python and make sure to check **"Add Python to PATH"**
3. Restart your computer

### Problem: "npm is not recognized as a command"
**Solution:** Node.js was not installed properly.
1. Re-install Node.js from https://nodejs.org/
2. Restart your computer

### Problem: "ODBC Driver 17 for SQL Server not found"
**Solution:** Install the ODBC driver from Microsoft's website (see Step 2.5).
After installing, close and reopen Command Prompt.

### Problem: "Cannot connect to SQL Server" or "Login failed"
**Solution:**
1. Open **Windows Services** (search "services" in Start menu)
2. Find **"SQL Server (SQLEXPRESS)"**
3. Make sure its Status is **"Running"**
4. If it's stopped, right-click > **Start**
5. If the instance name is different from `.\SQLEXPRESS`, update it in `backend/page/settings.py`

### Problem: "No module named 'django'" or similar
**Solution:** Your virtual environment is not activated.
```
cd backend
myenv\Scripts\activate
pip install -r requirements.txt
```

### Problem: Frontend shows "Network Error" or blank page
**Solution:**
1. Make sure the backend server is running (Step 4.7)
2. Check that it's running on `http://localhost:8000`
3. Check the frontend Config file at `frontend/src/Config/Config.js` — the API URL should be `http://localhost:8000/api`

### Problem: "npm install" fails with errors
**Solution:**
1. Delete the `node_modules` folder inside `frontend/`
2. Delete the `package-lock.json` file inside `frontend/`
3. Run `npm install` again

### Problem: "Migration errors" or "Table already exists"
**Solution:** This is normal! Most tables are pre-existing in SQL Server. Run:
```
python manage.py migrate --fake
```
This tells Django the migrations are already applied.

### Problem: "Port 8000 is already in use"
**Solution:** Another process is using port 8000. Either:
- Close other programs using that port, OR
- Run on a different port: `python manage.py runserver 8001`
  (Then update the API URL in the frontend Config)

### Problem: PowerShell says "execution of scripts is disabled"
**Solution:** Run this in PowerShell:
```
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Problem: "CORS error" in browser console
**Solution:** Make sure the frontend URL is listed in `backend/page/settings.py` under `CORS_ALLOWED_ORIGINS`. The default allows:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`

---

## Quick Reference Card

| What | Command | Where |
|------|---------|-------|
| Navigate to backend | `cd backend` | Any terminal |
| Activate virtual env | `myenv\Scripts\activate` | Backend terminal |
| Install Python packages | `pip install -r requirements.txt` | Backend terminal (env activated) |
| Run migrations | `python manage.py migrate` | Backend terminal (env activated) |
| Create admin user | `python manage.py createsuperuser` | Backend terminal (env activated) |
| Start backend server | `python manage.py runserver` | Backend terminal (env activated) |
| Navigate to frontend | `cd frontend` | New terminal |
| Install Node packages | `npm install` | Frontend terminal |
| Start frontend server | `npm run dev` | Frontend terminal |
| Open the website | `http://localhost:5173` | Web browser |
| Open API browser | `http://localhost:8000/api/products/` | Web browser |
| Stop any server | `Ctrl + C` | The server's terminal |

---

## Summary Checklist

Use this checklist to make sure you've done everything:

- [ ] Unzipped/copied the project folder
- [ ] Installed Python 3.10+ (with PATH checked)
- [ ] Installed Node.js 18+
- [ ] Installed SQL Server Express
- [ ] Installed SSMS (SQL Server Management Studio)
- [ ] Installed ODBC Driver 17
- [ ] Created `ElectroNestDB` database in SSMS
- [ ] Ran the table creation SQL script
- [ ] Imported CSV data (if available)
- [ ] Created virtual environment (`python -m venv myenv`)
- [ ] Activated virtual environment
- [ ] Installed Python packages (`pip install -r requirements.txt`)
- [ ] Ran migrations (`python manage.py migrate`)
- [ ] Created superuser (`python manage.py createsuperuser`)
- [ ] Started backend server (`python manage.py runserver`)
- [ ] Installed frontend packages (`npm install`)
- [ ] Started frontend server (`npm run dev`)
- [ ] Opened `http://localhost:5173` in browser
- [ ] Logged in with admin credentials
- [ ] Created owner and warehouse accounts
- [ ] Project is running successfully!

---

## STEP 9: Complete Project Context Reference (All Tables + All Files)

This section is the **full map** of the project so every database table and every backend/frontend context is documented in one place.

### 9.1 Complete Database Table Registry

#### A) Business tables in `ElectroNestDB` (main domain)

1. **Categories** — Product category master list.
2. **Suppliers** — Supplier/company records.
3. **Products** — Product catalog (price, stock, owner, specs, units sold).
4. **Customers** — Customer profile and login data.
5. **Customer_Address** — Billing/shipping addresses per customer.
6. **OrderStatus** — Order lifecycle states (Pending, Processing, etc.).
7. **Orders** — Customer order header.
8. **OrderDetails** — Product line items inside each order.
9. **Reviews** — Product reviews and ratings by customers.
10. **Cart** — Customer cart items.
11. **Whishlist** — Customer wishlist items (table name keeps existing spelling).
12. **PaymentMethods** — Payment method master list: Cash on Delivery (1), Credit Card (2), Debit Card (3), eSewa (4), Khalti (5), Bank Transfer (6). **ID order is critical** — the frontend Checkout.jsx uses a hardcoded map `{ cod: 1, esewa: 4, khalti: 5, bank: 6 }` so records must be inserted in this exact order.
13. **Payments** — Payment records per order.
14. **PurchaseOrders** — Warehouse procurement orders to suppliers. **Auto-generated** when a customer purchase drops a product's stock to or below its `ReorderLevel`. Reorder quantity = `max(1, reorder_level * 2 - current_stock)`, grouping by supplier. Products with no supplier are skipped; products already in a Pending PO are deduplicated. Can also be created manually by the warehouse team.
15. **PurchaseOrderDetails** — Line items for purchase orders.

#### B) Django-managed business/support tables (created by migrations)

16. **accounts_customuser** — Staff users (admin/owner/warehouse).
17. **CompareList** — Product comparison items by customer.
18. **Coupons** — Discount coupon definitions.
19. **CouponUsage** — Per-customer coupon usage tracking.
20. **Notifications** — In-app alerts and messages.
21. **AuditLog** — Admin/system audit trail.

#### C) Django internal framework tables

22. **django_migrations** — Migration history.
23. **django_content_type** — Content type registry.
24. **auth_permission** — Permission records.
25. **auth_group** — Auth groups.
26. **auth_group_permissions** — Group-to-permission mapping.
27. **django_admin_log** — Admin site activity log.
28. **django_session** — User sessions.

> Depending on your migration state, additional framework tables may appear, but the list above covers the full required table context for this project.

### 9.2 How Tables Connect (Relationship Map)

- `Categories` → `Products` (one category has many products)
- `Suppliers` → `Products` (one supplier has many products)
- `Customers` → `Customer_Address`, `Orders`, `Cart`, `Whishlist`, `Reviews`, `CompareList`, `CouponUsage`
- `OrderStatus` → `Orders`
- `Orders` → `OrderDetails`, `Payments`, `CouponUsage`
- `Products` → `OrderDetails`, `Reviews`, `Cart`, `Whishlist`, `CompareList`, `PurchaseOrderDetails`
- `PaymentMethods` → `Payments`
- `PurchaseOrders` → `PurchaseOrderDetails`
- `accounts_customuser` → `Coupons` (owner), `Notifications` (recipient/sender)

### 9.3 Backend Context (Every Important File)

#### A) Core backend root

- `backend/manage.py` — Django command entry (`runserver`, `migrate`, etc.).
- `backend/requirements.txt` — Python package dependencies.
- `backend/db.sqlite3` — Local SQLite file (not the main SQL Server production DB in this setup).

#### B) Django project package: `backend/page/`

- `page/settings.py` — Global Django settings (DB, CORS, installed apps, JWT, etc.).
- `page/urls.py` — Root API route wiring to all app URLs.
- `page/asgi.py` — ASGI startup for async deployment.
- `page/wsgi.py` — WSGI startup for sync deployment.
- `page/pagination.py` — Shared pagination class/config for API list endpoints.
- `page/__init__.py` — Python package marker.

#### C) `backend/accounts/` (staff auth + customer address bridge)

- `accounts/models.py` — `CustomUser` and `CustomerAddress` models.
- `accounts/serializers.py` — Data validation/output for user/account APIs.
- `accounts/views.py` — Register/login/profile and related account endpoints.
- `accounts/urls.py` — Routes for account APIs.
- `accounts/authentication.py` — Custom customer JWT authentication handling.
- `accounts/admin.py` — Django admin registrations for account models.
- `accounts/apps.py` — App config.
- `accounts/tests.py` — Account tests.
- `accounts/management/` — Custom management commands package.
- `accounts/migrations/` — Migration history for accounts app.
- `accounts/__init__.py` — Package marker.

#### D) `backend/products/` (catalog + review APIs)

- `products/models.py` — `Category`, `Supplier`, `Product`, `Customer`, `Review` mappings.
- `products/serializers.py` — Product/review/category/supplier serializers.
- `products/views.py` — Product listing/detail/filter/search/review endpoints.
- `products/urls.py` — Product app routes.
- `products/admin.py` — Admin registrations.
- `products/apps.py` — App config.
- `products/tests.py` — Product app tests.
- `products/migrations/` — Migration files.
- `products/__init__.py` — Package marker.

#### E) `backend/orders/` (orders, cart, wishlist, coupons, compare, notifications)

- `orders/models.py` — `OrderStatus`, `Order`, `OrderDetail`, `Cart`, `Wishlist`, `PaymentMethod`, `Payment`, `CompareList`, `Coupon`, `CouponUsage`, `Notification`.
- `orders/serializers.py` — Validation/output for checkout, cart, coupons, compare, orders.
- `orders/views.py` — Cart, checkout, my orders, coupon apply/consume, compare APIs. `OrderViewSet` includes three private helpers: `_notify_owners()` (in-app notification to store owner on new order), `_compute_shipping()` (Nepal NPR 200 / India NPR 3500 / free-delivery coupon = 0), and `_auto_restock_pos()` (auto-creates a Pending PurchaseOrder per supplier whenever a product's stock drops to/below `reorder_level` after a customer purchase — deduplicates against existing Pending POs).
- `orders/urls.py` — Order-related route definitions.
- `orders/admin.py` — Admin registrations for order-domain models.
- `orders/apps.py` — App config.
- `orders/tests.py` — Order app tests.
- `orders/migrations/` — Migration files (compare list, coupons, coupon usage, etc.).
- `orders/__init__.py` — Package marker.

#### F) `backend/warehouse/` (inventory + purchase flow)

- `warehouse/models.py` — `PurchaseOrders` and `PurchaseOrderDetails` mappings.
- `warehouse/serializers.py` — Serializer layer for warehouse endpoints.
- `warehouse/views.py` — Inventory, stock movement, low-stock, procurement APIs.
- `warehouse/urls.py` — Warehouse routes.
- `warehouse/admin.py` — Admin registrations.
- `warehouse/apps.py` — App config.
- `warehouse/tests.py` — Warehouse tests.
- `warehouse/migrations/` — Migration files.
- `warehouse/__init__.py` — Package marker.

#### G) `backend/admin_panel/` (admin tools + audit)

- `admin_panel/models.py` — `AuditLog` model + audit helper mixin.
- `admin_panel/serializers.py` — Serializer logic for admin panel entities.
- `admin_panel/views.py` — User management, supplier management, logs, system summary APIs.
- `admin_panel/permissions.py` — Admin-only permission classes.
- `admin_panel/urls.py` — Admin panel API routes.
- `admin_panel/admin.py` — Django admin registrations.
- `admin_panel/apps.py` — App config.
- `admin_panel/tests.py` — Admin panel tests.
- `admin_panel/migrations/` — Migration files.
- `admin_panel/__init__.py` — Package marker.

#### H) `backend/analytics/` (ML + forecasting + insights)

- `analytics/ml_services.py` — Core analytics/ML logic (RFM, churn, recommendations, demand forecast, dynamic pricing, comprehensive Prophet forecast with fallback).
- `analytics/views.py` — API endpoints that call ML services.
- `analytics/urls.py` — Analytics route definitions.
- `analytics/models.py` — Analytics app model placeholders/definitions used by app context.
- `analytics/admin.py` — Admin registrations.
- `analytics/apps.py` — App config.
- `analytics/tests.py` — Analytics tests.
- `analytics/migrations/` — Migration files.
- `analytics/__init__.py` — Package marker.

### 9.4 Frontend Context (Every Source File Group)

#### A) Frontend root (`frontend/src/`)

- `main.jsx` — React app bootstrap.
- `App.jsx` — Main route tree and app-level orchestration.
- `App.css`, `index.css` — Global styling.
- `Config/Config.js` — API base URL and environment config.
- `context/AuthContext.jsx` — Auth state/provider logic.
- `services/api.js` — Central API client and endpoint wrappers.
- `data/` — Reserved data folder (currently empty).

#### B) Customer-facing pages (`frontend/src/pages/Customer/`)

- `Login.jsx` — Customer auth/login/register UI.
- `Cart.jsx` — Cart management UI.
- `Checkout.jsx` — Multi-step checkout flow: saved address selection or new address entry (Nepal 7 provinces / India states / any country), coupon code application with store-scoped discount, 4 payment methods (eSewa, Khalti, Bank Transfer, Cash on Delivery), order submission, and success confirmation screen.
- `ProductDetail.jsx` — Full product detail page: image, price, stock, specs, star rating, Add to Cart/Wishlist, coupon carousel (store + platform coupons with claim/copy/progress bar), customer reviews, and "You May Also Like" section (least-sold products from the same category, clickable cards with no Add to Cart button).
- `Wishlist.jsx` — Wishlist UI.
- `Compare.jsx` — Product comparison page.
- `MyOrders.jsx` — Customer order history/tracking.
- `MyReviews.jsx` — Customer review history.
- `Profile.jsx` — Customer profile management.

#### C) Public page

- `pages/Home.jsx` — Landing/home product browsing page with filters/search.

#### D) Owner pages (`frontend/src/pages/Owner/`)

- `Dashboard.jsx` — Owner performance and quick stats.
- `ProductManagement.jsx` — CRUD for owner products.
- `OrderManagement.jsx` — Owner order handling.
- `Analytics.jsx` — Owner analytics dashboard.
- `CouponManagement.jsx` — Owner coupon creation and tracking.

#### E) Warehouse pages (`frontend/src/pages/Warehouse/`)

- `Dashboard.jsx` — Warehouse summary dashboard.
- `InventoryManagement.jsx` — Inventory listing and actions.
- `LowStockAlerts.jsx` — Low-stock monitoring.
- `StockMovements.jsx` — Stock movement tracking.

#### F) Admin pages (`frontend/src/pages/Admin/`)

- `Dashboard.jsx` — Admin overview.
- `UserManagement.jsx` — Manage admin/owner/warehouse users.
- `SupplierManagement.jsx` — Supplier management screen.
- `SystemLogs.jsx` — Audit/system logs UI.
- `AnalyticsSummary.jsx` — High-level admin analytics summary.

#### G) Shared/common components (`frontend/src/components/Common/`)

- `Navbar.jsx` — Top navigation for storefront.
- `Footer.jsx` — Global footer.
- `ProtectedRoute.jsx` — Role/auth route guard.

#### H) Admin components (`frontend/src/components/admin/`)

- `AdminLayout.jsx` — Admin page frame/layout.
- `AdminNavbar.jsx` — Admin navigation header.
- `SystemStatsCard.jsx` — Reusable stat card.
- `UserTable.jsx` — User grid/table.
- `UserModal.jsx` — User create/edit modal.
- `SupplierTable.jsx` — Supplier grid/table.
- `SupplierModal.jsx` — Supplier create/edit modal.
- `LogTable.jsx` — Audit log table.
- `RoleBadge.jsx` — Role chip/badge component.

#### I) Owner components (`frontend/src/components/Owner/`)

- `OwnerLayout.jsx` — Owner page frame/layout.
- `OwnerNavbar.jsx` — Owner navigation bar.
- `SalesOverviewCards.jsx` — Sales KPI cards.
- `RevenueChart.jsx` — Revenue chart.
- `CategoryChart.jsx` — Category performance chart.
- `TopProductsTable.jsx` — Top product list table.
- `ProductModal.jsx` — Product create/edit modal.
- `ProductDetailModal.jsx` — Product detail modal.
- `OrderDetailsModal.jsx` — Owner order details modal.
- `ComprehensiveForecastModal.jsx` — Advanced ML forecast modal.

#### J) Warehouse components (`frontend/src/components/warehouse/`)

- `WarehouseLayout.jsx` — Warehouse frame/layout.
- `WarehouseNavbar.jsx` — Warehouse navigation bar.
- `InventoryTable.jsx` — Inventory table component.
- `MovementModal.jsx` — Add/edit stock movement modal.
- `StockLevelCard.jsx` — Stock KPI card.
- `AlertBadge.jsx` — Alert status chip.
- `OwnerFilter.jsx` — Owner-based inventory filter.
- `SupplierPanel.jsx` — Supplier-related panel/card.

### 9.5 End-to-End Context (How Everything Works Together)

1. Frontend page/component calls a function in `services/api.js`.
2. API request goes to a route in `page/urls.py` and app `urls.py`.
3. App `views.py` handles the request and uses `serializers.py` for validation/output.
4. `models.py` maps to SQL Server tables (`ElectroNestDB`).
5. Response returns to frontend and updates UI state.
6. Analytics endpoints call `analytics/ml_services.py` for forecasting/recommendation logic.

This completes the full project context map with every table and every frontend/backend source context documented inside this file.
