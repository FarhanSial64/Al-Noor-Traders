const mongoose = require('mongoose');

/**
 * Journal Entry Schema
 * 
 * Every financial transaction creates a journal entry.
 * Journal entries follow double-entry bookkeeping:
 * - Total Debits must equal Total Credits
 * 
 * Auto-generated entries:
 * - Sales: Debit Customer (AR), Credit Sales Revenue
 * - Purchase: Debit Inventory/COGS, Credit Vendor (AP)
 * - Payment Received: Debit Cash/Bank, Credit Customer (AR)
 * - Payment Made: Debit Vendor (AP), Credit Cash/Bank
 */

// Individual line in a journal entry
const journalLineSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount',
    required: [true, 'Account is required']
  },
  accountCode: {
    type: String,
    required: true
  },
  accountName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  debitAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  creditAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // For subsidiary ledger entries
  partyType: {
    type: String,
    enum: ['customer', 'vendor', 'none'],
    default: 'none'
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'lines.partyModel'
  },
  partyModel: {
    type: String,
    enum: ['Customer', 'Vendor']
  },
  partyName: {
    type: String,
    trim: true
  }
});

const journalEntrySchema = new mongoose.Schema({
  // Entry Number (auto-generated)
  entryNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Entry Date
  entryDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Entry Type
  entryType: {
    type: String,
    enum: [
      'sales',           // From invoice
      'purchase',        // From purchase
      'receipt',         // Payment received from customer
      'payment',         // Payment made to vendor
      'expense',         // Expense entry
      'adjustment',      // Manual adjustment
      'opening',         // Opening balance
      'closing',         // Closing entry
      'transfer'         // Bank/cash transfer
    ],
    required: true
  },

  // Description/Narration
  narration: {
    type: String,
    required: [true, 'Narration is required'],
    trim: true
  },

  // Journal Lines
  lines: {
    type: [journalLineSchema],
    validate: {
      validator: function(lines) {
        if (lines.length < 2) return false;
        const totalDebit = lines.reduce((sum, line) => sum + line.debitAmount, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.creditAmount, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01; // Allow for floating point errors
      },
      message: 'Journal entry must have at least 2 lines and total debits must equal total credits'
    }
  },

  // Totals
  totalDebit: {
    type: Number,
    required: true,
    default: 0
  },
  totalCredit: {
    type: Number,
    required: true,
    default: 0
  },

  // Source Transaction Reference
  sourceType: {
    type: String,
    enum: ['Invoice', 'Purchase', 'Payment', 'Receipt', 'Expense', 'Manual', 'Opening'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  sourceNumber: {
    type: String
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'posted', 'reversed'],
    default: 'posted'
  },

  // Reversal Reference (if reversed)
  reversedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },
  reversalOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },

  // Posting
  isPosted: {
    type: Boolean,
    default: true
  },
  postedAt: {
    type: Date
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Audit Trail - CRITICAL
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  createdByName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Generate entry number before validation
journalEntrySchema.pre('validate', async function(next) {
  if (this.isNew && !this.entryNumber) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('JournalEntry').countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
      }
    });
    this.entryNumber = `JE-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals before saving
journalEntrySchema.pre('save', function(next) {
  this.totalDebit = this.lines.reduce((sum, line) => sum + line.debitAmount, 0);
  this.totalCredit = this.lines.reduce((sum, line) => sum + line.creditAmount, 0);
  
  if (this.isPosted && !this.postedAt) {
    this.postedAt = new Date();
  }
  next();
});

// Indexes
journalEntrySchema.index({ entryDate: -1 });
journalEntrySchema.index({ entryType: 1, entryDate: -1 });
journalEntrySchema.index({ sourceType: 1, sourceId: 1 });
journalEntrySchema.index({ 'lines.account': 1 });

module.exports = mongoose.model('JournalEntry', journalEntrySchema);
