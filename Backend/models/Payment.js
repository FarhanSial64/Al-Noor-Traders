const mongoose = require('mongoose');

/**
 * Payment Schema
 * 
 * Handles both:
 * - Receipts: Money received from customers
 * - Payments: Money paid to vendors
 */
const paymentSchema = new mongoose.Schema({
  // Payment Number (auto-generated in pre-save hook)
  paymentNumber: {
    type: String,
    unique: true
  },

  // Payment Type
  paymentType: {
    type: String,
    enum: ['receipt', 'payment'], // receipt = from customer, payment = to vendor
    required: [true, 'Payment type is required']
  },

  // Date
  paymentDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Party (Customer or Vendor)
  partyType: {
    type: String,
    enum: ['customer', 'vendor'],
    required: true
  },
  partyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'partyModel'
  },
  partyModel: {
    type: String,
    enum: ['Customer', 'Vendor'],
    required: true
  },
  partyName: {
    type: String,
    required: true
  },
  partyCode: {
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
    enum: ['cash', 'cheque', 'bank_transfer', 'online', 'other'],
    required: [true, 'Payment method is required']
  },

  // For cash payments - which cash account
  cashAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },

  // For bank payments
  bankAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChartOfAccount'
  },
  bankName: {
    type: String,
    trim: true
  },

  // Cheque Details (if payment by cheque)
  chequeNumber: {
    type: String,
    trim: true
  },
  chequeDate: {
    type: Date
  },
  chequeBank: {
    type: String,
    trim: true
  },

  // Online/Transfer Reference
  transactionReference: {
    type: String,
    trim: true
  },

  // Invoice/Purchase allocation
  allocations: [{
    documentType: {
      type: String,
      enum: ['Invoice', 'Purchase']
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId
    },
    documentNumber: {
      type: String
    },
    allocatedAmount: {
      type: Number,
      min: 0
    }
  }],

  // Is this an advance payment (not against any invoice)
  isAdvance: {
    type: Boolean,
    default: false
  },

  // Balance before and after
  partyBalanceBefore: {
    type: Number,
    required: true
  },
  partyBalanceAfter: {
    type: Number,
    required: true
  },

  // Journal Entry Reference
  journalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },

  // Remarks
  remarks: {
    type: String,
    trim: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled', 'bounced'],
    default: 'completed'
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

// Generate payment number
paymentSchema.pre('save', async function(next) {
  if (this.isNew) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = this.paymentType === 'receipt' ? 'RCV' : 'PAY';
    const count = await mongoose.model('Payment').countDocuments({
      paymentType: this.paymentType,
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    this.paymentNumber = `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Indexes
paymentSchema.index({ partyType: 1, partyId: 1, paymentDate: -1 });
paymentSchema.index({ paymentType: 1, paymentDate: -1 });
paymentSchema.index({ createdBy: 1, paymentType: 1, paymentDate: -1 }); // For order booker dashboard
paymentSchema.index({ paymentNumber: 1 });
paymentSchema.index({ paymentMethod: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
