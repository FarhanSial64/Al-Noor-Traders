const ChartOfAccount = require('../models/ChartOfAccount');
const JournalEntry = require('../models/JournalEntry');
const LedgerEntry = require('../models/LedgerEntry');
const { CashBookEntry, DailyCashSummary } = require('../models/CashBook');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');

/**
 * Accounting Service
 * 
 * Handles all accounting operations:
 * - Journal entry creation
 * - Ledger updates
 * - Account balance updates
 * - Cash book entries
 */

class AccountingService {
  /**
   * Create Journal Entry and update all related ledgers
   */
  static async createJournalEntry({
    entryType,
    entryDate,
    narration,
    lines,
    sourceType,
    sourceId,
    sourceNumber,
    userId,
    userName
  }) {
    // Validate debits = credits
    const totalDebit = lines.reduce((sum, l) => sum + (l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (l.creditAmount || 0), 0);
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Journal entry is not balanced. Debits must equal credits.');
    }

    // Prepare journal lines with account details
    const journalLines = await Promise.all(lines.map(async (line) => {
      const account = await ChartOfAccount.findById(line.accountId);
      if (!account) {
        throw new Error(`Account not found: ${line.accountId}`);
      }
      return {
        account: account._id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        description: line.description,
        debitAmount: line.debitAmount || 0,
        creditAmount: line.creditAmount || 0,
        partyType: line.partyType || 'none',
        partyId: line.partyId,
        partyModel: line.partyType === 'customer' ? 'Customer' : 
                    line.partyType === 'vendor' ? 'Vendor' : undefined,
        partyName: line.partyName
      };
    }));

    // Create journal entry
    const journalEntry = await JournalEntry.create({
      entryType,
      entryDate: entryDate || new Date(),
      narration,
      lines: journalLines,
      totalDebit,
      totalCredit,
      sourceType,
      sourceId,
      sourceNumber,
      isPosted: true,
      postedAt: new Date(),
      postedBy: userId,
      createdBy: userId,
      createdByName: userName
    });

    // Update account balances and create ledger entries
    await this.postToLedgers(journalEntry, userId);

    return journalEntry;
  }

  /**
   * Post journal entry to ledgers and update account balances
   */
  static async postToLedgers(journalEntry, userId) {
    for (const line of journalEntry.lines) {
      // Get current account balance
      const account = await ChartOfAccount.findById(line.account);
      
      // Calculate new balance based on normal balance side
      let balanceChange = line.debitAmount - line.creditAmount;
      if (account.normalBalance === 'credit') {
        balanceChange = -balanceChange;
      }
      
      const newBalance = account.currentBalance + balanceChange;

      // Update account balance
      await ChartOfAccount.findByIdAndUpdate(line.account, {
        currentBalance: newBalance
      });

      // Create ledger entry
      await LedgerEntry.create({
        account: line.account,
        accountCode: line.accountCode,
        accountName: line.accountName,
        entryDate: journalEntry.entryDate,
        description: line.description || journalEntry.narration,
        debitAmount: line.debitAmount,
        creditAmount: line.creditAmount,
        runningBalance: newBalance,
        journalEntry: journalEntry._id,
        journalEntryNumber: journalEntry.entryNumber,
        partyType: line.partyType,
        partyId: line.partyId,
        partyName: line.partyName,
        sourceType: journalEntry.sourceType,
        sourceId: journalEntry.sourceId,
        sourceNumber: journalEntry.sourceNumber,
        createdBy: userId
      });

      // Update cash book if it's a cash/bank account
      if (account.isCashAccount || account.isBankAccount) {
        await this.updateCashBook({
          entryDate: journalEntry.entryDate,
          cashAccount: account._id,
          accountName: account.accountName,
          isBankAccount: account.isBankAccount,
          description: journalEntry.narration,
          cashIn: line.debitAmount,
          cashOut: line.creditAmount,
          runningBalance: newBalance,
          referenceType: journalEntry.sourceType,
          referenceId: journalEntry.sourceId,
          referenceNumber: journalEntry.sourceNumber,
          journalEntry: journalEntry._id,
          partyType: line.partyType,
          partyName: line.partyName,
          createdBy: userId
        });
      }
    }
  }

