const { Expense, ExpenseCategory } = require('../models/Expense');
const ChartOfAccount = require('../models/ChartOfAccount');
const AccountingService = require('../services/accountingService');
const { createAuditLog } = require('../middleware/auditLogger');

/**
 * Expense Controller
 * 
 * Handles expense management - categories, expense entry and tracking
 */

// ========== EXPENSE CATEGORIES ==========

// @desc    Get all expense categories
// @route   GET /api/expenses/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const categories = await ExpenseCategory.find({ isActive: true })
      .populate('expenseAccount', 'accountCode accountName')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get expense categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expense categories'
    });
  }
};

// @desc    Create expense category
// @route   POST /api/expenses/categories
// @access  Private (Distributor, KPO)
exports.createCategory = async (req, res) => {
  try {
    const { name, description, expenseAccount } = req.body;

    // Check if category exists
    const existing = await ExpenseCategory.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Expense category already exists'
      });
    }

    const category = await ExpenseCategory.create({
      name,
      description,
      expenseAccount
    });

    res.status(201).json({
      success: true,
      message: 'Expense category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create expense category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating expense category'
    });
  }
};

// @desc    Update expense category
// @route   PUT /api/expenses/categories/:id
// @access  Private (Distributor, KPO)
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, expenseAccount, isActive } = req.body;

    const category = await ExpenseCategory.findByIdAndUpdate(
      req.params.id,
      { name, description, expenseAccount, isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Expense category not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update expense category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating expense category'
    });
  }
};

