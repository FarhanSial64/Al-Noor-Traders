const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Validation rules
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('role')
    .isIn(['distributor', 'computer_operator', 'order_booker', 'customer'])
    .withMessage('Valid role is required')
];

const customerSignupValidation = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('businessName')
    .trim()
    .notEmpty()
    .withMessage('Business/Shop name is required'),
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

const forceChangePasswordValidation = [
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
];

const forgotPasswordValidation = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters')
];

const updateProfileValidation = [
  body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('profilePicture').optional()
];

// Routes
router.post('/login', loginValidation, validate, authController.login);
router.post('/register', authenticate, registerValidation, validate, authController.register);
router.post('/customer-signup', customerSignupValidation, validate, authController.customerSignup);
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);

// Password reset with token (Public routes)
router.get('/verify-reset-token/:token', authController.verifyResetToken);
router.post('/reset-password/:token', authController.resetPasswordWithToken);

router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, updateProfileValidation, validate, authController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidation, validate, authController.changePassword);
router.put('/force-change-password', authenticate, forceChangePasswordValidation, validate, authController.forceChangePassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
