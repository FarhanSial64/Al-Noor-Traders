const mongoose = require('mongoose');

// Invoice Item Schema
const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productSku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  unitName: {
    type: String,
    required: true
  },
  // Price as entered in order
  salePrice: {
    type: Number,
    required: true
  },
  // Cost at time of sale (for COGS calculation)
  costPrice: {
    type: Number,
    required: true
  },
  lineTotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  // Profit on this line
  lineProfit: {
    type: Number,
    required: true
  }
});

const invoiceSchema = new mongoose.Schema({
  // Invoice Identification
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Reference to Order
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  orderNumber: {
    type: String
  },

  // Customer
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerCode: {
    type: String,
    required: true
  },
  customerAddress: {
    type: String
  },
  customerPhone: {
    type: String
  },

  // Invoice Items
  items: [invoiceItemSchema],

  // Totals
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    default: 0
  },

  // Cost and Profit
  totalCost: {
    type: Number,
    required: true,
    default: 0
  },
  grossProfit: {
    type: Number,
    required: true,
    default: 0
  },

  // Payment
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  dueAmount: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'issued', 'cancelled'],
    default: 'issued'
  },

  // For accounting
  journalEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JournalEntry'
  },

  // Remarks
  remarks: {
    type: String,
    trim: true
  },
  termsAndConditions: {
    type: String,
    trim: true
  },

  // Order Booker (for sales by order bookers) or Creator (for direct sales)
  orderBooker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderBookerName: {
    type: String,
    default: 'Direct'
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
  }
}, {
  timestamps: true
});

// Generate invoice number (only if not already set)
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const count = await mongoose.model('Invoice').countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
      }
    });
    this.invoiceNumber = `INV-${year}${month}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Calculate totals and profit
invoiceSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
  this.grandTotal = this.subtotal - this.totalDiscount + this.taxAmount;
  this.totalCost = this.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  this.grossProfit = this.items.reduce((sum, item) => sum + item.lineProfit, 0);
  this.dueAmount = this.grandTotal - this.paidAmount;
  
  if (this.paidAmount >= this.grandTotal) {
    this.paymentStatus = 'paid';
  } else if (this.paidAmount > 0) {
    this.paymentStatus = 'partial';
  }
  next();
});

// Indexes
invoiceSchema.index({ customer: 1, invoiceDate: -1 });
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