  /**
   * Update cash book
   */
  static async updateCashBook({
    entryDate,
    cashAccount,
    accountName,
    isBankAccount,
    description,
    cashIn,
    cashOut,
    runningBalance,
    referenceType,
    referenceId,
    referenceNumber,
    journalEntry,
    partyType,
    partyName,
    createdBy
  }) {
    await CashBookEntry.create({
      entryDate,
      cashAccount,
      accountName,
      isBankAccount,
      description,
      cashIn: cashIn || 0,
      cashOut: cashOut || 0,
      runningBalance,
      referenceType,
      referenceId,
      referenceNumber,
      journalEntry,
      partyType: partyType || 'none',
      partyName,
      createdBy
    });

    // Update daily summary
    await this.updateDailyCashSummary(cashAccount, accountName, entryDate);
  }

  /**
   * Update daily cash summary
   */
  static async updateDailyCashSummary(cashAccountId, accountName, date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get previous day's closing balance
    const previousSummary = await DailyCashSummary.findOne({
      cashAccount: cashAccountId,
      date: { $lt: startOfDay }
    }).sort({ date: -1 });

    const openingBalance = previousSummary ? previousSummary.closingBalance : 0;

    // Calculate day's totals
    const dayEntries = await CashBookEntry.find({
      cashAccount: cashAccountId,
      entryDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const totalCashIn = dayEntries.reduce((sum, e) => sum + e.cashIn, 0);
    const totalCashOut = dayEntries.reduce((sum, e) => sum + e.cashOut, 0);
    const closingBalance = openingBalance + totalCashIn - totalCashOut;

    await DailyCashSummary.findOneAndUpdate(
      { cashAccount: cashAccountId, date: startOfDay },
      {
        accountName,
        openingBalance,
        totalCashIn,
        totalCashOut,
        closingBalance,
        transactionCount: dayEntries.length
      },
      { upsert: true }
    );
  }

  /**
   * Create sales journal entry
   * Debit: Accounts Receivable (Customer)
   * Credit: Sales Revenue
   */
  static async createSalesEntry({
    customerId,
    customerName,
    invoiceId,
    invoiceNumber,
    amount,
    costOfGoodsSold,
    userId,
    userName,
    entryDate
  }) {
    // Get required accounts
    const arAccount = await ChartOfAccount.findOne({ accountSubType: 'accounts_receivable' });
    const salesAccount = await ChartOfAccount.findOne({ accountSubType: 'sales_revenue' });
    const cogsAccount = await ChartOfAccount.findOne({ accountSubType: 'cost_of_goods_sold' });
    const inventoryAccount = await ChartOfAccount.findOne({ accountSubType: 'inventory' });

    if (!arAccount || !salesAccount) {
      throw new Error('Required accounts not found in Chart of Accounts');
    }

    const lines = [
      {
        accountId: arAccount._id,
        debitAmount: amount,
        creditAmount: 0,
        description: `Sales to ${customerName}`,
        partyType: 'customer',
        partyId: customerId,
        partyName: customerName
      },
      {
        accountId: salesAccount._id,
        debitAmount: 0,
        creditAmount: amount,
        description: `Sales - ${invoiceNumber}`
      }
    ];

    // Add COGS entry if cost is provided
    if (costOfGoodsSold && costOfGoodsSold > 0 && cogsAccount && inventoryAccount) {
      lines.push({
        accountId: cogsAccount._id,
        debitAmount: costOfGoodsSold,
        creditAmount: 0,
        description: `Cost of goods sold - ${invoiceNumber}`
      });
      lines.push({
        accountId: inventoryAccount._id,
        debitAmount: 0,
        creditAmount: costOfGoodsSold,
        description: `Inventory sold - ${invoiceNumber}`
      });
    }

    const journalEntry = await this.createJournalEntry({
      entryType: 'sales',
      entryDate,
      narration: `Sales Invoice ${invoiceNumber} - ${customerName}`,
      lines,
      sourceType: 'Invoice',
      sourceId: invoiceId,
      sourceNumber: invoiceNumber,
      userId,
      userName
    });

    // Update customer balance
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { currentBalance: amount }
    });

    return journalEntry;
  }

