const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const settingsController = require('../controllers/settingsController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles, ROLES } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/settings/business
// @desc    Get business settings
// @access  All authenticated users
router.get('/business', settingsController.getBusinessSettings);

// @route   PUT /api/settings/business
// @desc    Update business settings
// @access  Distributor only
router.put(
  '/business',
  authorizeRoles(ROLES.DISTRIBUTOR),
  [
    body('businessName').optional().trim().notEmpty().withMessage('Business name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('phone.primary').optional().trim(),
    body('phone.secondary').optional().trim(),
    body('phone.whatsapp').optional().trim()
  ],
  validate,
  settingsController.updateBusinessSettings
);

module.exports = router;
