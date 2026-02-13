const mongoose = require('mongoose');

/**
 * Audit Log Schema
 * 
 * Records all significant actions for compliance and debugging.
 * Every financial transaction and important changes are logged here.
 */
const auditLogSchema = new mongoose.Schema({
  // Action Type
  action: {
    type: String,
    enum: [
      'CREATE', 'UPDATE', 'DELETE', 'VIEW',
      'LOGIN', 'LOGOUT', 'LOGIN_FAILED',
      'APPROVE', 'CANCEL', 'REVERSE', 'REJECT',
      'PAYMENT', 'RECEIPT',
      'STOCK_ADJUST', 'PRICE_CHANGE',
      'PASSWORD_RESET', 'DEACTIVATE'
    ],
    required: true
  },

  // Module/Entity
  module: {
    type: String,
    enum: [
      'auth', 'user', 'product', 'customer', 'vendor',
      'order', 'purchase', 'invoice', 'inventory',
      'payment', 'journal', 'ledger', 'report', 'expense'
    ],
    required: true
  },

  // Entity Reference
  entityType: {
    type: String
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  entityNumber: {
    type: String // Order number, invoice number, etc.
  },

  // Description
  description: {
    type: String,
    required: true
  },

  // For financial entries - amount involved
  amount: {
    type: Number
  },

  // Old and new values for updates
  previousValues: {
    type: mongoose.Schema.Types.Mixed
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },

  // User who performed the action
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: {
    type: String,
    required: true
  },
  performedByRole: {
    type: String,
    required: true
  },

  // Request metadata
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },

  // Status
  status: {
    type: String,
    enum: ['success', 'failure'],
    default: 'success'
  },
  errorMessage: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes for querying audit logs
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

// TTL index - keep audit logs for 2 years
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

module.exports = mongoose.model('AuditLog', auditLogSchema);
