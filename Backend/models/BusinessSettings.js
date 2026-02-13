const mongoose = require('mongoose');

/**
 * Business Settings Schema
 * 
 * Stores distributor business information for invoices and receipts
 */
const businessSettingsSchema = new mongoose.Schema({
  businessName: {
    type: String,
    required: [true, 'Business name is required'],
    default: 'AL NOOR TRADERS'
  },
  tagline: {
    type: String,
    default: 'Quality Products at Best Prices'
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: 'Lahore' },
    state: { type: String, default: 'Punjab' },
    country: { type: String, default: 'Pakistan' },
    postalCode: { type: String, default: '' }
  },
  phone: {
    primary: { type: String, default: '' },
    secondary: { type: String, default: '' },
    whatsapp: { type: String, default: '' }
  },
  email: {
    type: String,
    default: ''
  },
  website: {
    type: String,
    default: ''
  },
  // Tax and registration numbers
  ntn: {
    type: String,
    default: ''
  },
  strn: {
    type: String,
    default: ''
  },
  cnic: {
    type: String,
    default: ''
  },
  // Bank details for payments
  bankDetails: [{
    bankName: { type: String },
    accountTitle: { type: String },
    accountNumber: { type: String },
    iban: { type: String },
    branchCode: { type: String }
  }],
  // Logo
  logo: {
    type: String,
    default: ''
  },
  // Invoice/Receipt settings
  invoiceSettings: {
    prefix: { type: String, default: 'INV' },
    termsAndConditions: { type: String, default: '' },
    footerNote: { type: String, default: 'Thank you for your business!' },
    showBankDetails: { type: Boolean, default: true },
    showTaxNumber: { type: Boolean, default: true }
  },
  receiptSettings: {
    prefix: { type: String, default: 'RCV' },
    footerNote: { type: String, default: 'Thank you for your payment!' }
  },
  // Active distributor
  distributor: {
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

// Ensure only one settings document exists
businessSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('BusinessSettings', businessSettingsSchema);
