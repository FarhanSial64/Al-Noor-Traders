const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Basic Information
  customerCode: {
    type: String,
    required: [true, 'Customer code is required'],
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
    city: { type: String, trim: true, default: 'Karachi' },
    province: { type: String, trim: true, default: 'Sindh' }
  },

  // Business Details
  businessType: {
    type: String,
    enum: ['retailer', 'wholesaler', 'supermarket', 'general_store', 'other'],
    default: 'retailer'
  },
  ntn: {
    type: String,
    trim: true
  },
  strn: {
    type: String,
    trim: true
  },

  // Credit Terms
  creditLimit: {
    type: Number,
    default: 0
  },
  creditDays: {
    type: Number,
    default: 0
  },
  
  // Current Balance (Receivable from customer)
  // Positive = Customer owes us, Negative = We owe customer (advance)
  currentBalance: {
    type: Number,
    default: 0
  },

  // Assignment
  assignedOrderBooker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  route: {
    type: String,
    trim: true
  },
  visitDay: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },

  // Linked User Account (for customer self-registration)
  linkedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Generate customer code before saving
customerSchema.pre('save', async function(next) {
  if (this.isNew && !this.customerCode) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerCode = `CUST${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// Virtual for available credit
customerSchema.virtual('availableCredit').get(function() {
  return this.creditLimit - this.currentBalance;
});

// Index for search
customerSchema.index({ businessName: 'text', contactPerson: 'text', customerCode: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
