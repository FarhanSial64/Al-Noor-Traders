const { Product, Category, Brand, Unit } = require('../models/Product');
const { InventoryTransaction } = require('../models/Inventory');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const mongoose = require('mongoose');

/**
 * Shop Controller
 * Handles customer e-commerce shop operations
 * 
 * PRICING: Uses Product.salePrice which is calculated from weighted average
 * cost price (from ALL purchases) + 8% margin. This is updated automatically
 * by InventoryService.updateProductPricing whenever a purchase is saved/edited/deleted.
 */

// @desc    Get shop products with calculated prices
// @route   GET /api/shop/products
// @access  Customer
exports.getShopProducts = async (req, res) => {
  try {
    const { category, brand, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = { isActive: true, currentStock: { $gt: 0 } };

    if (category) {
      query.category = category;
    }

    if (brand) {
      query.brand = brand;
    }

    if (search) {
      // Use regex for more flexible search if $text search fails
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    // Run count and find queries in parallel
    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .populate('brand', 'name')
        .populate('primaryUnit', 'name abbreviation')
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .sort({ name: 1 })
        .lean(), // Use lean() for better performance
      Product.countDocuments(query)
    ]);

    // Map products - use Product.salePrice directly (single source of truth)
    const productsWithPrices = products.map(product => ({
      _id: product._id,
      name: product.name,
      sku: product.sku,
      description: product.description,
      category: product.category,
      brand: product.brand,
      unit: product.primaryUnit,
      stock: product.currentStock,
      salePrice: product.salePrice || 0, // Use salePrice from Product (weighted avg + 8% margin)
      image: product.image || null
    }));

    res.json({
      success: true,
      data: productsWithPrices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get shop products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load products'
    });
  }
};

// @desc    Get product detail
// @route   GET /api/shop/products/:id
// @access  Customer
exports.getProductDetail = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('primaryUnit', 'name abbreviation');

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        category: product.category,
        brand: product.brand,
        unit: product.primaryUnit,
        stock: product.currentStock,
        salePrice: product.salePrice || 0, // Use salePrice from Product (weighted avg + 8% margin)
        image: product.image || null
      }
    });
  } catch (error) {
    console.error('Get product detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load product'
    });
  }
};

// @desc    Get categories
// @route   GET /api/shop/categories
// @access  Customer
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load categories'
    });
  }
};

// @desc    Place order from cart
// @route   POST /api/shop/order
// @access  Customer
exports.placeOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, notes } = req.body;

    // Get customer linked to this user
    const customer = await Customer.findOne({ linkedUser: req.user._id });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    // Calculate prices and validate stock
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (product.currentStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.currentStock}`
        });
      }

      // Use salePrice from Product (weighted avg cost + 8% margin)
      const salePrice = product.salePrice || 0;

      if (salePrice === 0) {
        return res.status(400).json({
          success: false,
          message: `Price not available for ${product.name}. Please contact support.`
        });
      }

      const itemTotal = salePrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        quantity: item.quantity,
        unitPrice: salePrice,
        totalPrice: itemTotal
      });
    }

    // Generate order number
    const lastOrder = await Order.findOne().sort({ createdAt: -1 });
    const orderNumber = lastOrder
      ? `ORD-${String(parseInt(lastOrder.orderNumber?.split('-')[1] || 0) + 1).padStart(6, '0')}`
      : 'ORD-000001';

    // Create order
    const order = await Order.create({
      orderNumber,
      customer: customer._id,
      customerName: customer.name,
      items: orderItems,
      subtotal,
      discount: 0,
      totalAmount: subtotal,
      status: 'pending',
      orderType: 'customer_order',
      deliveryAddress: deliveryAddress || customer.address?.street || '',
      notes,
      createdBy: req.user._id,
      createdByName: req.user.fullName
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });
  } catch (error) {
    console.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order'
    });
  }
};

// @desc    Get my orders
// @route   GET /api/shop/orders
// @access  Customer
exports.getMyOrders = async (req, res) => {
  try {
    const customer = await Customer.findOne({ linkedUser: req.user._id });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    const orders = await Order.find({ customer: customer._id })
      .select('orderNumber totalAmount status createdAt items')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders.map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        itemCount: order.items.length,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load orders'
    });
  }
};

// @desc    Get order detail
// @route   GET /api/shop/orders/:id
// @access  Customer
exports.getOrderDetail = async (req, res) => {
  try {
    const customer = await Customer.findOne({ linkedUser: req.user._id });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    const order = await Order.findOne({
      _id: req.params.id,
      customer: customer._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load order'
    });
  }
};

// @desc    Get customer loyalty data
// @route   GET /api/shop/loyalty
// @access  Customer
exports.getLoyaltyData = async (req, res) => {
  try {
    const customer = await Customer.findOne({ linkedUser: req.user._id });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    // Get order stats in one aggregation
    const orderStats = await Order.aggregate([
      { $match: { customer: customer._id, status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      }
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0 };
    const points = Math.floor(stats.totalSpent / 100); // 1 point per 100 PKR

    // Calculate tier
    let tier = 'Bronze';
    let nextTierPoints = 500;
    let tierProgress = (points / 500) * 100;

    if (points >= 2000) {
      tier = 'Platinum';
      nextTierPoints = points; // Already at max
      tierProgress = 100;
    } else if (points >= 1000) {
      tier = 'Gold';
      nextTierPoints = 2000;
      tierProgress = ((points - 1000) / 1000) * 100;
    } else if (points >= 500) {
      tier = 'Silver';
      nextTierPoints = 1000;
      tierProgress = ((points - 500) / 500) * 100;
    }

    res.json({
      success: true,
      data: {
        points,
        tier,
        totalOrders: stats.totalOrders,
        totalSpent: stats.totalSpent,
        nextTierPoints,
        tierProgress: Math.min(tierProgress, 100)
      }
    });
  } catch (error) {
    console.error('Get loyalty data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load loyalty data'
    });
  }
};

// @desc    Get customer profile with loyalty (combined endpoint for performance)
// @route   GET /api/shop/profile
// @access  Customer
exports.getCustomerProfile = async (req, res) => {
  try {
    // Run all queries in parallel for better performance
    const [customer, orderStats] = await Promise.all([
      Customer.findOne({ linkedUser: req.user._id }).lean(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        {
          $lookup: {
            from: 'customers',
            localField: 'customer',
            foreignField: '_id',
            as: 'customerData'
          }
        },
        { $unwind: '$customerData' },
        { $match: { 'customerData.linkedUser': req.user._id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Customer account not found'
      });
    }

    const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0 };
    const points = Math.floor(stats.totalSpent / 100);

    let tier = 'Bronze';
    let nextTierPoints = 500;
    let tierProgress = (points / 500) * 100;

    if (points >= 2000) {
      tier = 'Platinum';
      nextTierPoints = points;
      tierProgress = 100;
    } else if (points >= 1000) {
      tier = 'Gold';
      nextTierPoints = 2000;
      tierProgress = ((points - 1000) / 1000) * 100;
    } else if (points >= 500) {
      tier = 'Silver';
      nextTierPoints = 1000;
      tierProgress = ((points - 500) / 500) * 100;
    }

    res.json({
      success: true,
      data: {
        customer,
        loyalty: {
          points,
          tier,
          totalOrders: stats.totalOrders,
          totalSpent: stats.totalSpent,
          nextTierPoints,
          tierProgress: Math.min(tierProgress, 100)
        }
      }
    });
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load profile'
    });
  }
};
