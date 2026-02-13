const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { authorize, authorizeAny, authorizeRoles, PERMISSIONS, ROLES } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/users/role/order-bookers
// @desc    Get all order bookers
// @access  Distributor, Computer Operator (anyone who can read orders)
// NOTE: This must come BEFORE /:id route to avoid matching 'role' as an ID
router.get(
  '/role/order-bookers',
  authorizeAny(PERMISSIONS.USER_READ, PERMISSIONS.ORDER_READ),
  userController.getOrderBookers
);

// ========== Password Reset Requests Management ==========
// NOTE: These must come BEFORE /:id route to avoid matching 'password-reset-requests' as an ID

// @route   GET /api/users/password-reset-requests
// @desc    Get all password reset requests
// @access  Distributor only
router.get(
  '/password-reset-requests',
  authorizeRoles(ROLES.DISTRIBUTOR),
  userController.getPasswordResetRequests
);

// @route   GET /api/users/password-reset-requests/count
// @desc    Get pending password reset requests count
// @access  Distributor only
router.get(
  '/password-reset-requests/count',
  authorizeRoles(ROLES.DISTRIBUTOR),
  userController.getPasswordResetRequestsCount
);

// @route   PUT /api/users/password-reset-requests/:id
// @desc    Process password reset request (approve/reject)
// @access  Distributor only
router.put(
  '/password-reset-requests/:id',
  authorizeRoles(ROLES.DISTRIBUTOR),
  param('id').isMongoId().withMessage('Invalid request ID'),
  body('action').isIn(['approve', 'reject']).withMessage('Action must be approve or reject'),
  body('rejectionReason').optional().trim().isLength({ max: 500 }),
  validate,
  userController.processPasswordResetRequest
);

// @route   GET /api/users
// @desc    Get all users
// @access  Distributor only
router.get(
  '/',
  authorize(PERMISSIONS.USER_READ),
  userController.getUsers
);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Distributor only
router.get(
  '/:id',
  authorize(PERMISSIONS.USER_READ),
  param('id').isMongoId().withMessage('Invalid user ID'),
  validate,
  userController.getUser
);

// @route   POST /api/users
// @desc    Create user
// @access  Distributor only
router.post(
  '/',
  authorize(PERMISSIONS.USER_CREATE),
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('fullName').notEmpty().withMessage('Full name is required'),
    body('role')
      .isIn(['distributor', 'computer_operator', 'order_booker', 'customer'])
      .withMessage('Valid role is required'),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Please enter a valid phone number'),
    body('assignedArea').optional().isString(),
    body('linkedCustomerId').optional().isMongoId()
  ],
  validate,
  userController.createUser
);

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Distributor only
router.put(
  '/:id',
  authorize(PERMISSIONS.USER_UPDATE),
  param('id').isMongoId().withMessage('Invalid user ID'),
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('role')
      .optional()
      .isIn(['distributor', 'computer_operator', 'order_booker', 'customer'])
      .withMessage('Valid role is required'),
    body('phone').optional({ checkFalsy: true }).isMobilePhone('any').withMessage('Please enter a valid phone number'),
    body('assignedArea').optional().isString(),
    body('isActive').optional().isBoolean()
  ],
  validate,
  userController.updateUser
);

// @route   DELETE /api/users/:id
// @desc    Deactivate user (soft delete)
// @access  Distributor only
router.delete(
  '/:id',
  authorize(PERMISSIONS.USER_DELETE),
  param('id').isMongoId().withMessage('Invalid user ID'),
  validate,
  userController.deactivateUser
);

// @route   PUT /api/users/:id/reset-password
// @desc    Reset user password
// @access  Distributor only
router.put(
  '/:id/reset-password',
  authorizeRoles(ROLES.DISTRIBUTOR),
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  validate,
  userController.resetUserPassword
);

module.exports = router;
