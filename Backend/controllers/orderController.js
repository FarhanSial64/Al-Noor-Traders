const Order = require('../models/Order');
const Customer = require('../models/Customer');
const { Product } = require('../models/Product');
const Invoice = require('../models/Invoice');
const { InventoryValuation } = require('../models/Inventory');
const InventoryService = require('../services/inventoryService');
const AccountingService = require('../services/accountingService');
const { createAuditLog, logFinancialTransaction } = require('../middleware/auditLogger');
const { ROLES } = require('../config/roles');

/**
 * Order Controller
 * 
 * CRITICAL: Prices are manually entered by Order Booker.
 * The system does NOT use fixed product prices.
 */

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    const {
      customer,
      status,
      paymentStatus,
      bookedBy,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'orderDate',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Order bookers can only see their own orders
    if (req.user.role === ROLES.ORDER_BOOKER) {
      query.bookedBy = req.user._id;
    } else if (bookedBy) {
      query.bookedBy = bookedBy;
    }

    if (customer) query.customer = customer;
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'businessName customerCode')
        .populate('bookedBy', 'fullName')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders'
    });
  }
};

// @desc    Get orders booked by current user
// @route   GET /api/orders/my-orders
// @access  Private (Order Booker)
exports.getMyOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = { bookedBy: req.user._id };

    if (status) query.status = status;
    if (startDate || endDate) {
      query.orderDate = {};
      if (startDate) query.orderDate.$gte = new Date(startDate);
      if (endDate) query.orderDate.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('customer', 'businessName customerCode')
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Order.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders'
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer')
      .populate('bookedBy', 'fullName phone')
      .populate('approvedBy', 'fullName')
      .populate('items.product', 'name sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // For Order Booker, only allow viewing own orders
    if (
      req.user.role === ROLES.ORDER_BOOKER &&
      order.bookedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own orders'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order'
    });
  }
};

