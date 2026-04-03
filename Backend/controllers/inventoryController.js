const { Product } = require('../models/Product');
const { InventoryTransaction, InventoryValuation } = require('../models/Inventory');
const InventoryService = require('../services/inventoryService');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Inventory Controller
 * 
 * Handles inventory queries, stock movements, and adjustments
 */

// @desc    Get current stock for all products
// @route   GET /api/inventory/stock
// @access  Private
exports.getStock = async (req, res) => {
  try {
    const {
      category,
      brand,
      lowStockOnly,
      search,
      page = 1,
      limit = 50
    } = req.query;

    // DEBUG: Log start
    const totalProducts = await Product.countDocuments({ isActive: true });
    console.log(`[getStock] Starting inventory check for ${totalProducts} products`);

    const query = { isActive: true };

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (lowStockOnly === 'true') {
      // Will filter after query based on minimumStock
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }

    let products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .select('sku name barcode currentStock minimumStock category brand piecesPerCarton')
      .lean();

    // CRITICAL: Recalculate stock dynamically for each product
    const enrichedProducts = [];
    for (const product of products) {
      try {
        const { currentStock } = await InventoryService.calculateDynamicStock(product._id);
        enrichedProducts.push({
          ...product,
          currentStock: currentStock, // Use DYNAMIC calculation, not stored value
          isDynamic: true
        });
      } catch (calcError) {
        console.warn(`[getStock] Error calculating stock for ${product.sku}, using stored value:`, calcError.message);
        enrichedProducts.push(product); // Fallback to stored value
      }
    }

    if (lowStockOnly === 'true') {
      enrichedProducts.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0));
    }

    // Pagination
    const total = enrichedProducts.length;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProducts = enrichedProducts.slice(skip, skip + parseInt(limit));

    // Calculate totals
    const totalItems = enrichedProducts.reduce((sum, p) => sum + (p.currentStock || 0), 0);

    console.log(`[getStock] Total items across all products: ${totalItems} (using DYNAMIC calculation)`);

    res.json({
      success: true,
      data: paginatedProducts,
      summary: {
        totalProducts: enrichedProducts.length,
        totalItems,
        lowStockCount: enrichedProducts.filter(p => (p.currentStock || 0) <= (p.minimumStock || 0)).length,
        outOfStockCount: enrichedProducts.filter(p => (p.currentStock || 0) === 0).length,
        calculationMethod: 'DYNAMIC_FROM_PURCHASES_ORDERS'
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stock'
    });
  }
};

// @desc    Get stock for specific product
// @route   GET /api/inventory/stock/:productId
// @access  Private
exports.getProductStock = async (req, res) => {
  try {
    console.log(`[getProductStock] Fetching stock for product ${req.params.productId}`);
    
    // Use DYNAMIC calculation instead of stored value
    const stockInfo = await InventoryService.getStockInfoDynamic(req.params.productId);

    if (!stockInfo) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    console.log(`[getProductStock] Calculated stock: ${stockInfo.currentStock} (breakdown: O=${stockInfo.stockBreakdown.opening}, P=${stockInfo.stockBreakdown.purchased}, S=${stockInfo.stockBreakdown.sold})`);

    res.json({
      success: true,
      data: stockInfo
    });
  } catch (error) {
    console.error('Get product stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product stock'
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/inventory/low-stock
// @access  Private
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await InventoryService.getLowStockProducts();

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching low stock products'
    });
  }
};

// @desc    Get stock movements for a product
// @route   GET /api/inventory/movements/:productId
// @access  Private
exports.getStockMovements = async (req, res) => {
  try {
    const { startDate, endDate, transactionType, page = 1, limit = 50 } = req.query;

    const options = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      transactionType,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    const movements = await InventoryService.getStockMovements(req.params.productId, options);

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stock movements'
    });
  }
};

// @desc    Get all stock movements
// @route   GET /api/inventory/movements
// @access  Private
exports.getAllStockMovements = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      transactionType,
      productId,
      page = 1,
      limit = 50,
      sortBy = 'transactionDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (productId) query.product = productId;
    if (transactionType) query.transactionType = transactionType;

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('product', 'sku name')
        .populate('createdBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      InventoryTransaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stock movements'
    });
  }
};

