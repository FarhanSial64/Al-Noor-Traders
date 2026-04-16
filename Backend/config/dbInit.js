/**
 * Database Initialization Utility
 * 
 * Ensures all critical accounts and settings exist
 * Called during server startup to prevent runtime errors
 */

const ChartOfAccount = require('../models/ChartOfAccount');

const REQUIRED_ACCOUNTS = {
  inventory: { 
    accountCode: '1400', 
    accountName: 'Inventory', 
    accountType: 'asset', 
    accountSubType: 'inventory', 
    normalBalance: 'debit', 
    isSystem: true, 
    isInventory: true 
  },
  accountsPayable: { 
    accountCode: '2100', 
    accountName: 'Accounts Payable', 
    accountType: 'liability', 
    accountSubType: 'accounts_payable', 
    normalBalance: 'credit', 
    isSystem: true, 
    isPayable: true 
  },
  accountsReceivable: { 
    accountCode: '1300', 
    accountName: 'Accounts Receivable', 
    accountType: 'asset', 
    accountSubType: 'accounts_receivable', 
    normalBalance: 'debit', 
    isSystem: true, 
    isReceivable: true 
  },
  salesRevenue: { 
    accountCode: '4100', 
    accountName: 'Sales Revenue', 
    accountType: 'income', 
    accountSubType: 'sales_revenue', 
    normalBalance: 'credit', 
    isSystem: true, 
    isSalesAccount: true 
  },
  cogs: { 
    accountCode: '5000', 
    accountName: 'Cost of Goods Sold', 
    accountType: 'expense', 
    accountSubType: 'cost_of_goods_sold', 
    normalBalance: 'debit', 
    isSystem: true, 
    isCOGSAccount: true 
  },
  cash: { 
    accountCode: '1100', 
    accountName: 'Cash in Hand', 
    accountType: 'asset', 
    accountSubType: 'cash', 
    normalBalance: 'debit', 
    isSystem: true, 
    isCashAccount: true 
  }
};

/**
 * Initialize database with required accounts
 * Called on server startup
 */
async function initializeDatabase() {
  try {
    console.log('\n🔍 Checking critical database accounts...');
    
    const missing = [];
    const existing = [];

    // Check each required account
    for (const [key, accountData] of Object.entries(REQUIRED_ACCOUNTS)) {
      const accountExists = await ChartOfAccount.findOne({
        accountSubType: accountData.accountSubType
      });

      if (accountExists) {
        existing.push(`  ✓ ${accountData.accountName}`);
      } else {
        missing.push(accountData);
      }
    }

    if (existing.length > 0) {
      console.log('\n✅ Existing Accounts:');
      existing.forEach(msg => console.log(msg));
    }

    // Create missing accounts
    if (missing.length > 0) {
      console.log('\n⚠️  Missing Critical Accounts - Creating...');
      for (const accountData of missing) {
        await ChartOfAccount.create(accountData);
        console.log(`  ✓ Created: ${accountData.accountName}`);
      }
    }

    if (missing.length === 0 && existing.length > 0) {
      console.log('\n✅ All critical accounts are present!\n');
    } else if (missing.length > 0) {
      console.log(`\n✅ Successfully created ${missing.length} missing accounts!\n`);
    }

    return true;
  } catch (error) {
    console.error('\n❌ Database initialization error:', error.message);
    // Don't fail server startup, just warn
    return false;
  }
}

module.exports = { initializeDatabase };
