const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const purchaseController = require('../controllers/purchaseController');
const { authenticate } = require('../middleware/auth');
const { authorize, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// Validation rules for purchase with MANUAL price entry
const purchaseValidation = [
  body('vendor').isMongoId().withMessage('Valid vendor ID is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  // CRITICAL: purchasePrice is manually entered, must be present
  body('items.*.purchasePrice')
    .isFloat({ min: 0 })
    .withMessage('Purchase price is required and must be non-negative')
];

// Routes
router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.PURCHASE_READ),
  purchaseController.getPurchases
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PURCHASE_READ),
  param('id').isMongoId().withMessage('Invalid purchase ID'),
  validate,
  purchaseController.getPurchase
);

// Create purchase - KPO enters purchase price manually
router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.PURCHASE_CREATE),
  purchaseValidation,
  validate,
  purchaseController.createPurchase
);

// Update purchase - only before stock is updated
router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PURCHASE_UPDATE),
  param('id').isMongoId().withMessage('Invalid purchase ID'),
  purchaseValidation,
  validate,
  purchaseController.updatePurchase
);

// Receive goods (update stock)
router.put(
  '/:id/receive',
  authenticate,
  authorize(PERMISSIONS.PURCHASE_UPDATE),
  param('id').isMongoId().withMessage('Invalid purchase ID'),
  validate,
  purchaseController.receiveGoods
);

// Update purchase status
router.put(
  '/:id/status',
  authenticate,
  authorize(PERMISSIONS.PURCHASE_UPDATE),
  param('id').isMongoId().withMessage('Invalid purchase ID'),
  body('status').isIn(['approved', 'cancelled']).withMessage('Invalid status'),
  validate,
  purchaseController.updatePurchaseStatus
);

module.exports = router;
