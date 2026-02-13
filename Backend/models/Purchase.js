const mongoose = require('mongoose');

// Purchase Item Schema - CRITICAL: Price is manually entered per item
const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: true
  },
  productSku: {
    type: String,
    required: true
  },
  // Cartons and pieces tracking
  cartons: {
    type: Number,
    default: 0
  },
  pieces: {
    type: Number,
    default: 0
  },
  piecesPerCarton: {
    type: Number,
    default: 1
  },
  // Total quantity in pieces
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  unitName: {
    type: String,
    default: 'Pieces'
  },
  // CRITICAL: Manually entered purchase price per piece - NOT from product master
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  // For inventory valuation
  costPerUnit: {
    type: Number,
    required: true
  },
  // Line total
  lineTotal: {
    type: Number,
    required: true
  },
  // Received quantity (for partial deliveries)
  receivedQuantity: {
    type: Number,
    default: 0
  }
});

// Calculate totals
purchaseItemSchema.pre('validate', function(next) {
  this.costPerUnit = this.purchasePrice;
  this.lineTotal = this.quantity * this.purchasePrice;
  next();
});

const purchaseSchema = new mongoose.Schema({
  // Purchase Identification
  purchaseNumber: {
    type: String,
    unique: true
  },
  purchaseDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Vendor
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: [true, 'Vendor is required']
  },
  vendorName: {
    type: String,
    required: true
  },
  vendorCode: {
    type: String,
    required: true
  },

  // Vendor Invoice Reference
  vendorInvoiceNumber: {
    type: String,
    trim: true
  },
  vendorInvoiceDate: {
    type: Date
  },

  // Purchase Items
  items: [purchaseItemSchema],

  // Totals
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  otherCharges: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    required: true,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'received', 'partial', 'cancelled'],
    default: 'pending'
  },

  // Payment Status
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paidAmount: {
    type: Number,
    default: 0
  },

  // Stock Update
  stockUpdated: {
    type: Boolean,
    default: false
  },
  stockUpdatedAt: {
    type: Date
  },

  // Reference
  remarks: {
    type: String,
    trim: true
  },

  // Audit - CRITICAL for tracking who entered the prices
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
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Generate purchase number
purchaseSchema.pre('save', async function(next) {
  if (this.isNew) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Purchase').countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    this.purchaseNumber = `PUR-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Calculate totals
purchaseSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.grandTotal = this.subtotal + this.taxAmount + this.otherCharges;
  next();
});

// Index for queries
purchaseSchema.index({ vendor: 1, purchaseDate: -1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ purchaseNumber: 1 });

module.exports = mongoose.model('Purchase', purchaseSchema);
