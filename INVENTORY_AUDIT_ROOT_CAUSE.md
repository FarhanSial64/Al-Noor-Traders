# Inventory System Audit & Root Cause Analysis

## CRITICAL FINDING: Inventory is Stored Statically, Not Dynamic

### Architecture Problem

The system uses **DUAL STATIC STORAGE** for inventory instead of dynamic calculation:

1. **Product.currentStock** (static field in Product collection)
2. **InventoryValuation.currentStock** (static field in InventoryValuation collection)

When these fields are updated on create/edit/delete operations, they can **get out of sync** if:
- A deletion fails partway through
- InventoryValuation doesn't exist for a product
- Transactions occur but fields aren't updated properly
- System crashes during write

### The System Behavior (Current)

```
Create Purchase:
  addStock() → InventoryValuation.currentStock += quantity
              → Product.currentStock = newValue
              → InventoryTransaction created

Delete Purchase:
  removeStock() → InventoryValuation.currentStock -= quantity  
                → Product.currentStock = newValue
                → InventoryTransaction created (purchase_reversal)

Delete All Purchases/Orders:
  ✓ InventoryTransaction records are deleted
  ✓ Deletion functions call removeStock/addStock
  BUT ✗ If Product.currentStock was set to 100, and deletion logic fails
        OR if Product.currentStock wasn't updated to 0, it STAYS 100

User sees inventory = 100 even though 0 purchases exist!
```

### Why Current System Failed

**Root Causes:**

1. **No Guard to Ensure Consistency**
   - Product.currentStock can diverge from InventoryValuation.currentStock
   - No validation that they match

2. **Static Fields Never Recalculated from Transactions**
   - If you query `Product.find()`, it returns stored `currentStock`
   - This field is never recalculated from Purchase/Order collections
   - If field update fails on deletion, stale value persists

3. **No Dynamic Fallback**
   - Inventory endpoints directly return `Product.currentStock`
   - No calculation from actual Purchase/Order quantities
   - No on-the-fly recomputation

4. **Opening Balance Problem**
   - System likely has opening inventory transactions
   - These are never deleted when purchases/orders are deleted
   - "Opening" stock remains even when all transactions are deleted

5. **Missing Verification After Deletions**
   - deletePurchase() and deleteOrder() don't verify that Product.currentStock became 0
   - No endpoint to recalculate/refresh inventory after bulk deletes

---

## Data Flow Analysis

### Inventory Sources (What SHOULD Calculate Stock)

```
Stock = (Sum of all Purchase quantities) - (Sum of all Order/Sale quantities)
     +  (Opening balance from InventoryTransaction type='opening')
```

### Current Implementation Discovery

**Product Model** (lines 125-131):
```javascript
currentStock: {
  type: Number,
  default: 0
}
```
✗ Static field, only updated on transaction operations

**InventoryValuation Model** (lines 50-60):
```javascript
currentStock: {
  type: Number,
  default: 0
}
```
✗ Another static copy, used for weighted average cost

**InventoryTransaction Model** (lines 20-35):
```javascript
transactionType: ['purchase', 'purchase_reversal', 'sale', 'sale_reversal', 'return_in', 'return_out', 'adjustment', 'adjustment_in', 'adjustment_out', 'edit_in', 'edit_out', 'opening']
```
✓ All transactions are recorded, but inventory endpoints don't recalculate from them

### Inventory Endpoints (All Using Static Fields)

1. **getStock()** (inventory controller line 15)
   - Returns `Product.find()` → uses static `currentStock`
   - ✗ No dynamic calculation

2. **getProductStock()** (inventory controller line 87)
   - Calls `InventoryService.getStockInfo()`
   - Returns `product.currentStock ?? valuation?.currentStock`
   - ✗ Uses static fields as fallback

3. **getInventoryValuation()** (inventory controller line 373)
   - Returns `InventoryValuation.find()`
   - ✗ Uses static `currentStock` field

4. **getProductValuation()** (inventory controller line 399)
   - Returns `product.currentStock` for quantity
   - ✗ No dynamic calculation

This is why inventory shows non-zero:
- User deletes purchases and orders
- `Product.currentStock` is updated on deletion (hopefully)
- BUT if InventoryValuation doesn't exist or wasn't updated
- OR if orphaned "opening" transaction exists
- OR if deletion partially failed
- → Stale value remains in Product.currentStock field
→ API returns the stale static value

---

## What Should Happen (Correct Behavior)

