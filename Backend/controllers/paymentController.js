const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const ChartOfAccount = require('../models/ChartOfAccount');
const AccountingService = require('../services/accountingService');
const { logFinancialTransaction } = require('../middleware/auditLogger');
const { ROLES } = require('../config/roles');

/**
 * Payment Controller
 * 
 * Handles:
 * - Receipts: Money received from customers
 * - Payments: Money paid to vendors
 */

// @desc    Get all receipts (from customers)
// @route   GET /api/finance/receipts
// @access  Private
exports.getReceipts = async (req, res) => {
  try {
    const {
      customerId,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { paymentType: 'receipt' };

    // Order bookers can only see their own receipts
    if (req.user.role === ROLES.ORDER_BOOKER) {
      query.createdBy = req.user._id;
    }

    if (customerId) query.partyId = customerId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [receipts, total] = await Promise.all([
      Payment.find(query)
        .populate('partyId', 'businessName customerCode')
        .populate('createdBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);

    // Calculate summary
    const summary = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: receipts,
      summary: summary[0] || { totalAmount: 0, count: 0 },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching receipts'
    });
  }
};

// @desc    Create receipt (payment from customer)
// @route   POST /api/finance/receipts
// @access  Private
exports.createReceipt = async (req, res) => {
  try {
    const {
      customerId,
      amount,
      paymentMethod,
      paymentDate,
      cashAccountId,
      bankAccountId,
      chequeNumber,
      chequeDate,
      chequeBank,
      transactionReference,
      allocations = [],
      remarks
    } = req.body;

    // Get customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Determine which account to use
    let accountId = cashAccountId;
    if (paymentMethod === 'cheque' || paymentMethod === 'bank_transfer' || paymentMethod === 'online') {
      accountId = bankAccountId;
    }

    // Get default cash account if not specified
    if (!accountId) {
      const defaultAccount = await ChartOfAccount.findOne({
        isCashAccount: paymentMethod === 'cash',
        isBankAccount: paymentMethod !== 'cash',
        isActive: true
      });
      if (defaultAccount) {
        accountId = defaultAccount._id;
      }
    }

    const balanceBefore = customer.currentBalance;
    const balanceAfter = balanceBefore - amount;

    // Create payment record
    const receipt = new Payment({
      paymentType: 'receipt',
      paymentDate: paymentDate || new Date(),
      partyType: 'customer',
      partyId: customer._id,
      partyModel: 'Customer',
      partyName: customer.businessName,
      partyCode: customer.customerCode,
      amount,
      paymentMethod,
      cashAccount: paymentMethod === 'cash' ? accountId : undefined,
      bankAccount: paymentMethod !== 'cash' ? accountId : undefined,
      chequeNumber,
      chequeDate,
      chequeBank,
      transactionReference,
      allocations,
      isAdvance: balanceAfter < 0,
      partyBalanceBefore: balanceBefore,
      partyBalanceAfter: balanceAfter,
      remarks,
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      status: 'completed'
    });

    await receipt.save();

    // Create accounting entry
    const journalEntry = await AccountingService.createReceiptEntry({
      customerId: customer._id,
      customerName: customer.businessName,
      paymentId: receipt._id,
      paymentNumber: receipt.paymentNumber,
      amount,
      paymentMethod,
      cashAccountId: accountId,
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: receipt.paymentDate
    });

    receipt.journalEntryId = journalEntry._id;
    await receipt.save();

    await logFinancialTransaction(req, {
      action: 'RECEIPT',
      module: 'payment',
      entityType: 'Payment',
      entityId: receipt._id,
      entityNumber: receipt.paymentNumber,
      description: `Receipt from ${customer.businessName}`,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Receipt recorded successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Create receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating receipt'
    });
  }
};

// @desc    Get all payments (to vendors)
// @route   GET /api/finance/payments
// @access  Private
exports.getPayments = async (req, res) => {
  try {
    const {
      vendorId,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    const query = { paymentType: 'payment' };

    if (vendorId) query.partyId = vendorId;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .populate('partyId', 'businessName vendorCode')
        .populate('createdBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Payment.countDocuments(query)
    ]);

    // Calculate summary
    const summary = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: payments,
      summary: summary[0] || { totalAmount: 0, count: 0 },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payments'
    });
  }
};

