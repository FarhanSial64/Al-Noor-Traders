# Al Noor Traders - Distribution Management System (DMS)

A complete, production-ready Web-Based Distribution Management System built using the MERN stack (MongoDB, Express.js, React.js, Node.js) for FMCG distribution business.

## 🚀 Features

### User Roles & Permissions
- **Distributor (Admin)**: Full system access, financial reports, user management
- **Computer Operator (KPO)**: Data entry, purchases, inventory management, payments
- **Order Booker (Field Sales)**: Order creation with manual pricing, customer management
- **Customer**: View own orders and account ledger

### Core Modules

#### 📦 Products Management
- Product catalog with categories, brands, and units
- **NO fixed prices** - prices are entered manually per transaction
- Product code and barcode support

#### 👥 Customer Management
- Customer profiles with credit limits and payment terms
- Area-wise customer organization
- Customer ledger with complete transaction history

#### 🏭 Vendor Management
- Vendor/Supplier profiles with payment terms
- Vendor ledger tracking
- Purchase history

#### 🛒 Sales Orders
- **Manual sale price entry** per product per order
- Order workflow: Pending → Confirmed → Delivered
- Automatic invoice generation on delivery
- Order booker tracking

#### 📥 Purchases
- **Manual purchase price entry** per product
- Purchase workflow: Draft → Ordered → Received
- Goods receiving with automatic inventory update
- Vendor invoice tracking

#### 💰 Payments
- Customer receipts (money received)
- Vendor payments (money paid)
- Multiple payment modes: Cash, Bank Transfer, Cheque, Online
- Automatic accounting entries

#### 📊 Inventory Management
- Real-time stock levels
- **Weighted average cost** calculation
- Stock movements history
- Stock adjustments with reason tracking
- Low stock alerts

#### 📈 Accounting Module
- **Double-entry bookkeeping**
- Chart of Accounts (Assets, Liabilities, Equity, Income, Expenses)
- Automatic journal entries on transactions
- Account ledgers
- Cash book
- Trial Balance
- Profit & Loss Statement
- Accounts Receivable report
- Accounts Payable report

#### 🎛️ Dashboard
- Role-based dashboard with relevant metrics
- Today's sales and receipts
- Outstanding receivables/payables
- Low stock alerts
- Recent orders and purchases
- Sales/Purchase trends chart

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** authentication (7-day expiry)
- **bcryptjs** for password hashing (salt rounds: 12)
- **express-validator** for input validation
- **CORS** and **Helmet** for security
- **express-rate-limit** for API protection

### Frontend
- **React 18** with functional components and hooks
- **Redux Toolkit** for state management
- **redux-persist** for auth persistence
- **Material-UI (MUI) v5** component library
- **React Router v6** for navigation
- **Axios** for API calls
- **Chart.js** with react-chartjs-2 for visualizations
- **Formik** with **Yup** for form handling
- **react-hot-toast** for notifications

## 📁 Project Structure

```
Al Noor Traders/
├── Backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── roles.js           # RBAC permissions
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── productController.js
│   │   ├── customerController.js
│   │   ├── vendorController.js
│   │   ├── orderController.js
│   │   ├── purchaseController.js
│   │   ├── paymentController.js
│   │   ├── inventoryController.js
│   │   ├── accountingController.js
│   │   ├── userController.js
│   │   └── dashboardController.js
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   ├── authorize.js       # Permission checking
│   │   ├── auditLogger.js     # Audit trail
│   │   ├── validate.js        # Validation handler
│   │   └── errorHandler.js    # Error handling
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js         # Product, Category, Brand, Unit
│   │   ├── Customer.js
│   │   ├── Vendor.js
│   │   ├── Order.js
│   │   ├── Purchase.js
│   │   ├── Invoice.js
│   │   ├── Inventory.js       # InventoryTransaction, InventoryValuation
│   │   ├── ChartOfAccount.js
│   │   ├── JournalEntry.js
│   │   ├── LedgerEntry.js
│   │   ├── Payment.js
│   │   ├── CashBook.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   └── [11 route files]
│   ├── services/
│   │   ├── accountingService.js
│   │   └── inventoryService.js
│   ├── .env
│   ├── package.json
│   ├── seed.js               # Initial data seeding
│   └── server.js             # Entry point
│
└── Frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   └── common/        # Reusable components
        ├── layouts/
        │   ├── AuthLayout.js
        │   └── MainLayout.js
        ├── pages/
        │   ├── auth/
        │   ├── dashboard/
        │   ├── products/
        │   ├── customers/
        │   ├── vendors/
        │   ├── orders/
        │   ├── purchases/
        │   ├── payments/
        │   ├── inventory/
        │   ├── reports/
        │   └── users/
        ├── services/          # API service files
        ├── store/             # Redux store
        ├── App.js
        ├── index.js
        └── theme.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB 6+
- npm or yarn

### Backend Setup

```bash
cd Backend

