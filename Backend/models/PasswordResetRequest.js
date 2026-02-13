const mongoose = require('mongoose');

const passwordResetRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  processedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for efficient querying
passwordResetRequestSchema.index({ status: 1, createdAt: -1 });
passwordResetRequestSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('PasswordResetRequest', passwordResetRequestSchema);
