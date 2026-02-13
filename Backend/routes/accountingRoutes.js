const express = require('express');
const router = express.Router();
const { param, query } = require('express-validator');
const accountingController = require('../controllers/accountingController');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// ========== CHART OF ACCOUNTS ==========
router.get(
  '/accounts',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getChartOfAccounts
);

router.get(
  '/accounts/:id',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  param('id').isMongoId().withMessage('Invalid account ID'),
  validate,
  accountingController.getAccountDetails
);

// ========== JOURNAL ENTRIES ==========
router.get(
  '/journal-entries',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getJournalEntries
);

router.get(
  '/journal-entries/:id',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  param('id').isMongoId().withMessage('Invalid journal entry ID'),
  validate,
  accountingController.getJournalEntry
);

// ========== LEDGER ==========
router.get(
  '/ledger/:accountId',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  param('accountId').isMongoId().withMessage('Invalid account ID'),
  validate,
  accountingController.getAccountLedger
);

// ========== CASH BOOK ==========
router.get(
  '/cash-book',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getCashBook
);

router.get(
  '/cash-book/summary',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_LEDGER, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getCashBookSummary
);

// ========== FINANCIAL REPORTS ==========
router.get(
  '/trial-balance',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_TRIAL_BALANCE, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getTrialBalance
);

router.get(
  '/profit-loss',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_PL, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getProfitAndLoss
);

router.get(
  '/balance-sheet',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_REPORTS, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getBalanceSheet
);

// ========== RECEIVABLES & PAYABLES ==========
router.get(
  '/receivables',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_REPORTS, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getReceivables
);

router.get(
  '/payables',
  authenticate,
  authorizeAny(PERMISSIONS.FINANCE_VIEW_REPORTS, PERMISSIONS.FINANCE_FULL_ACCESS),
  accountingController.getPayables
);

// ========== DATA REPAIR UTILITIES ==========
const { authorizeRoles } = require('../middleware/authorize');

router.post(
  '/recalculate-profits',
  authenticate,
  authorizeRoles('distributor'),
  accountingController.recalculateInvoiceProfits
);

module.exports = router;
