const Purchase = require('../models/Purchase');
const Vendor = require('../models/Vendor');
const { Product, Unit } = require('../models/Product');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');
const JournalEntry = require('../models/JournalEntry');
const LedgerEntry = require('../models/LedgerEntry');
const { logFinancialTransaction } = require('../middleware/auditLogger');
const mongoose = require('mongoose');

/**
 * Purchase Controller
 * 
 * CRITICAL: Purchase prices are manually entered by Computer Operator.
 * The system does NOT use fixed product prices.
 * 
 * After every purchase save/edit/delete:
 * - Recalculate weighted average cost price from ALL purchases
 * - Update sale price with 8% margin
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
      .populate('items.product', 'name sku piecesPerCarton');

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
  const session = await mongoose.startSession();
  session.startTransaction();
  
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
    const vendor = await Vendor.findById(vendorId).session(session);
    if (!vendor) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (!vendor.isActive) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Cannot create purchase from inactive vendor'
      });
    }

    // Build purchase items with manually entered prices
    const purchaseItems = [];
    const affectedProductIds = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      // Validate purchase price
      const purchasePrice = Math.round(parseFloat(item.purchasePrice) * 100) / 100;
      if (isNaN(purchasePrice) || purchasePrice < 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Invalid purchase price for ${product.name}`
        });
      }

      const quantity = parseInt(item.quantity);
      if (isNaN(quantity) || quantity < 1) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${product.name}`
        });
      }

      const lineTotal = Math.round(quantity * purchasePrice * 100) / 100;

      purchaseItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        cartons: item.cartons || 0,
        pieces: item.pieces || 0,
        piecesPerCarton: item.piecesPerCarton || product.piecesPerCarton || 1,
        quantity: quantity,
        unitName: 'Pieces',
        purchasePrice: purchasePrice,
        costPerUnit: purchasePrice,
        lineTotal,
        receivedQuantity: quantity
      });
      
      affectedProductIds.push(product._id);
    }

    // Create purchase with received status (no pending)
    const purchase = new Purchase({
      vendor: vendor._id,
      vendorName: vendor.businessName,
      vendorCode: vendor.vendorCode,
      vendorInvoiceNumber,
      vendorInvoiceDate,
      items: purchaseItems,
      taxAmount: Math.round(parseFloat(taxAmount || 0) * 100) / 100,
      otherCharges: Math.round(parseFloat(otherCharges || 0) * 100) / 100,
      remarks,
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      status: 'received',
      stockUpdated: true,
      stockUpdatedAt: new Date(),
      receivedBy: req.user._id,
      receivedAt: new Date()
    });

    await purchase.save({ session });

    // Update inventory for each item
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

    // Collect product IDs for pricing recalculation AFTER transaction
    const uniqueProductIds = [...new Set(affectedProductIds.map(id => id.toString()))];

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

    await session.commitTransaction();
    session.endSession();

    // CRITICAL: Recalculate pricing AFTER transaction commits to avoid write conflicts
    try {
      await InventoryService.recalculatePricingForProducts(uniqueProductIds);
    } catch (pricingError) {
      console.error('Pricing recalculation error (non-fatal):', pricingError);
    }

    await logFinancialTransaction(req, {
      action: 'CREATE',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: purchase._id,
      entityNumber: purchase.purchaseNumber,
      description: `Purchase created from ${vendor.businessName} - inventory & pricing updated`,
      amount: purchase.grandTotal
    });

    res.status(201).json({
      success: true,
      message: 'Purchase created & pricing recalculated successfully',
      data: purchase
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Create purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating purchase'
    });
  }
};

// @desc    Update purchase (KPO and Distributor can edit at ANY stage)
// @route   PUT /api/purchases/:id
// @access  Private (Computer Operator, Distributor)
exports.updatePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
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

    const purchase = await Purchase.findById(req.params.id).session(session);
    
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // KPO and Distributor can edit at any stage
    const allowedRoles = ['distributor', 'computer_operator'];
    if (!allowedRoles.includes(req.user.role)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'Only KPO and Distributor can edit purchases'
      });
    }

    // Collect all affected product IDs (both original and new)
    const affectedProductIds = new Set();
    const originalVendorId = purchase.vendor;
    const originalVendorName = purchase.vendorName;
    const originalGrandTotal = purchase.grandTotal;
    
    // Store original items for inventory adjustment if stock was already updated
    const originalItems = purchase.stockUpdated ? [...purchase.items] : null;
    if (originalItems) {
      originalItems.forEach(item => affectedProductIds.add(item.product.toString()));
    }

    // Get vendor if changed
    let vendor = null;
    if (vendorId) {
      vendor = await Vendor.findById(vendorId).session(session);
      if (!vendor) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }
    }

    // Process items if provided
    if (items && items.length > 0) {
      const purchaseItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) {
          await session.abortTransaction();
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        // Validate and round prices
        const purchasePrice = Math.round(parseFloat(item.purchasePrice) * 100) / 100;
        const quantity = parseInt(item.quantity);
        
        if (isNaN(purchasePrice) || purchasePrice < 0) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid purchase price for ${product.name}`
          });
        }
        
        if (isNaN(quantity) || quantity < 1) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Invalid quantity for ${product.name}`
          });
        }

        const lineTotal = Math.round(quantity * purchasePrice * 100) / 100;

        purchaseItems.push({
          product: product._id,
          productName: product.name,
          productSku: product.sku,
          cartons: item.cartons || 0,
          pieces: item.pieces || 0,
          piecesPerCarton: item.piecesPerCarton || product.piecesPerCarton || 1,
          quantity: quantity,
          unitName: 'Pieces',
          purchasePrice: purchasePrice,
          costPerUnit: purchasePrice,
          lineTotal,
          receivedQuantity: purchase.stockUpdated ? quantity : 0
        });
        
        affectedProductIds.add(product._id.toString());
      }

      purchase.items = purchaseItems;
    }

    // Update vendor if changed
    if (vendor) {
      purchase.vendor = vendor._id;
      purchase.vendorName = vendor.businessName;
      purchase.vendorCode = vendor.vendorCode;
    }

    // Update other fields with proper rounding
    if (vendorInvoiceNumber !== undefined) purchase.vendorInvoiceNumber = vendorInvoiceNumber;
    if (vendorInvoiceDate !== undefined) purchase.vendorInvoiceDate = vendorInvoiceDate;
    if (taxAmount !== undefined) purchase.taxAmount = Math.round(parseFloat(taxAmount || 0) * 100) / 100;
    if (otherCharges !== undefined) purchase.otherCharges = Math.round(parseFloat(otherCharges || 0) * 100) / 100;
    if (remarks !== undefined) purchase.remarks = remarks;

    // If stock was already updated, adjust inventory using difference method
    if (originalItems && items && items.length > 0) {
      // First, reverse the original stock entries (skip stock check - this is an adjustment)
      for (const origItem of originalItems) {
        await InventoryService.removeStock({
          productId: origItem.product,
          quantity: origItem.quantity,
          referenceType: 'PurchaseAdjustment',
          referenceId: purchase._id,
          referenceNumber: `${purchase.purchaseNumber}-REV`,
          userId: req.user._id,
          userName: req.user.fullName,
          skipStockCheck: true // Skip validation for adjustments
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

    }

    await purchase.save({ session });

    // Update accounting entry based on actual difference (prevents duplicate payables)
    // Only for purchases that already posted stock/accounting
    if (purchase.stockUpdated) {
      await AccountingService.updatePurchaseEntry({
        purchaseId: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        oldVendorId: originalVendorId,
        oldVendorName: originalVendorName,
        newVendorId: purchase.vendor,
        newVendorName: purchase.vendorName,
        oldAmount: originalGrandTotal,
        newAmount: purchase.grandTotal,
        userId: req.user._id,
        userName: req.user.fullName,
        entryDate: purchase.purchaseDate
      });
    }

    // Collect product IDs for pricing recalculation AFTER transaction
    const uniqueProductIds = [...affectedProductIds];

    await session.commitTransaction();
    session.endSession();

    // CRITICAL: Recalculate pricing AFTER transaction commits to avoid write conflicts
    // This uses aggregation which reads committed data
    try {
      await InventoryService.recalculatePricingForProducts(uniqueProductIds);
    } catch (pricingError) {
      console.error('Pricing recalculation error (non-fatal):', pricingError);
      // Don't fail the request - pricing can be recalculated later
    }

    // Keep static vendor balance in sync with dynamic payable calculation
    await AccountingService.syncVendorBalance(purchase.vendor);
    if (String(originalVendorId) !== String(purchase.vendor)) {
      await AccountingService.syncVendorBalance(originalVendorId);
    }

    await logFinancialTransaction(req, {
      action: 'UPDATE',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: purchase._id,
      entityNumber: purchase.purchaseNumber,
      description: originalItems ? `Purchase updated with inventory & pricing adjustment` : `Purchase updated with pricing recalculation`,
      amount: purchase.grandTotal
    });

    res.json({
      success: true,
      message: 'Purchase updated & pricing recalculated successfully',
      data: purchase
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
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

// @desc    Delete purchase (KPO and Distributor only)
// @route   DELETE /api/purchases/:id
// @access  Private (Computer Operator, Distributor)
exports.deletePurchase = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    
    if (!purchase) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    // Only KPO and Distributor can delete
    const allowedRoles = ['distributor', 'computer_operator'];
    if (!allowedRoles.includes(req.user.role)) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'Only KPO and Distributor can delete purchases'
      });
    }

    // Collect affected product IDs
    const affectedProductIds = purchase.items.map(item => item.product.toString());
    const journalCountBefore = await JournalEntry.countDocuments({ sourceId: purchase._id });
    const ledgerCountBefore = await LedgerEntry.countDocuments({ sourceId: purchase._id });
    const hasPurchaseAccounting = await JournalEntry.exists({ sourceType: 'Purchase', sourceId: purchase._id });

    console.log(`[deletePurchase] Deleting purchase ${purchase.purchaseNumber} with ${purchase.items.length} items, affected products: ${affectedProductIds.length}`);

    // If stock was updated, reverse it
    if (purchase.stockUpdated) {
      for (const item of purchase.items) {
        console.log(`[deletePurchase] Reversing stock for product ${item.productSku}: qty=${item.quantity}`);
        // For KPO/Distributor deletions, allow stock to go negative if necessary
        // This is an administrative action and stock adjustments will be handled
        await InventoryService.removeStock({
          productId: item.product,
          quantity: item.quantity,
          referenceType: 'PurchaseDelete',
          referenceId: purchase._id,
          referenceNumber: `${purchase.purchaseNumber}-DEL`,
          userId: req.user._id,
          userName: req.user.fullName,
          transactionType: 'purchase_reversal',
          skipStockCheck: true // KPO/Distributor can delete regardless of stock level
        });
      }
    }

    // Reverse accounting entries only if source purchase accounting exists
    if (hasPurchaseAccounting) {
      await AccountingService.reversePurchaseEntry({
        purchaseId: purchase._id,
        purchaseNumber: purchase.purchaseNumber,
        vendorId: purchase.vendor,
        vendorName: purchase.vendorName,
        amount: purchase.grandTotal,
        userId: req.user._id,
        userName: req.user.fullName
      });
    } else {
      console.log(`[deletePurchase] No source purchase journal found for ${purchase.purchaseNumber}; skipping AP reversal.`);
    }

    // Store purchase info for logging
    const purchaseNumber = purchase.purchaseNumber;
    const vendorName = purchase.vendorName;
    const grandTotal = purchase.grandTotal;
    const vendorId = purchase.vendor;

    // Delete the purchase
    await Purchase.findByIdAndDelete(req.params.id).session(session);

    // Collect product IDs for pricing recalculation AFTER transaction
    const uniqueProductIds = [...new Set(affectedProductIds)];

    await session.commitTransaction();
    session.endSession();

    // CRITICAL: Recalculate pricing AFTER transaction commits to avoid write conflicts
    try {
      console.log(`[deletePurchase] Recalculating pricing for ${uniqueProductIds.length} products`);
      await InventoryService.recalculatePricingForProducts(uniqueProductIds);
    } catch (pricingError) {
      console.error('Pricing recalculation error (non-fatal):', pricingError);
    }

    // CRITICAL FIX: Sync stock from transactions for all affected products
    try {
      console.log(`[deletePurchase] Syncing stock for ${uniqueProductIds.length} affected products`);
      for (const productId of uniqueProductIds) {
        await InventoryService.syncProductStockFromTransactions(productId);
      }
    } catch (syncError) {
      console.error('[deletePurchase] Stock sync error (non-fatal):', syncError);
    }

    // Keep static vendor balance in sync with dynamic payable calculation
    await AccountingService.syncVendorBalance(vendorId);

    const journalCountAfter = await JournalEntry.countDocuments({ sourceId: purchase._id });
    const ledgerCountAfter = await LedgerEntry.countDocuments({ sourceId: purchase._id });
    console.log(`[deletePurchase] Entry counts sourceId=${purchase._id} journal ${journalCountBefore}->${journalCountAfter}, ledger ${ledgerCountBefore}->${ledgerCountAfter}`);

    await logFinancialTransaction(req, {
      action: 'DELETE',
      module: 'purchase',
      entityType: 'Purchase',
      entityId: req.params.id,
      entityNumber: purchaseNumber,
      description: `Purchase ${purchaseNumber} from ${vendorName} deleted - stock reversed, pricing & stock synced`,
      amount: grandTotal
    });

    res.json({
      success: true,
      message: 'Purchase deleted, accounting reversed & inventory synced successfully'
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('Delete purchase error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting purchase'
    });
  }
};
