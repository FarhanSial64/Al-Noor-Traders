const mongoose = require('mongoose');

// Inventory Transaction Schema - Records every stock movement
const inventoryTransactionSchema = new mongoose.Schema({
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

  // Transaction Type
  transactionType: {
    type: String,
    enum: ['purchase', 'sale', 'return_in', 'return_out', 'adjustment', 'adjustment_in', 'adjustment_out', 'edit_in', 'edit_out', 'opening'],
    required: true
  },

  // Quantities
  quantityIn: {
    type: Number,
    default: 0
  },
  quantityOut: {
    type: Number,
    default: 0
  },
  
  // Balance after transaction
  balanceAfter: {
    type: Number,
    required: true
  },

  // Unit cost at time of transaction (for valuation)
  unitCost: {
    type: Number,
    required: true
  },

  // Reference Document
  referenceType: {
    type: String,
    enum: ['Purchase', 'Order', 'Invoice', 'Adjustment', 'Opening', 'Return'],
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  referenceNumber: {
    type: String,
    required: true
  },

  // Date
  transactionDate: {
    type: Date,
    default: Date.now,
    required: true
  },

  // Audit
  remarks: {
    type: String,
    trim: true
  },
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

// Indexes
inventoryTransactionSchema.index({ product: 1, transactionDate: -1 });
inventoryTransactionSchema.index({ referenceType: 1, referenceId: 1 });

// Inventory Valuation Schema - For tracking inventory value using weighted average
const inventoryValuationSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    unique: true
  },
  currentStock: {
    type: Number,
    default: 0
  },
  // Weighted Average Cost
  averageCost: {
    type: Number,
    default: 0
  },
  // Total inventory value
  totalValue: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryTransaction'
  }
}, {
  timestamps: true
});

// Method to update valuation on purchase
inventoryValuationSchema.methods.addStock = function(quantity, costPerUnit) {
  const existingValue = this.currentStock * this.averageCost;
  const newValue = quantity * costPerUnit;
  const newTotalQty = this.currentStock + quantity;
  
  if (newTotalQty > 0) {
    this.averageCost = (existingValue + newValue) / newTotalQty;
  }
  this.currentStock = newTotalQty;
  this.totalValue = this.currentStock * this.averageCost;
  this.lastUpdated = new Date();
};

// Method to update valuation on sale
inventoryValuationSchema.methods.removeStock = function(quantity) {
  this.currentStock = Math.max(0, this.currentStock - quantity);
  this.totalValue = this.currentStock * this.averageCost;
  this.lastUpdated = new Date();
};

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
const InventoryValuation = mongoose.model('InventoryValuation', inventoryValuationSchema);

module.exports = { InventoryTransaction, InventoryValuation };
