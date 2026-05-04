USE ElectroNestDB
SELECT *FROM Products
CREATE TABLE Customers (
	CustomerID INT PRIMARY KEY IDENTITY(1000,1),
	FirstName NVARCHAR(50) NOT NULL,
	LastName NVARCHAR(50) NOT NULL,
	Email NVARCHAR(100) NOT NULL UNIQUE,
	Phone NVARCHAR(20),
	Gender NVARCHAR(10) check (Gender IN ('Male','Female','Other')),
	DateOfBirth DATE,
	RegistrationDate DATETIME NOT NULL DEFAULT GETDATE(),
	isActive BIT NOT NULL DEFAULT 1,
	
);
GO

CREATE TABLE Customer_Address (
	AddressID INT PRIMARY KEY IDENTITY(1000,1),
	CustomerID INT NOT NULL,
	Street NVARCHAR(255),
	City NVARCHAR(255) NOT NULL,
	Province NVARCHAR(255),
	PostalCode NVARCHAR(20) NOT NULL,
	Country NVARCHAR(255) DEFAULT 'Nepal',
	AddressType NVARCHAR(50) CHECK (AddressType IN ('Billing','Shipping'))  ,
	FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE
	
);

GO

CREATE TABLE Categories (
	CategoryID INT PRIMARY KEY IDENTITY(1000,1),
	CategoryName NVARCHAR(50) NOT NULL

);
GO

CREATE TABLE Brands (
	BrandID INT PRIMARY KEY IDENTITY(1000,1),
	BrandName NVARCHAR(50) NOT NULL,
	BrandDescription NVARCHAR(255),
	logoURL NVARCHAR(255),
	CreatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
);
GO

CREATE TABLE Products (
    ProductID INT PRIMARY KEY IDENTITY(1000,1),
    SKU NVARCHAR(50) NOT NULL UNIQUE, 
    ProductName NVARCHAR(100) NOT NULL,
    CategoryID INT NOT NULL,
Brand NVARCHAR(50)   NOT NULL DEFAULT '',
OwnerName             NVARCHAR(100)  NOT NULL DEFAULT '',
    SellingPrice DECIMAL(10,2) NOT NULL CHECK (SellingPrice > 0),
	CostPrice DECIMAL(10,2) NOT NULL CHECK (CostPrice > 0),
    Stock INT NOT NULL CHECK (Stock >= 0),
    ReorderLevel INT DEFAULT 10,
    ProductDescription NVARCHAR(255),
	ProductImageURL NVARCHAR(255),
	ProductSpecifications NVARCHAR(3000),
	UnitsSold INT NOT NULL DEFAULT 0,
	createdAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	updatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID),
	

    
);
GO

CREATE TABLE OrderStatus (
	OrderStatusID INT PRIMARY KEY IDENTITY(1,1),
	StatusName NVARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO OrderStatus (StatusName) VALUES
('Pending'),
('Processing'),
('Shipped'),
('Delivered'),
('Cancelled');



CREATE TABLE Orders (
	OrderID INT PRIMARY KEY IDENTITY(1000,1),
	OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
	CustomerID INT NOT NULL,
	OrderStatusID INT,
	OrderDate DATETIME NOT NULL DEFAULT GETDATE(),
	TotalAmount DECIMAL(10, 2) NOT NULL CHECK (TotalAmount > 0),
	EstimatedDeliveryDate DATETIME,
	CreatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	UpdatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID),
	FOREIGN KEY (OrderStatusID) REFERENCES OrderStatus(OrderStatusID)
);
GO




CREATE TABLE OrderDetails (
	OrderDetailID INT PRIMARY KEY IDENTITY(1000,1),
	OrderID INT NOT NULL,
	ProductID INT NOT NULL,
	Quantity INT NOT NULL,
	UnitPrice DECIMAL(10, 2) NOT NULL,
	TotalPrice AS (Quantity * UnitPrice) PERSISTED,
	FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE CASCADE,
	FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);
GO

CREATE TABLE Cart (
	CartID INT PRIMARY KEY IDENTITY(1000,1),
	CustomerID INT NOT NULL,
	ProductID INT NOT NULL,
	OrderCount INT NOT NULL DEFAULT 0,
	CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
	FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
	FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE
);
GO

CREATE TABLE Whishlist (
	WishlistID INT PRIMARY KEY IDENTITY(1000,1),
	CustomerID INT NOT NULL,
	ProductID INT NOT NULL,
	AddedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID) ON DELETE CASCADE,
	FOREIGN KEY (ProductID) REFERENCES Products(ProductID) ON DELETE CASCADE
);
GO

CREATE TABLE Reviews (
	ReviewID INT PRIMARY KEY IDENTITY(1000,1),
	ProductID INT NOT NULL,
	CustomerID INT NOT NULL,
	Rating DECIMAL(1, 1) CHECK (Rating>=0 AND Rating <=5),
	Comment NVARCHAR(255),
	ReviewDate DATETIME NOT NULL DEFAULT GETDATE(),
	FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
	FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID),
	
);
GO