// @desc    Create order (with manual price entry)
// @route   POST /api/orders
// @access  Private (Order Booker, Computer Operator, Distributor)
exports.createOrder = async (req, res) => {
  try {
    const { customer: customerId, items, deliveryDate, deliveryNotes, remarks } = req.body;

    // Get customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    if (!customer.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create order for inactive customer'
      });
    }

    // Build order items with manually entered prices
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product is inactive: ${product.name}`
        });
      }

      // Calculate total pieces from cartons and pieces
      const cartons = item.cartons || 0;
      const pieces = item.pieces || 0;
      const piecesPerCarton = product.piecesPerCarton || 1;
      const totalPieces = (cartons * piecesPerCarton) + pieces;

      if (totalPieces < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${product.name}. Enter cartons or pieces.`
        });
      }

      // Validate stock availability
      const currentStock = product.currentStock || 0;
      if (totalPieces > currentStock) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${currentStock} pcs, Requested: ${totalPieces} pcs`
        });
      }

      // Get actual average cost from inventory valuation
      const valuation = await InventoryValuation.findOne({ product: product._id });
      const costPrice = valuation?.averageCost || 0;

      // CRITICAL: Use the price entered by Order Booker, NOT from product master
      const lineTotal = totalPieces * item.salePrice;
      const netAmount = lineTotal - (item.discount || 0);
      const lineProfit = (item.salePrice - costPrice) * totalPieces;

      orderItems.push({
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        cartons: cartons,
        pieces: pieces,
        piecesPerCarton: piecesPerCarton,
        quantity: totalPieces,
        unitName: 'Pieces',
        salePrice: item.salePrice, // Manually entered price per piece
        costPrice: costPrice, // Captured average cost at time of sale
        lineTotal,
        discount: item.discount || 0,
        netAmount,
        lineProfit: lineProfit
      });
    }

    // Calculate order totals including profit
    const totalCost = orderItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
    const totalProfit = orderItems.reduce((sum, item) => sum + item.lineProfit, 0);
    const grandTotal = orderItems.reduce((sum, item) => sum + item.netAmount, 0);
    const profitMargin = grandTotal > 0 ? (totalProfit / grandTotal) * 100 : 0;

    // Create order - status is confirmed immediately (no pending)
    const order = new Order({
      customer: customer._id,
      customerName: customer.businessName,
      customerCode: customer.customerCode,
      items: orderItems,
      totalCost: totalCost,
      totalProfit: totalProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      deliveryDate,
      deliveryNotes,
      remarks,
      bookedBy: req.user._id,
      bookedByName: req.user.fullName,
      status: 'confirmed',
      approvedBy: req.user._id,
      approvedAt: new Date()
    });

    await order.save();

    // Immediately deduct from inventory (no pending status)
    for (const item of orderItems) {
      await InventoryService.removeStock({
        productId: item.product,
        quantity: item.quantity,
        referenceType: 'Order',
        referenceId: order._id,
        referenceNumber: order.orderNumber,
        userId: req.user._id,
        userName: req.user.fullName,
        transactionDate: new Date()
      });
    }

    // Create accounting entry for the sale
    await AccountingService.createSalesEntry({
      customerId: customer._id,
      customerName: customer.businessName,
      invoiceId: order._id,
      invoiceNumber: order.orderNumber,
      amount: order.grandTotal,
      costOfGoodsSold: order.totalCost, // Actual cost from inventory valuation
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: new Date()
    });

    // Audit log
    await logFinancialTransaction(req, {
      action: 'CREATE',
      module: 'order',
      entityType: 'Order',
      entityId: order._id,
      entityNumber: order.orderNumber,
      description: `Order created for ${customer.businessName}`,
      amount: order.grandTotal
    });

    res.status(201).json({
      success: true,
      message: 'Order created and inventory updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error creating order'
    });
  }
};

// @desc    Update order (edit order details)
// @route   PUT /api/orders/:id
// @access  Private (Computer Operator, Distributor)
exports.updateOrder = async (req, res) => {
  try {
    const { items, deliveryNotes, remarks } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow editing confirmed or pending orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit order with status: ${order.status}`
      });
    }

    if (order.invoiceGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit order with generated invoice'
      });
    }

    // If items are provided, recalculate
    if (items && items.length > 0) {
      const orderItems = [];
      const newProductIds = items.map(i => i.product.toString());
      
      // CRITICAL: Handle removed items - restore their stock
      for (const originalItem of order.items) {
        const productId = originalItem.product.toString();
        if (!newProductIds.includes(productId)) {
          // This item was removed from the order - restore stock
          try {
            await InventoryService.addStock({
              productId: originalItem.product,
              quantity: originalItem.quantity,
              costPerUnit: originalItem.salePrice * 0.7,
              referenceType: 'Order',
              referenceId: order._id,
              referenceNumber: `${order.orderNumber}-REMOVE`,
              userId: req.user._id,
              userName: req.user.fullName,
              transactionDate: new Date()
            });
          } catch (stockError) {
            console.error(`Failed to restore stock for removed product ${productId}:`, stockError);
          }
        }
      }
      
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        const cartons = item.cartons || 0;
        const pieces = item.pieces || 0;
        const piecesPerCarton = product.piecesPerCarton || 1;
        const totalPieces = (cartons * piecesPerCarton) + pieces;

        if (totalPieces < 1) {
          return res.status(400).json({
            success: false,
            message: `Invalid quantity for ${product.name}. Enter cartons or pieces.`
          });
        }

        // Calculate difference from original order quantity for stock validation
        const originalItem = order.items.find(i => i.product.toString() === item.product);
        const originalQty = originalItem ? originalItem.quantity : 0;
        const qtyDifference = totalPieces - originalQty;
        
        // Only validate if requesting MORE stock than before
        if (qtyDifference > 0) {
          const currentStock = product.currentStock || 0;
          if (qtyDifference > currentStock) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${product.name}. Available: ${currentStock} pcs, Additional needed: ${qtyDifference} pcs`
            });
          }
        }

        const lineTotal = totalPieces * item.salePrice;
        const netAmount = lineTotal - (item.discount || 0);

        orderItems.push({
          product: product._id,
          productName: product.name,
          productSku: product.sku,
          cartons: cartons,
          pieces: pieces,
          piecesPerCarton: piecesPerCarton,
          quantity: totalPieces,
          unitName: 'Pieces',
          salePrice: item.salePrice,
          lineTotal,
          discount: item.discount || 0,
          netAmount,
          _originalQty: originalQty, // Track for inventory adjustment
          _qtyDifference: qtyDifference
        });
      }

      // CRITICAL: Adjust inventory for quantity differences (for existing products)
      for (const newItem of orderItems) {
        const qtyDiff = newItem._qtyDifference || 0;
        if (qtyDiff !== 0) {
          try {
            if (qtyDiff > 0) {
              // More items ordered - deduct additional from inventory
              await InventoryService.removeStock({
                productId: newItem.product,
                quantity: qtyDiff,
                referenceType: 'Order',
                referenceId: order._id,
                referenceNumber: `${order.orderNumber}-EDIT`,
                userId: req.user._id,
                userName: req.user.fullName,
                transactionDate: new Date(),
                transactionType: 'edit_out'
              });
            } else if (newItem._originalQty > 0) {
              // Fewer items ordered (and was previously in order) - return stock to inventory
              await InventoryService.addStock({
                productId: newItem.product,
                quantity: Math.abs(qtyDiff),
                costPerUnit: newItem.salePrice * 0.7,
                referenceType: 'Order',
                referenceId: order._id,
                referenceNumber: `${order.orderNumber}-EDIT`,
                userId: req.user._id,
                userName: req.user.fullName,
                transactionDate: new Date(),
                transactionType: 'edit_in'
              });
            }
          } catch (stockError) {
            console.error(`Failed to adjust stock for product ${newItem.product}:`, stockError);
          }
        }
        // Clean up temporary tracking fields
        delete newItem._originalQty;
        delete newItem._qtyDifference;
      }

      order.items = orderItems;
    }

    if (deliveryNotes !== undefined) order.deliveryNotes = deliveryNotes;
    if (remarks !== undefined) order.remarks = remarks;

    // Recalculate totals
    order.subtotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0);
    order.totalDiscount = order.items.reduce((sum, item) => sum + (item.discount || 0), 0);
    order.grandTotal = order.items.reduce((sum, item) => sum + item.netAmount, 0);

    await order.save();

    await logFinancialTransaction(req, {
      action: 'UPDATE',
      module: 'order',
      entityType: 'Order',
      entityId: order._id,
      entityNumber: order.orderNumber,
      description: `Order updated by ${req.user.fullName}`
    });

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating order'
    });
  }
};

// @desc    Process order return
// @route   POST /api/orders/:id/return
// @access  Private (Computer Operator, Distributor)
exports.processReturn = async (req, res) => {
  try {
    const { returnItems, reason } = req.body;
    const order = await Order.findById(req.params.id).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'delivered' && order.status !== 'dispatched') {
      return res.status(400).json({
        success: false,
        message: 'Only delivered or dispatched orders can have returns'
      });
    }

    let totalReturnAmount = 0;
    const returnedItems = [];

    for (const returnItem of returnItems) {
      const orderItem = order.items.find(i => i.product.toString() === returnItem.product);
      if (!orderItem) {
        return res.status(400).json({
          success: false,
          message: `Product ${returnItem.product} not found in order`
        });
      }

      if (returnItem.quantity > orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity exceeds order quantity for ${orderItem.productName}`
        });
      }

      const returnAmount = returnItem.quantity * orderItem.salePrice;
      totalReturnAmount += returnAmount;

      returnedItems.push({
        product: orderItem.product,
        productName: orderItem.productName,
        productSku: orderItem.productSku,
        quantity: returnItem.quantity,
        salePrice: orderItem.salePrice,
        returnAmount,
        reason: returnItem.reason || reason
      });

      // Add stock back to inventory (use sale price * 0.7 as estimated cost if cost not available)
      const valuation = await InventoryValuation.findOne({ product: orderItem.product });
      const costPerUnit = valuation?.averageCost || (orderItem.salePrice * 0.7);
      
      await InventoryService.addStock({
        productId: orderItem.product,
        quantity: returnItem.quantity,
        costPerUnit: costPerUnit,
        referenceType: 'Return',
        referenceId: order._id,
        referenceNumber: `${order.orderNumber}-RETURN`,
        userId: req.user._id,
        userName: req.user.fullName,
        transactionDate: new Date()
      });
    }

    // Update order with return info
    order.hasReturn = true;
    order.returnItems = order.returnItems || [];
    order.returnItems.push(...returnedItems);
    order.totalReturnAmount = (order.totalReturnAmount || 0) + totalReturnAmount;
    order.netAmount = order.grandTotal - order.totalReturnAmount;

    await order.save();

    // Create credit note / adjust customer balance
    await AccountingService.createReturnEntry({
      customerId: order.customer._id,
      customerName: order.customerName,
      orderId: order._id,
      orderNumber: order.orderNumber,
      amount: totalReturnAmount,
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: new Date()
    });

    await logFinancialTransaction(req, {
      action: 'RETURN',
      module: 'order',
      entityType: 'Order',
      entityId: order._id,
      entityNumber: order.orderNumber,
      description: `Return processed: ${returnedItems.length} items, Amount: ${totalReturnAmount}`,
      amount: totalReturnAmount
    });

    res.json({
      success: true,
      message: 'Return processed successfully',
      data: {
        order,
        returnedItems,
        totalReturnAmount
      }
    });
  } catch (error) {
    console.error('Process return error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error processing return'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Computer Operator, Distributor)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update cancelled order'
      });
    }

    const previousStatus = order.status;
    order.status = status;

    if (status === 'approved' && !order.approvedBy) {
      order.approvedBy = req.user._id;
      order.approvedAt = new Date();
    }

    await order.save();

    await logFinancialTransaction(req, {
      action: 'APPROVE',
      module: 'order',
      entityType: 'Order',
      entityId: order._id,
      entityNumber: order.orderNumber,
      description: `Order status changed from ${previousStatus} to ${status}`,
      previousValues: { status: previousStatus },
      newValues: { status }
    });

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order status'
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.invoiceGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order with generated invoice'
      });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel delivered order'
      });
    }

    // CRITICAL: Restore stock to inventory since it was deducted when order was created
    // Only restore if order was confirmed (stock was deducted)
    if (['confirmed', 'dispatched'].includes(order.status)) {
      for (const item of order.items) {
        try {
          await InventoryService.addStock({
            productId: item.product,
            quantity: item.quantity,
            costPerUnit: item.salePrice * 0.7, // Estimate cost (or use valuation average)
            referenceType: 'Order',
            referenceId: order._id,
            referenceNumber: `${order.orderNumber}-CANCEL`,
            userId: req.user._id,
            userName: req.user.fullName,
            transactionDate: new Date()
          });
        } catch (stockError) {
          console.error(`Failed to restore stock for product ${item.product}:`, stockError);
          // Continue with other items even if one fails
        }
      }
    }

    order.status = 'cancelled';
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    order.stockRestored = true;
    await order.save();

    await logFinancialTransaction(req, {
      action: 'CANCEL',
      module: 'order',
      entityType: 'Order',
      entityId: order._id,
      entityNumber: order.orderNumber,
      description: `Order cancelled: ${reason}`,
      amount: order.grandTotal
    });

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling order'
    });
  }
};

