const { Product } = require('../models/Product');
const { InventoryTransaction, InventoryValuation } = require('../models/Inventory');
const Purchase = require('../models/Purchase');
const mongoose = require('mongoose');

/**
 * Inventory Service
 * 
 * Handles all inventory operations:
 * - Stock updates on purchase/sale
 * - Weighted average cost calculation
 * - Stock transactions logging
 */

// 8% margin for sale price calculation
const SALE_MARGIN_PERCENTAGE = 8;

class InventoryService {

  /**
   * Calculate weighted average cost price from ALL purchases for a product
   * Formula: (Sum of all purchasePrice * quantity) / (Sum of all quantities)
   * 
   * @param {String} productId - The product ID
   * @param {Object} session - Optional mongoose session for transactions
   * @returns {Object} { totalAmount, totalQuantity, costPrice, salePrice }
   */
  static async calculateWeightedAverageCost(productId, session = null) {
    const queryOptions = session ? { session } : {};
    
    // Aggregate all purchase items for this product
    const result = await Purchase.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $match: { 'items.product': new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: '$items.product',
          totalAmount: { 
            $sum: { $multiply: ['$items.purchasePrice', '$items.quantity'] } 
          },
          totalQuantity: { $sum: '$items.quantity' }
        }
      }
    ]);

    if (!result.length || result[0].totalQuantity === 0) {
      return { 
        totalAmount: 0, 
        totalQuantity: 0, 
        costPrice: 0, 
        salePrice: 0 
      };
    }

    const { totalAmount, totalQuantity } = result[0];
    
    // Calculate cost price with 2 decimal precision
    const costPrice = Math.round((totalAmount / totalQuantity) * 100) / 100;
    
    // Calculate sale price with 8% margin
    const salePrice = Math.round(costPrice * (1 + SALE_MARGIN_PERCENTAGE / 100) * 100) / 100;

    return { totalAmount, totalQuantity, costPrice, salePrice };
  }

  /**
   * Update product pricing after purchase changes
   * This should be called after every purchase create/edit/delete
   * 
   * @param {String} productId - The product ID
   * @param {Object} session - Optional mongoose session for transactions
   */
  static async updateProductPricing(productId, session = null) {
    const { costPrice, salePrice } = await this.calculateWeightedAverageCost(productId, session);
    
    const updateOptions = session ? { session } : {};
    
    await Product.findByIdAndUpdate(
      productId,
      { 
        costPrice: costPrice,
        salePrice: salePrice
      },
      updateOptions
    );

    // Also update the InventoryValuation averageCost to keep them in sync
    await InventoryValuation.findOneAndUpdate(
      { product: productId },
      { averageCost: costPrice },
      { ...updateOptions, upsert: false }
    );

    return { costPrice, salePrice };
  }

  /**
   * Recalculate pricing for ALL products affected by a purchase
   * @param {Array} productIds - Array of product IDs
   * @param {Object} session - Optional mongoose session
   */
  static async recalculatePricingForProducts(productIds, session = null) {
    const results = [];
    for (const productId of productIds) {
      const pricing = await this.updateProductPricing(productId, session);
      results.push({ productId, ...pricing });
    }
    return results;
  }

  /**
   * Add stock (from purchase)
   */
  static async addStock({
    productId,
    quantity,
    costPerUnit,
    referenceType,
    referenceId,
    referenceNumber,
    userId,
    userName,
    transactionDate,
    transactionType = 'purchase'
  }) {
    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Get or create valuation record
    let valuation = await InventoryValuation.findOne({ product: productId });
    if (!valuation) {
      valuation = new InventoryValuation({
        product: productId,
        currentStock: 0,
        averageCost: 0,
        totalValue: 0
      });
    }

    // Update valuation using weighted average
    valuation.addStock(quantity, costPerUnit);
    await valuation.save();

    // Update product stock
    product.currentStock = valuation.currentStock;
    await product.save();

    // Create transaction record
    const transaction = await InventoryTransaction.create({
      product: productId,
      productName: product.name,
      productSku: product.sku,
      transactionType: transactionType,
      quantityIn: quantity,
      quantityOut: 0,
      balanceAfter: valuation.currentStock,
      unitCost: costPerUnit,
      referenceType,
      referenceId,
      referenceNumber,
      transactionDate: transactionDate || new Date(),
      createdBy: userId,
      createdByName: userName
    });

    return {
      transaction,
      newBalance: valuation.currentStock,
      averageCost: valuation.averageCost
    };
  }

  /**
   * Remove stock (from sale)
   * @param {boolean} skipStockCheck - If true, skips stock availability check (for adjustments/reversals)
   */
  static async removeStock({
    productId,
    quantity,
    referenceType,
    referenceId,
    referenceNumber,
    userId,
    userName,
    transactionDate,
    transactionType = 'sale',
    skipStockCheck = false
  }) {
    // Get product
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Get valuation
    const valuation = await InventoryValuation.findOne({ product: productId });
    if (!valuation) {
      throw new Error(`No inventory valuation found for product: ${product.name}`);
    }

    // Check stock availability (skip for adjustments/reversals)
    if (!skipStockCheck && valuation.currentStock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}. Available: ${valuation.currentStock}, Requested: ${quantity}`);
    }

    const costAtSale = valuation.averageCost;

    // Update valuation
    valuation.removeStock(quantity);
    await valuation.save();

    // Update product stock
    product.currentStock = valuation.currentStock;
    await product.save();

    // Create transaction record
    const transaction = await InventoryTransaction.create({
      product: productId,
      productName: product.name,
      productSku: product.sku,
      transactionType: transactionType,
      quantityIn: 0,
      quantityOut: quantity,
      balanceAfter: valuation.currentStock,
      unitCost: costAtSale,
      referenceType,
      referenceId,
      referenceNumber,
      transactionDate: transactionDate || new Date(),
      createdBy: userId,
      createdByName: userName
    });

    return {
      transaction,
      newBalance: valuation.currentStock,
      costAtSale,
      totalCost: costAtSale * quantity
    };
  }

  /**
   * Adjust stock (manual adjustment)
   */
  static async adjustStock({
    productId,
    newQuantity,
    reason,
    referenceNumber,
    userId,
    userName
  }) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    let valuation = await InventoryValuation.findOne({ product: productId });
    if (!valuation) {
      valuation = new InventoryValuation({
        product: productId,
        currentStock: 0,
        averageCost: 0,
        totalValue: 0
      });
    }

    const oldQuantity = valuation.currentStock;
    const difference = newQuantity - oldQuantity;

    valuation.currentStock = newQuantity;
    valuation.totalValue = newQuantity * valuation.averageCost;
    await valuation.save();

    product.currentStock = newQuantity;
    await product.save();

    const transaction = await InventoryTransaction.create({
      product: productId,
      productName: product.name,
      productSku: product.sku,
      transactionType: 'adjustment',
      quantityIn: difference > 0 ? difference : 0,
      quantityOut: difference < 0 ? Math.abs(difference) : 0,
      balanceAfter: newQuantity,
      unitCost: valuation.averageCost,
      referenceType: 'Adjustment',
      referenceId: product._id,
      referenceNumber: referenceNumber || `ADJ-${Date.now()}`,
      remarks: reason,
      transactionDate: new Date(),
      createdBy: userId,
      createdByName: userName
    });

    return {
      transaction,
      oldQuantity,
      newQuantity,
      difference
    };
  }

  /**
   * CRITICAL FIX: Calculate stock dynamically from Purchase, Order, and Opening Balance transactions
   * This ensures we always have the correct stock regardless of any stale Product.currentStock values
   * 
   * Formula: Stock = OpeningBalance + TotalPurchased - TotalSold
   * 
   * @param {String} productId - The product ID
   * @returns {Object} { currentStock, purchased, sold, opening, source }
   */
  static async calculateDynamicStock(productId) {
    try {
      const productObjectId = new mongoose.Types.ObjectId(productId);

      // 1. Sum all purchases quantity (exclude cancelled)
      const purchaseAgg = await Purchase.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $match: { 'items.product': productObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: '$items.quantity' }
          }
        }
      ]);
      const purchasedQuantity = purchaseAgg[0]?.total || 0;

      // 2. Sum all orders quantity (exclude cancelled)
      const Order = require('../models/Order');
      const orderAgg = await Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        { $match: { 'items.product': productObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: '$items.quantity' }
          }
        }
      ]);
      const soldQuantity = orderAgg[0]?.total || 0;

      // 3. Sum opening balance inventory transactions
      const openingAgg = await InventoryTransaction.aggregate([
        { $match: { product: productObjectId, transactionType: 'opening' } },
        {
          $group: {
            _id: null,
            total: { $sum: '$quantityIn' }
          }
        }
      ]);
      const openingQuantity = openingAgg[0]?.total || 0;

      // 4. Calculate final stock
      const dynamicStock = openingQuantity + purchasedQuantity - soldQuantity;

      console.log(`[calculateDynamicStock] Product ${productId}: Opening=${openingQuantity}, Purchased=${purchasedQuantity}, Sold=${soldQuantity}, Stock=${dynamicStock}`);

      return {
        currentStock: dynamicStock,
        purchased: purchasedQuantity,
        sold: soldQuantity,
        opening: openingQuantity,
        source: 'dynamic_calculation'
      };
    } catch (error) {
      console.error(`[calculateDynamicStock] Error calculating stock for ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Recalculate stock for all products from actual Purchase/Order collections
   * Use this endpoint after bulk deletes to ensure consistency
   * 
   * @returns {Object} Summary of recalculation results
   */
  static async recalculateAllStockFromTransactions() {
    try {
      console.log('[recalculateAllStockFromTransactions] Starting full inventory recalculation...');
      
      const products = await Product.find({ isActive: true }).select('_id name sku');
      const results = {
        processed: 0,
        corrected: 0,
        errors: 0,
        products: []
      };

      for (const product of products) {
        try {
          // Get dynamic stock
          const { currentStock, purchased, sold, opening } = await this.calculateDynamicStock(product._id);
          
          // Get stored stock
          const storedProduct = await Product.findById(product._id);
          const storedStock = storedProduct.currentStock || 0;
          
          // Check if correction needed
          const needsCorrection = currentStock !== storedStock;
          
          if (needsCorrection) {
            // Update Product.currentStock
            await Product.findByIdAndUpdate(product._id, { currentStock });
            
            // Update InventoryValuation if exists
            const valuation = await InventoryValuation.findOne({ product: product._id });
            if (valuation) {
              valuation.currentStock = currentStock;
              await valuation.save();
            }
            
            results.corrected++;
            console.log(`[recalculate] Corrected ${product.sku}: ${storedStock} → ${currentStock}`);
          }
          
          results.processed++;
          results.products.push({
            productId: product._id,
            sku: product.sku,
            name: product.name,
            storedStock,
            dynamicStock: currentStock,
            corrected: needsCorrection,
            breakdown: { opening, purchased, sold }
          });
        } catch (productError) {
          results.errors++;
          console.error(`[recalculate] Error processing product ${product.sku}:`, productError);
        }
      }

      console.log(`[recalculateAllStockFromTransactions] Completed: ${results.processed} processed, ${results.corrected} corrected, ${results.errors} errors`);
      return results;
    } catch (error) {
      console.error('[recalculateAllStockFromTransactions] Error:', error);
      throw error;
    }
  }

  /**
   * Get product stock information - uses DYNAMIC calculation with fallback to stored value
   */
  static async getStockInfoDynamic(productId) {
    const product = await Product.findById(productId)
      .populate('category brand');
    
    if (!product) {
      throw new Error('Product not found');
    }

    // Calculate dynamic stock from actual transactions
    let { currentStock, purchased, sold, opening } = await this.calculateDynamicStock(productId);
    
    // Get pricing info
    const avgCost = product.costPrice || 0;
    const suggestedSalePrice = product.salePrice || (avgCost > 0 ? Math.round(avgCost * 1.08 * 100) / 100 : (product.suggestedRetailPrice || 0));

    // Build response
    const stockInfo = {
      product,
      quantity: currentStock,
      currentStock: currentStock,
      averageCost: avgCost,
      costPrice: avgCost,
      salePrice: suggestedSalePrice,
      suggestedSalePrice: suggestedSalePrice,
      suggestedRetailPrice: product.suggestedRetailPrice || 0,
      suggestedPurchasePrice: product.suggestedPurchasePrice || 0,
      totalValue: currentStock * avgCost,
      isLowStock: currentStock <= (product.minimumStock || 0),
      // Add breakdown
      stockBreakdown: {
        opening,
        purchased,
        sold,
        calculated: currentStock,
        formula: `${opening} + ${purchased} - ${sold} = ${currentStock}`
      }
    };

    return stockInfo;
  }

  /**
   * Update stock value based on dynamic calculation
   * Call this to sync Product.currentStock with actual transactions
   */
  static async syncProductStockFromTransactions(productId) {
    try {
      const { currentStock } = await this.calculateDynamicStock(productId);
      
      // Update product
      await Product.findByIdAndUpdate(productId, { currentStock });
      
      // Update valuation if exists
      const valuation = await InventoryValuation.findOne({ product: productId });
      if (valuation) {
        valuation.currentStock = currentStock;
        await valuation.save();
      }
      
      console.log(`[syncProductStockFromTransactions] Synced product ${productId} to stock=${currentStock}`);
      
      return { productId, currentStock };
    } catch (error) {
      console.error(`[syncProductStockFromTransactions] Error syncing product ${productId}:`, error);
      throw error;
    }
  }

  /**
    const product = await Product.findById(productId)
      .populate('category brand');
    
    if (!product) {
      throw new Error('Product not found');
    }

    const valuation = await InventoryValuation.findOne({ product: productId });

    // Use product.currentStock as primary source, fallback to valuation
    const quantity = product.currentStock ?? valuation?.currentStock ?? 0;
    const avgCost = product.costPrice || valuation?.averageCost || 0;

    // Calculate suggested sale price: average cost + 8% margin
    const suggestedSalePrice = product.salePrice || (avgCost > 0 ? Math.round(avgCost * 1.08 * 100) / 100 : (product.suggestedRetailPrice || 0));

    return {
      product,
      quantity,
      currentStock: quantity,
      averageCost: avgCost,
      costPrice: avgCost,
      salePrice: suggestedSalePrice,
      suggestedSalePrice: suggestedSalePrice,
      suggestedRetailPrice: product.suggestedRetailPrice || 0,
      suggestedPurchasePrice: product.suggestedPurchasePrice || 0,
      totalValue: quantity * avgCost,
      isLowStock: quantity <= (product.minimumStock || 0)
    };
  }

  /**
   * Get stock movements for a product
   */
  static async getStockMovements(productId, options = {}) {
    const { startDate, endDate, limit = 100 } = options;
    const query = { product: productId };
    
    // Only add date filter if valid dates are provided
    if (startDate && !isNaN(new Date(startDate).getTime())) {
      query.transactionDate = query.transactionDate || {};
      query.transactionDate.$gte = new Date(startDate);
    }
    if (endDate && !isNaN(new Date(endDate).getTime())) {
      query.transactionDate = query.transactionDate || {};
      query.transactionDate.$lte = new Date(endDate);
    }

    const movements = await InventoryTransaction.find(query)
      .sort({ transactionDate: -1 })
      .limit(parseInt(limit) || 100)
      .populate('createdBy', 'fullName');

    return movements;
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts() {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minimumStock'] }
    }).populate('category brand');

    return products;
  }

  /**
   * Get inventory valuation report
   */
  static async getInventoryValuation() {
    const valuations = await InventoryValuation.find()
      .populate({
        path: 'product',
        select: 'name sku category brand',
        populate: [
          { path: 'category', select: 'name' },
          { path: 'brand', select: 'name' }
        ]
      });

    const totalValue = valuations.reduce((sum, v) => sum + v.totalValue, 0);

    return {
      items: valuations.filter(v => v.product).map(v => ({
        productId: v.product._id,
        productName: v.product.name,
        productSku: v.product.sku,
        category: v.product.category?.name,
        brand: v.product.brand?.name,
        currentStock: v.currentStock,
        averageCost: v.averageCost,
        totalValue: v.totalValue
      })),
      totalValue,
      asOfDate: new Date()
    };
  }
}

module.exports = InventoryService;
