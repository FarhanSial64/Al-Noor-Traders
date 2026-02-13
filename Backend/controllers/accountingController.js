const ChartOfAccount = require('../models/ChartOfAccount');
const JournalEntry = require('../models/JournalEntry');
const LedgerEntry = require('../models/LedgerEntry');
const { CashBookEntry, DailyCashSummary } = require('../models/CashBook');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const AccountingService = require('../services/accountingService');

/**
 * Accounting Controller
 * 
 * Handles financial reports and accounting queries
 */

// @desc    Get chart of accounts
// @route   GET /api/accounting/accounts
// @access  Private
exports.getChartOfAccounts = async (req, res) => {
  try {
    const { accountType, isActive } = req.query;

    const query = {};
    if (accountType) query.accountType = accountType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const accounts = await ChartOfAccount.find(query)
      .sort({ accountCode: 1 });

    // Group by account type
    const grouped = {
      assets: accounts.filter(a => a.accountType === 'asset'),
      liabilities: accounts.filter(a => a.accountType === 'liability'),
      equity: accounts.filter(a => a.accountType === 'equity'),
      income: accounts.filter(a => a.accountType === 'income'),
      expenses: accounts.filter(a => a.accountType === 'expense')
    };

    res.json({
      success: true,
      data: accounts,
      grouped
    });
  } catch (error) {
    console.error('Get chart of accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching chart of accounts'
    });
  }
};

// @desc    Get account details
// @route   GET /api/accounting/accounts/:id
// @access  Private
exports.getAccountDetails = async (req, res) => {
  try {
    const account = await ChartOfAccount.findById(req.params.id)
      .populate('parentAccount', 'accountName accountCode');

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    console.error('Get account details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching account details'
    });
  }
};

// @desc    Get journal entries
// @route   GET /api/accounting/journal-entries
// @access  Private
exports.getJournalEntries = async (req, res) => {
  try {
    const {
      entryType,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'entryDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (entryType) query.entryType = entryType;

    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [entries, total] = await Promise.all([
      JournalEntry.find(query)
        .populate('createdBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      JournalEntry.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get journal entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching journal entries'
    });
  }
};

// @desc    Get single journal entry
// @route   GET /api/accounting/journal-entries/:id
// @access  Private
exports.getJournalEntry = async (req, res) => {
  try {
    const entry = await JournalEntry.findById(req.params.id)
      .populate('createdBy', 'fullName')
      .populate('postedBy', 'fullName')
      .populate('lines.account', 'accountName accountCode');

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Journal entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    console.error('Get journal entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching journal entry'
    });
  }
};

// @desc    Get account ledger
// @route   GET /api/accounting/ledger/:accountId
// @access  Private
exports.getAccountLedger = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 100 } = req.query;
    const accountId = req.params.accountId;

    const account = await ChartOfAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    const query = { account: accountId };

    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      LedgerEntry.find(query)
        .sort({ entryDate: 1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      LedgerEntry.countDocuments(query)
    ]);

    // Calculate opening balance if date filter is applied
    let openingBalance = 0;
    if (startDate) {
      const previousEntries = await LedgerEntry.aggregate([
        {
          $match: {
            account: account._id,
            entryDate: { $lt: new Date(startDate) }
          }
        },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: '$debitAmount' },
            totalCredit: { $sum: '$creditAmount' }
          }
        }
      ]);

      if (previousEntries.length > 0) {
        const diff = previousEntries[0].totalDebit - previousEntries[0].totalCredit;
        openingBalance = account.normalBalance === 'debit' ? diff : -diff;
      }
    }

    res.json({
      success: true,
      data: {
        account: {
          id: account._id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          accountType: account.accountType,
          currentBalance: account.currentBalance
        },
        openingBalance,
        entries,
        summary: {
          totalDebit: entries.reduce((sum, e) => sum + e.debitAmount, 0),
          totalCredit: entries.reduce((sum, e) => sum + e.creditAmount, 0)
        }
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get account ledger error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching account ledger'
    });
  }
};

// @desc    Get cash book
// @route   GET /api/accounting/cash-book
// @access  Private
exports.getCashBook = async (req, res) => {
  try {
    const { cashAccountId, startDate, endDate, page = 1, limit = 100 } = req.query;

    const query = {};

    if (cashAccountId) query.cashAccount = cashAccountId;
    
    if (startDate || endDate) {
      query.entryDate = {};
      if (startDate) query.entryDate.$gte = new Date(startDate);
      if (endDate) query.entryDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [entries, total] = await Promise.all([
      CashBookEntry.find(query)
        .populate('cashAccount', 'accountName accountCode')
        .sort({ entryDate: 1, createdAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      CashBookEntry.countDocuments(query)
    ]);

    // Summary
    const summary = await CashBookEntry.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCashIn: { $sum: '$cashIn' },
          totalCashOut: { $sum: '$cashOut' }
        }
      }
    ]);

    res.json({
      success: true,
      data: entries,
      summary: summary[0] || { totalCashIn: 0, totalCashOut: 0 },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get cash book error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching cash book'
    });
  }
};

