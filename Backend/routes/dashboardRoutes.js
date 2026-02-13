const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny, authorizeRoles, PERMISSIONS, ROLES } = require('../middleware/authorize');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics based on role
// @access  All authenticated users
router.get('/stats', dashboardController.getDashboardStats);

// @route   GET /api/dashboard/distributor-stats
// @desc    Get comprehensive distributor dashboard stats
// @access  Distributor only
router.get(
  '/distributor-stats',
  authorizeRoles(ROLES.DISTRIBUTOR),
  dashboardController.getDistributorStats
);

// @route   GET /api/dashboard/sales-trend
// @desc    Get daily sales trend
// @access  Distributor, Computer Operator
router.get(
  '/sales-trend',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getSalesTrend
);

// @route   GET /api/dashboard/customer-aging
// @desc    Get customer aging report
// @access  Distributor, Computer Operator
router.get(
  '/customer-aging',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getCustomerAging
);

// @route   GET /api/dashboard/sales-summary
// @desc    Get sales summary (daily/weekly/monthly)
// @access  Distributor, Computer Operator
router.get(
  '/sales-summary',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getSalesSummary
);

// @route   GET /api/dashboard/purchase-summary
// @desc    Get purchase summary
// @access  Distributor, Computer Operator
router.get(
  '/purchase-summary',
  authorizeAny(PERMISSIONS.PURCHASE_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getPurchaseSummary
);

// @route   GET /api/dashboard/top-products
// @desc    Get top selling products
// @access  Distributor, Computer Operator
router.get(
  '/top-products',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.INVENTORY_READ),
  dashboardController.getTopProducts
);

// @route   GET /api/dashboard/top-customers
// @desc    Get top customers by sales
// @access  Distributor, Computer Operator
router.get(
  '/top-customers',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.CUSTOMER_READ),
  dashboardController.getTopCustomers
);

// @route   GET /api/dashboard/cash-position
// @desc    Get current cash position
// @access  Distributor only
router.get(
  '/cash-position',
  authorizeRoles(ROLES.DISTRIBUTOR),
  dashboardController.getCashPosition
);

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity
// @access  Distributor, Computer Operator
router.get(
  '/recent-activity',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.PURCHASE_READ),
  dashboardController.getRecentActivity
);

// @route   GET /api/dashboard/order-booker-stats
// @desc    Get order booker performance stats
// @access  Order Booker (own stats), Distributor/KPO (all)
router.get(
  '/order-booker-stats',
  dashboardController.getOrderBookerStats
);

// @route   GET /api/dashboard/order-booker-dashboard
// @desc    Get comprehensive order booker dashboard
// @access  Order Booker only
router.get(
  '/order-booker-dashboard',
  authorizeRoles(ROLES.ORDER_BOOKER),
  dashboardController.getOrderBookerDashboard
);

// @route   GET /api/dashboard/my-sales-report
// @desc    Get order booker's own sales report
// @access  Order Booker only
router.get(
  '/my-sales-report',
  authorizeRoles(ROLES.ORDER_BOOKER),
  dashboardController.getMySalesReport
);

// @route   GET /api/dashboard/my-collections-report
// @desc    Get order booker's own collections report
// @access  Order Booker only
router.get(
  '/my-collections-report',
  authorizeRoles(ROLES.ORDER_BOOKER),
  dashboardController.getMyCollectionsReport
);

// @route   GET /api/dashboard/my-performance
// @desc    Get order booker's performance summary
// @access  Order Booker only
router.get(
  '/my-performance',
  authorizeRoles(ROLES.ORDER_BOOKER),
  dashboardController.getMyPerformance
);

// @route   GET /api/dashboard/customer-stats
// @desc    Get customer's own stats
// @access  Customer only
router.get(
  '/customer-stats',
  authorizeRoles(ROLES.CUSTOMER),
  dashboardController.getCustomerStats
);

// @route   GET /api/dashboard/order-bookers
// @desc    Get unique order bookers from orders (for load form filter)
// @access  Distributor, Computer Operator
router.get(
  '/order-bookers',
  authorizeAny(PERMISSIONS.ORDER_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getOrderBookers
);

// @route   GET /api/dashboard/sales-report
// @desc    Get comprehensive sales report with filters
// @access  Distributor, Computer Operator
router.get(
  '/sales-report',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getSalesReport
);

// @route   GET /api/dashboard/invoice-order-bookers
// @desc    Get unique order bookers from invoices (for filter dropdown)
// @access  Distributor, Computer Operator
router.get(
  '/invoice-order-bookers',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getInvoiceOrderBookers
);

// @route   GET /api/dashboard/purchase-report
// @desc    Get comprehensive purchase report with filters
// @access  Distributor, Computer Operator
router.get(
  '/purchase-report',
  authorizeAny(PERMISSIONS.PURCHASE_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getPurchaseReport
);

// @route   GET /api/dashboard/sale-summary
// @desc    Get product-wise sales summary
// @access  Distributor, Computer Operator
router.get(
  '/sale-summary',
  authorizeAny(PERMISSIONS.REPORT_SALES, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getSaleSummary
);

// @route   GET /api/dashboard/purchase-summary-products
// @desc    Get product-wise purchase summary
// @access  Distributor, Computer Operator
router.get(
  '/purchase-summary-products',
  authorizeAny(PERMISSIONS.PURCHASE_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getPurchaseSummaryProducts
);

// @route   GET /api/dashboard/load-form-orders
// @desc    Get orders for load form selection
// @access  Distributor, Computer Operator
router.get(
  '/load-form-orders',
  authorizeAny(PERMISSIONS.ORDER_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.getOrdersForLoadForm
);

// @route   POST /api/dashboard/generate-load-form
// @desc    Generate load form from selected orders
// @access  Distributor, Computer Operator
router.post(
  '/generate-load-form',
  authorizeAny(PERMISSIONS.ORDER_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  dashboardController.generateLoadForm
);

module.exports = router;
