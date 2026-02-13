const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');
const { authorize, PERMISSIONS } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');

// Validation rules
const productValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('category').isMongoId().withMessage('Valid category ID is required'),
  body('brand').isMongoId().withMessage('Valid brand ID is required'),
  body('piecesPerCarton').optional().isInt({ min: 1 }).withMessage('Pieces per carton must be at least 1')
];

const categoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required')
];

const brandValidation = [
  body('name').trim().notEmpty().withMessage('Brand name is required')
];

const unitValidation = [
  body('name').trim().notEmpty().withMessage('Unit name is required'),
  body('abbreviation').trim().notEmpty().withMessage('Abbreviation is required')
];

// ========== PRODUCT ROUTES ==========
router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_READ),
  productController.getProducts
);

router.get(
  '/low-stock',
  authenticate,
  authorize(PERMISSIONS.INVENTORY_READ),
  productController.getLowStockProducts
);

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_READ),
  param('id').isMongoId().withMessage('Invalid product ID'),
  validate,
  productController.getProduct
);

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_CREATE),
  productValidation,
  validate,
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  param('id').isMongoId().withMessage('Invalid product ID'),
  validate,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_DELETE),
  param('id').isMongoId().withMessage('Invalid product ID'),
  validate,
  productController.deleteProduct
);

// ========== CATEGORY ROUTES ==========
router.get(
  '/master/categories',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_READ_MASTER),
  productController.getCategories
);

router.post(
  '/master/categories',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_CREATE),
  categoryValidation,
  validate,
  productController.createCategory
);

router.put(
  '/master/categories/:id',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  param('id').isMongoId().withMessage('Invalid category ID'),
  categoryValidation,
  validate,
  productController.updateCategory
);

// ========== BRAND ROUTES ==========
router.get(
  '/master/brands',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_READ_MASTER),
  productController.getBrands
);

router.post(
  '/master/brands',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_CREATE),
  brandValidation,
  validate,
  productController.createBrand
);

router.put(
  '/master/brands/:id',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  param('id').isMongoId().withMessage('Invalid brand ID'),
  brandValidation,
  validate,
  productController.updateBrand
);

// ========== UNIT ROUTES ==========
router.get(
  '/master/units',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_READ_MASTER),
  productController.getUnits
);

router.post(
  '/master/units',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_CREATE),
  unitValidation,
  validate,
  productController.createUnit
);

router.put(
  '/master/units/:id',
  authenticate,
  authorize(PERMISSIONS.PRODUCT_UPDATE),
  param('id').isMongoId().withMessage('Invalid unit ID'),
  unitValidation,
  validate,
  productController.updateUnit
);

module.exports = router;
