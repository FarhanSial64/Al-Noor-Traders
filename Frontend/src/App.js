import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { CircularProgress, Box } from '@mui/material';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { getMe } from './store/slices/authSlice';

// Layouts - Keep non-lazy for faster initial render
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import CustomerLayout from './layouts/CustomerLayout';

// Loading Fallback Component
const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
    <CircularProgress />
  </Box>
);

// Lazy load all pages for code splitting
// Auth Pages
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ForceChangePassword = lazy(() => import('./pages/auth/ForceChangePassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

// Dashboard
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

// Products
const ProductList = lazy(() => import('./pages/products/ProductList'));
const ProductForm = lazy(() => import('./pages/products/ProductForm'));
const Categories = lazy(() => import('./pages/products/Categories'));
const Brands = lazy(() => import('./pages/products/Brands'));

// Customers
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const CustomerForm = lazy(() => import('./pages/customers/CustomerForm'));
const CustomerLedger = lazy(() => import('./pages/customers/CustomerLedger'));

// Vendors
const VendorList = lazy(() => import('./pages/vendors/VendorList'));
const VendorForm = lazy(() => import('./pages/vendors/VendorForm'));
const VendorLedger = lazy(() => import('./pages/vendors/VendorLedger'));

// Orders
const OrderList = lazy(() => import('./pages/orders/OrderList'));
const OrderForm = lazy(() => import('./pages/orders/OrderForm'));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail'));
const OrderEdit = lazy(() => import('./pages/orders/OrderEdit'));

// Purchases
const PurchaseList = lazy(() => import('./pages/purchases/PurchaseList'));
const PurchaseForm = lazy(() => import('./pages/purchases/PurchaseForm'));
const PurchaseDetail = lazy(() => import('./pages/purchases/PurchaseDetail'));

// Payments
const ReceiptList = lazy(() => import('./pages/payments/ReceiptList'));
const ReceiptForm = lazy(() => import('./pages/payments/ReceiptForm'));
const PaymentList = lazy(() => import('./pages/payments/PaymentList'));
const PaymentForm = lazy(() => import('./pages/payments/PaymentForm'));

// Expenses
const ExpenseList = lazy(() => import('./pages/expenses/ExpenseList'));
const ExpenseForm = lazy(() => import('./pages/expenses/ExpenseForm'));
const ExpenseCategories = lazy(() => import('./pages/expenses/ExpenseCategories'));

// Inventory
const InventoryStock = lazy(() => import('./pages/inventory/InventoryStock'));
const StockMovements = lazy(() => import('./pages/inventory/StockMovements'));
const StockAdjustment = lazy(() => import('./pages/inventory/StockAdjustment'));

// Reports
const TrialBalance = lazy(() => import('./pages/reports/TrialBalance'));
const ProfitLoss = lazy(() => import('./pages/reports/ProfitLoss'));
const CashBook = lazy(() => import('./pages/reports/CashBook'));
const Receivables = lazy(() => import('./pages/reports/Receivables'));
const Payables = lazy(() => import('./pages/reports/Payables'));
const SalesReport = lazy(() => import('./pages/reports/SalesReport'));
const PurchaseReport = lazy(() => import('./pages/reports/PurchaseReport'));
const SaleSummary = lazy(() => import('./pages/reports/SaleSummary'));
const PurchaseSummary = lazy(() => import('./pages/reports/PurchaseSummary'));
const LoadForm = lazy(() => import('./pages/reports/LoadForm'));
const MySalesReport = lazy(() => import('./pages/reports/MySalesReport'));
const MyCollectionsReport = lazy(() => import('./pages/reports/MyCollectionsReport'));
const ProductPricingReport = lazy(() => import('./pages/reports/ProductPricingReport'));

// Users
const UserList = lazy(() => import('./pages/users/UserList'));
const UserForm = lazy(() => import('./pages/users/UserForm'));
const PasswordResetRequests = lazy(() => import('./pages/users/PasswordResetRequests'));

// Settings
const DistributorProfile = lazy(() => import('./pages/settings/DistributorProfile'));

// Profile Management
const ProfileManagement = lazy(() => import('./pages/profile/ProfileManagement'));

// Distributor Dashboard
const DistributorDashboard = lazy(() => import('./pages/dashboard/DistributorDashboard'));

// Order Booker Dashboard
const OrderBookerDashboard = lazy(() => import('./pages/dashboard/OrderBookerDashboard'));

// Customer Shop
const CustomerShop = lazy(() => import('./pages/shop/CustomerShop'));
const MyOrders = lazy(() => import('./pages/shop/MyOrders'));
const CustomerProfile = lazy(() => import('./pages/shop/CustomerProfile'));

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Customer Route Component - Only for customers
const CustomerRoute = ({ children }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'customer') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);

  // Fetch user profile on app load if authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      dispatch(getMe());
    }
  }, [dispatch, isAuthenticated, token]);

  // Determine where to redirect authenticated users
  const getDefaultRoute = () => {
    if (user?.role === 'customer') {
      return '/shop';
    }
    return '/dashboard';
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Login />
          }
        />
        <Route
          path="/signup"
          element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <Signup />
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <ForgotPassword />
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <ResetPassword />
          }
        />
        <Route
          path="/force-change-password"
          element={<ForceChangePassword />}
        />
      </Route>

      {/* Customer Shop Routes */}
      <Route
        element={
          <CustomerRoute>
            <CustomerLayout />
          </CustomerRoute>
        }
      >
        <Route path="/shop" element={<CustomerShop />} />
        <Route path="/shop/orders" element={<MyOrders />} />
        <Route path="/shop/profile" element={<CustomerProfile />} />
      </Route>

      {/* Protected Routes for Staff */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            user?.role === 'distributor' ? (
              <DistributorDashboard />
            ) : user?.role === 'order_booker' ? (
              <OrderBookerDashboard />
            ) : (
              <Dashboard />
            )
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Products */}
        <Route path="/products" element={<ProductList />} />
        <Route
          path="/products/new"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/categories"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <Categories />
            </ProtectedRoute>
          }
        />
        <Route
          path="/products/brands"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <Brands />
            </ProtectedRoute>
          }
        />

        {/* Customers */}
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/new" element={<CustomerForm />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />
        <Route path="/customers/:id/ledger" element={<CustomerLedger />} />

        {/* Vendors */}
        <Route
          path="/vendors"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <VendorList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendors/new"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <VendorForm />
            </ProtectedRoute>
          }
        />
        <Route path="/vendors/:id/edit" element={<VendorForm />} />
        <Route path="/vendors/:id/ledger" element={<VendorLedger />} />

        {/* Orders */}
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/new" element={<OrderForm />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route
          path="/orders/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <OrderEdit />
            </ProtectedRoute>
          }
        />

        {/* Purchases */}
        <Route
          path="/purchases"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PurchaseList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/new"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PurchaseForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/purchases/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PurchaseForm />
            </ProtectedRoute>
          }
        />
        <Route path="/purchases/:id" element={<PurchaseDetail />} />

        {/* Payments */}
        <Route
          path="/receipts"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator', 'order_booker']}>
              <ReceiptList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/receipts/new"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator', 'order_booker']}>
              <ReceiptForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PaymentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/new"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PaymentForm />
            </ProtectedRoute>
          }
        />

        {/* Expenses */}
        <Route
          path="/expenses"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <ExpenseList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/new"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <ExpenseForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <ExpenseForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenses/categories"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <ExpenseCategories />
            </ProtectedRoute>
          }
        />

        {/* Inventory */}
        <Route
          path="/inventory"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <InventoryStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/movements"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <StockMovements />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory/adjustment"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <StockAdjustment />
            </ProtectedRoute>
          }
        />

        {/* Reports */}
        <Route
          path="/reports/trial-balance"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <TrialBalance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/profit-loss"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <ProfitLoss />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/cash-book"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <CashBook />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/receivables"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <Receivables />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/payables"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <Payables />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/sales"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <SalesReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/purchases"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PurchaseReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/sale-summary"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <SaleSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/purchase-summary"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <PurchaseSummary />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/load-form"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator']}>
              <LoadForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/product-pricing"
          element={
            <ProtectedRoute allowedRoles={['distributor', 'computer_operator', 'order_booker']}>
              <ProductPricingReport />
            </ProtectedRoute>
          }
        />

        {/* Order Booker Reports */}
        <Route
          path="/reports/my-sales"
          element={
            <ProtectedRoute allowedRoles={['order_booker']}>
              <MySalesReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports/my-collections"
          element={
            <ProtectedRoute allowedRoles={['order_booker']}>
              <MyCollectionsReport />
            </ProtectedRoute>
          }
        />

        {/* Users */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <UserList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <UserForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <UserForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/password-reset-requests"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <PasswordResetRequests />
            </ProtectedRoute>
          }
        />

        {/* Settings/Profile */}
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute allowedRoles={['distributor']}>
              <DistributorProfile />
            </ProtectedRoute>
          }
        />

        {/* Profile Management for Order Booker & Computer Operator */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={['order_booker', 'computer_operator']}>
              <ProfileManagement />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Analytics />
      <SpeedInsights />
    </Suspense>
  );
}

export default App;
