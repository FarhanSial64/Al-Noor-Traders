const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const unitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Unit name is required'],
    unique: true,
    trim: true
  },
  abbreviation: {
    type: String,
    required: true,
    trim: true
  },
  // For unit conversion (e.g., 1 carton = 12 pieces)
  baseUnit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  conversionFactor: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

const productSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    trim: true,
    sparse: true
  },
  description: {
    type: String,
    trim: true
  },

  // Product Image (URL or base64)
  image: {
    type: String,
    default: null
  },

  // Classification
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: [true, 'Brand is required']
  },

  // Packaging - Simple pieces per carton
  piecesPerCarton: {
    type: Number,
    default: 1,
    min: 1
  },

  // IMPORTANT: No fixed prices - prices are entered per transaction
  // These are just reference/suggested prices for display
  suggestedRetailPrice: {
    type: Number,
    default: 0
  },
  suggestedPurchasePrice: {
    type: Number,
    default: 0
  },

  // Inventory
  currentStock: {
    type: Number,
    default: 0
  },
  minimumStock: {
    type: Number,
    default: 0
  },
  maximumStock: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search
productSchema.index({ name: 'text', sku: 'text', description: 'text' });

// Virtual for low stock check
productSchema.virtual('isLowStock').get(function() {
  return this.currentStock <= this.minimumStock;
});

const Category = mongoose.model('Category', categorySchema);
const Brand = mongoose.model('Brand', brandSchema);
const Unit = mongoose.model('Unit', unitSchema);
const Product = mongoose.model('Product', productSchema);

module.exports = { Product, Category, Brand, Unit };
