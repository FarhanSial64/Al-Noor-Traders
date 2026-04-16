# Purchase Creation Error Fix - Account Initialization

## Problem
When creating a purchase in the Al Noor Traders application deployed on Render, you're getting this error:
```
Failed to load resource: the server responded with a status of 500
Error: Required accounts not found in Chart of Accounts
```

## Root Cause
The purchase creation process tries to create journal entries that require these accounts to exist in the Chart of Accounts:
- **Inventory** (account sub-type: inventory)
- **Accounts Payable** (account sub-type: accounts_payable)

These accounts were defined in your `seed.js` file but were **never created** in the MongoDB database.

## Solution

### Option 1: Automatic Fix (Recommended - Already Applied)
The backend server now automatically checks for and creates missing critical accounts on startup.

**Steps:**
1. Restart your backend server on Render:
   - Go to Dashboard → Services → Backend
   - Click the "..." menu and select "Restart service"
   - Wait for the server to restart

2. The server will automatically:
   - Check for missing accounts
   - Create any missing critical accounts
   - Log the results in the startup messages

3. Test by creating a purchase again

### Option 2: Manual Fix Using Repair Script
If you need to manually fix the accounts:

1. From your Backend directory, run:
   ```bash
   npm install  # Ensure dependencies are up to date
   node repair-accounts.js
   ```

2. This script will:
   - Connect to MongoDB
   - Check for missing required accounts
   - Create any missing accounts
   - Report the results

### Option 3: Manual Database Console Fix
If you have MongoDB Atlas access:

1. Go to your MongoDB Atlas cluster
2. Navigate to Collections → Chart of Accounts
3. Insert the missing documents:

```json
{
  "accountCode": "1400",
  "accountName": "Inventory",
  "accountType": "asset",
  "accountSubType": "inventory",
  "normalBalance": "debit",
  "isSystem": true,
  "isInventory": true,
  "currentBalance": 0
}
```

```json
{
  "accountCode": "2100",
  "accountName": "Accounts Payable",
  "accountType": "liability",
  "accountSubType": "accounts_payable",
  "normalBalance": "credit",
  "isSystem": true,
  "isPayable": true,
  "currentBalance": 0
}
```

## What Changed
1. **New File: `config/dbInit.js`**
   - Checks for critical accounts on server startup
   - Automatically creates missing accounts
   - Prevents purchase/sales/payment errors from missing accounts

2. **Updated: `server.js`**
   - Calls `initializeDatabase()` after database connection
   - Ensures all critical accounts exist before server starts accepting requests

3. **New File: `repair-accounts.js`**
   - Standalone script for manual account setup
   - Useful for testing or recovery

## Accounts Automatically Checked on Startup
- ✓ Inventory (for purchases)
- ✓ Accounts Payable (for vendor payments)
- ✓ Accounts Receivable (for customer invoices)
- ✓ Sales Revenue (for order income)
- ✓ Cost of Goods Sold (for COGS)
- ✓ Cash in Hand (for transactions)

## Testing
After applying the fix:

1. **Test Purchase Creation:**
   - Go to Purchases → Create New Purchase
   - Select a vendor
   - Add items with quantities and prices
   - Click Save
   - Should now succeed without errors

2. **Check Server Logs:**
   - After restart, look for initialization messages:
   ```
   🔍 Checking critical database accounts...
   ✓ Inventory
   ✓ Accounts Payable
   ✓ Accounts Receivable
   ✓ Sales Revenue
   ✓ Cost of Goods Sold
   ✓ Cash in Hand
   ✅ All critical accounts are present!
   ```

## Prevention for Future Issues
- The automatic account initialization ensures this won't happen again
- If you add new features requiring specific accounts, add them to `REQUIRED_ACCOUNTS` in `config/dbInit.js`
- Always run the seed script when setting up a new database: `node seed.js`

## Troubleshooting

### Still Getting Error After Restart?
1. Check that MongoDB is accessible on Render
2. Verify your `MONGODB_URI` environment variable is correct
3. Check server logs on Render for any connection errors
4. Try running the repair script manually

### Can't Access MongoDB Atlas?
1. Verify your IP is whitelisted in MongoDB Atlas Network Access
2. Check your connection string includes the correct username/password
3. Restart the application after fixing connection issues

### Need to Debug?
1. Add environment variable: `DEBUG=*`
2. Check Render application logs
3. See database initialization messages at server startup

## Questions?
- Check `MIGRATION_FIX_SUMMARY.md` for related fixes
- Review `seed.js` for complete account setup structure
- Check `services/accountingService.js` for which accounts are required by which operations
