/**
 * Database Seed Script
 * 
 * Seeds the database with initial data:
 * - Chart of Accounts
 * - Default Admin (Distributor) user
 * - Sample Categories, Brands, Units
 * 
 * Run: node seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');
const ChartOfAccount = require('./models/ChartOfAccount');
const { Product, Category, Brand, Unit } = require('./models/Product');
const { ExpenseCategory } = require('./models/Expense');

// ===== CHART OF ACCOUNTS DATA =====
const chartOfAccountsData = [
  // ASSETS (1000-1999)
  { accountCode: '1000', accountName: 'Assets', accountType: 'asset', accountSubType: 'other_asset', normalBalance: 'debit', isSystem: true },
  { accountCode: '1100', accountName: 'Cash in Hand', accountType: 'asset', accountSubType: 'cash', normalBalance: 'debit', isSystem: true, isCashAccount: true },
  { accountCode: '1110', accountName: 'Petty Cash', accountType: 'asset', accountSubType: 'cash', normalBalance: 'debit', isSystem: true, isCashAccount: true },
  { accountCode: '1200', accountName: 'Bank Accounts', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit', isSystem: true },
  { accountCode: '1210', accountName: 'Main Bank Account', accountType: 'asset', accountSubType: 'bank', normalBalance: 'debit', isSystem: true, isBankAccount: true },
  { accountCode: '1300', accountName: 'Accounts Receivable', accountType: 'asset', accountSubType: 'accounts_receivable', normalBalance: 'debit', isSystem: true, isReceivable: true },
  { accountCode: '1310', accountName: 'Trade Debtors', accountType: 'asset', accountSubType: 'accounts_receivable', normalBalance: 'debit', isSystem: true, isReceivable: true },
  { accountCode: '1400', accountName: 'Inventory', accountType: 'asset', accountSubType: 'inventory', normalBalance: 'debit', isSystem: true, isInventory: true },
  { accountCode: '1410', accountName: 'Merchandise Inventory', accountType: 'asset', accountSubType: 'inventory', normalBalance: 'debit', isSystem: true, isInventory: true },
  { accountCode: '1500', accountName: 'Prepaid Expenses', accountType: 'asset', accountSubType: 'other_asset', normalBalance: 'debit', isSystem: true },
  { accountCode: '1600', accountName: 'Fixed Assets', accountType: 'asset', accountSubType: 'fixed_asset', normalBalance: 'debit', isSystem: true },
  { accountCode: '1610', accountName: 'Vehicles', accountType: 'asset', accountSubType: 'fixed_asset', normalBalance: 'debit', isSystem: true },
  { accountCode: '1620', accountName: 'Furniture & Equipment', accountType: 'asset', accountSubType: 'fixed_asset', normalBalance: 'debit', isSystem: true },
  { accountCode: '1700', accountName: 'Accumulated Depreciation', accountType: 'asset', accountSubType: 'fixed_asset', normalBalance: 'credit', isSystem: true },

  // LIABILITIES (2000-2999)
  { accountCode: '2000', accountName: 'Liabilities', accountType: 'liability', accountSubType: 'short_term_liability', normalBalance: 'credit', isSystem: true },
  { accountCode: '2100', accountName: 'Accounts Payable', accountType: 'liability', accountSubType: 'accounts_payable', normalBalance: 'credit', isSystem: true, isPayable: true },
  { accountCode: '2110', accountName: 'Trade Creditors', accountType: 'liability', accountSubType: 'accounts_payable', normalBalance: 'credit', isSystem: true, isPayable: true },
  { accountCode: '2200', accountName: 'Accrued Expenses', accountType: 'liability', accountSubType: 'short_term_liability', normalBalance: 'credit', isSystem: true },
  { accountCode: '2300', accountName: 'Sales Tax Payable', accountType: 'liability', accountSubType: 'short_term_liability', normalBalance: 'credit', isSystem: true },
  { accountCode: '2400', accountName: 'Short Term Loans', accountType: 'liability', accountSubType: 'short_term_liability', normalBalance: 'credit', isSystem: true },
  { accountCode: '2500', accountName: 'Long Term Loans', accountType: 'liability', accountSubType: 'long_term_liability', normalBalance: 'credit', isSystem: true },

  // EQUITY (3000-3999)
  { accountCode: '3000', accountName: 'Owner\'s Equity', accountType: 'equity', accountSubType: 'capital', normalBalance: 'credit', isSystem: true },
  { accountCode: '3100', accountName: 'Owner\'s Capital', accountType: 'equity', accountSubType: 'capital', normalBalance: 'credit', isSystem: true },
  { accountCode: '3200', accountName: 'Owner\'s Drawings', accountType: 'equity', accountSubType: 'drawings', normalBalance: 'debit', isSystem: true },
  { accountCode: '3300', accountName: 'Retained Earnings', accountType: 'equity', accountSubType: 'retained_earnings', normalBalance: 'credit', isSystem: true },

  // INCOME (4000-4999)
  { accountCode: '4000', accountName: 'Revenue', accountType: 'income', accountSubType: 'sales_revenue', normalBalance: 'credit', isSystem: true },
  { accountCode: '4100', accountName: 'Sales Revenue', accountType: 'income', accountSubType: 'sales_revenue', normalBalance: 'credit', isSystem: true, isSalesAccount: true },
  { accountCode: '4110', accountName: 'Product Sales', accountType: 'income', accountSubType: 'sales_revenue', normalBalance: 'credit', isSystem: true, isSalesAccount: true },
  { accountCode: '4200', accountName: 'Sales Returns & Allowances', accountType: 'income', accountSubType: 'sales_revenue', normalBalance: 'debit', isSystem: true },
  { accountCode: '4300', accountName: 'Sales Discounts', accountType: 'income', accountSubType: 'sales_revenue', normalBalance: 'debit', isSystem: true },
  { accountCode: '4500', accountName: 'Other Income', accountType: 'income', accountSubType: 'other_income', normalBalance: 'credit', isSystem: true },

  // COST OF GOODS SOLD (5000-5999)
  { accountCode: '5000', accountName: 'Cost of Goods Sold', accountType: 'expense', accountSubType: 'cost_of_goods_sold', normalBalance: 'debit', isSystem: true, isCOGSAccount: true },
  { accountCode: '5100', accountName: 'Purchases', accountType: 'expense', accountSubType: 'cost_of_goods_sold', normalBalance: 'debit', isSystem: true, isPurchaseAccount: true },
  { accountCode: '5200', accountName: 'Purchase Returns', accountType: 'expense', accountSubType: 'cost_of_goods_sold', normalBalance: 'credit', isSystem: true },
  { accountCode: '5300', accountName: 'Purchase Discounts', accountType: 'expense', accountSubType: 'cost_of_goods_sold', normalBalance: 'credit', isSystem: true },
  { accountCode: '5400', accountName: 'Freight In', accountType: 'expense', accountSubType: 'cost_of_goods_sold', normalBalance: 'debit', isSystem: true },

  // OPERATING EXPENSES (6000-6999)
  { accountCode: '6000', accountName: 'Operating Expenses', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6100', accountName: 'Salaries & Wages', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6200', accountName: 'Rent Expense', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6300', accountName: 'Utilities Expense', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6400', accountName: 'Transportation & Delivery', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6500', accountName: 'Office Supplies', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6600', accountName: 'Telephone & Internet', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6700', accountName: 'Depreciation Expense', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6800', accountName: 'Bank Charges', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true },
  { accountCode: '6900', accountName: 'Miscellaneous Expense', accountType: 'expense', accountSubType: 'operating_expense', normalBalance: 'debit', isSystem: true }
];

// ===== CATEGORIES DATA =====
const categoriesData = [
  { categoryCode: 'SOAP', categoryName: 'Soaps', description: 'Bar soaps, liquid soaps, handwash' },
  { categoryCode: 'DETERGENT', categoryName: 'Detergents', description: 'Washing powders, liquids, fabric care' },
  { categoryCode: 'SHAMPOO', categoryName: 'Shampoos', description: 'Hair care products' },
  { categoryCode: 'CREAM', categoryName: 'Creams & Lotions', description: 'Skin care products' },
  { categoryCode: 'TOOTHPASTE', categoryName: 'Oral Care', description: 'Toothpaste, mouthwash, toothbrush' },
  { categoryCode: 'TEA', categoryName: 'Tea & Beverages', description: 'Tea, coffee, drinks' },
  { categoryCode: 'FOOD', categoryName: 'Food Items', description: 'Cooking essentials, snacks' },
  { categoryCode: 'CLEANING', categoryName: 'Cleaning Products', description: 'Floor cleaners, dish wash, bleach' }
];

// ===== BRANDS DATA =====
const brandsData = [
  { brandCode: 'LUX', brandName: 'Lux', manufacturer: 'Unilever' },
  { brandCode: 'LIFEBUOY', brandName: 'Lifebuoy', manufacturer: 'Unilever' },
  { brandCode: 'DOVE', brandName: 'Dove', manufacturer: 'Unilever' },
  { brandCode: 'SURF', brandName: 'Surf Excel', manufacturer: 'Unilever' },
  { brandCode: 'BONUS', brandName: 'Bonus', manufacturer: 'Colgate-Palmolive' },
  { brandCode: 'ARIEL', brandName: 'Ariel', manufacturer: 'P&G' },
  { brandCode: 'HEAD', brandName: 'Head & Shoulders', manufacturer: 'P&G' },
  { brandCode: 'PANTENE', brandName: 'Pantene', manufacturer: 'P&G' },
  { brandCode: 'SUNSILK', brandName: 'Sunsilk', manufacturer: 'Unilever' },
  { brandCode: 'CLEAR', brandName: 'Clear', manufacturer: 'Unilever' },
  { brandCode: 'COLGATE', brandName: 'Colgate', manufacturer: 'Colgate-Palmolive' },
  { brandCode: 'CLOSEUP', brandName: 'Close Up', manufacturer: 'Unilever' },
  { brandCode: 'LIPTON', brandName: 'Lipton', manufacturer: 'Unilever' },
  { brandCode: 'TAPAL', brandName: 'Tapal', manufacturer: 'Tapal Tea' },
  { brandCode: 'FAIR', brandName: 'Fair & Lovely', manufacturer: 'Unilever' },
  { brandCode: 'VASELINE', brandName: 'Vaseline', manufacturer: 'Unilever' },
  { brandCode: 'VIM', brandName: 'Vim', manufacturer: 'Unilever' },
  { brandCode: 'HARPIC', brandName: 'Harpic', manufacturer: 'Reckitt' }
];

// ===== UNITS DATA =====
const unitsData = [
  { unitName: 'Piece', shortName: 'Pc', conversionFactor: 1, isBaseUnit: true },
  { unitName: 'Dozen', shortName: 'Dz', conversionFactor: 12 },
  { unitName: 'Carton', shortName: 'Ctn', conversionFactor: 24 },
  { unitName: 'Box', shortName: 'Box', conversionFactor: 48 },
  { unitName: 'Pack', shortName: 'Pk', conversionFactor: 6 },
  { unitName: 'Kilogram', shortName: 'Kg', conversionFactor: 1, isBaseUnit: true },
  { unitName: 'Gram', shortName: 'g', conversionFactor: 0.001 },
  { unitName: 'Liter', shortName: 'L', conversionFactor: 1, isBaseUnit: true },
  { unitName: 'Milliliter', shortName: 'ml', conversionFactor: 0.001 }
];

// ===== EXPENSE CATEGORIES DATA =====
const expenseCategoriesData = [
  { name: 'Salaries & Wages', description: 'Employee salaries, wages, and benefits', accountCode: '6100' },
  { name: 'Rent', description: 'Office/warehouse rent and lease payments', accountCode: '6200' },
  { name: 'Utilities', description: 'Electricity, water, gas bills', accountCode: '6300' },
  { name: 'Transportation', description: 'Vehicle fuel, maintenance, delivery costs', accountCode: '6400' },
  { name: 'Office Supplies', description: 'Stationery, printing, office consumables', accountCode: '6500' },
  { name: 'Communication', description: 'Phone bills, internet, postage', accountCode: '6600' },
  { name: 'Bank Charges', description: 'Bank fees, transaction charges', accountCode: '6800' },
  { name: 'Repairs & Maintenance', description: 'Equipment and vehicle repairs', accountCode: '6900' },
  { name: 'Marketing & Advertising', description: 'Promotional activities, advertisements', accountCode: '6900' },
  { name: 'Entertainment', description: 'Client entertainment, meals', accountCode: '6900' },
  { name: 'Insurance', description: 'Business insurance premiums', accountCode: '6900' },
  { name: 'Miscellaneous', description: 'Other general expenses', accountCode: '6900' }
];

// ===== SAMPLE PRODUCTS =====
const sampleProducts = [
  {
    productCode: 'LUX-PNK-100',
    productName: 'Lux Pink Soap 100g',
    barcode: '8901030612345',
    categoryCode: 'SOAP',
    brandCode: 'LUX',
    suggestedRetailPrice: 150,
    reorderLevel: 50,
    reorderQuantity: 100
  },
  {
    productCode: 'LUX-WHT-100',
    productName: 'Lux White Soap 100g',
    barcode: '8901030612346',
    categoryCode: 'SOAP',
    brandCode: 'LUX',
    suggestedRetailPrice: 150,
    reorderLevel: 50,
    reorderQuantity: 100
  },
  {
    productCode: 'LB-RED-100',
    productName: 'Lifebuoy Red Soap 100g',
    barcode: '8901030612347',
    categoryCode: 'SOAP',
    brandCode: 'LIFEBUOY',
    suggestedRetailPrice: 100,
    reorderLevel: 100,
    reorderQuantity: 200
  },
  {
    productCode: 'SURF-1KG',
    productName: 'Surf Excel Washing Powder 1Kg',
    barcode: '8901030612348',
    categoryCode: 'DETERGENT',
    brandCode: 'SURF',
    suggestedRetailPrice: 350,
    reorderLevel: 30,
    reorderQuantity: 60
  },
  {
    productCode: 'SURF-500G',
    productName: 'Surf Excel Washing Powder 500g',
    barcode: '8901030612349',
    categoryCode: 'DETERGENT',
    brandCode: 'SURF',
    suggestedRetailPrice: 180,
    reorderLevel: 50,
    reorderQuantity: 100
  },
  {
    productCode: 'BONUS-1KG',
    productName: 'Bonus Detergent 1Kg',
    barcode: '8901030612350',
    categoryCode: 'DETERGENT',
    brandCode: 'BONUS',
    suggestedRetailPrice: 280,
    reorderLevel: 40,
    reorderQuantity: 80
  },
  {
    productCode: 'SS-200ML',
    productName: 'Sunsilk Shampoo 200ml',
    barcode: '8901030612351',
    categoryCode: 'SHAMPOO',
    brandCode: 'SUNSILK',
    suggestedRetailPrice: 320,
    reorderLevel: 20,
    reorderQuantity: 50
  },
  {
    productCode: 'CG-100G',
    productName: 'Colgate Toothpaste 100g',
    barcode: '8901030612352',
    categoryCode: 'TOOTHPASTE',
    brandCode: 'COLGATE',
    suggestedRetailPrice: 180,
    reorderLevel: 40,
    reorderQuantity: 80
  },
  {
    productCode: 'LIP-TEA-200',
    productName: 'Lipton Yellow Label 200g',
    barcode: '8901030612353',
    categoryCode: 'TEA',
    brandCode: 'LIPTON',
    suggestedRetailPrice: 450,
    reorderLevel: 25,
    reorderQuantity: 50
  },
  {
    productCode: 'VIM-500G',
    productName: 'Vim Dishwash Bar 500g',
    barcode: '8901030612354',
    categoryCode: 'CLEANING',
    brandCode: 'VIM',
    suggestedRetailPrice: 120,
    reorderLevel: 40,
    reorderQuantity: 100
  }
];

// ===== SEED FUNCTION =====
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Connect to database
    await connectDB();
    console.log('✓ Connected to database\n');

    // ===== SEED CHART OF ACCOUNTS =====
    console.log('📊 Seeding Chart of Accounts...');
    const existingAccounts = await ChartOfAccount.countDocuments();
    if (existingAccounts === 0) {
      await ChartOfAccount.insertMany(chartOfAccountsData);
      console.log(`   ✓ Created ${chartOfAccountsData.length} accounts\n`);
    } else {
      console.log(`   ⏭ Skipped - ${existingAccounts} accounts already exist\n`);
    }

    // ===== SEED ADMIN USER =====
    console.log('👤 Seeding Admin (Distributor) User...');
    const existingAdmin = await User.findOne({ role: 'distributor' });
    if (!existingAdmin) {
      const adminUser = await User.create({
        username: 'admin',
        email: 'admin@alnoortraders.com',
        password: 'Admin@123', // Will be hashed by pre-save hook
        fullName: 'System Administrator',
        role: 'distributor',
        phone: '03001234567',
        isActive: true
      });
      console.log(`   ✓ Created admin user: ${adminUser.username}`);
      console.log('   📝 Credentials:');
      console.log('      Username: admin');
      console.log('      Password: Admin@123\n');
    } else {
      console.log(`   ⏭ Skipped - Admin user already exists: ${existingAdmin.username}\n`);
    }

    // ===== SEED CATEGORIES =====
    console.log('📁 Seeding Categories...');
    const existingCategories = await Category.countDocuments();
    if (existingCategories === 0) {
      await Category.insertMany(categoriesData);
      console.log(`   ✓ Created ${categoriesData.length} categories\n`);
    } else {
      console.log(`   ⏭ Skipped - ${existingCategories} categories already exist\n`);
    }

    // ===== SEED BRANDS =====
    console.log('🏷️ Seeding Brands...');
    const existingBrands = await Brand.countDocuments();
    if (existingBrands === 0) {
      await Brand.insertMany(brandsData);
      console.log(`   ✓ Created ${brandsData.length} brands\n`);
    } else {
      console.log(`   ⏭ Skipped - ${existingBrands} brands already exist\n`);
    }

    // ===== SEED UNITS =====
    console.log('📏 Seeding Units...');
    const existingUnits = await Unit.countDocuments();
    if (existingUnits === 0) {
      await Unit.insertMany(unitsData);
      console.log(`   ✓ Created ${unitsData.length} units\n`);
    } else {
      console.log(`   ⏭ Skipped - ${existingUnits} units already exist\n`);
    }

    // ===== SEED EXPENSE CATEGORIES =====
    console.log('💰 Seeding Expense Categories...');
    const existingExpenseCategories = await ExpenseCategory.countDocuments();
    if (existingExpenseCategories === 0) {
      // Get chart of accounts for linking
      const accounts = await ChartOfAccount.find().lean();
      const accountMap = {};
      accounts.forEach(a => accountMap[a.accountCode] = a._id);

      const expenseCategoriesToInsert = expenseCategoriesData.map(cat => ({
        name: cat.name,
        description: cat.description,
        expenseAccount: accountMap[cat.accountCode] || null,
        isActive: true
      }));

      await ExpenseCategory.insertMany(expenseCategoriesToInsert);
      console.log(`   ✓ Created ${expenseCategoriesToInsert.length} expense categories\n`);
    } else {
      console.log(`   ⏭ Skipped - ${existingExpenseCategories} expense categories already exist\n`);
    }

    // ===== SEED SAMPLE PRODUCTS =====
    console.log('📦 Seeding Sample Products...');
    const existingProducts = await Product.countDocuments();
    if (existingProducts === 0) {
      // Get category and brand IDs
      const categories = await Category.find().lean();
      const brands = await Brand.find().lean();
      const defaultUnit = await Unit.findOne({ shortName: 'Pc' });

      const categoryMap = {};
      categories.forEach(c => categoryMap[c.categoryCode] = c._id);

      const brandMap = {};
      brands.forEach(b => brandMap[b.brandCode] = b._id);

      const productsToInsert = sampleProducts.map(p => ({
        productCode: p.productCode,
        productName: p.productName,
        barcode: p.barcode,
        category: categoryMap[p.categoryCode],
        brand: brandMap[p.brandCode],
        unit: defaultUnit._id,
        suggestedRetailPrice: p.suggestedRetailPrice,
        reorderLevel: p.reorderLevel,
        reorderQuantity: p.reorderQuantity,
        currentStock: 0,
        isActive: true
      }));

      await Product.insertMany(productsToInsert);
      console.log(`   ✓ Created ${productsToInsert.length} sample products\n`);
    } else {
      console.log(`   ⏭ Skipped - ${existingProducts} products already exist\n`);
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Database seeding completed successfully!');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📝 Next steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Login with admin credentials');
    console.log('   3. Create users (Order Bookers, Computer Operators)');
    console.log('   4. Add customers and vendors');
    console.log('   5. Start entering purchases to add stock\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

// Run seed
seedDatabase();
