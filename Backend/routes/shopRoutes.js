const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const shopController = require('../controllers/shopController');
const { authenticate } = require('../middleware/auth');
const { authorizeRoles, ROLES } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// All routes require authentication and customer role
router.use(authenticate);
router.use(authorizeRoles(ROLES.CUSTOMER));

// @route   GET /api/shop/products
// @desc    Get all products for shop with calculated prices
// @access  Customer only
router.get('/products', shopController.getShopProducts);

// @route   GET /api/shop/products/:id
// @desc    Get single product details
// @access  Customer only
router.get(
  '/products/:id',
  param('id').isMongoId().withMessage('Invalid product ID'),
  validate,
  shopController.getProductDetail
);

// @route   GET /api/shop/categories
// @desc    Get all categories for filtering
// @access  Customer only
router.get('/categories', shopController.getCategories);

// @route   POST /api/shop/cart
// @desc    Place order from cart
// @access  Customer only
router.post(
  '/order',
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.product').isMongoId().withMessage('Valid product ID required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('deliveryAddress').optional().trim(),
    body('notes').optional().trim()
  ],
  validate,
  shopController.placeOrder
);

// @route   GET /api/shop/orders
// @desc    Get customer's order history
// @access  Customer only
router.get('/orders', shopController.getMyOrders);

// @route   GET /api/shop/loyalty
// @desc    Get customer loyalty points and tier
// @access  Customer only
router.get('/loyalty', shopController.getLoyaltyData);

// @route   GET /api/shop/profile
// @desc    Get customer profile with loyalty data (combined for performance)
// @access  Customer only
router.get('/profile', shopController.getCustomerProfile);

// @route   GET /api/shop/orders/:id
// @desc    Get order details
// @access  Customer only
router.get(
  '/orders/:id',
  param('id').isMongoId().withMessage('Invalid order ID'),
  validate,
  shopController.getOrderDetail
);

module.exports = router;
