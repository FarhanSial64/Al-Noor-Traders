const Vendor = require('../models/Vendor');
const LedgerEntry = require('../models/LedgerEntry');
const Purchase = require('../models/Purchase');
const Payment = require('../models/Payment');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Vendor Controller
 */

// @desc    Get next vendor code
// @route   GET /api/vendors/next-code
// @access  Private
exports.getNextVendorCode = async (req, res) => {
  try {
    const count = await Vendor.countDocuments();
    const nextCode = `VEND${String(count + 1).padStart(5, '0')}`;
    
    res.json({
      success: true,
      data: { nextCode }
    });
  } catch (error) {
    console.error('Get next vendor code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Private
exports.getVendors = async (req, res) => {
  try {
    const {
      search,
      isActive,
      page = 1,
      limit = 50,
      sortBy = 'businessName',
      sortOrder = 'asc'
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { vendorCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [vendors, total] = await Promise.all([
      Vendor.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Vendor.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching vendors'
    });
  }
};

// @desc    Get single vendor
// @route   GET /api/vendors/:id
// @access  Private
exports.getVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id)
      .populate('productsSupplied', 'name sku');

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get recent purchases
    const recentPurchases = await Purchase.find({ vendor: vendor._id })
      .sort({ purchaseDate: -1 })
      .limit(5)
      .select('purchaseNumber purchaseDate grandTotal paymentStatus');

    // Get recent payments
    const recentPayments = await Payment.find({ 
      partyId: vendor._id,
      partyType: 'vendor'
    })
      .sort({ paymentDate: -1 })
      .limit(5)
      .select('paymentNumber paymentDate amount paymentMethod');

    res.json({
      success: true,
      data: {
        ...vendor.toObject(),
        recentPurchases,
        recentPayments
      }
    });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching vendor'
    });
  }
};

// @desc    Get vendor ledger
// @route   GET /api/vendors/:id/ledger
// @access  Private
exports.getVendorLedger = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const vendorId = req.params.id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const query = {
      partyType: 'vendor',
      partyId: vendorId
    };

    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const entries = await LedgerEntry.find(query)
      .sort({ entryDate: 1, createdAt: 1 })
      .populate('journalEntry', 'entryNumber narration');

    res.json({
      success: true,
      data: {
        vendor: {
          id: vendor._id,
          vendorCode: vendor.vendorCode,
          businessName: vendor.businessName,
          currentBalance: vendor.currentBalance
        },
        entries,
        summary: {
          totalDebit: entries.reduce((sum, e) => sum + e.debitAmount, 0),
          totalCredit: entries.reduce((sum, e) => sum + e.creditAmount, 0),
          closingBalance: vendor.currentBalance
        }
      }
    });
  } catch (error) {
    console.error('Get vendor ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching vendor ledger'
    });
  }
};

// @desc    Create vendor
// @route   POST /api/vendors
// @access  Private
exports.createVendor = async (req, res) => {
  try {
    const vendorData = {
      ...req.body,
      createdBy: req.user._id
    };

    const vendor = await Vendor.create(vendorData);

    await createAuditLog({
      action: 'CREATE',
      module: 'vendor',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Created vendor: ${vendor.businessName} (${vendor.vendorCode})`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Vendor created successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating vendor'
    });
  }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Private
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    const previousValues = vendor.toObject();

    // Don't allow balance update through this endpoint
    delete req.body.currentBalance;

    Object.assign(vendor, req.body, { updatedBy: req.user._id });
    await vendor.save();

    await createAuditLog({
      action: 'UPDATE',
      module: 'vendor',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Updated vendor: ${vendor.businessName}`,
      previousValues,
      newValues: vendor.toObject(),
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor
    });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating vendor'
    });
  }
};

// @desc    Delete (deactivate) vendor
// @route   DELETE /api/vendors/:id
// @access  Private
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check for outstanding balance
    if (vendor.currentBalance !== 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate vendor with outstanding balance of Rs. ${vendor.currentBalance}`
      });
    }

    vendor.isActive = false;
    vendor.updatedBy = req.user._id;
    await vendor.save();

    await createAuditLog({
      action: 'DELETE',
      module: 'vendor',
      entityType: 'Vendor',
      entityId: vendor._id,
      description: `Deactivated vendor: ${vendor.businessName}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Vendor deactivated successfully'
    });
  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting vendor'
    });
  }
};
