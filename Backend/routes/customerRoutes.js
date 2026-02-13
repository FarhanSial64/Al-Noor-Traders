const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const customerController = require('../controllers/customerController');
const { authenticate } = require('../middleware/auth');
const { authorize, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// Validation rules
const customerValidation = [
  body('businessName').trim().notEmpty().withMessage('Business name is required'),
  body('contactPerson').trim().notEmpty().withMessage('Contact person is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required')
];

// Routes
router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.CUSTOMER_READ),
  customerController.getCustomers
);

router.get(
  '/next-code',
  authenticate,
  authorize(PERMISSIONS.CUSTOMER_CREATE),
  customerController.getNextCustomerCode
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CUSTOMER_READ),
  param('id').isMongoId().withMessage('Invalid customer ID'),
  validate,
  customerController.getCustomer
);

router.get(
  '/:id/ledger',
  authenticate,
  authorize(PERMISSIONS.FINANCE_VIEW_LEDGER),
  param('id').isMongoId().withMessage('Invalid customer ID'),
  validate,
  customerController.getCustomerLedger
);

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.CUSTOMER_CREATE),
  customerValidation,
  validate,
  customerController.createCustomer
);

router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CUSTOMER_UPDATE),
  param('id').isMongoId().withMessage('Invalid customer ID'),
  validate,
  customerController.updateCustomer
);

router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CUSTOMER_DELETE),
  param('id').isMongoId().withMessage('Invalid customer ID'),
  validate,
  customerController.deleteCustomer
);

module.exports = router;
