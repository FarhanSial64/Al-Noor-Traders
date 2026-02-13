const mongoose = require('mongoose');

/**
 * Chart of Accounts Schema
 * 
 * Account Types:
 * - Assets: Cash, Bank, Inventory, Accounts Receivable
 * - Liabilities: Accounts Payable
 * - Equity: Capital, Retained Earnings
 * - Income: Sales Revenue
 * - Expenses: Cost of Goods Sold, Operating Expenses
 */
const chartOfAccountSchema = new mongoose.Schema({
  // Account Code (for sorting and grouping)
  accountCode: {
    type: String,
    required: [true, 'Account code is required'],
    unique: true,
    trim: true
  },
  
  // Account Name
  accountName: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true
  },

  // Account Type (Top level classification)
  accountType: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'income', 'expense'],
    required: [true, 'Account type is required']
  },

  // Sub-type for more detailed classification
  accountSubType: {
    type: String,
    enum: [
      // Assets
      'cash', 'bank', 'accounts_receivable', 'inventory', 'fixed_asset', 'other_asset',
      // Liabilities
      'accounts_payable', 'short_term_liability', 'long_term_liability',
      // Equity
      'capital', 'retained_earnings', 'drawings',
      // Income
      'sales_revenue', 'sales_returns', 'sales_discounts', 'other_income',
      // Expenses
      'cost_of_goods_sold', 'operating_expense', 'financial_expense', 'other_expense'
    ],
    required: true
  },

  // Parent account for hierarchical structure
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },

  // Account level in hierarchy
  level: {
    type: Number,
    default: 1
  },

  // Description
  description: {
    type: String,
    trim: true
  },

  // Current balance
  currentBalance: {
    type: Number,
    default: 0
  },

  // Normal balance side
  normalBalance: {
    type: String,
    enum: ['debit', 'credit'],
    required: true
  },

  // Is this a control account (e.g., Accounts Receivable, Accounts Payable)
  isControlAccount: {
    type: Boolean,
    default: false
  },

  // Is this a bank account
  isBankAccount: {
    type: Boolean,
    default: false
  },

  // Is this a cash account
  isCashAccount: {
    type: Boolean,
    default: false
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // System account (cannot be deleted)
  isSystemAccount: {
    type: Boolean,
    default: false
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for sorting
chartOfAccountSchema.index({ accountCode: 1 });
chartOfAccountSchema.index({ accountType: 1, accountCode: 1 });

module.exports = mongoose.model('ChartOfAccount', chartOfAccountSchema);
