const Customer = require('../models/Customer');
const LedgerEntry = require('../models/LedgerEntry');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Customer Controller
 */

// @desc    Get next customer code
// @route   GET /api/customers/next-code
// @access  Private
exports.getNextCustomerCode = async (req, res) => {
  try {
    const count = await Customer.countDocuments();
    const nextCode = `CUST${String(count + 1).padStart(5, '0')}`;
    
    res.json({
      success: true,
      data: { nextCode }
    });
  } catch (error) {
    console.error('Get next customer code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = async (req, res) => {
  try {
    const {
      search,
      businessType,
      isActive,
      assignedOrderBooker,
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
        { customerCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    if (businessType) query.businessType = businessType;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (assignedOrderBooker) query.assignedOrderBooker = assignedOrderBooker;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [customers, total] = await Promise.all([
      Customer.find(query)
        .populate('assignedOrderBooker', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Customer.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customers'
    });
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .populate('assignedOrderBooker', 'fullName phone');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get recent invoices
    const recentInvoices = await Invoice.find({ customer: customer._id })
      .sort({ invoiceDate: -1 })
      .limit(5)
      .select('invoiceNumber invoiceDate grandTotal paymentStatus');

    // Get recent payments
    const recentPayments = await Payment.find({ 
      partyId: customer._id,
      partyType: 'customer'
    })
      .sort({ paymentDate: -1 })
      .limit(5)
      .select('paymentNumber paymentDate amount paymentMethod');

    res.json({
      success: true,
      data: {
        ...customer.toObject(),
        recentInvoices,
        recentPayments
      }
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer'
    });
  }
};

// @desc    Get customer ledger
// @route   GET /api/customers/:id/ledger
// @access  Private
exports.getCustomerLedger = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const customerId = req.params.id;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const query = {
      partyType: 'customer',
      partyId: customerId
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
        customer: {
          id: customer._id,
          customerCode: customer.customerCode,
          businessName: customer.businessName,
          currentBalance: customer.currentBalance
        },
        entries,
        summary: {
          totalDebit: entries.reduce((sum, e) => sum + e.debitAmount, 0),
          totalCredit: entries.reduce((sum, e) => sum + e.creditAmount, 0),
          closingBalance: customer.currentBalance
        }
      }
    });
  } catch (error) {
    console.error('Get customer ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer ledger'
    });
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
exports.createCustomer = async (req, res) => {
  try {
    const customerData = {
      ...req.body,
      createdBy: req.user._id
    };

    const customer = await Customer.create(customerData);

    await createAuditLog({
      action: 'CREATE',
      module: 'customer',
      entityType: 'Customer',
      entityId: customer._id,
      description: `Created customer: ${customer.businessName} (${customer.customerCode})`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating customer'
    });
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const previousValues = customer.toObject();

    // Don't allow balance update through this endpoint
    delete req.body.currentBalance;

    Object.assign(customer, req.body, { updatedBy: req.user._id });
    await customer.save();

    await createAuditLog({
      action: 'UPDATE',
      module: 'customer',
      entityType: 'Customer',
      entityId: customer._id,
      description: `Updated customer: ${customer.businessName}`,
      previousValues,
      newValues: customer.toObject(),
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating customer'
    });
  }
};

// @desc    Delete (deactivate) customer
// @route   DELETE /api/customers/:id
// @access  Private
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Check for outstanding balance
    if (customer.currentBalance !== 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot deactivate customer with outstanding balance of Rs. ${customer.currentBalance}`
      });
    }

    customer.isActive = false;
    customer.updatedBy = req.user._id;
    await customer.save();

    await createAuditLog({
      action: 'DELETE',
      module: 'customer',
      entityType: 'Customer',
      entityId: customer._id,
      description: `Deactivated customer: ${customer.businessName}`,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting customer'
    });
  }
};
