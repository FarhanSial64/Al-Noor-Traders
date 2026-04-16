/**
 * Database Remediation Script
 * 
 * Ensures all required accounts exist in Chart of Accounts
 * Run this after seed.js or whenever accounts are missing
 * 
 * Usage: node repair-accounts.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const ChartOfAccount = require('./models/ChartOfAccount');

// Required accounts for purchases, sales, and other operations
const REQUIRED_ACCOUNTS = [
  // Inventory & COGS
  { accountCode: '1400', accountName: 'Inventory', accountType: 'asset', accountSubType: 'inventory', normalBalance: 'debit', isSystem: true, isInventory: true },
  { accountCode: '1410', accountName: 'Merchandise Inventory', accountType: 'asset', accountSubType: 'inventory', normalBalance: 'debit', isSystem: true, isInventory: true },
  { accountCode: '5000', accountName: 'Cost of Goods Sold', accountType: 'expense', accountSubType: 'cost_of_goods_sold', normalBalance: 'debit', isSystem: true, isCOGSAccount: true },
  
  // Accounts Payable
  { accountCode: '2100', accountName: 'Accounts Payable', accountType: 'liability', accountSubType: 'accounts_payable', normalBalance: 'credit', isSystem: true, isPayable: true },
  { accountCode: '2110', accountName: 'Trade Creditors', accountType: 'liability', accountSubType: 'accounts_payable', normalBalance: 'credit', isSystem: true, isPayable: true },
  
  // Accounts Receivable & Sales
  { accountCode: '1300', accountName: 'Accounts Receivable', accountType: 'asset', accountSubType: 'accounts_receivable', normalBalance: 'debit', isSystem: true, isReceivable: true },
  { accountCode: '4100', accountName: 'Sales Revenue', accountType: 'income', accountSubType: 'sales_revenue', normalBalance: 'credit', isSystem: true, isSalesAccount: true },
  
  // Cash & Bank
  { accountCode: '1100', accountName: 'Cash in Hand', accountType: 'asset', accountSubType: 'cash', normalBalance: 'debit', isSystem: true, isCashAccount: true },
  { accountCode: '1210', accountName: 'Main Bank Account', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit', isSystem: true, isBankAccount: true }
];

async function repairAccounts() {
  try {
    console.log('🔧 Starting account remediation...\n');
    
    await connectDB();
    console.log('✓ Connected to database\n');

    let created = 0;
    let skipped = 0;

    for (const account of REQUIRED_ACCOUNTS) {
      const exists = await ChartOfAccount.findOne({ 
        accountSubType: account.accountSubType 
      });

      if (!exists) {
        await ChartOfAccount.create(account);
        console.log(`✓ Created account: ${account.accountName} (${account.accountCode})`);
        created++;
      } else {
        console.log(`⏭ Already exists: ${account.accountName}`);
        skipped++;
      }
    }

    console.log(`\n📊 Repair Summary:`);
    console.log(`   Created: ${created} accounts`);
    console.log(`   Already existed: ${skipped} accounts`);
    console.log(`\n✨ Account remediation complete!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during account remediation:', error);
    process.exit(1);
  }
}

// Run the remediation
repairAccounts();