// @desc    Delete expense category
// @route   DELETE /api/expenses/categories/:id
// @access  Private (Distributor)
exports.deleteCategory = async (req, res) => {
  try {
    // Check if category is in use
    const expenseCount = await Expense.countDocuments({ category: req.params.id });
    if (expenseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. It is used in ${expenseCount} expense(s). Deactivate it instead.`
      });
    }

    await ExpenseCategory.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Expense category deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense category error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting expense category'
    });
  }
};

// ========== EXPENSES ==========

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
  try {
    const {
      category,
      status,
      paymentMethod,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy = 'expenseDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (category) query.category = category;
    if (status) query.status = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (search) {
      query.$or = [
        { expenseNumber: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { vendorName: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('category', 'name')
        .populate('createdBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Expense.countDocuments(query)
    ]);

    // Calculate totals
    const totalAmount = await Expense.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    res.json({
      success: true,
      data: expenses,
      summary: {
        totalAmount: totalAmount[0]?.total || 0,
        count: total
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expenses'
    });
  }
};

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('category', 'name')
      .populate('createdBy', 'fullName')
      .populate('approvedBy', 'fullName');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expense'
    });
  }
};

// @desc    Create expense
// @route   POST /api/expenses
// @access  Private (Distributor, KPO)
exports.createExpense = async (req, res) => {
  try {
    const {
      expenseDate,
      category,
      amount,
      paymentMethod,
      bankAccount,
      chequeNumber,
      transactionReference,
      description,
      notes,
      vendorName,
      receiptNumber
    } = req.body;

    // Get category details
    const expenseCategory = await ExpenseCategory.findById(category)
      .populate('expenseAccount');
    
    if (!expenseCategory) {
      return res.status(404).json({
        success: false,
        message: 'Expense category not found'
      });
    }

    // Create expense
    const expense = new Expense({
      expenseDate: expenseDate || new Date(),
      category,
      categoryName: expenseCategory.name,
      amount,
      paymentMethod,
      bankAccount,
      chequeNumber,
      transactionReference,
      description,
      notes,
      vendorName,
      receiptNumber,
      status: 'approved',
      createdBy: req.user._id,
      createdByName: req.user.fullName,
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    await expense.save();

    // Create accounting entry
    // Debit: Expense Account, Credit: Cash/Bank
    try {
      // Find expense account (use category's linked account or default expense account)
      let expenseAccountId = expenseCategory.expenseAccount?._id;
      
      if (!expenseAccountId) {
        // Try to find a general expense account
        const generalExpenseAccount = await ChartOfAccount.findOne({
          accountType: 'expense',
          accountSubType: 'operating_expense'
        });
        expenseAccountId = generalExpenseAccount?._id;
      }

      // Find cash or bank account based on payment method
      let cashBankAccount;
      if (paymentMethod === 'cash') {
        cashBankAccount = await ChartOfAccount.findOne({
          accountCode: '1100' // Cash in Hand
        });
      } else {
        cashBankAccount = await ChartOfAccount.findOne({
          accountCode: '1210' // Main Bank Account
        });
      }

      if (expenseAccountId && cashBankAccount) {
        const journalEntry = await AccountingService.createJournalEntry({
          entryType: 'expense',
          entryDate: expense.expenseDate,
          narration: `Expense: ${description} (${expenseCategory.name})`,
          lines: [
            {
              accountId: expenseAccountId,
              description: description,
              debitAmount: amount,
              creditAmount: 0
            },
            {
              accountId: cashBankAccount._id,
              description: `Payment for: ${description}`,
              debitAmount: 0,
              creditAmount: amount
            }
          ],
          sourceType: 'Expense',
          sourceId: expense._id,
          sourceNumber: expense.expenseNumber,
          userId: req.user._id,
          userName: req.user.fullName
        });

        expense.journalEntry = journalEntry._id;
        await expense.save();
      }
    } catch (accountingError) {
      console.error('Accounting entry error:', accountingError);
      // Don't fail the expense creation, just log the error
    }

    // Audit log
    await createAuditLog({
      action: 'CREATE',
      module: 'expense',
      entityType: 'Expense',
      entityId: expense._id,
      entityNumber: expense.expenseNumber,
      description: `Expense created: ${expense.expenseNumber} - ${description}`,
      amount: amount,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating expense'
    });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Distributor)
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // Only allow updates if not linked to journal entry or by distributor
    if (expense.journalEntry && req.user.role !== 'distributor') {
      return res.status(403).json({
        success: false,
        message: 'Expense with accounting entry can only be updated by distributor'
      });
    }

    const { description, notes, vendorName, receiptNumber } = req.body;
    
    expense.description = description || expense.description;
    expense.notes = notes;
    expense.vendorName = vendorName;
    expense.receiptNumber = receiptNumber;

    await expense.save();

    res.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating expense'
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Distributor)
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    // If expense has journal entry, need to reverse it
    if (expense.journalEntry) {
      // TODO: Implement journal entry reversal
      return res.status(400).json({
        success: false,
        message: 'Expense with accounting entry cannot be deleted. Contact administrator.'
      });
    }

    await expense.deleteOne();

    // Audit log
    await createAuditLog({
      action: 'DELETE',
      module: 'expense',
      entityType: 'Expense',
      entityId: expense._id,
      entityNumber: expense.expenseNumber,
      description: `Expense deleted: ${expense.expenseNumber}`,
      amount: expense.amount,
      performedBy: req.user._id,
      performedByName: req.user.fullName,
      performedByRole: req.user.role,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting expense'
    });
  }
};

// @desc    Get expense summary by category
// @route   GET /api/expenses/summary
// @access  Private
exports.getExpenseSummary = async (req, res) => {
  try {
    const { startDate, endDate, period = 'month' } = req.query;

    let dateFilter = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        expenseDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      // Default to current month
      dateFilter = {
        expenseDate: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        }
      };
    }

    // Aggregate by category
    const categoryWise = await Expense.aggregate([
      { $match: { status: 'approved', ...dateFilter } },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryName' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Aggregate by payment method
    const paymentMethodWise = await Expense.aggregate([
      { $match: { status: 'approved', ...dateFilter } },
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Total
    const total = categoryWise.reduce((sum, c) => sum + c.totalAmount, 0);

    res.json({
      success: true,
      data: {
        byCategory: categoryWise,
        byPaymentMethod: paymentMethodWise,
        total,
        totalCount: categoryWise.reduce((sum, c) => sum + c.count, 0)
      }
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expense summary'
    });
  }
};

// @desc    Get expense accounts from Chart of Accounts
// @route   GET /api/expenses/accounts
// @access  Private
exports.getExpenseAccounts = async (req, res) => {
  try {
    const accounts = await ChartOfAccount.find({
      accountType: 'expense',
      isActive: true
    }).select('accountCode accountName accountSubType').sort({ accountCode: 1 });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    console.error('Get expense accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expense accounts'
    });
  }
};
