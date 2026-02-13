const mongoose = require('mongoose');

// Order Item Schema - CRITICAL: Price is manually entered per item
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  productName: {
    type: String,
    required: true // Store name for historical reference
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
  // CRITICAL: Manually entered sale price per piece - NOT from product master
  salePrice: {
    type: Number,
    required: [true, 'Sale price is required'],
    min: [0, 'Sale price cannot be negative']
  },
  // Cost price per piece at time of sale (weighted average)
  costPrice: {
    type: Number,
    default: 0
  },
  // Line total = quantity * salePrice
  lineTotal: {
    type: Number,
    required: true
  },
  // Optional discount per line
  discount: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number,
    required: true
  },
  // Profit per line = (salePrice - costPrice) * quantity
  lineProfit: {
    type: Number,
    default: 0
  }
});

// Calculate line totals before validation
orderItemSchema.pre('validate', function(next) {
  this.lineTotal = this.quantity * this.salePrice;
  this.netAmount = this.lineTotal - (this.discount || 0);
  next();
});

const orderSchema = new mongoose.Schema({
  // Order Identification
  orderNumber: {
    type: String,
    unique: true
  },
  orderDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Customer
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  customerName: {
    type: String,
    required: true // Store for historical reference
  },
  customerCode: {
    type: String,
    required: true
  },

  // Order Items - with manually entered prices
  items: [orderItemSchema],

  // Order Totals
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

  // Cost and Profit Tracking
  totalCost: {
    type: Number,
    default: 0
  },
  totalProfit: {
    type: Number,
    default: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'approved', 'processing', 'dispatched', 'delivered', 'cancelled'],
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

  // Delivery
  deliveryDate: {
    type: Date
  },
  deliveryNotes: {
    type: String,
    trim: true
  },

  // Reference
  remarks: {
    type: String,
    trim: true
  },
  invoiceGenerated: {
    type: Boolean,
    default: false
  },
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },

  // Audit - CRITICAL for tracking who entered the prices
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Order booker is required']
  },
  bookedByName: {
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
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate order number before validation
orderSchema.pre('validate', async function(next) {
  if (this.isNew && !this.orderNumber) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Order').countDocuments({
      createdAt: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });
    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Calculate totals before saving
orderSchema.pre('save', function(next) {
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.totalDiscount = this.items.reduce((sum, item) => sum + (item.discount || 0), 0);
  this.grandTotal = this.subtotal - this.totalDiscount + this.taxAmount;
  next();
});

// Index for queries
orderSchema.index({ customer: 1, orderDate: -1 });
orderSchema.index({ bookedBy: 1, orderDate: -1 });
orderSchema.index({ bookedBy: 1, createdAt: -1 }); // For dashboard queries
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);