// @desc    Get cash book daily summary
// @route   GET /api/accounting/cash-book/summary
// @access  Private
exports.getCashBookSummary = async (req, res) => {
  try {
    const { cashAccountId, startDate, endDate } = req.query;

    const query = {};
    if (cashAccountId) query.cashAccount = cashAccountId;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const summaries = await DailyCashSummary.find(query)
      .populate('cashAccount', 'accountName accountCode')
      .sort({ date: -1 });

    // Get cash accounts with current balances
    const cashAccounts = await ChartOfAccount.find({
      $or: [{ isCashAccount: true }, { isBankAccount: true }],
      isActive: true
    }).select('accountCode accountName currentBalance isCashAccount isBankAccount');

    res.json({
      success: true,
      data: {
        dailySummaries: summaries,
        cashAccounts
      }
    });
  } catch (error) {
    console.error('Get cash book summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching cash book summary'
    });
  }
};

// @desc    Get trial balance
// @route   GET /api/accounting/trial-balance
// @access  Private
exports.getTrialBalance = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    // Set asOfDate to end of day to include all transactions on that date
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const trialBalance = await AccountingService.getTrialBalance(asOf);

    res.json({
      success: true,
      data: trialBalance
    });
  } catch (error) {
    console.error('Get trial balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating trial balance'
    });
  }
};

// @desc    Get profit and loss statement
// @route   GET /api/accounting/profit-loss
// @access  Private
exports.getProfitAndLoss = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Set start date to beginning of day
    const start = startDate 
      ? new Date(startDate) 
      : new Date(new Date().getFullYear(), 0, 1);
    start.setHours(0, 0, 0, 0);

    // Set end date to end of day (23:59:59.999) to include all transactions on that date
    const end = endDate 
      ? new Date(endDate) 
      : new Date();
    end.setHours(23, 59, 59, 999);

    const pnl = await AccountingService.getProfitAndLoss(start, end);

    res.json({
      success: true,
      data: pnl
    });
  } catch (error) {
    console.error('Get profit and loss error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating profit and loss statement'
    });
  }
};

// @desc    Get balance sheet
// @route   GET /api/accounting/balance-sheet
// @access  Private
exports.getBalanceSheet = async (req, res) => {
  try {
    const { asOfDate } = req.query;

    // Set asOfDate to end of day to include all transactions on that date
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const balanceSheet = await AccountingService.getBalanceSheet(asOf);

    res.json({
      success: true,
      data: balanceSheet
    });
  } catch (error) {
    console.error('Get balance sheet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating balance sheet'
    });
  }
};

// @desc    Get outstanding receivables
// @route   GET /api/accounting/receivables
// @access  Private
exports.getReceivables = async (req, res) => {
  try {
    const customers = await Customer.find({
      currentBalance: { $gt: 0 },
      isActive: true
    })
    .select('customerCode businessName contactPerson phone currentBalance creditLimit creditDays')
    .sort({ currentBalance: -1 });

    const totalReceivables = customers.reduce((sum, c) => sum + c.currentBalance, 0);

    res.json({
      success: true,
      data: {
        customers,
        summary: {
          totalReceivables,
          customerCount: customers.length
        }
      }
    });
  } catch (error) {
    console.error('Get receivables error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching receivables'
    });
  }
};

// @desc    Get outstanding payables
// @route   GET /api/accounting/payables
// @access  Private
exports.getPayables = async (req, res) => {
  try {
    const vendors = await Vendor.find({
      currentBalance: { $gt: 0 },
      isActive: true
    })
    .select('vendorCode businessName contactPerson phone currentBalance paymentTerms creditDays')
    .sort({ currentBalance: -1 });

    const totalPayables = vendors.reduce((sum, v) => sum + v.currentBalance, 0);

    res.json({
      success: true,
      data: {
        vendors,
        summary: {
          totalPayables,
          vendorCount: vendors.length
        }
      }
    });
  } catch (error) {
    console.error('Get payables error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching payables'
    });
  }
};

// @desc    Recalculate invoice profits (Data Repair Utility)
// @route   POST /api/accounting/recalculate-profits
// @access  Private (Distributor only)
exports.recalculateInvoiceProfits = async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    const InventoryValuation = require('../models/Inventory').InventoryValuation;
    
    const invoices = await Invoice.find({ status: 'issued' });
    
    let updated = 0;
    let errors = [];
    
    for (const invoice of invoices) {
      try {
        let totalCost = 0;
        let totalProfit = 0;
        
        // Recalculate each item's cost and profit
        for (const item of invoice.items) {
          // Get current cost from inventory valuation
          const valuation = await InventoryValuation.findOne({ product: item.product });
          const costPrice = valuation ? valuation.averageCost : (item.costPrice || 0);
          
          // Update item cost and profit
          item.costPrice = costPrice;
          item.lineProfit = item.netAmount - (costPrice * item.quantity);
          
          totalCost += costPrice * item.quantity;
          totalProfit += item.lineProfit;
        }
        
        // Update invoice totals
        invoice.totalCost = totalCost;
        invoice.grossProfit = totalProfit;
        
        await invoice.save();
        updated++;
      } catch (err) {
        errors.push({ invoiceNumber: invoice.invoiceNumber, error: err.message });
      }
    }
    
    res.json({
      success: true,
      message: `Recalculated profits for ${updated} invoices`,
      data: {
        totalProcessed: invoices.length,
        updated,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    console.error('Recalculate profits error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error recalculating invoice profits'
    });
  }
};