// @desc    Create payment (to vendor)
// @route   POST /api/finance/payments
// @access  Private
exports.createPayment = async (req, res) => {
  try {
    const {
      vendorId,
      amount,
      paymentMethod,
      paymentDate,
      cashAccountId,
      bankAccountId,
      chequeNumber,
      chequeDate,
      chequeBank,
      transactionReference,
      allocations = [],
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

    // Determine which account to use
    let accountId = cashAccountId;
    if (paymentMethod === 'cheque' || paymentMethod === 'bank_transfer' || paymentMethod === 'online') {
      accountId = bankAccountId;
    }

    // Get default cash account if not specified
    if (!accountId) {
      const defaultAccount = await ChartOfAccount.findOne({
        isCashAccount: paymentMethod === 'cash',
        isBankAccount: paymentMethod !== 'cash',
        isActive: true
      });
      if (defaultAccount) {
        accountId = defaultAccount._id;
      }
    }

    const balanceBefore = vendor.currentBalance;
    const balanceAfter = balanceBefore - amount;

    // Create payment record
    const payment = new Payment({
      paymentType: 'payment',
      paymentDate: paymentDate || new Date(),
      partyType: 'vendor',
      partyId: vendor._id,
      partyModel: 'Vendor',
      partyName: vendor.businessName,
      partyCode: vendor.vendorCode,
      amount,
      paymentMethod,
      cashAccount: paymentMethod === 'cash' ? accountId : undefined,
      bankAccount: paymentMethod !== 'cash' ? accountId : undefined,
      chequeNumber,
      chequeDate,
      chequeBank,
      transactionReference,
      allocations,
      isAdvance: balanceAfter < 0,
      partyBalanceBefore: balanceBefore,
      partyBalanceAfter: balanceAfter,
      remarks,
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      status: 'completed'
    });

    await payment.save();

    // Create accounting entry
    const journalEntry = await AccountingService.createPaymentEntry({
      vendorId: vendor._id,
      vendorName: vendor.businessName,
      paymentId: payment._id,
      paymentNumber: payment.paymentNumber,
      amount,
      paymentMethod,
      cashAccountId: accountId,
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: payment.paymentDate
    });

    payment.journalEntryId = journalEntry._id;
    await payment.save();

    await logFinancialTransaction(req, {
      action: 'PAYMENT',
      module: 'payment',
      entityType: 'Payment',
      entityId: payment._id,
      entityNumber: payment.paymentNumber,
      description: `Payment to ${vendor.businessName}`,
      amount
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating payment'
    });
  }
};

// @desc    Get payment details
// @route   GET /api/finance/:id
// @access  Private
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('partyId')
      .populate('createdBy', 'fullName')
      .populate('approvedBy', 'fullName')
      .populate('journalEntryId')
      .populate('cashAccount', 'accountName accountCode')
      .populate('bankAccount', 'accountName accountCode');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payment details'
    });
  }
};

// @desc    Update receipt (Distributor only)
// @route   PUT /api/payments/receipts/:id
// @access  Private (Distributor)
exports.updateReceipt = async (req, res) => {
  try {
    const receipt = await Payment.findOne({ 
      _id: req.params.id, 
      paymentType: 'receipt' 
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    const {
      amount,
      paymentMethod,
      paymentDate,
      chequeNumber,
      chequeDate,
      chequeBank,
      transactionReference,
      remarks
    } = req.body;

    // Track original values for accounting reversal
    const originalAmount = receipt.amount;
    const amountDifference = amount ? amount - originalAmount : 0;

    // Update fields
    if (amount) receipt.amount = amount;
    if (paymentMethod) receipt.paymentMethod = paymentMethod;
    if (paymentDate) receipt.paymentDate = new Date(paymentDate);
    if (chequeNumber !== undefined) receipt.chequeNumber = chequeNumber;
    if (chequeDate) receipt.chequeDate = new Date(chequeDate);
    if (chequeBank !== undefined) receipt.chequeBank = chequeBank;
    if (transactionReference !== undefined) receipt.transactionReference = transactionReference;
    if (remarks !== undefined) receipt.remarks = remarks;

    // Update balance if amount changed
    if (amountDifference !== 0) {
      receipt.partyBalanceAfter = receipt.partyBalanceBefore - receipt.amount;
      
      // Update customer balance
      await Customer.findByIdAndUpdate(receipt.partyId, {
        $inc: { currentBalance: -amountDifference }
      });

      // Update accounting entries via service
      await AccountingService.updateReceiptEntry({
        paymentId: receipt._id,
        oldAmount: originalAmount,
        newAmount: receipt.amount,
        userId: req.user._id,
        userName: req.user.fullName
      });
    }

    await receipt.save();

    await logFinancialTransaction(req, {
      action: 'RECEIPT_UPDATE',
      module: 'payment',
      entityType: 'Payment',
      entityId: receipt._id,
      entityNumber: receipt.paymentNumber,
      description: `Receipt updated: ${receipt.paymentNumber}`,
      amount: receipt.amount,
      previousAmount: originalAmount
    });

    res.json({
      success: true,
      message: 'Receipt updated successfully',
      data: receipt
    });
  } catch (error) {
    console.error('Update receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating receipt'
    });
  }
};

// @desc    Delete receipt (Distributor only)
// @route   DELETE /api/payments/receipts/:id
// @access  Private (Distributor)
exports.deleteReceipt = async (req, res) => {
  try {
    const receipt = await Payment.findOne({ 
      _id: req.params.id, 
      paymentType: 'receipt' 
    });

    if (!receipt) {
      return res.status(404).json({
        success: false,
        message: 'Receipt not found'
      });
    }

    // Reverse the customer balance
    await Customer.findByIdAndUpdate(receipt.partyId, {
      $inc: { currentBalance: receipt.amount }
    });

    // Reverse accounting entries
    await AccountingService.reverseReceiptEntry({
      paymentId: receipt._id,
      amount: receipt.amount,
      customerId: receipt.partyId,
      userId: req.user._id,
      userName: req.user.fullName
    });

    // Log before deleting
    await logFinancialTransaction(req, {
      action: 'RECEIPT_DELETE',
      module: 'payment',
      entityType: 'Payment',
      entityId: receipt._id,
      entityNumber: receipt.paymentNumber,
      description: `Receipt deleted: ${receipt.paymentNumber} from ${receipt.partyName}`,
      amount: receipt.amount
    });

    // Mark as cancelled instead of hard delete for audit trail
    receipt.status = 'cancelled';
    await receipt.save();

    res.json({
      success: true,
      message: 'Receipt deleted successfully'
    });
  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting receipt'
    });
  }
};