CREATE TABLE PurchaseOrders (
    PurchaseOrderID INT PRIMARY KEY IDENTITY(1000,1),
    SupplierID INT NOT NULL,
    OrderDate DATETIME NOT NULL DEFAULT GETDATE(),
    TotalAmount DECIMAL(10,2) CHECK (TotalAmount > 0),
	ExpectedDeliveryDate DATETIME,
	CreatedAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	OrderStatusID INT,
	FOREIGN KEY (OrderStatusID) REFERENCES OrderStatus(OrderStatusID) ON DELETE SET NULL,
	FOREIGN KEY (SupplierID) REFERENCES Suppliers(SupplierID)
	
);
GO

CREATE TABLE PurchaseOrderDetails (
    PurchaseOrderDetailID INT PRIMARY KEY IDENTITY(1000,1),
    PurchaseOrderID INT NOT NULL,
    ProductID INT NOT NULL,
    Quantity INT NOT NULL CHECK (Quantity > 0),
    UnitCost DECIMAL(10,2) NOT NULL CHECK (UnitCost > 0),
    TotalCost AS (Quantity * UnitCost),
	FOREIGN KEY (PurchaseOrderID) REFERENCES PurchaseOrders(PurchaseOrderID) ON DELETE CASCADE,
	FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);

CREATE TABLE PaymentMethods (
    MethodID INT PRIMARY KEY IDENTITY(1,1),
    MethodName NVARCHAR(50) NOT NULL UNIQUE,
);


INSERT INTO PaymentMethods (MethodName)
VALUES 
('Cash'), 
('CreditCard'), 
('DebitCard'),
('Esewa'),
('Khalti'),
('BankTransfer');


CREATE TABLE Payments (
    PaymentID INT PRIMARY KEY IDENTITY(1000,1),
    OrderID INT,
    MethodID INT NOT NULL FOREIGN KEY REFERENCES PaymentMethods(MethodID),
    DiscountPercent DECIMAL(5,2) DEFAULT 0 CHECK (DiscountPercent BETWEEN 0 AND 100),
    PayableAmount DECIMAL(10,2) CHECK (PayableAmount>0) ,
	PaidAt DATETIME NOT NULL DEFAULT SYSDATETIME(),
	FOREIGN KEY (OrderID) REFERENCES Orders(OrderID) ON DELETE SET NULL,
	FOREIGN KEY (MethodID) REFERENCES PaymentMethods(MethodID)
	);
GO



CREATE TABLE AuditLog (
	LogID INT PRIMARY KEY IDENTITY(1,1),
	Action NVARCHAR(255) NOT NULL,
	TableName NVARCHAR(255) NOT NULL,
	RecordID INT NOT NULL,
	UserID INT NOT NULL,
	Timestamp DATETIME NOT NULL DEFAULT GETDATE()
);

GO

/* ── Performance Indexes (SQL Server) ── */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_category' AND object_id = OBJECT_ID('Products'))
	CREATE INDEX idx_products_category ON Products (CategoryID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_brand' AND object_id = OBJECT_ID('Products'))
	CREATE INDEX idx_products_brand ON Products (Brand);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_owner' AND object_id = OBJECT_ID('Products'))
	CREATE INDEX idx_products_owner ON Products (OwnerName);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_units_sold' AND object_id = OBJECT_ID('Products'))
	CREATE INDEX idx_products_units_sold ON Products (UnitsSold DESC);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_products_selling_price' AND object_id = OBJECT_ID('Products'))
	CREATE INDEX idx_products_selling_price ON Products (SellingPrice);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reviews_product' AND object_id = OBJECT_ID('Reviews'))
	CREATE INDEX idx_reviews_product ON Reviews (ProductID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_reviews_customer' AND object_id = OBJECT_ID('Reviews'))
	CREATE INDEX idx_reviews_customer ON Reviews (CustomerID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orders_customer' AND object_id = OBJECT_ID('Orders'))
	CREATE INDEX idx_orders_customer ON Orders (CustomerID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orders_order_date' AND object_id = OBJECT_ID('Orders'))
	CREATE INDEX idx_orders_order_date ON Orders (OrderDate);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orders_status' AND object_id = OBJECT_ID('Orders'))
	CREATE INDEX idx_orders_status ON Orders (OrderStatusID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orderdetails_order' AND object_id = OBJECT_ID('OrderDetails'))
	CREATE INDEX idx_orderdetails_order ON OrderDetails (OrderID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_orderdetails_product' AND object_id = OBJECT_ID('OrderDetails'))
	CREATE INDEX idx_orderdetails_product ON OrderDetails (ProductID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_cart_customer' AND object_id = OBJECT_ID('Cart'))
	CREATE INDEX idx_cart_customer ON Cart (CustomerID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_wishlist_customer' AND object_id = OBJECT_ID('Whishlist'))
	CREATE INDEX idx_wishlist_customer ON Whishlist (CustomerID);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'idx_payments_order' AND object_id = OBJECT_ID('Payments'))
	CREATE INDEX idx_payments_order ON Payments (OrderID);
