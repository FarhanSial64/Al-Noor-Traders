const Purchase = require('../models/Purchase');
const Vendor = require('../models/Vendor');
const { Product, Unit } = require('../models/Product');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');
const { logFinancialTransaction } = require('../middleware/auditLogger');

/**
 * Purchase Controller
 * 
 * CRITICAL: Purchase prices are manually entered by Computer Operator.
 * The system does NOT use fixed product prices.
 */

// @desc    Get all purchases
// @route   GET /api/purchases
// @access  Private
exports.getPurchases = async (req, res) => {
  try {
    const {
      vendor,
      status,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'purchaseDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (vendor) query.vendor = vendor;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.purchaseDate = {};
      if (startDate) query.purchaseDate.$gte = new Date(startDate);
      if (endDate) query.purchaseDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [purchases, total] = await Promise.all([
      Purchase.find(query)
        .populate('vendor', 'businessName vendorCode')
        .populate('createdBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Purchase.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: purchases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching purchases'
    });
  }
};

// @desc    Get single purchase
// @route   GET /api/purchases/:id
// @access  Private
exports.getPurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('vendor')
      .populate('createdBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .populate('receivedBy', 'fullName')
      .populate('items.product', 'name sku');

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    res.json({
      success: true,
      data: purchase
    });
  } catch (error) {
    console.error('Get purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching purchase'
    });
  }
};

// @desc    Create purchase (with manual price entry)
// @route   POST /api/purchases
// @access  Private (Computer Operator, Distributor)
exports.createPurchase = async (req, res) => {
  try {
    const { 
      vendor: vendorId, 
      items, 
      vendorInvoiceNumber,
      vendorInvoiceDate,
      taxAmount = 0,
      otherCharges = 0,
      remarks 
    } = req.body;

    // Get vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (!vendor.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create purchase from inactive vendor'
      });
    }

    // Build purchase items with manually entered prices
    const purchaseItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      // CRITICAL: Use the price entered by KPO, NOT from product master
      const lineTotal = item.quantity * item.purchasePrice;

      purchaseItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        cartons: item.cartons || 0,
        pieces: item.pieces || 0,
        piecesPerCarton: item.piecesPerCarton || product.piecesPerCarton || 1,
        quantity: item.quantity,
        unitName: 'Pieces',
        purchasePrice: item.purchasePrice, // Manually entered price per piece
        costPerUnit: item.purchasePrice,
        lineTotal,
        receivedQuantity: item.quantity // Immediately mark as received
      });
    }

    // Create purchase with received status (no pending)
    const purchase = new Purchase({
      vendor: vendor._id,
      vendorName: vendor.businessName,
      vendorCode: vendor.vendorCode,
      vendorInvoiceNumber,
      vendorInvoiceDate,
      items: purchaseItems,
      taxAmount,
      otherCharges,
      remarks,
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      status: 'received',
      stockUpdated: true,
      stockUpdatedAt: new Date(),
      receivedBy: req.user._id,
      receivedAt: new Date()
    });

    await purchase.save();

    // Immediately update inventory
    for (const item of purchaseItems) {
      await InventoryService.addStock({
        productId: item.product,
        quantity: item.quantity,
        costPerUnit: item.purchasePrice,
        referenceType: 'Purchase',
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        userId: req.user._id,
        userName: req.user.fullName
      });
    }

    // Create accounting entry
    await AccountingService.createPurchaseEntry({
      vendorId: purchase.vendor,
      vendorName: purchase.vendorName,
      purchaseId: purchase._id,
      purchaseNumber: purchase.purchaseNumber,
      amount: purchase.grandTotal,
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: purchase.purchaseDate
    });

    await logFinancialTransaction(req, {
      action: 'CREATE',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: purchase._id,
      entityNumber: purchase.purchaseNumber,
      description: `Purchase created from ${vendor.businessName} - inventory updated`,
      amount: purchase.grandTotal
    });

    res.status(201).json({
      success: true,
      message: 'Purchase created & inventory updated successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating purchase'
    });
  }
};