// @desc    Update payment (Distributor only)
// @route   PUT /api/payments/payments/:id
// @access  Private (Distributor)
exports.updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ 
      _id: req.params.id, 
      paymentType: 'payment' 
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const {
      amount,
      paymentMethod,
      paymentDate,
      chequeNumber,
      chequeDate,
      chequeBank,
      transactionReference,
      remarks
    } = req.body;

    // Track original values for accounting reversal
    const originalAmount = payment.amount;
    const amountDifference = amount ? amount - originalAmount : 0;

    // Update fields
    if (amount) payment.amount = amount;
    if (paymentMethod) payment.paymentMethod = paymentMethod;
    if (paymentDate) payment.paymentDate = new Date(paymentDate);
    if (chequeNumber !== undefined) payment.chequeNumber = chequeNumber;
    if (chequeDate) payment.chequeDate = new Date(chequeDate);
    if (chequeBank !== undefined) payment.chequeBank = chequeBank;
    if (transactionReference !== undefined) payment.transactionReference = transactionReference;
    if (remarks !== undefined) payment.remarks = remarks;

    // Update balance if amount changed
    if (amountDifference !== 0) {
      payment.partyBalanceAfter = payment.partyBalanceBefore - payment.amount;
      
      // Update vendor balance
      await Vendor.findByIdAndUpdate(payment.partyId, {
        $inc: { currentBalance: -amountDifference }
      });

      // Update accounting entries via service
      await AccountingService.updatePaymentEntry({
        paymentId: payment._id,
        oldAmount: originalAmount,
        newAmount: payment.amount,
        userId: req.user._id,
        userName: req.user.fullName
      });
    }

    await payment.save();

    await logFinancialTransaction(req, {
      action: 'PAYMENT_UPDATE',
      module: 'payment',
      entityType: 'Payment',
      entityId: payment._id,
      entityNumber: payment.paymentNumber,
      description: `Payment updated: ${payment.paymentNumber}`,
      amount: payment.amount,
      previousAmount: originalAmount
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating payment'
    });
  }
};

// @desc    Delete payment (Distributor only)
// @route   DELETE /api/payments/payments/:id
// @access  Private (Distributor)
exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({ 
      _id: req.params.id, 
      paymentType: 'payment' 
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Reverse the vendor balance
    await Vendor.findByIdAndUpdate(payment.partyId, {
      $inc: { currentBalance: payment.amount }
    });

    // Reverse accounting entries
    await AccountingService.reversePaymentEntry({
      paymentId: payment._id,
      amount: payment.amount,
      vendorId: payment.partyId,
      userId: req.user._id,
      userName: req.user.fullName
    });

    // Log before deleting
    await logFinancialTransaction(req, {
      action: 'PAYMENT_DELETE',
      module: 'payment',
      entityType: 'Payment',
      entityId: payment._id,
      entityNumber: payment.paymentNumber,
      description: `Payment deleted: ${payment.paymentNumber} to ${payment.partyName}`,
      amount: payment.amount
    });

    // Mark as cancelled instead of hard delete for audit trail
    payment.status = 'cancelled';
    await payment.save();

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting payment'
    });
  }
};
