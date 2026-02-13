const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny, PERMISSIONS, ROLES } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// Validation rules for receipt (payment from customer)
const receiptValidation = [
  body('customerId').isMongoId().withMessage('Valid customer ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'other'])
    .withMessage('Valid payment method is required')
];

// Validation rules for payment (payment to vendor)
const paymentValidation = [
  body('vendorId').isMongoId().withMessage('Valid vendor ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod')
    .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'other'])
    .withMessage('Valid payment method is required')
];

// ========== RECEIPTS (From Customers) ==========
router.get(
  '/receipts',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_RECEIPT_ENTRY, PERMISSIONS.FINANCE_FULL_ACCESS),
  paymentController.getReceipts
);

router.post(
  '/receipts',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_RECEIPT_ENTRY, PERMISSIONS.FINANCE_FULL_ACCESS),
  receiptValidation,
  validate,
  paymentController.createReceipt
);

// ========== PAYMENTS (To Vendors) ==========
router.get(
  '/payments',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_PAYMENT_ENTRY, PERMISSIONS.FINANCE_FULL_ACCESS),
  paymentController.getPayments
);

router.post(
  '/payments',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_PAYMENT_ENTRY, PERMISSIONS.FINANCE_FULL_ACCESS),
  paymentValidation,
  validate,
  paymentController.createPayment
);

// ========== EDIT/DELETE (Distributor Only) ==========
router.put(
  '/receipts/:id',
  authenticate,
  authorize(PERMISSIONS.FINANCE_FULL_ACCESS),
  param('id').isMongoId().withMessage('Invalid receipt ID'),
  [
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'other'])
      .withMessage('Valid payment method is required')
  ],
  validate,
  paymentController.updateReceipt
);

router.delete(
  '/receipts/:id',
  authenticate,
  authorize(PERMISSIONS.FINANCE_FULL_ACCESS),
  param('id').isMongoId().withMessage('Invalid receipt ID'),
  validate,
  paymentController.deleteReceipt
);

router.put(
  '/payments/:id',
  authenticate,
  authorize(PERMISSIONS.FINANCE_FULL_ACCESS),
  param('id').isMongoId().withMessage('Invalid payment ID'),
  [
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('paymentMethod')
      .optional()
      .isIn(['cash', 'cheque', 'bank_transfer', 'online', 'other'])
      .withMessage('Valid payment method is required')
  ],
  validate,
  paymentController.updatePayment
);

router.delete(
  '/payments/:id',
  authenticate,
  authorize(PERMISSIONS.FINANCE_FULL_ACCESS),
  param('id').isMongoId().withMessage('Invalid payment ID'),
  validate,
  paymentController.deletePayment
);

// ========== COMMON ==========
router.get(
  '/:id',
  authenticate,
  authorizeAny(
    PERMISSIONS.FINANCE_PAYMENT_ENTRY, 
    PERMISSIONS.FINANCE_RECEIPT_ENTRY, 
    PERMISSIONS.FINANCE_FULL_ACCESS
  ),
  param('id').isMongoId().withMessage('Invalid payment ID'),
  validate,
  paymentController.getPaymentDetails
);

module.exports = router;
