const { Product, Category, Brand, Unit } = require('../models/Product');
const { InventoryValuation } = require('../models/Inventory');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Product Controller
 * Handles product, category, brand, and unit CRUD operations
 */

// ==================== PRODUCTS ====================

// @desc    Get all products
// @route   GET /api/products
// @access  Private
exports.getProducts = async (req, res) => {
  try {
    const { 
      search, 
      category, 
      brand, 
      isActive,
      page = 1, 
      limit = 50,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    // Search by name, sku, or barcode
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('brand', 'name')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching products'
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get valuation info
    const valuation = await InventoryValuation.findOne({ product: product._id });

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        valuation: valuation ? {
          currentStock: valuation.currentStock,
          averageCost: valuation.averageCost,
          totalValue: valuation.totalValue
        } : null
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product'
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
exports.createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
      createdBy: req.user._id
    };

    const product = await Product.create(productData);

    // Create initial valuation record
    await InventoryValuation.create({
      product: product._id,
      currentStock: 0,
      averageCost: 0,
      totalValue: 0
    });

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      module: 'product',
      entityType: 'Product',
      entityId: product._id,
      description: `Created product: ${product.name} (${product.sku})`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating product'
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousValues = product.toObject();

    Object.assign(product, req.body, { updatedBy: req.user._id });
    await product.save();

    // Audit log
    await createAuditLog({
      action: 'UPDATE',
      module: 'product',
      entityType: 'Product',
      entityId: product._id,
      description: `Updated product: ${product.name}`,
      previousValues,
      newValues: product.toObject(),
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating product'
    });
  }
};

// @desc    Delete (deactivate) product
// @route   DELETE /api/products/:id
// @access  Private
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Soft delete - just deactivate
    product.isActive = false;
    product.updatedBy = req.user._id;
    await product.save();

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      module: 'product',
      entityType: 'Product',
      entityId: product._id,
      description: `Deactivated product: ${product.name}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Product deactivated successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting product'
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    })
    .populate('category', 'name')
    .populate('brand', 'name')
    .sort({ currentStock: 1 });

    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching low stock products'
    });
  }
};

// ==================== CATEGORIES ====================

exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching categories'
    });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating category'
    });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating category'
    });
  }
};

// ==================== BRANDS ====================

exports.getBrands = async (req, res) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });
    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error('Get brands error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching brands'
    });
  }
};

exports.createBrand = async (req, res) => {
  try {
    const brand = await Brand.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Brand created successfully',
      data: brand
    });
  } catch (error) {
    console.error('Create brand error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating brand'
    });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: 'Brand not found'
      });
    }

    res.json({
      success: true,
      message: 'Brand updated successfully',
      data: brand
    });
  } catch (error) {
    console.error('Update brand error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating brand'
    });
  }
};

// ==================== UNITS ====================

exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.find().sort({ name: 1 });
    res.json({
      success: true,
      data: units
    });
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching units'
    });
  }
};

exports.createUnit = async (req, res) => {
  try {
    const unit = await Unit.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit
    });
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating unit'
    });
  }
};

exports.updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found'
      });
    }

    res.json({
      success: true,
      message: 'Unit updated successfully',
      data: unit
    });
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating unit'
    });
  }
};
