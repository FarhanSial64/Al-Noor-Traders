const mongoose = require('mongoose');

/**
 * Ledger Entry Schema
 * 
 * This tracks individual account movements.
 * Every journal line creates a corresponding ledger entry.
 * This enables quick account balance queries and statements.
 */
const ledgerEntrySchema = new mongoose.Schema({
  // Account
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: true
  },
  accountCode: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },

  // Entry Date
  entryDate: {
    type: Date,
    required: true
  },

  // Description
  description: {
    type: String,
    trim: true
  },

  // Amounts
  debitAmount: {
    type: Number,
    default: 0
  },
  creditAmount: {
    type: Number,
    default: 0
  },

  // Running balance after this entry
  runningBalance: {
    type: Number,
    required: true
  },

  // Reference to Journal Entry
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry',
    required: true
  },
  journalEntryNumber: {
    type: String,
    required: true
  },

  // For Subsidiary Ledgers (Customer/Vendor specific)
  partyType: {
    type: String,
    enum: ['customer', 'vendor', 'none'],
    default: 'none'
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId
  },
  partyName: {
    type: String,
    trim: true
  },

  // Source Reference
  sourceType: {
    type: String,
    enum: ['Invoice', 'Purchase', 'Payment', 'Receipt', 'Expense', 'Manual', 'Opening']
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  sourceNumber: {
    type: String
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

// Indexes for quick queries
ledgerEntrySchema.index({ account: 1, entryDate: -1 });
ledgerEntrySchema.index({ partyType: 1, partyId: 1, entryDate: -1 });
ledgerEntrySchema.index({ journalEntry: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