// @desc    Generate invoice from order
// @route   POST /api/orders/:id/invoice
// @access  Private (Computer Operator, Distributor)
exports.generateInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.invoiceGenerated) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already generated for this order'
      });
    }

    if (order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate invoice for cancelled order'
      });
    }

    if (order.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order must be approved before generating invoice'
      });
    }

    // Build invoice items with cost calculation
    // NOTE: Stock is already deducted when order is created - DO NOT deduct again here
    const invoiceItems = [];
    let totalCost = 0;

    for (const item of order.items) {
      // Get current cost from inventory valuation
      const valuation = await InventoryValuation.findOne({ product: item.product });
      const costPrice = valuation ? valuation.averageCost : 0;
      const lineCost = costPrice * item.quantity;
      const lineProfit = item.netAmount - lineCost;

      invoiceItems.push({
        product: item.product,
        productName: item.productName,
        productSku: item.productSku,
        quantity: item.quantity,
        unit: item.unit,
        unitName: item.unitName,
        salePrice: item.salePrice, // Price as entered in order
        costPrice,
        lineTotal: item.lineTotal,
        discount: item.discount,
        netAmount: item.netAmount,
        lineProfit
      });

      totalCost += lineCost;
      // Stock was already deducted when order was created - no duplicate deduction needed
    }

    // Generate invoice number manually (validation runs before pre-save hooks)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const invoiceCount = await Invoice.countDocuments({
      createdAt: {
        $gte: new Date(today.getFullYear(), today.getMonth(), 1),
        $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
      }
    });
    const invoiceNumber = `INV-${year}${month}-${String(invoiceCount + 1).padStart(5, '0')}`;

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      order: order._id,
      orderNumber: order.orderNumber,
      customer: order.customer,
      customerName: order.customerName,
      customerCode: order.customerCode,
      customerAddress: order.customer.address ? 
        `${order.customer.address.street}, ${order.customer.address.area}, ${order.customer.address.city}` : '',
      customerPhone: order.customer.phone,
      items: invoiceItems,
      subtotal: order.subtotal,
      totalDiscount: order.totalDiscount,
      taxAmount: order.taxAmount,
      grandTotal: order.grandTotal,
      totalCost,
      grossProfit: order.grandTotal - totalCost,
      dueDate: new Date(Date.now() + (order.customer.creditDays || 0) * 24 * 60 * 60 * 1000),
      // Order Booker info - from the order's bookedBy
      orderBooker: order.bookedBy,
      orderBookerName: order.bookedByName || 'Direct',
      createdBy: req.user._id,
      createdByName: req.user.fullName
    });

    // Save invoice
    await invoice.save();

    // Create accounting entries with the generated invoice number
    const journalEntry = await AccountingService.createSalesEntry({
      customerId: order.customer._id,
      customerName: order.customerName,
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.grandTotal,
      costOfGoodsSold: totalCost,
      userId: req.user._id,
      userName: req.user.fullName,
      entryDate: invoice.invoiceDate
    });

    // Update invoice with journal entry ID
    invoice.journalEntryId = journalEntry._id;
    await invoice.save();

    // Update order
    order.invoiceGenerated = true;
    order.invoiceId = invoice._id;
    order.status = 'dispatched';
    await order.save();

    await logFinancialTransaction(req, {
      action: 'CREATE',
      module: 'invoice',
      entityType: 'Invoice',
      entityId: invoice._id,
      entityNumber: invoice.invoiceNumber,
      description: `Invoice generated from order ${order.orderNumber}`,
      amount: invoice.grandTotal
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error generating invoice'
    });
  }
};