```
Get Current Stock for Product:
  
  1. SUM all purchases for this product
     WHERE purchase.status != 'cancelled'
     query = db.purchase.aggregate([
       { $match: { status: { $ne: 'cancelled' } } },
       { $unwind: '$items' },
       { $match: { 'items.product': productId } },
       { $group: { _id: null, total: { $sum: '$items.quantity' } } }
     ])
  
  2. SUM all orders for this product
     WHERE order.status != 'cancelled'
     query = db.order.aggregate([
       { $match: { status: { $ne: 'cancelled' } } },
       { $unwind: '$items' },
       { $match: { 'items.product': productId } },
       { $group: { _id: null, total: { $sum: '$items.quantity' } } }
     ])
  
  3. SUM all InventoryTransactions for opening balance
     query = db.inventoryTransaction.aggregate([
       { $match: { product: productId, transactionType: 'opening' } },
       { $group: { _id: null, total: { $sum: '$quantityIn' } } }
     ])
  
  4. Calculate Final Stock:
     currentStock = openingBalance + totalPurchased - totalSold
  
  Example:
    Opening: 50
    Purchases: 100
    Orders: 30
    Stock = 50 + 100 - 30 = 120
    
  After deleting all 100 purchased units:
    Opening: 50
    Purchases: 0
    Orders: 30 (if not deleted)
    Stock = 50 + 0 - 30 = 20
    
  After deleting all orders too:
    Opening: 50
    Purchases: 0
    Orders: 0
    Stock = 50 + 0 - 0 = 50 (opening bal only)
    
  After deleting opening balance:
    Opening: 0
    Purchases: 0
    Orders: 0
    Stock = 0 + 0 - 0 = 0 ✓ CORRECT
```

---

## Issues to Fix

### Issue 1: Static Fields Not Regularly Recalculated
**Current**: Product.currentStock only updated during transaction operations
**Fix**: Create endpoint to recalculate all stock from actual purchases/orders

### Issue 2: Inventory APIs Return Static Values
**Current**: getStock() returns Product.currentStock directly
**Fix**: Calculate stock dynamically from Purchase + Order + Opening collections

### Issue 3: Orphaned Opening Balance
**Current**: Opening inventory transactions never deleted with purchases/orders
**Fix**: Add check to see if opening balance exists and include in calculation

### Issue 4: InventoryValuation Not Always Created
**Current**: Some products might not have InventoryValuation record
**Fix**: Ensure dynamic calculation works without relying on InventoryValuation

### Issue 5: No Recalculation After Bulk Deletes
**Current**: User deletes all purchases but inventory still shows old values
**Fix**: Add admin endpoint to recalculate inventory for all products

---

## Proposed Solution

### 1. Create Dynamic Stock Calculation Function

Add to InventoryService:
```javascript
static async calculateDynamicStock(productId) {
  // Sum purchases (minus reversals)
  const purchaseData = await Purchase.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $match: { 'items.product': new ObjectId(productId) } },
    { $group: { _id: null, total: { $sum: '$items.quantity' } } }
  ]);
  
  // Sum orders (minus reversals and cancelled)
  const orderData = await Order.aggregate([
    { $match: { status: { $ne: 'cancelled' } } },
    { $unwind: '$items' },
    { $match: { 'items.product': new ObjectId(productId) } },
    { $group: { _id: null, total: { $sum: '$items.quantity' } } }
  ]);
  
  // Sum opening balance
  const openingData = await InventoryTransaction.aggregate([
    { $match: { product: new ObjectId(productId), transactionType: 'opening' } },
    { $group: { _id: null, total: { $sum: '$quantityIn' } } }
  ]);
  
  const purchased = purchaseData[0]?.total || 0;
  const sold = orderData[0]?.total || 0;
  const opening = openingData[0]?.total || 0;
  const currentStock = opening + purchased - sold;
  
  return { currentStock, purchased, sold, opening };
}
```

### 2. Fix All Inventory Endpoints

Update getStock(), getProductStock(), getProductValuation() to use dynamic calculation

### 3. Add Recalculation Endpoint

```javascript
POST /api/inventory/recalculate-all
- Recalculates stock for all products
- Updates Product.currentStock
- Returns summary
```

### 4. Add Debug Logging

All inventory endpoints must log:
- Total purchases
- Total sales/orders
- Opening balance  
- Calculated stock value

### 5. Fix Deletion Bug (If Exists)

Verify that deleteOrder() and deletePurchase() are properly updating Product.currentStock to 0 when all transactions deleted

---

## Files to Modify

1. **Backend/services/inventoryService.js**
   - Add calculateDynamicStock() function
   - Add recalculateAllStock() function
   - Modify getStockInfo() to use dynamic calc

2. **Backend/controllers/inventoryController.js**
   - Update getStock() to use dynamic calculation
   - Update getProductStock() to use dynamic calculation
   - Add recalculateInventory() endpoint
   - Add debug logging

3. **Backend/controllers/purchaseController.js**
   - Add verification after deletion that Product.currentStock is 0

4. **Backend/controllers/orderController.js**
   - Add verification after deletion that Product.currentStock is 0

---

## Test Cases After Fix

- [ ] Delete all purchases → Stock should be 0 (or opening balance if exists)
- [ ] Delete all orders → Stock should include opening + unsold purchases
- [ ] Delete all transactions → Stock should be 0
- [ ] Call POST /api/inventory/recalculate-all → Corrects any orphaned values
- [ ] Create new purchase → Stock increases
- [ ] Create new order → Stock decreases
- [ ] Stock never goes below 0 (or allows negative with explanation)