// @desc    Create stock adjustment
// @route   POST /api/inventory/adjustment
// @access  Private
exports.createStockAdjustment = async (req, res) => {
  try {
    const { productId, quantity, adjustmentType, reason, batchNumber, notes } = req.body;

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    let transaction;
    const numQuantity = parseFloat(quantity);

    if (adjustmentType === 'add') {
      transaction = await InventoryService.addStock({
        productId,
        quantity: numQuantity,
        costPerUnit: product.costPrice || 0,
        referenceType: 'Adjustment',
        referenceId: product._id,
        referenceNumber: `ADJ-${Date.now()}`,
        userId: req.user._id,
        userName: req.user.fullName || 'System',
        transactionDate: new Date(),
        transactionType: 'adjustment_in'
      });
    } else if (adjustmentType === 'remove') {
      transaction = await InventoryService.removeStock({
        productId,
        quantity: numQuantity,
        referenceType: 'Adjustment',
        referenceId: product._id,
        referenceNumber: `ADJ-${Date.now()}`,
        userId: req.user._id,
        userName: req.user.fullName || 'System',
        transactionDate: new Date(),
        transactionType: 'adjustment_out'
      });
    } else if (adjustmentType === 'set') {
      transaction = await InventoryService.adjustStock({
        productId,
        newQuantity: numQuantity,
        reason,
        referenceNumber: `ADJ-${Date.now()}`,
        userId: req.user._id,
        userName: req.user.fullName || 'System'
      });
    }

    // Audit log
    await createAuditLog({
      action: 'STOCK_ADJUST',
      module: 'inventory',
      entityType: 'Product',
      entityId: product._id,
      description: `Stock ${adjustmentType}: ${product.sku} - ${product.name}, Qty: ${quantity}, Reason: ${reason}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      previousValues: { stock: transaction.oldQuantity || transaction.stockBefore },
      newValues: { stock: transaction.newQuantity || transaction.stockAfter }
    });

    // Fetch updated product
    const updatedProduct = await Product.findById(productId)
      .select('productCode productName currentStock reorderLevel');

    res.status(201).json({
      success: true,
      message: 'Stock adjustment created successfully',
      data: {
        transaction,
        product: updatedProduct
      }
    });
  } catch (error) {
    console.error('Create stock adjustment error:', error);

    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating stock adjustment'
    });
  }
};

// @desc    Get stock adjustments history
// @route   GET /api/inventory/adjustments
// @access  Private
exports.getStockAdjustments = async (req, res) => {
  try {
    const { startDate, endDate, productId, page = 1, limit = 50 } = req.query;

    const query = {
      transactionType: { $in: ['adjustment_in', 'adjustment_out'] }
    };

    if (productId) query.product = productId;

    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) query.transactionDate.$gte = new Date(startDate);
      if (endDate) query.transactionDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [adjustments, total] = await Promise.all([
      InventoryTransaction.find(query)
        .populate('product', 'productCode productName')
        .populate('performedBy', 'fullName')
        .sort({ transactionDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      InventoryTransaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: adjustments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get stock adjustments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching stock adjustments'
    });
  }
};

// @desc    Get inventory valuation report
// @route   GET /api/inventory/valuation
// @access  Private
exports.getInventoryValuation = async (req, res) => {
  try {
    const { category, brand, asOfDate } = req.query;

    const valuation = await InventoryService.getInventoryValuation({
      category,
      brand,
      asOfDate: asOfDate ? new Date(asOfDate) : new Date()
    });

    res.json({
      success: true,
      data: valuation
    });
  } catch (error) {
    console.error('Get inventory valuation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching inventory valuation'
    });
  }
};

// @desc    Get product valuation
// @route   GET /api/inventory/valuation/:productId
// @access  Private
exports.getProductValuation = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('category', 'categoryName')
      .populate('brand', 'brandName');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const valuation = await InventoryValuation.findOne({ product: req.params.productId });

    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          productCode: product.productCode,
          productName: product.productName,
          category: product.category?.categoryName,
          brand: product.brand?.brandName
        },
        valuation: valuation || {
          quantityOnHand: product.currentStock,
          weightedAverageCost: 0,
          totalValue: 0
        },
        currentStock: product.currentStock
      }
    });
  } catch (error) {
    console.error('Get product valuation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product valuation'
    });
  }
};

// @desc    Get product pricing report (avg cost and sale prices)
// @route   GET /api/inventory/pricing-report
// @access  Private (all roles, but cost hidden for order_booker)
exports.getProductPricingReport = async (req, res) => {
  try {
    const { search, category, brand } = req.query;
    const userRole = req.user.role;

    // Build query
    const query = { isActive: true };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (brand) query.brand = brand;

    // Get products
    const products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .select('sku name piecesPerCarton currentStock category brand')
      .sort({ name: 1 })
      .lean();

    // Get all valuations
    const productIds = products.map(p => p._id);
    const valuations = await InventoryValuation.find({ product: { $in: productIds } }).lean();
    const valuationMap = {};
    valuations.forEach(v => {
      valuationMap[v.product.toString()] = v;
    });

    // Build report data
    const reportData = products.map(product => {
      const valuation = valuationMap[product._id.toString()];
      const avgCostPerPiece = valuation?.averageCost || 0;
      const piecesPerCarton = product.piecesPerCarton || 1;
      
      // Calculate prices
      const avgCostPerCarton = avgCostPerPiece * piecesPerCarton;
      const suggestedSalePricePerPiece = avgCostPerPiece > 0 ? Math.round(avgCostPerPiece * 1.08 * 100) / 100 : 0;
      const suggestedSalePricePerCarton = suggestedSalePricePerPiece * piecesPerCarton;

      const item = {
        _id: product._id,
        sku: product.sku,
        name: product.name,
        category: product.category?.name || '-',
        brand: product.brand?.name || '-',
        piecesPerCarton: piecesPerCarton,
        currentStock: product.currentStock || 0,
        suggestedSalePricePerPiece,
        suggestedSalePricePerCarton
      };

      // Only include cost for distributor and computer_operator
      if (userRole === 'distributor' || userRole === 'computer_operator') {
        item.avgCostPerPiece = avgCostPerPiece;
        item.avgCostPerCarton = avgCostPerCarton;
        item.profitPerPiece = suggestedSalePricePerPiece - avgCostPerPiece;
        item.profitPerCarton = suggestedSalePricePerCarton - avgCostPerCarton;
        item.profitMargin = avgCostPerPiece > 0 ? ((suggestedSalePricePerPiece - avgCostPerPiece) / avgCostPerPiece * 100).toFixed(1) : 0;
      }

      return item;
    });

    res.json({
      success: true,
      data: reportData,
      userRole: userRole,
      showCost: userRole === 'distributor' || userRole === 'computer_operator'
    });
  } catch (error) {
    console.error('Get product pricing report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching pricing report'
    });
  }
};
// @desc    CRITICAL FIX: Recalculate all inventory from actual Purchase/Order transactions
// @route   POST /api/inventory/recalculate-all
// @access  Private (Distributor, Computer Operator only)
// @purpose After deleting purchases/orders, run this to correct any stale inventory values
exports.recalculateAllInventory = async (req, res) => {
  try {
    // Verify only authorized users
    const allowedRoles = ['distributor', 'computer_operator'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Distributor and Computer Operator can recalculate inventory'
      });
    }

    console.log(`[recalculateAllInventory] Starting full inventory recalculation by ${req.user.fullName} (${req.user.role})`);

    // Recalculate all stock
    const results = await InventoryService.recalculateAllStockFromTransactions();

    // Log the action
    await createAuditLog({
      action: 'INVENTORY_RECALCULATE_ALL',
      module: 'inventory',
      entityType: 'Inventory',
      entityId: 'all-products',
      description: `Full inventory recalculation - Processed: ${results.processed}, Corrected: ${results.corrected}, Errors: ${results.errors}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Inventory recalculation complete: ${results.corrected}/${results.processed} products corrected`,
      data: {
        summary: {
          processed: results.processed,
          corrected: results.corrected,
          errors: results.errors,
          timestamp: new Date()
        },
        details: results.products.filter(p => p.corrected).slice(0, 50) // Show first 50 corrected items
      }
    });
  } catch (error) {
    console.error('Recalculate inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recalculating inventory'
    });
  }
};

// @desc    sync a specific product's stock from transactions
// @route   POST /api/inventory/sync-stock/:productId
// @access  Private
exports.syncProductStock = async (req, res) => {
  try {
    const productId = req.params.productId;
    
    console.log(`[syncProductStock] Syncing stock for product ${productId}`);

    const result = await InventoryService.syncProductStockFromTransactions(productId);

    res.json({
      success: true,
      message: 'Product stock synchronized',
      data: result
    });
  } catch (error) {
    console.error('Sync product stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error syncing product stock'
    });
  }
};