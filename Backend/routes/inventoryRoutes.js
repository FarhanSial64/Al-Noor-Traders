const express = require('express');
const router = express.Router();
const { param, query, body } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// ========== STOCK QUERIES ==========

// Get current stock for all products
router.get(
  '/stock',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  inventoryController.getStock
);

// Get stock for specific product
router.get(
  '/stock/:productId',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  param('productId').isMongoId().withMessage('Invalid product ID'),
  validate,
  inventoryController.getProductStock
);

// Get low stock products
router.get(
  '/low-stock',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  inventoryController.getLowStockProducts
);

// ========== STOCK MOVEMENTS ==========

// Get stock movements for a product
router.get(
  '/movements/:productId',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  param('productId').isMongoId().withMessage('Invalid product ID'),
  validate,
  inventoryController.getStockMovements
);

// Get all stock movements (with filters)
router.get(
  '/movements',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  inventoryController.getAllStockMovements
);

// ========== STOCK ADJUSTMENTS ==========

// Create stock adjustment
router.post(
  '/adjustment',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_ADJUST),
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('quantity').isNumeric().withMessage('Quantity is required'),
    body('adjustmentType').isIn(['add', 'remove', 'set']).withMessage('Adjustment type must be add, remove, or set'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('batchNumber').optional().isString()
  ],
  validate,
  inventoryController.createStockAdjustment
);

// Get stock adjustments history
router.get(
  '/adjustments',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  inventoryController.getStockAdjustments
);

// ========== INVENTORY VALUATION ==========

// Get product pricing report (avg cost and sale prices)
router.get(
  '/pricing-report',
  authenticate,
  inventoryController.getProductPricingReport
);

// Get inventory valuation report
router.get(
  '/valuation',
  authenticate,
  authorizeAny(PERMISSIONS.INVENTORY_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  inventoryController.getInventoryValuation
);

// Get inventory valuation for specific product
router.get(
  '/valuation/:productId',
  authenticate,
  authorizeAny(PERMISSIONS.INVENTORY_READ, PERMISSIONS.FINANCE_FULL_ACCESS),
  param('productId').isMongoId().withMessage('Invalid product ID'),
  validate,
  inventoryController.getProductValuation
);

module.exports = router;