// @desc    Bulk generate invoices for multiple orders
// @route   POST /api/orders/bulk/generate-invoices
// @access  Private (Invoice Create permission)
exports.bulkGenerateInvoices = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of order IDs'
      });
    }

    const results = { success: [], failed: [] };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId).populate('customer');

        if (!order) {
          results.failed.push({ orderId, reason: 'Order not found' });
          continue;
        }

        if (order.invoiceGenerated) {
          results.failed.push({ orderId, orderNumber: order.orderNumber, reason: 'Invoice already generated' });
          continue;
        }

        if (order.status === 'cancelled') {
          results.failed.push({ orderId, orderNumber: order.orderNumber, reason: 'Cannot generate invoice for cancelled order' });
          continue;
        }

        if (order.status === 'pending') {
          results.failed.push({ orderId, orderNumber: order.orderNumber, reason: 'Order must be approved first' });
          continue;
        }

        // Build invoice items with cost calculation
        const invoiceItems = [];
        let totalCost = 0;

        for (const item of order.items) {
          const valuation = await InventoryValuation.findOne({ product: item.product });
          const costPrice = valuation ? valuation.averageCost : 0;
          const lineCost = costPrice * item.quantity;
          const lineProfit = item.netAmount - lineCost;

          invoiceItems.push({
            product: item.product,
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unit: item.unit,
            unitName: item.unitName,
            salePrice: item.salePrice,
            costPrice,
            lineTotal: item.lineTotal,
            discount: item.discount,
            netAmount: item.netAmount,
            lineProfit
          });

          totalCost += lineCost;
        }

        // Generate invoice number
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const invoiceCount = await Invoice.countDocuments({
          createdAt: {
            $gte: new Date(today.getFullYear(), today.getMonth(), 1),
            $lt: new Date(today.getFullYear(), today.getMonth() + 1, 1)
          }
        });
        const invoiceNumber = `INV-${year}${month}-${String(invoiceCount + 1).padStart(5, '0')}`;

        const invoice = new Invoice({
          invoiceNumber,
          order: order._id,
          orderNumber: order.orderNumber,
          customer: order.customer._id,
          customerName: order.customerName,
          customerCode: order.customerCode,
          customerAddress: order.customer.address ?
            `${order.customer.address.street}, ${order.customer.address.area}, ${order.customer.address.city}` : '',
          customerPhone: order.customer.phone,
          items: invoiceItems,
          subtotal: order.subtotal,
          totalDiscount: order.totalDiscount,
          taxAmount: order.taxAmount,
          grandTotal: order.grandTotal,
          totalCost,
          grossProfit: order.grandTotal - totalCost,
          dueDate: new Date(Date.now() + (order.customer.creditDays || 0) * 24 * 60 * 60 * 1000),
          // Order Booker info - from the order's bookedBy
          orderBooker: order.bookedBy,
          orderBookerName: order.bookedByName || 'Direct',
          createdBy: req.user._id,
          createdByName: req.user.fullName
        });

        await invoice.save();

        const journalEntry = await AccountingService.createSalesEntry({
          customerId: order.customer._id,
          customerName: order.customerName,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.grandTotal,
          costOfGoodsSold: totalCost,
          userId: req.user._id,
          userName: req.user.fullName,
          entryDate: invoice.invoiceDate
        });

        invoice.journalEntryId = journalEntry._id;
        await invoice.save();

        order.invoiceGenerated = true;
        order.invoiceId = invoice._id;
        order.status = 'dispatched';
        await order.save();

        results.success.push({
          orderId: order._id,
          orderNumber: order.orderNumber,
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber
        });

      } catch (err) {
        results.failed.push({ orderId, reason: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${results.success.length} invoices, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk generate invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Bulk update order status
// @route   PUT /api/orders/bulk/status
// @access  Private
exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of order IDs'
      });
    }

    const validStatuses = ['confirmed', 'processing', 'dispatched', 'delivered'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const results = { success: [], failed: [] };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId);

        if (!order) {
          results.failed.push({ orderId, reason: 'Order not found' });
          continue;
        }

        if (order.status === 'cancelled') {
          results.failed.push({ orderId, orderNumber: order.orderNumber, reason: 'Cannot update cancelled order' });
          continue;
        }

        if (status === 'delivered' && !order.invoiceGenerated) {
          results.failed.push({ orderId, orderNumber: order.orderNumber, reason: 'Invoice must be generated before delivery' });
          continue;
        }

        order.status = status;
        if (status === 'delivered') {
          order.deliveryDate = new Date();
        }
        await order.save();

        results.success.push({ orderId: order._id, orderNumber: order.orderNumber, status });

      } catch (err) {
        results.failed.push({ orderId, reason: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Updated ${results.success.length} orders, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk update status error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get invoices for bulk printing
// @route   POST /api/orders/bulk/invoices
// @access  Private
exports.bulkGetInvoices = async (req, res) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of order IDs'
      });
    }

    const invoices = [];

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId)
          .populate('customer', 'businessName code phone address creditDays')
          .populate('bookedBy', 'fullName role');

        if (!order) continue;

        // If invoice exists, get it
        if (order.invoiceGenerated && order.invoiceId) {
          const invoice = await Invoice.findById(order.invoiceId);
          if (invoice) {
            invoices.push({
              ...invoice.toObject(),
              orderBookerName: order.bookedByName || order.bookedBy?.fullName,
              orderBookerRole: order.bookedBy?.role,
              orderStatus: order.status,
              invoiceGenerated: order.invoiceGenerated
            });
            continue;
          }
        }

        // Otherwise, use order data for printing
        invoices.push({
          _id: order._id,
          invoiceNumber: order.invoiceGenerated ? `INV-${order.orderNumber}` : `ORDER-${order.orderNumber}`,
          invoiceDate: order.orderDate,
          orderNumber: order.orderNumber,
          customer: order.customer?._id,
          customerName: order.customerName,
          customerCode: order.customerCode,
          customerAddress: order.customer?.address ? 
            `${order.customer.address.street || ''}, ${order.customer.address.area || ''}, ${order.customer.address.city || ''}` : '',
          customerPhone: order.customer?.phone,
          items: order.items.map(item => ({
            productName: item.productName,
            productSku: item.productSku,
            quantity: item.quantity,
            unitName: item.unitName,
            salePrice: item.salePrice,
            discount: item.discount || 0,
            lineTotal: item.lineTotal,
            netAmount: item.netAmount
          })),
          subtotal: order.subtotal,
          totalDiscount: order.totalDiscount || 0,
          taxAmount: order.taxAmount || 0,
          grandTotal: order.grandTotal,
          orderBookerName: order.bookedByName || order.bookedBy?.fullName,
          orderBookerRole: order.bookedBy?.role,
          dueDate: order.customer?.creditDays ? 
            new Date(Date.now() + order.customer.creditDays * 24 * 60 * 60 * 1000) : null,
          orderStatus: order.status,
          invoiceGenerated: order.invoiceGenerated
        });

      } catch (err) {
        console.error(`Error fetching order ${orderId}:`, err.message);
      }
    }

    res.status(200).json({
      success: true,
      count: invoices.length,
      data: invoices
    });
  } catch (error) {
    console.error('Bulk get invoices error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
