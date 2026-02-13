const { Product } = require('../models/Product');
const { InventoryTransaction, InventoryValuation } = require('../models/Inventory');

/**
 * Inventory Service
 * 
 * Handles all inventory operations:
 * - Stock updates on purchase/sale
 * - Weighted average cost calculation
 * - Stock transactions logging
 */

class InventoryService {
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
    transactionType = 'sale'
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

    // Check stock availability
    if (valuation.currentStock < quantity) {
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
   * Get product stock information
   */
  static async getStockInfo(productId) {
    const product = await Product.findById(productId)
      .populate('category brand');
    
    if (!product) {
      throw new Error('Product not found');
    }

    const valuation = await InventoryValuation.findOne({ product: productId });

    // Use product.currentStock as primary source, fallback to valuation
    const quantity = product.currentStock ?? valuation?.currentStock ?? 0;
    const avgCost = valuation?.averageCost || product.costPrice || 0;

    // Calculate suggested sale price: average cost + 5% margin
    const suggestedSalePrice = avgCost > 0 ? Math.ceil(avgCost * 1.05) : (product.suggestedRetailPrice || 0);

    return {
      product,
      quantity,
      currentStock: quantity,
      averageCost: avgCost,
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