# Install dependencies
npm install

# Create .env file (copy from .env.example)
cp .env.example .env

# Edit .env with your settings
# MONGO_URI=mongodb://localhost:27017/alnoor_dms
# JWT_SECRET=your-secret-key
# PORT=5000

# Seed initial data (Chart of Accounts, Admin user, Sample data)
npm run seed

# Start development server
npm run dev

# Or start production server
npm start
```

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Default Login Credentials

```
Username: admin
Password: Admin@123
Role: Distributor (Full Access)
```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register user (Admin only)
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password

### Products
- `GET/POST /api/products` - List/Create products
- `GET/PUT/DELETE /api/products/:id` - Get/Update/Delete product
- `GET/POST /api/products/categories` - Categories
- `GET/POST /api/products/brands` - Brands
- `GET/POST /api/products/units` - Units

### Customers
- `GET/POST /api/customers` - List/Create customers
- `GET/PUT/DELETE /api/customers/:id` - CRUD operations
- `GET /api/customers/:id/ledger` - Customer ledger

### Vendors
- `GET/POST /api/vendors` - List/Create vendors
- `GET/PUT/DELETE /api/vendors/:id` - CRUD operations
- `GET /api/vendors/:id/ledger` - Vendor ledger

### Orders
- `GET/POST /api/orders` - List/Create orders
- `GET/PUT/DELETE /api/orders/:id` - CRUD operations
- `PUT /api/orders/:id/status` - Update status
- `POST /api/orders/:id/invoice` - Generate invoice

### Purchases
- `GET/POST /api/purchases` - List/Create purchases
- `GET/PUT/DELETE /api/purchases/:id` - CRUD operations
- `POST /api/purchases/:id/receive` - Receive goods

### Payments
- `GET/POST /api/payments/receipts` - Customer receipts
- `GET/POST /api/payments/payments` - Vendor payments

### Inventory
- `GET /api/inventory/stock` - Current stock
- `GET /api/inventory/movements` - Stock movements
- `POST /api/inventory/adjust` - Stock adjustment
- `GET /api/inventory/valuation` - Inventory valuation

### Accounting
- `GET /api/accounting/chart-of-accounts` - Chart of accounts
- `GET /api/accounting/trial-balance` - Trial balance
- `GET /api/accounting/profit-loss` - P&L statement
- `GET /api/accounting/cash-book` - Cash book
- `GET /api/accounting/receivables` - AR report
- `GET /api/accounting/payables` - AP report

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics

## 🔐 Security Features

- JWT-based authentication with 7-day expiry
- Role-based access control (RBAC) with 40+ permissions
- Password hashing with bcryptjs (12 salt rounds)
- API rate limiting (100 requests per 15 minutes)
- CORS protection
- Helmet security headers
- Input validation on all endpoints
- Audit logging for financial transactions

## 💼 Business Rules

### Pricing
- **Sales prices are NOT fixed** - Order Booker manually enters the sale price for each product when booking an order
- **Purchase prices are NOT fixed** - Computer Operator manually enters the purchase price when recording a purchase

### Inventory
- Uses **Weighted Average Cost** method for inventory valuation
- Automatic stock updates on purchase receipt and order delivery
- Stock adjustment with reason tracking

### Accounting
- **Double-entry bookkeeping** - Every transaction creates balanced journal entries
- Automatic posting to ledgers
- Daily cash book maintenance
- Integration with all financial modules

## 📊 Reports

1. **Trial Balance** - Summary of all account balances
2. **Profit & Loss Statement** - Income and expenses for a period
3. **Cash Book** - Daily cash transactions
4. **Accounts Receivable** - Customer outstanding balances
5. **Accounts Payable** - Vendor outstanding balances
6. **Stock Report** - Current inventory with valuation
7. **Stock Movements** - Transaction history

## 🔧 Configuration

### Environment Variables (Backend)

```env
MONGO_URI=mongodb://localhost:27017/alnoor_dms
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
```

### API Base URL (Frontend)

Edit `src/services/api.js`:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
```

## 📝 License

This project is proprietary software developed for Al Noor Traders.

## 👨‍💻 Developer

Built with ❤️ using MERN Stack
