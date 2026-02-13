const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const vendorController = require('../controllers/vendorController');
const { authenticate } = require('../middleware/auth');
const { authorize, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// Validation rules
const vendorValidation = [
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('contactPerson').trim().notEmpty().withMessage('Contact person is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
];

// Routes
router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.VENDOR_READ),
  vendorController.getVendors
);

router.get(
  '/next-code',
  authenticate,
  authorize(PERMISSIONS.VENDOR_CREATE),
  vendorController.getNextVendorCode
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.VENDOR_READ),
  param('id').isMongoId().withMessage('Invalid vendor ID'),
  validate,
  vendorController.getVendor
);

router.get(
  '/:id/ledger',
  authenticate,
  authorize(PERMISSIONS.FINANCE_VIEW_LEDGER),
  param('id').isMongoId().withMessage('Invalid vendor ID'),
  validate,
  vendorController.getVendorLedger
);

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.VENDOR_CREATE),
  vendorValidation,
  validate,
  vendorController.createVendor
);

router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.VENDOR_UPDATE),
  param('id').isMongoId().withMessage('Invalid vendor ID'),
  validate,
  vendorController.updateVendor
);

router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.VENDOR_DELETE),
  param('id').isMongoId().withMessage('Invalid vendor ID'),
  validate,
  vendorController.deleteVendor
);

module.exports = router;
