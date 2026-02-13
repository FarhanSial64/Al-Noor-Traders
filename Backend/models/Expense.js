const mongoose = require('mongoose');

/**
 * Expense Category Schema
 * Pre-defined expense categories for easier tracking
 */
const expenseCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  // Link to Chart of Account for automatic posting
  expenseAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

/**
 * Expense Schema
 * Records all business expenses
 */
const expenseSchema = new mongoose.Schema({
  // Expense Number (auto-generated)
  expenseNumber: {
    type: String,
    unique: true
  },

  // Expense Date
  expenseDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Category
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExpenseCategory',
    required: [true, 'Expense category is required']
  },
  categoryName: {
    type: String,
    required: true
  },

  // Amount
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },

  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'online'],
    default: 'cash',
    required: true
  },

  // Bank Details (if not cash)
  bankAccount: {
    type: String,
    trim: true
  },
  chequeNumber: {
    type: String,
    trim: true
  },
  transactionReference: {
    type: String,
    trim: true
  },

  // Description & Notes
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },

  // Vendor/Payee (optional)
  vendorName: {
    type: String,
    trim: true
  },

  // Receipt/Invoice Reference
  receiptNumber: {
    type: String,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid'],
    default: 'approved'
  },

  // Accounting Reference
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Auto-generate expense number
expenseSchema.pre('save', async function(next) {
  if (!this.expenseNumber) {
    const today = new Date();
    const prefix = `EXP-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    const lastExpense = await this.constructor.findOne({
      expenseNumber: { $regex: `^${prefix}` }
    }).sort({ expenseNumber: -1 });

    let sequence = 1;
    if (lastExpense) {
      const lastSequence = parseInt(lastExpense.expenseNumber.split('-').pop());
      sequence = lastSequence + 1;
    }

    this.expenseNumber = `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
  next();
});

// Index for efficient querying
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ createdBy: 1 });

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);
const Expense = mongoose.model('Expense', expenseSchema);

module.exports = { Expense, ExpenseCategory };