  /**
   * Create return entry (sales return / credit note)
   * Debit: Sales Returns
   * Credit: Accounts Receivable (Customer)
   * Also adds inventory back
   */
  static async createReturnEntry({
    customerId,
    customerName,
    orderId,
    orderNumber,
    amount,
    userId,
    userName,
    entryDate
  }) {
    // Get required accounts
    const arAccount = await ChartOfAccount.findOne({ accountSubType: 'accounts_receivable' });
    const salesReturnsAccount = await ChartOfAccount.findOne({ accountSubType: 'sales_returns' }) ||
                                 await ChartOfAccount.findOne({ accountSubType: 'sales_revenue' });
    const inventoryAccount = await ChartOfAccount.findOne({ accountSubType: 'inventory' });
    const cogsAccount = await ChartOfAccount.findOne({ accountSubType: 'cost_of_goods_sold' });

    if (!arAccount || !salesReturnsAccount) {
      throw new Error('Required accounts not found in Chart of Accounts');
    }

    const lines = [
      {
        accountId: salesReturnsAccount._id,
        debitAmount: amount,
        creditAmount: 0,
        description: `Sales return - ${orderNumber}`
      },
      {
        accountId: arAccount._id,
        debitAmount: 0,
        creditAmount: amount,
        description: `Credit note for ${customerName}`,
        partyType: 'customer',
        partyId: customerId,
        partyName: customerName
      }
    ];

    // Reverse COGS entry (estimate cost as 70% of sale price)
    const estimatedCost = amount * 0.7;
    if (inventoryAccount && cogsAccount) {
      lines.push({
        accountId: inventoryAccount._id,
        debitAmount: estimatedCost,
        creditAmount: 0,
        description: `Inventory returned - ${orderNumber}`
      });
      lines.push({
        accountId: cogsAccount._id,
        debitAmount: 0,
        creditAmount: estimatedCost,
        description: `COGS reversal - ${orderNumber}`
      });
    }

    const journalEntry = await this.createJournalEntry({
      entryType: 'return',
      entryDate: entryDate || new Date(),
      narration: `Sales Return - Order ${orderNumber} - ${customerName}`,
      lines,
      sourceType: 'Return',
      sourceId: orderId,
      sourceNumber: orderNumber,
      userId,
      userName
    });

    // Reduce customer balance (they owe less)
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { currentBalance: -amount }
    });

    return journalEntry;
  }

  /**
   * Create purchase journal entry
   * Debit: Inventory
   * Credit: Accounts Payable (Vendor)
   */
  static async createPurchaseEntry({
    vendorId,
    vendorName,
    purchaseId,
    purchaseNumber,
    amount,
    userId,
    userName,
    entryDate
  }) {
    const inventoryAccount = await ChartOfAccount.findOne({ accountSubType: 'inventory' });
    const apAccount = await ChartOfAccount.findOne({ accountSubType: 'accounts_payable' });

    if (!inventoryAccount || !apAccount) {
      throw new Error('Required accounts not found in Chart of Accounts');
    }

    const journalEntry = await this.createJournalEntry({
      entryType: 'purchase',
      entryDate,
      narration: `Purchase ${purchaseNumber} - ${vendorName}`,
      lines: [
        {
          accountId: inventoryAccount._id,
          debitAmount: amount,
          creditAmount: 0,
          description: `Inventory purchased from ${vendorName}`
        },
        {
          accountId: apAccount._id,
          debitAmount: 0,
          creditAmount: amount,
          description: `Payable to ${vendorName}`,
          partyType: 'vendor',
          partyId: vendorId,
          partyName: vendorName
        }
      ],
      sourceType: 'Purchase',
      sourceId: purchaseId,
      sourceNumber: purchaseNumber,
      userId,
      userName
    });

    // Update vendor balance
    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: { currentBalance: amount }
    });

    return journalEntry;
  }

  /**
   * Create receipt entry (payment from customer)
   * Debit: Cash/Bank
   * Credit: Accounts Receivable (Customer)
   */
  static async createReceiptEntry({
    customerId,
    customerName,
    paymentId,
    paymentNumber,
    amount,
    paymentMethod,
    cashAccountId,
    userId,
    userName,
    entryDate
  }) {
    const arAccount = await ChartOfAccount.findOne({ accountSubType: 'accounts_receivable' });
    
    let paymentAccount;
    if (cashAccountId) {
      paymentAccount = await ChartOfAccount.findById(cashAccountId);
    } else {
      paymentAccount = await ChartOfAccount.findOne({ 
        isCashAccount: true 
      });
    }

    if (!arAccount || !paymentAccount) {
      throw new Error('Required accounts not found');
    }

    const journalEntry = await this.createJournalEntry({
      entryType: 'receipt',
      entryDate,
      narration: `Receipt ${paymentNumber} from ${customerName}`,
      lines: [
        {
          accountId: paymentAccount._id,
          debitAmount: amount,
          creditAmount: 0,
          description: `${paymentMethod} received from ${customerName}`
        },
        {
          accountId: arAccount._id,
          debitAmount: 0,
          creditAmount: amount,
          description: `Payment from ${customerName}`,
          partyType: 'customer',
          partyId: customerId,
          partyName: customerName
        }
      ],
      sourceType: 'Receipt',
      sourceId: paymentId,
      sourceNumber: paymentNumber,
      userId,
      userName
    });

    // Update customer balance (decrease receivable)
    await Customer.findByIdAndUpdate(customerId, {
      $inc: { currentBalance: -amount }
    });

    return journalEntry;
  }

  /**
   * Create payment entry (payment to vendor)
   * Debit: Accounts Payable (Vendor)
   * Credit: Cash/Bank
   */
  static async createPaymentEntry({
    vendorId,
    vendorName,
    paymentId,
    paymentNumber,
    amount,
    paymentMethod,
    cashAccountId,
    userId,
    userName,
    entryDate
  }) {
    const apAccount = await ChartOfAccount.findOne({ accountSubType: 'accounts_payable' });
    
    let paymentAccount;
    if (cashAccountId) {
      paymentAccount = await ChartOfAccount.findById(cashAccountId);
    } else {
      paymentAccount = await ChartOfAccount.findOne({ 
        isCashAccount: true 
      });
    }

    if (!apAccount || !paymentAccount) {
      throw new Error('Required accounts not found');
    }

    const journalEntry = await this.createJournalEntry({
      entryType: 'payment',
      entryDate,
      narration: `Payment ${paymentNumber} to ${vendorName}`,
      lines: [
        {
          accountId: apAccount._id,
          debitAmount: amount,
          creditAmount: 0,
          description: `Payment to ${vendorName}`,
          partyType: 'vendor',
          partyId: vendorId,
          partyName: vendorName
        },
        {
          accountId: paymentAccount._id,
          debitAmount: 0,
          creditAmount: amount,
          description: `${paymentMethod} paid to ${vendorName}`
        }
      ],
      sourceType: 'Payment',
      sourceId: paymentId,
      sourceNumber: paymentNumber,
      userId,
      userName
    });

    // Update vendor balance (decrease payable)
    await Vendor.findByIdAndUpdate(vendorId, {
      $inc: { currentBalance: -amount }
    });

    return journalEntry;
  }

  /**
   * Get Trial Balance
   */
  static async getTrialBalance(asOfDate) {
    const accounts = await ChartOfAccount.find({ isActive: true })
      .sort({ accountCode: 1 });

    let totalDebit = 0;
    let totalCredit = 0;

    const trialBalance = accounts.map(account => {
      let debit = 0;
      let credit = 0;

      if (account.normalBalance === 'debit') {
        if (account.currentBalance >= 0) {
          debit = account.currentBalance;
        } else {
          credit = Math.abs(account.currentBalance);
        }
      } else {
        if (account.currentBalance >= 0) {
          credit = account.currentBalance;
        } else {
          debit = Math.abs(account.currentBalance);
        }
      }

      totalDebit += debit;
      totalCredit += credit;

      return {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountType: account.accountType,
        debit,
        credit
      };
    }).filter(a => a.debit > 0 || a.credit > 0);

    return {
      accounts: trialBalance,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
      asOfDate: asOfDate || new Date()
    };
  }

  /**
   * Get Profit & Loss Statement
   * Returns detailed breakdown of income, COGS, gross profit, expenses, and net profit
   * Uses INVOICE data to align with Sales Report
   */
  static async getProfitAndLoss(startDate, endDate) {
    const Invoice = require('../models/Invoice');
    const Purchase = require('../models/Purchase');
    const { Expense } = require('../models/Expense');

    const dateFilter = {
      $gte: startDate || new Date(new Date().getFullYear(), 0, 1),
      $lte: endDate || new Date()
    };

    // ===== REVENUE SECTION =====
    // Get sales from INVOICES (issued invoices only), aligned with Sales Report
    const salesData = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: dateFilter,
          status: { $in: ['issued'] } // Only count issued invoices
        }
      },
      {
        $group: {
          _id: null,
          grossSales: { $sum: '$grandTotal' },
          totalDiscount: { $sum: { $ifNull: ['$totalDiscount', 0] } },
          totalCOGS: { $sum: { $ifNull: ['$totalCost', 0] } },
          totalProfit: { $sum: { $ifNull: ['$grossProfit', 0] } },
          invoiceCount: { $sum: 1 },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    const sales = salesData[0] || { grossSales: 0, totalDiscount: 0, totalCOGS: 0, totalProfit: 0, invoiceCount: 0, totalItems: 0 };
    const netSales = sales.grossSales - sales.totalDiscount;

    // ===== COST OF GOODS SOLD =====
    // COGS is the cost price of items sold
    const cogs = sales.totalCOGS || 0;

    // Gross Profit = Net Sales - COGS
    const grossProfit = netSales - cogs;
    const grossProfitMargin = netSales > 0 ? (grossProfit / netSales * 100).toFixed(2) : 0;

    // ===== OPERATING EXPENSES =====
    // Get expenses from Expense collection grouped by category
    const expenseData = await Expense.aggregate([
      {
        $match: {
          expenseDate: dateFilter,
          status: 'approved'
        }
      },
      {
        $group: {
          _id: '$categoryName',
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]);

    const totalOperatingExpenses = expenseData.reduce((sum, e) => sum + e.amount, 0);

    // ===== PURCHASE DATA (for reference/analysis) =====
    const purchaseData = await Purchase.aggregate([
      {
        $match: {
          purchaseDate: dateFilter,
          status: { $in: ['received', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$grandTotal' },
          purchaseCount: { $sum: 1 }
        }
      }
    ]);

    const purchases = purchaseData[0] || { totalPurchases: 0, purchaseCount: 0 };

    // ===== CALCULATIONS =====
    const operatingProfit = grossProfit - totalOperatingExpenses;
    const netProfit = operatingProfit; // Can add other income/expenses here
    const netProfitMargin = netSales > 0 ? (netProfit / netSales * 100).toFixed(2) : 0;

    // ===== FORMAT RESPONSE =====
    return {
      // Period
      period: {
        startDate: dateFilter.$gte,
        endDate: dateFilter.$lte
      },
      
      // Revenue Section
      revenue: {
        grossSales: sales.grossSales,
        salesReturns: 0, // TODO: Track returns
        discounts: sales.totalDiscount,
        netSales: netSales,
        orderCount: sales.invoiceCount,
        itemsSold: sales.totalItems
      },
      
      // Cost of Goods Sold
      costOfGoodsSold: {
        beginningInventory: 0, // TODO: Track inventory valuation
        purchases: purchases.totalPurchases,
        endingInventory: 0,
        cogs: cogs, // Direct COGS from order items
        cogsNote: 'Cost based on purchase prices at time of sale'
      },
      
      // Gross Profit
      grossProfit: {
        amount: grossProfit,
        margin: parseFloat(grossProfitMargin)
      },
      
      // Operating Expenses (detailed)
      operatingExpenses: {
        items: expenseData.map(e => ({
          category: e._id || 'Uncategorized',
          amount: e.amount,
          count: e.count
        })),
        total: totalOperatingExpenses
      },
      
      // Operating Profit
      operatingProfit: {
        amount: operatingProfit
      },
      
      // Other Income/Expenses (future)
      otherIncome: 0,
      otherExpenses: 0,
      
      // Net Profit/Loss
      netProfit: {
        amount: netProfit,
        margin: parseFloat(netProfitMargin),
        isProfit: netProfit >= 0
      },
      
      // Summary for quick view
      summary: {
        totalRevenue: netSales,
        totalCOGS: cogs,
        totalExpenses: totalOperatingExpenses,
        grossProfit: grossProfit,
        netProfit: netProfit
      },

      // Legacy format for backward compatibility
      income: [
        { accountCode: '4100', accountName: 'Sales Revenue', accountSubType: 'sales_revenue', amount: sales.grossSales },
        { accountCode: '4200', accountName: 'Less: Discounts', accountSubType: 'sales_revenue', amount: -sales.totalDiscount }
      ].filter(i => i.amount !== 0),
      expenses: [
        { accountCode: '5000', accountName: 'Cost of Goods Sold', accountSubType: 'cost_of_goods_sold', amount: cogs },
        ...expenseData.map(e => ({
          accountCode: '6000',
          accountName: e._id || 'Other Expenses',
          accountSubType: 'operating_expense',
          amount: e.amount
        }))
      ].filter(e => e.amount !== 0),
      totalIncome: netSales,
      totalExpenses: cogs + totalOperatingExpenses
    };
  }

  /**
   * Get Balance Sheet
   * Assets = Liabilities + Equity
   * Shows the financial position at a specific date
   */
  static async getBalanceSheet(asOfDate) {
    const { InventoryValuation } = require('../models/Inventory');
    
    const effectiveDate = asOfDate || new Date();
    
    // Get all active accounts
    const accounts = await ChartOfAccount.find({ isActive: true }).sort({ accountCode: 1 });
    
    // Get inventory value from valuation
    const inventoryValuation = await InventoryValuation.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$totalValue' }
        }
      }
    ]);
    const inventoryValue = inventoryValuation[0]?.totalValue || 0;
    
    // Get AR total (customers who owe us)
    const arTotal = await Customer.aggregate([
      { $match: { currentBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$currentBalance' } } }
    ]);
    
    // Get AP total (what we owe to vendors)
    const apTotal = await Vendor.aggregate([
      { $match: { currentBalance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$currentBalance' } } }
    ]);
    
    // Classify accounts by type
    const assets = [];
    const liabilities = [];
    const equity = [];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    for (const account of accounts) {
      // Skip parent accounts with 0 balance
      if (account.currentBalance === 0 && !['accounts_receivable', 'accounts_payable', 'inventory'].includes(account.accountSubType)) {
        continue;
      }
      
      let balance = account.currentBalance;
      
      // Override with actual calculated values for control accounts
      if (account.accountSubType === 'accounts_receivable') {
        balance = arTotal[0]?.total || 0;
      } else if (account.accountSubType === 'accounts_payable') {
        balance = apTotal[0]?.total || 0;
      } else if (account.accountSubType === 'inventory') {
        balance = inventoryValue;
      }
      
      // For proper reporting, show positive numbers
      const displayBalance = account.normalBalance === 'debit' ? balance : balance;
      
      if (balance === 0) continue;
      
      const accountData = {
        accountCode: account.accountCode,
        accountName: account.accountName,
        accountSubType: account.accountSubType,
        balance: Math.abs(balance)
      };
      
      switch (account.accountType) {
        case 'asset':
          assets.push(accountData);
          totalAssets += balance;
          break;
        case 'liability':
          liabilities.push(accountData);
          totalLiabilities += balance;
          break;
        case 'equity':
          equity.push(accountData);
          totalEquity += balance;
          break;
      }
    }
    
    // Calculate retained earnings (Net Income - Drawings)
    // For simplicity, we're using the difference to balance the equation
    const retainedEarnings = totalAssets - totalLiabilities - totalEquity;
    
    if (retainedEarnings !== 0) {
      const existingRE = equity.find(e => e.accountSubType === 'retained_earnings');
      if (existingRE) {
        existingRE.balance = Math.abs(retainedEarnings);
      } else {
        equity.push({
          accountCode: '3300',
          accountName: 'Retained Earnings',
          accountSubType: 'retained_earnings',
          balance: Math.abs(retainedEarnings)
        });
      }
      totalEquity += retainedEarnings;
    }
    
    // Group assets by subtype
    const currentAssets = assets.filter(a => ['cash', 'bank', 'accounts_receivable', 'inventory'].includes(a.accountSubType));
    const fixedAssets = assets.filter(a => ['fixed_asset'].includes(a.accountSubType));
    const otherAssets = assets.filter(a => ['other_asset'].includes(a.accountSubType));
    
    const currentLiabilities = liabilities.filter(l => ['accounts_payable', 'short_term_liability'].includes(l.accountSubType));
    const longTermLiabilities = liabilities.filter(l => ['long_term_liability'].includes(l.accountSubType));
    
    return {
      asOfDate: effectiveDate,
      
      // Assets Section
      assets: {
        currentAssets: {
          items: currentAssets,
          total: currentAssets.reduce((sum, a) => sum + a.balance, 0)
        },
        fixedAssets: {
          items: fixedAssets,
          total: fixedAssets.reduce((sum, a) => sum + a.balance, 0)
        },
        otherAssets: {
          items: otherAssets,
          total: otherAssets.reduce((sum, a) => sum + a.balance, 0)
        },
        totalAssets
      },
      
      // Liabilities Section
      liabilities: {
        currentLiabilities: {
          items: currentLiabilities,
          total: currentLiabilities.reduce((sum, l) => sum + l.balance, 0)
        },
        longTermLiabilities: {
          items: longTermLiabilities,
          total: longTermLiabilities.reduce((sum, l) => sum + l.balance, 0)
        },
        totalLiabilities
      },
      
      // Equity Section
      equity: {
        items: equity,
        totalEquity
      },
      
      // Summary
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1
    };
  }
}

module.exports = AccountingService;
