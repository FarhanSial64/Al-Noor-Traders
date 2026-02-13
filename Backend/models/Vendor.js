const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  // Basic Information
  vendorCode: {
    type: String,
    required: [true, 'Vendor code is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
  },
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  alternatePhone: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Address
  address: {
    street: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true }
  },

  // Business Details
  ntn: {
    type: String,
    trim: true
  },
  strn: {
    type: String,
    trim: true
  },
  bankDetails: {
    bankName: { type: String, trim: true },
    accountTitle: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    iban: { type: String, trim: true }
  },

  // Payment Terms
  paymentTerms: {
    type: String,
    enum: ['cash', 'credit', 'advance'],
    default: 'cash'
  },
  creditDays: {
    type: Number,
    default: 0
  },
  
  // Current Balance (Payable to vendor)
  // Positive = We owe vendor, Negative = Vendor owes us (advance)
  currentBalance: {
    type: Number,
    default: 0
  },

  // Products supplied
  productsSupplied: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

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

// Generate vendor code before saving
vendorSchema.pre('save', async function(next) {
  if (this.isNew && !this.vendorCode) {
    const count = await mongoose.model('Vendor').countDocuments();
    this.vendorCode = `VEND${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Index for search
vendorSchema.index({ businessName: 'text', contactPerson: 'text', vendorCode: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);
