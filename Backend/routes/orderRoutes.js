const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// Validation rules for order with MANUAL price entry
const orderValidation = [
  body('customer').isMongoId().withMessage('Valid customer ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  // CRITICAL: salePrice is manually entered, must be present
  body('items.*.salePrice')
    .isFloat({ min: 0 })
    .withMessage('Sale price is required and must be non-negative')
];

// Validation rules for updating order (customer not required)
const updateOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.salePrice')
    .isFloat({ min: 0 })
    .withMessage('Sale price is required and must be non-negative')
];

const approveValidation = [
  body('status')
    .isIn(['approved', 'processing', 'dispatched', 'delivered', 'cancelled'])
    .withMessage('Invalid status')
];

// Routes
router.get(
  '/',
  authenticate,
  authorizeAny(PERMISSIONS.ORDER_READ, PERMISSIONS.ORDER_READ_OWN),
  orderController.getOrders
);

router.get(
  '/my-orders',
  authenticate,
  authorize(PERMISSIONS.ORDER_READ_OWN),
  orderController.getMyOrders
);

// Bulk routes MUST come before /:id routes
// Bulk generate invoices
router.post(
  '/bulk/generate-invoices',
  authenticate,
  authorize(PERMISSIONS.INVOICE_CREATE),
  body('orderIds').isArray({ min: 1 }).withMessage('At least one order ID is required'),
  body('orderIds.*').isMongoId().withMessage('Invalid order ID'),
  validate,
  orderController.bulkGenerateInvoices
);

// Bulk update status
router.put(
  '/bulk/status',
  authenticate,
  authorize(PERMISSIONS.ORDER_UPDATE),
  body('orderIds').isArray({ min: 1 }).withMessage('At least one order ID is required'),
  body('orderIds.*').isMongoId().withMessage('Invalid order ID'),
  body('status').notEmpty().withMessage('Status is required'),
  validate,
  orderController.bulkUpdateStatus
);

// Bulk get invoices for printing
router.post(
  '/bulk/invoices',
  authenticate,
  authorizeAny(PERMISSIONS.ORDER_READ, PERMISSIONS.INVOICE_READ),
  body('orderIds').isArray({ min: 1 }).withMessage('At least one order ID is required'),
  body('orderIds.*').isMongoId().withMessage('Invalid order ID'),
  validate,
  orderController.bulkGetInvoices
);

router.get(
  '/:id',
  authenticate,
  authorizeAny(PERMISSIONS.ORDER_READ, PERMISSIONS.ORDER_READ_OWN),
  param('id').isMongoId().withMessage('Invalid order ID'),
  validate,
  orderController.getOrder
);

// Create order - Order Booker enters sale price manually
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.ORDER_CREATE),
  orderValidation,
  validate,
  orderController.createOrder
);

// Update order status
router.put(
  '/:id/status',
  authenticate,
  authorize(PERMISSIONS.ORDER_APPROVE),
  param('id').isMongoId().withMessage('Invalid order ID'),
  approveValidation,
  validate,
  orderController.updateOrderStatus
);

// Update order (edit order details)
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.ORDER_UPDATE),
  param('id').isMongoId().withMessage('Invalid order ID'),
  updateOrderValidation,
  validate,
  orderController.updateOrder
);

// Cancel order
router.put(
  '/:id/cancel',
  authenticate,
  authorizeAny(PERMISSIONS.ORDER_UPDATE, PERMISSIONS.ORDER_DELETE),
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('reason').trim().notEmpty().withMessage('Cancellation reason is required'),
  validate,
  orderController.cancelOrder
);

// Process return
router.post(
  '/:id/return',
  authenticate,
  authorizeAny(PERMISSIONS.ORDER_MANAGE_RETURNS, PERMISSIONS.ORDER_UPDATE),
  param('id').isMongoId().withMessage('Invalid order ID'),
  body('returnItems').isArray({ min: 1 }).withMessage('At least one return item is required'),
  body('returnItems.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('returnItems.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('reason').optional().trim(),
  validate,
  orderController.processReturn
);

// Generate invoice from order
router.post(
  '/:id/invoice',
  authenticate,
  authorize(PERMISSIONS.INVOICE_CREATE),
  param('id').isMongoId().withMessage('Invalid order ID'),
  validate,
  orderController.generateInvoice
);

module.exports = router;
