const AuditLog = require('../models/AuditLog');

/**
 * Audit Logger Middleware and Utilities
 * 
 * Logs all significant actions for compliance and debugging.
 */

// Create audit log entry
const createAuditLog = async ({
  action,
  module,
  entityType,
  entityId,
  entityNumber,
  description,
  amount,
  previousValues,
  newValues,
  performedBy,
  performedByName,
  performedByRole,
  ipAddress,
  userAgent,
  status = 'success',
  errorMessage
}) => {
  try {
    await AuditLog.create({
      action,
      module,
      entityType,
      entityId,
      entityNumber,
      description,
      amount,
      previousValues,
      newValues,
      performedBy,
      performedByName,
      performedByRole,
      ipAddress,
      userAgent,
      status,
      errorMessage
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit failure shouldn't break the application
  }
};

// Middleware to automatically log requests
const auditMiddleware = (action, module) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = async (data) => {
      // Log after response
      if (req.user) {
        await createAuditLog({
          action,
          module,
          entityType: req.params.id ? module : undefined,
          entityId: req.params.id,
          description: `${action} on ${module}`,
          performedBy: req.user._id,
          performedByName: req.user.fullName,
          performedByRole: req.user.role,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
          status: data.success ? 'success' : 'failure',
          errorMessage: !data.success ? data.message : undefined
        });
      }

      return originalJson(data);
    };

    next();
  };
};

// Helper for logging financial transactions
const logFinancialTransaction = async (req, {
  action,
  module,
  entityType,
  entityId,
  entityNumber,
  description,
  amount,
  previousValues,
  newValues
}) => {
  await createAuditLog({
    action,
    module,
    entityType,
    entityId,
    entityNumber,
    description,
    amount,
    previousValues,
    newValues,
    performedBy: req.user._id,
    performedByName: req.user.fullName,
    performedByRole: req.user.role,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'],
    status: 'success'
  });
};

module.exports = {
  createAuditLog,
  auditMiddleware,
  logFinancialTransaction
};