// @desc    Update purchase (only if not yet received/stock not updated - OR by distributor anytime)
// @route   PUT /api/purchases/:id
// @access  Private (Computer Operator before stock update, Distributor anytime)
exports.updatePurchase = async (req, res) => {
  try {
    const { 
      vendor: vendorId, 
      items, 
      vendorInvoiceNumber,
      vendorInvoiceDate,
      taxAmount = 0,
      otherCharges = 0,
      remarks 
    } = req.body;

    const purchase = await Purchase.findById(req.params.id);
    
    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Check if user is distributor - distributors can edit anytime
    const isDistributor = req.user.role === 'distributor';

    // Non-distributors can only edit if stock has not been updated
    if (purchase.stockUpdated && !isDistributor) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit purchase after stock has been updated. Only distributor can edit.'
      });
    }

    // Store original items for inventory adjustment if stock was already updated
    const originalItems = purchase.stockUpdated ? [...purchase.items] : null;

    // Get vendor if changed
    let vendor = null;
    if (vendorId) {
      vendor = await Vendor.findById(vendorId);
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }
    }

    // Process items if provided
    if (items && items.length > 0) {
      const { Product } = require('../models/Product');
      const purchaseItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        const lineTotal = item.quantity * item.purchasePrice;

        purchaseItems.push({
          product: product._id,
          productName: product.name,
          productSku: product.sku,
          cartons: item.cartons || 0,
          pieces: item.pieces || 0,
          piecesPerCarton: item.piecesPerCarton || product.piecesPerCarton || 1,
          quantity: item.quantity,
          unitName: 'Pieces',
          purchasePrice: item.purchasePrice,
          costPerUnit: item.purchasePrice,
          lineTotal,
          receivedQuantity: purchase.stockUpdated ? item.quantity : 0
        });
      }

      purchase.items = purchaseItems;
    }

    // Update vendor if changed
    if (vendor) {
      purchase.vendor = vendor._id;
      purchase.vendorName = vendor.businessName;
      purchase.vendorCode = vendor.vendorCode;
    }

    // Update other fields
    if (vendorInvoiceNumber !== undefined) purchase.vendorInvoiceNumber = vendorInvoiceNumber;
    if (vendorInvoiceDate !== undefined) purchase.vendorInvoiceDate = vendorInvoiceDate;
    if (taxAmount !== undefined) purchase.taxAmount = taxAmount;
    if (otherCharges !== undefined) purchase.otherCharges = otherCharges;
    if (remarks !== undefined) purchase.remarks = remarks;

    // If stock was already updated (distributor editing), adjust inventory
    if (originalItems && items && items.length > 0) {
      // First, reverse the original stock entries
      for (const origItem of originalItems) {
        await InventoryService.removeStock({
          productId: origItem.product,
          quantity: origItem.quantity,
          referenceType: 'PurchaseAdjustment',
          referenceId: purchase._id,
          referenceNumber: `${purchase.purchaseNumber}-REV`,
          userId: req.user._id,
          userName: req.user.fullName
        });
      }

      // Then, add the new stock entries
      for (const newItem of purchase.items) {
        await InventoryService.addStock({
          productId: newItem.product,
          quantity: newItem.quantity,
          costPerUnit: newItem.purchasePrice,
          referenceType: 'PurchaseAdjustment',
          referenceId: purchase._id,
          referenceNumber: `${purchase.purchaseNumber}-ADJ`,
          userId: req.user._id,
          userName: req.user.fullName
        });
      }

      // Update accounting entry
      await AccountingService.createPurchaseEntry({
        vendorId: purchase.vendor,
        vendorName: purchase.vendorName,
        purchaseId: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        amount: purchase.grandTotal,
        userId: req.user._id,
        userName: req.user.fullName,
        entryDate: purchase.purchaseDate,
        isAdjustment: true
      });
    }

    await purchase.save();

    await logFinancialTransaction(req, {
      action: 'UPDATE',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: purchase._id,
      entityNumber: purchase.purchaseNumber,
      description: originalItems ? `Purchase updated by distributor with inventory adjustment` : `Purchase updated`,
      amount: purchase.grandTotal
    });

    res.json({
      success: true,
      message: 'Purchase updated successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Update purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating purchase'
    });
  }
};

// @desc    Receive goods and update inventory
// @route   PUT /api/purchases/:id/receive
// @access  Private
exports.receiveGoods = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot receive goods for cancelled purchase'
      });
    }

    if (purchase.stockUpdated) {
      return res.status(400).json({
        success: false,
        message: 'Stock already updated for this purchase'
      });
    }

    // Update inventory for each item
    for (const item of purchase.items) {
      await InventoryService.addStock({
        productId: item.product,
        quantity: item.quantity,
        costPerUnit: item.purchasePrice, // Use the manually entered price
        referenceType: 'Purchase',
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        userId: req.user._id,
        userName: req.user.fullName
      });

      item.receivedQuantity = item.quantity;
    }

    purchase.status = 'received';
    purchase.stockUpdated = true;
    purchase.stockUpdatedAt = new Date();
    purchase.receivedBy = req.user._id;
    purchase.receivedAt = new Date();
    await purchase.save();

    // Create accounting entry
    await AccountingService.createPurchaseEntry({
      vendorId: purchase.vendor,
      vendorName: purchase.vendorName,
      purchaseId: purchase._id,
      purchaseNumber: purchase.purchaseNumber,
      amount: purchase.grandTotal,
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: purchase.purchaseDate
    });

    await logFinancialTransaction(req, {
      action: 'UPDATE',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: purchase._id,
      entityNumber: purchase.purchaseNumber,
      description: 'Goods received and stock updated',
      amount: purchase.grandTotal
    });

    res.json({
      success: true,
      message: 'Goods received and inventory updated successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Receive goods error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error receiving goods'
    });
  }
};

// @desc    Update purchase status
// @route   PUT /api/purchases/:id/status
// @access  Private
exports.updatePurchaseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    if (purchase.stockUpdated && status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel purchase after stock is updated'
      });
    }

    const previousStatus = purchase.status;
    purchase.status = status;

    if (status === 'approved') {
      purchase.approvedBy = req.user._id;
      purchase.approvedAt = new Date();
    }

    await purchase.save();

    await logFinancialTransaction(req, {
      action: status === 'approved' ? 'APPROVE' : 'CANCEL',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: purchase._id,
      entityNumber: purchase.purchaseNumber,
      description: `Purchase status changed from ${previousStatus} to ${status}`,
      previousValues: { status: previousStatus },
      newValues: { status }
    });

    res.json({
      success: true,
      message: 'Purchase status updated successfully',
      data: purchase
    });
  } catch (error) {
    console.error('Update purchase status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating purchase status'
    });
  }
};
