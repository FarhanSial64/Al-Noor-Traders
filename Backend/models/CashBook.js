const mongoose = require('mongoose');

/**
 * Cash Book Entry Schema
 * 
 * Records all cash transactions with opening and closing balances.
 * This is a summary view derived from journal entries but stored
 * separately for quick cash position queries.
 */
const cashBookEntrySchema = new mongoose.Schema({
  // Date
  entryDate: {
    type: Date,
    required: true
  },

  // Cash Account
  cashAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  isBankAccount: {
    type: Boolean,
    default: false
  },

  // Description
  description: {
    type: String,
    required: true,
    trim: true
  },

  // Amounts
  cashIn: {
    type: Number,
    default: 0
  },
  cashOut: {
    type: Number,
    default: 0
  },

  // Running Balance
  runningBalance: {
    type: Number,
    required: true
  },

  // Reference
  referenceType: {
    type: String,
    enum: ['Payment', 'Receipt', 'Expense', 'Transfer', 'Opening', 'Adjustment']
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  referenceNumber: {
    type: String
  },

  // Journal Entry Reference
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },

  // Party Information (if applicable)
  partyType: {
    type: String,
    enum: ['customer', 'vendor', 'other', 'none'],
    default: 'none'
  },
  partyName: {
    type: String,
    trim: true
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes
cashBookEntrySchema.index({ cashAccount: 1, entryDate: -1 });
cashBookEntrySchema.index({ entryDate: -1 });

/**
 * Daily Cash Summary Schema
 * 
 * Aggregated daily cash position for quick reporting.
 */
const dailyCashSummarySchema = new mongoose.Schema({
  // Date (stored as start of day)
  date: {
    type: Date,
    required: true
  },

  // Cash Account
  cashAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true
  },
  accountName: {
    type: String,
    required: true
  },

  // Balances
  openingBalance: {
    type: Number,
    required: true,
    default: 0
  },
  totalCashIn: {
    type: Number,
    default: 0
  },
  totalCashOut: {
    type: Number,
    default: 0
  },
  closingBalance: {
    type: Number,
    required: true,
    default: 0
  },

  // Transaction counts
  transactionCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Compound index for unique daily entries per account
dailyCashSummarySchema.index({ cashAccount: 1, date: 1 }, { unique: true });

const CashBookEntry = mongoose.model('CashBookEntry', cashBookEntrySchema);
const DailyCashSummary = mongoose.model('DailyCashSummary', dailyCashSummarySchema);

module.exports = { CashBookEntry, DailyCashSummary };
