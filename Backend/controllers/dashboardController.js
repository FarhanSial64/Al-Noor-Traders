const mongoose = require('mongoose');
const Order = require('../models/Order');
const Purchase = require('../models/Purchase');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const { Product } = require('../models/Product');
const User = require('../models/User');
const ChartOfAccount = require('../models/ChartOfAccount');
const InventoryService = require('../services/inventoryService');
const { ROLES } = require('../config/roles');

/**
 * Dashboard Controller
 * 
 * Provides dashboard statistics and summaries for different user roles
 */

// Helper function to get date range
const getDateRange = (period = 'today') => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'yesterday':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    case 'week':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'all':
      startDate = new Date(2000, 0, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  }

  return { startDate, endDate };
};

// @desc    Get dashboard statistics based on role
// @route   GET /api/dashboard/stats
// @access  All authenticated users
exports.getDashboardStats = async (req, res) => {
  try {
    const { role, _id: userId, linkedCustomer } = req.user;
    const { period = 'today' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    let stats = {};

    if (role === ROLES.DISTRIBUTOR || role === ROLES.COMPUTER_OPERATOR) {
      // Full dashboard for distributor and KPO
      const [
        todayOrders,
        todayInvoices,
        todayPurchases,
        todayReceipts,
        pendingOrders,
        lowStockProducts,
        totalCustomers,
        totalVendors,
        receivablesTotal,
        payablesTotal
      ] = await Promise.all([
        Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
        Invoice.aggregate([
          { $match: { invoiceDate: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
        ]),
        Purchase.aggregate([
          { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
        ]),
        Payment.aggregate([
          { 
            $match: { 
              paymentType: 'receipt',
              paymentDate: { $gte: startDate, $lte: endDate } 
            } 
          },
          { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
        ]),
        Order.countDocuments({ status: { $in: ['pending', 'confirmed'] } }),
        InventoryService.getLowStockProducts(),
        Customer.countDocuments({ isActive: true }),
        Vendor.countDocuments({ isActive: true }),
        Customer.aggregate([
          { $match: { isActive: true, currentBalance: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentBalance' } } }
        ]),
        Vendor.aggregate([
          { $match: { isActive: true, currentBalance: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$currentBalance' } } }
        ])
      ]);

      stats = {
        period,
        orders: {
          count: todayOrders,
          pending: pendingOrders
        },
        sales: {
          count: todayInvoices[0]?.count || 0,
          total: todayInvoices[0]?.total || 0
        },
        purchases: {
          count: todayPurchases[0]?.count || 0,
          total: todayPurchases[0]?.total || 0
        },
        receipts: {
          count: todayReceipts[0]?.count || 0,
          total: todayReceipts[0]?.total || 0
        },
        inventory: {
          lowStockCount: lowStockProducts.length
        },
        customers: totalCustomers,
        vendors: totalVendors,
        receivables: receivablesTotal[0]?.total || 0,
        payables: payablesTotal[0]?.total || 0
      };

    } else if (role === ROLES.ORDER_BOOKER) {
      // Order booker sees their own stats
      const orderBookerUserId = new mongoose.Types.ObjectId(userId);
      const [myOrders, myTodayOrders, myPendingOrders] = await Promise.all([
        Order.countDocuments({ bookedBy: orderBookerUserId }),
        Order.countDocuments({ 
          bookedBy: orderBookerUserId,
          createdAt: { $gte: startDate, $lte: endDate }
        }),
        Order.countDocuments({ 
          bookedBy: orderBookerUserId,
          status: { $in: ['pending', 'confirmed'] }
        })
      ]);

      const salesAmount = await Invoice.aggregate([
        { 
          $match: { 
            orderBooker: orderBookerUserId,
            invoiceDate: { $gte: startDate, $lte: endDate }
          } 
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);

      stats = {
        period,
        myOrders: {
          total: myOrders,
          today: myTodayOrders,
          pending: myPendingOrders
        },
        mySales: {
          total: salesAmount[0]?.total || 0
        }
      };

    } else if (role === ROLES.CUSTOMER) {
      // Customer sees their own stats
      const [myOrders, myInvoices, myBalance] = await Promise.all([
        Order.countDocuments({ customer: linkedCustomer }),
        Invoice.aggregate([
          { $match: { customer: linkedCustomer } },
          { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
        ]),
        Customer.findById(linkedCustomer).select('currentBalance creditLimit')
      ]);

      stats = {
        myOrders: myOrders,
        totalPurchases: myInvoices[0]?.total || 0,
        invoiceCount: myInvoices[0]?.count || 0,
        currentBalance: myBalance?.currentBalance || 0,
        creditLimit: myBalance?.creditLimit || 0,
        availableCredit: (myBalance?.creditLimit || 0) - (myBalance?.currentBalance || 0)
      };
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard stats'
    });
  }
};

// @desc    Get sales summary
// @route   GET /api/dashboard/sales-summary
// @access  Distributor, Computer Operator
exports.getSalesSummary = async (req, res) => {
  try {
    const { period = 'week', groupBy = 'day' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const salesData = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$invoiceDate' } },
          totalSales: { $sum: '$grandTotal' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$totalProfit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const summary = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$totalProfit' },
          avgOrderValue: { $avg: '$grandTotal' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        groupBy,
        startDate,
        endDate,
        chartData: salesData,
        summary: summary[0] || {
          totalSales: 0,
          totalCost: 0,
          totalProfit: 0,
          avgOrderValue: 0,
          count: 0
        }
      }
    });
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sales summary'
    });
  }
};

// @desc    Get purchase summary
// @route   GET /api/dashboard/purchase-summary
// @access  Distributor, Computer Operator
exports.getPurchaseSummary = async (req, res) => {
  try {
    const { period = 'week', groupBy = 'day' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const purchaseData = await Purchase.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalPurchases: { $sum: '$grandTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const summary = await Purchase.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$grandTotal' },
          avgOrderValue: { $avg: '$grandTotal' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        groupBy,
        startDate,
        endDate,
        chartData: purchaseData,
        summary: summary[0] || {
          totalPurchases: 0,
          avgOrderValue: 0,
          count: 0
        }
      }
    });
  } catch (error) {
    console.error('Get purchase summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching purchase summary'
    });
  }
};

// @desc    Get top selling products
// @route   GET /api/dashboard/top-products
// @access  Distributor, Computer Operator
exports.getTopProducts = async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const topProducts = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          totalQuantity: { $sum: '$items.quantity' },
          totalSales: { $sum: { $multiply: ['$items.quantity', '$items.salePrice'] } },
          totalProfit: { $sum: '$items.profit' }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        period,
        products: topProducts
      }
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching top products'
    });
  }
};

// @desc    Get top customers
// @route   GET /api/dashboard/top-customers
// @access  Distributor, Computer Operator
exports.getTopCustomers = async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    const { startDate, endDate } = getDateRange(period);

    const topCustomers = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$customer',
          customerName: { $first: '$customerName' },
          totalSales: { $sum: '$grandTotal' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        period,
        customers: topCustomers
      }
    });
  } catch (error) {
    console.error('Get top customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching top customers'
    });
  }
};

// @desc    Get current cash position
// @route   GET /api/dashboard/cash-position
// @access  Distributor only
exports.getCashPosition = async (req, res) => {
  try {
    const cashAccounts = await ChartOfAccount.find({
      $or: [{ isCashAccount: true }, { isBankAccount: true }],
      isActive: true
    }).select('accountCode accountName currentBalance isCashAccount isBankAccount');

    const totalCash = cashAccounts
      .filter(a => a.isCashAccount)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    const totalBank = cashAccounts
      .filter(a => a.isBankAccount)
      .reduce((sum, a) => sum + a.currentBalance, 0);

    res.json({
      success: true,
      data: {
        accounts: cashAccounts,
        summary: {
          cashInHand: totalCash,
          bankBalance: totalBank,
          totalLiquidity: totalCash + totalBank
        }
      }
    });
  } catch (error) {
    console.error('Get cash position error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching cash position'
    });
  }
};

// @desc    Get recent activity
// @route   GET /api/dashboard/recent-activity
// @access  Distributor, Computer Operator
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const [recentOrders, recentInvoices, recentPayments] = await Promise.all([
      Order.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) / 3)
        .select('orderNumber customerName status grandTotal createdAt')
        .lean(),
      Invoice.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) / 3)
        .select('invoiceNumber customerName grandTotal invoiceDate')
        .lean(),
      Payment.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit) / 3)
        .select('paymentNumber paymentType amount paymentDate partyName')
        .lean()
    ]);

    // Combine and sort by date
    const activities = [
      ...recentOrders.map(o => ({
        type: 'order',
        id: o._id,
        reference: o.orderNumber,
        description: `Order from ${o.customerName}`,
        amount: o.grandTotal,
        status: o.status,
        date: o.createdAt
      })),
      ...recentInvoices.map(i => ({
        type: 'invoice',
        id: i._id,
        reference: i.invoiceNumber,
        description: `Invoice to ${i.customerName}`,
        amount: i.grandTotal,
        date: i.invoiceDate
      })),
      ...recentPayments.map(p => ({
        type: p.paymentType,
        id: p._id,
        reference: p.paymentNumber,
        description: `${p.paymentType === 'receipt' ? 'Receipt from' : 'Payment to'} ${p.partyName}`,
        amount: p.amount,
        date: p.paymentDate
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date))
     .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recent activity'
    });
  }
};

// @desc    Get order booker performance stats
// @route   GET /api/dashboard/order-booker-stats
// @access  Order Booker (own stats), Distributor/KPO (all)
exports.getOrderBookerStats = async (req, res) => {
  try {
    const { period = 'month', orderBookerId } = req.query;
    const { startDate, endDate } = getDateRange(period);

    let targetUserId;
    
    if (req.user.role === ROLES.ORDER_BOOKER) {
      targetUserId = new mongoose.Types.ObjectId(req.user._id);
    } else if (orderBookerId) {
      targetUserId = new mongoose.Types.ObjectId(orderBookerId);
    }

    if (targetUserId) {
      // Single order booker stats
      const [orderStats, invoiceStats] = await Promise.all([
        Order.aggregate([
          {
            $match: {
              bookedBy: targetUserId,
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalValue: { $sum: '$grandTotal' },
              avgOrderValue: { $avg: '$grandTotal' }
            }
          }
        ]),
        Invoice.aggregate([
          {
            $match: {
              orderBooker: targetUserId,
              invoiceDate: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              totalSales: { $sum: '$grandTotal' },
              totalProfit: { $sum: '$totalProfit' },
              invoiceCount: { $sum: 1 }
            }
          }
        ])
      ]);

      const user = await User.findById(targetUserId).select('fullName assignedArea');

      res.json({
        success: true,
        data: {
          orderBooker: user,
          period,
          orders: orderStats[0] || { totalOrders: 0, totalValue: 0, avgOrderValue: 0 },
          sales: invoiceStats[0] || { totalSales: 0, totalProfit: 0, invoiceCount: 0 }
        }
      });
    } else {
      // All order bookers comparison
      const stats = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$bookedBy',
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$grandTotal' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            orderBookerId: '$_id',
            fullName: '$user.fullName',
            assignedArea: '$user.assignedArea',
            totalOrders: 1,
            totalValue: 1
          }
        },
        { $sort: { totalValue: -1 } }
      ]);

      res.json({
        success: true,
        data: {
          period,
          orderBookers: stats
        }
      });
    }
  } catch (error) {
    console.error('Get order booker stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order booker stats'
    });
  }
};

// @desc    Get customer's own stats
// @route   GET /api/dashboard/customer-stats
// @access  Customer only
exports.getCustomerStats = async (req, res) => {
  try {
    const customerId = req.user.linkedCustomer;

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'No customer account linked'
      });
    }

    const [customer, recentOrders, recentInvoices] = await Promise.all([
      Customer.findById(customerId)
        .select('businessName customerCode currentBalance creditLimit creditDays'),
      Order.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber status grandTotal createdAt'),
      Invoice.find({ customer: customerId })
        .sort({ invoiceDate: -1 })
        .limit(5)
        .select('invoiceNumber grandTotal invoiceDate paymentStatus')
    ]);

    res.json({
      success: true,
      data: {
        customer,
        recentOrders,
        recentInvoices
      }
    });
  } catch (error) {
    console.error('Get customer stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer stats'
    });
  }
};

// @desc    Get distributor comprehensive dashboard stats
// @route   GET /api/dashboard/distributor-stats
// @access  Distributor only
exports.getDistributorStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    const { startDate, endDate } = getDateRange(period);

    // Get previous period for comparison
    const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - periodDays);
    const prevEndDate = new Date(startDate);
    prevEndDate.setMilliseconds(prevEndDate.getMilliseconds() - 1);

    const [
      // Current period stats
      currentSales,
      currentPurchases,
      currentReceipts,
      currentPayments,
      currentOrders,

      // Previous period stats for comparison
      prevSales,
      prevReceipts,

      // General stats
      pendingOrders,
      processingOrders,
      lowStockProducts,
      totalCustomers,
      activeCustomers,
      totalVendors,
      receivablesTotal,
      payablesTotal,
      cashPosition,
      userStats,
      topOrderBookers
    ] = await Promise.all([
      // Current period
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startDate, $lte: endDate } } },
        { $group: { 
          _id: null, 
          totalSales: { $sum: '$grandTotal' }, 
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$totalProfit' },
          count: { $sum: 1 } 
        }}
      ]),
      Purchase.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } }}
      ]),
      Payment.aggregate([
        { $match: { paymentType: 'receipt', paymentDate: { $gte: startDate, $lte: endDate }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } }}
      ]),
      Payment.aggregate([
        { $match: { paymentType: 'payment', paymentDate: { $gte: startDate, $lte: endDate }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } }}
      ]),
      Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),

      // Previous period
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: prevStartDate, $lte: prevEndDate } } },
        { $group: { _id: null, totalSales: { $sum: '$grandTotal' }, count: { $sum: 1 } }}
      ]),
      Payment.aggregate([
        { $match: { paymentType: 'receipt', paymentDate: { $gte: prevStartDate, $lte: prevEndDate }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } }}
      ]),

      // General
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'processing' }),
      InventoryService.getLowStockProducts(),
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Vendor.countDocuments({ isActive: true }),
      Customer.aggregate([
        { $match: { isActive: true, currentBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$currentBalance' }, count: { $sum: 1 } }}
      ]),
      Vendor.aggregate([
        { $match: { isActive: true, currentBalance: { $gt: 0 } } },
        { $group: { _id: null, total: { $sum: '$currentBalance' }, count: { $sum: 1 } }}
      ]),
      ChartOfAccount.find({
        $or: [{ isCashAccount: true }, { isBankAccount: true }],
        isActive: true
      }).select('accountCode accountName currentBalance isCashAccount isBankAccount'),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$bookedBy', totalOrders: { $sum: 1 }, totalValue: { $sum: '$grandTotal' } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { fullName: '$user.fullName', totalOrders: 1, totalValue: 1 } },
        { $sort: { totalValue: -1 } },
        { $limit: 5 }
      ])
    ]);

    // Calculate totals
    const totalCash = cashPosition.filter(a => a.isCashAccount).reduce((sum, a) => sum + a.currentBalance, 0);
    const totalBank = cashPosition.filter(a => a.isBankAccount).reduce((sum, a) => sum + a.currentBalance, 0);

    // Calculate growth percentages
    const salesGrowth = prevSales[0]?.totalSales 
      ? ((currentSales[0]?.totalSales || 0) - prevSales[0].totalSales) / prevSales[0].totalSales * 100 
      : 0;
    const receiptsGrowth = prevReceipts[0]?.total 
      ? ((currentReceipts[0]?.total || 0) - prevReceipts[0].total) / prevReceipts[0].total * 100 
      : 0;

    res.json({
      success: true,
      data: {
        period,
        sales: {
          total: currentSales[0]?.totalSales || 0,
          cost: currentSales[0]?.totalCost || 0,
          profit: currentSales[0]?.totalProfit || 0,
          count: currentSales[0]?.count || 0,
          growth: salesGrowth
        },
        purchases: {
          total: currentPurchases[0]?.total || 0,
          count: currentPurchases[0]?.count || 0
        },
        receipts: {
          total: currentReceipts[0]?.total || 0,
          count: currentReceipts[0]?.count || 0,
          growth: receiptsGrowth
        },
        payments: {
          total: currentPayments[0]?.total || 0,
          count: currentPayments[0]?.count || 0
        },
        orders: {
          total: currentOrders,
          pending: pendingOrders,
          processing: processingOrders
        },
        inventory: {
          lowStockCount: lowStockProducts.length,
          lowStockItems: lowStockProducts.slice(0, 5)
        },
        customers: {
          total: totalCustomers,
          active: activeCustomers
        },
        vendors: totalVendors,
        receivables: {
          total: receivablesTotal[0]?.total || 0,
          count: receivablesTotal[0]?.count || 0
        },
        payables: {
          total: payablesTotal[0]?.total || 0,
          count: payablesTotal[0]?.count || 0
        },
        cashPosition: {
          cashInHand: totalCash,
          bankBalance: totalBank,
          total: totalCash + totalBank,
          accounts: cashPosition
        },
        users: userStats.reduce((acc, u) => ({ ...acc, [u._id]: { total: u.count, active: u.active } }), {}),
        topOrderBookers
      }
    });
  } catch (error) {
    console.error('Get distributor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching distributor stats'
    });
  }
};

// @desc    Get daily sales trend
// @route   GET /api/dashboard/sales-trend
// @access  Distributor, Computer Operator
exports.getSalesTrend = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const salesTrend = await Invoice.aggregate([
      { $match: { invoiceDate: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          sales: { $sum: '$grandTotal' },
          profit: { $sum: '$totalProfit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const receiptsTrend = await Payment.aggregate([
      { $match: { paymentType: 'receipt', paymentDate: { $gte: startDate }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        salesTrend,
        receiptsTrend
      }
    });
  } catch (error) {
    console.error('Get sales trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sales trend'
    });
  }
};

// @desc    Get customer aging report
// @route   GET /api/dashboard/customer-aging
// @access  Distributor, Computer Operator
exports.getCustomerAging = async (req, res) => {
  try {
    const customers = await Customer.find({ 
      isActive: true, 
      currentBalance: { $gt: 0 } 
    })
    .select('businessName customerCode currentBalance phone')
    .sort({ currentBalance: -1 })
    .limit(20);

    // Get last payment date for each customer
    const customerIds = customers.map(c => c._id);
    const lastPayments = await Payment.aggregate([
      { 
        $match: { 
          partyType: 'customer', 
          partyId: { $in: customerIds },
          paymentType: 'receipt',
          status: 'completed'
        } 
      },
      { $sort: { paymentDate: -1 } },
      { $group: { _id: '$partyId', lastPaymentDate: { $first: '$paymentDate' }, lastAmount: { $first: '$amount' } } }
    ]);

    const paymentMap = lastPayments.reduce((acc, p) => {
      acc[p._id.toString()] = { lastPaymentDate: p.lastPaymentDate, lastAmount: p.lastAmount };
      return acc;
    }, {});

    const result = customers.map(c => ({
      ...c.toObject(),
      lastPayment: paymentMap[c._id.toString()] || null
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get customer aging error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching customer aging'
    });
  }
};

// @desc    Get unique order bookers from orders (for load form filter dropdown)
// @route   GET /api/dashboard/order-bookers
// @access  Distributor, Computer Operator
exports.getOrderBookers = async (req, res) => {
  try {
    // Get unique order bookers from orders
    const orderBookers = await Order.aggregate([
      {
        $group: {
          _id: '$bookedBy',
          fullName: { $first: '$bookedByName' }
        }
      },
      { $match: { fullName: { $ne: null } } },
      { $sort: { fullName: 1 } }
    ]);

    res.json({
      success: true,
      data: orderBookers
    });
  } catch (error) {
    console.error('Get order bookers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order bookers'
    });
  }
};

// @desc    Get unique order bookers from invoices (for filter dropdown)
// @route   GET /api/dashboard/invoice-order-bookers
// @access  Distributor, Computer Operator
exports.getInvoiceOrderBookers = async (req, res) => {
  try {
    // Get unique order bookers from invoices - lookup from Order if not set on Invoice
    const orderBookers = await Invoice.aggregate([
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderData'
        }
      },
      {
        $addFields: {
          resolvedOrderBooker: {
            $ifNull: ['$orderBooker', { $ifNull: [{ $arrayElemAt: ['$orderData.bookedBy', 0] }, '$createdBy'] }]
          },
          resolvedOrderBookerName: {
            $ifNull: ['$orderBookerName', { $ifNull: [{ $arrayElemAt: ['$orderData.bookedByName', 0] }, '$createdByName'] }]
          }
        }
      },
      {
        $group: {
          _id: '$resolvedOrderBooker',
          name: { $first: '$resolvedOrderBookerName' }
        }
      },
      { $match: { name: { $ne: null } } },
      { $sort: { name: 1 } },
      { $project: { _id: 1, fullName: '$name' } }
    ]);

    res.json({
      success: true,
      data: orderBookers
    });
  } catch (error) {
    console.error('Get invoice order bookers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order bookers'
    });
  }
};

// @desc    Get comprehensive sales report
// @route   GET /api/dashboard/sales-report
// @access  Distributor, Computer Operator
exports.getSalesReport = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, orderBooker, groupBy = 'day' } = req.query;
    
    let dateFilter = {};
    if (period === 'custom' && startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (period === 'all') {
      dateFilter = { $exists: true };
    } else {
      const { startDate: start, endDate: end } = getDateRange(period);
      dateFilter = { $gte: start, $lte: end };
    }

    const matchQuery = { invoiceDate: dateFilter };
    if (orderBooker) {
      matchQuery.orderBooker = new mongoose.Types.ObjectId(orderBooker);
    }

    let dateFormat;
    switch (groupBy) {
      case 'week': dateFormat = '%Y-W%V'; break;
      case 'month': dateFormat = '%Y-%m'; break;
      default: dateFormat = '%Y-%m-%d';
    }

    // Get chart data grouped by date
    const chartData = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$invoiceDate' } },
          totalSales: { $sum: '$grandTotal' },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
          totalProfit: { $sum: { $ifNull: ['$grossProfit', 0] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get summary
    const summary = await Invoice.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$grandTotal' },
          totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
          totalProfit: { $sum: { $ifNull: ['$grossProfit', 0] } },
          avgOrderValue: { $avg: '$grandTotal' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get order booker wise breakdown (only if not filtered by specific order booker)
    let orderBookerWise = [];
    if (!orderBooker) {
      orderBookerWise = await Invoice.aggregate([
        { $match: matchQuery },
        {
          $lookup: {
            from: 'orders',
            localField: 'order',
            foreignField: '_id',
            as: 'orderData'
          }
        },
        {
          $addFields: {
            resolvedOrderBooker: {
              $ifNull: ['$orderBooker', { $ifNull: [{ $arrayElemAt: ['$orderData.bookedBy', 0] }, '$createdBy'] }]
            },
            resolvedOrderBookerName: {
              $ifNull: ['$orderBookerName', { $ifNull: [{ $arrayElemAt: ['$orderData.bookedByName', 0] }, '$createdByName'] }]
            }
          }
        },
        {
          $group: {
            _id: '$resolvedOrderBooker',
            orderBookerName: { $first: '$resolvedOrderBookerName' },
            totalSales: { $sum: '$grandTotal' },
            totalCost: { $sum: { $ifNull: ['$totalCost', 0] } },
            totalProfit: { $sum: { $ifNull: ['$grossProfit', 0] } },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalSales: -1 } }
      ]);
    }

    // Get detailed invoices with order booker lookup from Order if not set on invoice
    const invoices = await Invoice.aggregate([
      { $match: matchQuery },
      { $sort: { invoiceDate: -1 } },
      { $limit: 500 },
      {
        $lookup: {
          from: 'orders',
          localField: 'order',
          foreignField: '_id',
          as: 'orderData'
        }
      },
      {
        $project: {
          invoiceNumber: 1,
          invoiceDate: 1,
          customerName: 1,
          grandTotal: 1,
          totalCost: { $ifNull: ['$totalCost', 0] },
          totalProfit: { $ifNull: ['$grossProfit', 0] },
          status: 1,
          // Use orderBookerName if set, otherwise get from linked order, finally fallback to createdByName
          orderBookerName: {
            $ifNull: [
              '$orderBookerName',
              { $ifNull: [{ $arrayElemAt: ['$orderData.bookedByName', 0] }, '$createdByName'] }
            ]
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        chartData,
        summary: summary[0] || { totalSales: 0, totalCost: 0, totalProfit: 0, avgOrderValue: 0, count: 0 },
        orderBookerWise,
        invoices
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sales report'
    });
  }
};

// @desc    Get comprehensive purchase report
// @route   GET /api/dashboard/purchase-report
// @access  Distributor, Computer Operator
exports.getPurchaseReport = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate, vendor, groupBy = 'day' } = req.query;
    
    let dateFilter = {};
    if (period === 'custom' && startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (period === 'all') {
      dateFilter = { $exists: true };
    } else {
      const { startDate: start, endDate: end } = getDateRange(period);
      dateFilter = { $gte: start, $lte: end };
    }

    const matchQuery = { createdAt: dateFilter };
    if (vendor) {
      matchQuery.vendor = new mongoose.Types.ObjectId(vendor);
    }

    let dateFormat;
    switch (groupBy) {
      case 'week': dateFormat = '%Y-W%V'; break;
      case 'month': dateFormat = '%Y-%m'; break;
      default: dateFormat = '%Y-%m-%d';
    }

    // Get chart data grouped by date
    const chartData = await Purchase.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalPurchases: { $sum: '$grandTotal' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get summary
    const summary = await Purchase.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$grandTotal' },
          totalSubtotal: { $sum: '$subtotal' },
          totalDiscount: { $sum: '$discount' },
          avgPurchaseValue: { $avg: '$grandTotal' },
          count: { $sum: 1 },
          vendorCount: { $addToSet: '$vendor' }
        }
      },
      {
        $project: {
          totalPurchases: 1,
          totalSubtotal: 1,
          totalDiscount: 1,
          avgPurchaseValue: 1,
          count: 1,
          vendorCount: { $size: '$vendorCount' }
        }
      }
    ]);

    // Get vendor wise breakdown (only if not filtered by specific vendor)
    let vendorWise = [];
    if (!vendor) {
      vendorWise = await Purchase.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$vendor',
            vendorName: { $first: '$vendorName' },
            totalPurchases: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        },
        { $sort: { totalPurchases: -1 } }
      ]);
    }

    // Get detailed purchases
    const purchases = await Purchase.find(matchQuery)
      .sort({ createdAt: -1 })
      .select('purchaseNumber createdAt vendorName subtotal discount grandTotal status')
      .limit(500)
      .lean();

    res.json({
      success: true,
      data: {
        period,
        chartData,
        summary: summary[0] || { totalPurchases: 0, totalSubtotal: 0, totalDiscount: 0, avgPurchaseValue: 0, count: 0, vendorCount: 0 },
        vendorWise,
        purchases
      }
    });
  } catch (error) {
    console.error('Get purchase report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching purchase report'
    });
  }
};

// @desc    Get product-wise sales summary
// @route   GET /api/dashboard/sale-summary
// @access  Distributor, Computer Operator
exports.getSaleSummary = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (period === 'custom' && startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (period === 'all') {
      dateFilter = { $exists: true };
    } else {
      const { startDate: start, endDate: end } = getDateRange(period);
      dateFilter = { $gte: start, $lte: end };
    }

    const matchQuery = { invoiceDate: dateFilter };

    // Get product-wise aggregation
    const products = await Invoice.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          unit: { $first: '$items.unit' },
          totalQuantity: { $sum: '$items.quantity' },
          avgSalePrice: { $avg: '$items.salePrice' },
          avgCostPrice: { $avg: '$items.costPrice' },
          totalSales: { $sum: '$items.lineTotal' },
          totalCost: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } },
          totalProfit: { $sum: '$items.profit' },
          invoiceCount: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          productName: 1,
          unit: 1,
          totalQuantity: 1,
          avgSalePrice: { $round: ['$avgSalePrice', 2] },
          avgCostPrice: { $round: ['$avgCostPrice', 2] },
          totalSales: 1,
          totalCost: 1,
          totalProfit: 1,
          invoiceCount: { $size: '$invoiceCount' }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    // Get overall summary
    const summary = await Invoice.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' },
          totalSales: { $sum: '$items.lineTotal' },
          totalCost: { $sum: { $multiply: ['$items.quantity', '$items.costPrice'] } },
          totalProfit: { $sum: '$items.profit' },
          productCount: { $addToSet: '$items.product' }
        }
      },
      {
        $project: {
          totalQuantity: 1,
          totalSales: 1,
          totalCost: 1,
          totalProfit: 1,
          productCount: { $size: '$productCount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        products,
        summary: summary[0] || { totalQuantity: 0, totalSales: 0, totalCost: 0, totalProfit: 0, productCount: 0 }
      }
    });
  } catch (error) {
    console.error('Get sale summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sale summary'
    });
  }
};

// @desc    Get product-wise purchase summary
// @route   GET /api/dashboard/purchase-summary-products
// @access  Distributor, Computer Operator
exports.getPurchaseSummaryProducts = async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (period === 'custom' && startDate && endDate) {
      dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate + 'T23:59:59') };
    } else if (period === 'all') {
      dateFilter = { $exists: true };
    } else {
      const { startDate: start, endDate: end } = getDateRange(period);
      dateFilter = { $gte: start, $lte: end };
    }

    const matchQuery = { createdAt: dateFilter };

    // Get product-wise aggregation
    const products = await Purchase.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          unit: { $first: '$items.unit' },
          totalQuantity: { $sum: '$items.quantity' },
          avgPurchasePrice: { $avg: '$items.purchasePrice' },
          totalPurchases: { $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] } },
          purchaseCount: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          productName: 1,
          unit: 1,
          totalQuantity: 1,
          avgPurchasePrice: { $round: ['$avgPurchasePrice', 2] },
          totalPurchases: 1,
          purchaseCount: { $size: '$purchaseCount' }
        }
      },
      { $sort: { totalPurchases: -1 } }
    ]);

    // Get overall summary
    const summary = await Purchase.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$items.quantity' },
          totalPurchases: { $sum: { $multiply: ['$items.quantity', '$items.purchasePrice'] } },
          productCount: { $addToSet: '$items.product' }
        }
      },
      {
        $project: {
          totalQuantity: 1,
          totalPurchases: 1,
          productCount: { $size: '$productCount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        products,
        summary: summary[0] || { totalQuantity: 0, totalPurchases: 0, productCount: 0 }
      }
    });
  } catch (error) {
    console.error('Get purchase summary products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching purchase summary'
    });
  }
};

// @desc    Get orders for load form selection
// @route   GET /api/dashboard/load-form-orders
// @access  Distributor, Computer Operator
exports.getOrdersForLoadForm = async (req, res) => {
  try {
    const { startDate, endDate, orderBooker } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const matchQuery = {
      orderDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59')
      },
      // Include all order statuses except cancelled and pending
      status: { $in: ['confirmed', 'approved', 'processing', 'dispatched', 'delivered'] }
    };

    if (orderBooker) {
      matchQuery.bookedBy = new mongoose.Types.ObjectId(orderBooker);
    }

    const orders = await Order.find(matchQuery)
      .select('orderNumber orderDate customerName bookedByName grandTotal status items')
      .sort({ orderDate: -1, customerName: 1 })
      .lean();

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get orders for load form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders'
    });
  }
};

// @desc    Generate load form from selected orders
// @route   POST /api/dashboard/generate-load-form
// @access  Distributor, Computer Operator
exports.generateLoadForm = async (req, res) => {
  try {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one order'
      });
    }

    // Get selected orders with full details
    const orders = await Order.find({ _id: { $in: orderIds } })
      .populate('customer', 'businessName phone address')
      .lean();

    // Aggregate products from all orders
    const productMap = new Map();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const key = item.product.toString();
        if (productMap.has(key)) {
          const existing = productMap.get(key);
          existing.totalCartons += item.cartons || 0;
          existing.totalPieces += item.pieces || 0;
          existing.totalQuantity += item.quantity;
          existing.totalValue += item.netAmount || item.lineTotal;
        } else {
          productMap.set(key, {
            productId: key,
            productName: item.productName,
            productSku: item.productSku,
            totalCartons: item.cartons || 0,
            totalPieces: item.pieces || 0,
            totalQuantity: item.quantity,
            totalValue: item.netAmount || item.lineTotal
          });
        }
      });
    });

    // Convert to array and sort by product name
    const products = Array.from(productMap.values()).sort((a, b) => 
      a.productName.localeCompare(b.productName)
    );

    // Format order details
    const orderDetails = orders.map(order => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerAddress: order.customer?.address ? 
        `${order.customer.address.street || ''}, ${order.customer.address.area || ''}, ${order.customer.address.city || ''}`.replace(/^, |, $/g, '') : '',
      customerPhone: order.customer?.phone || '',
      grandTotal: order.grandTotal,
      itemCount: order.items.length
    }));

    res.json({
      success: true,
      data: {
        products,
        orders: orderDetails,
        generatedAt: new Date(),
        totalOrders: orders.length,
        totalProducts: products.length
      }
    });
  } catch (error) {
    console.error('Generate load form error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating load form'
    });
  }
};

// @desc    Get comprehensive order booker dashboard
// @route   GET /api/dashboard/order-booker-dashboard
// @access  Order Booker only
exports.getOrderBookerDashboard = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const now = new Date();
    
    // Date ranges
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    
    // Previous week dates for growth calculation
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(weekStart);
    previousWeekEnd.setMilliseconds(-1);
    
    // Get user info
    const user = await User.findById(userId).select('fullName assignedArea').lean();

    // Parallel queries for performance
    const [
      // Combined today stats
      todayStats,
      todayReceipts,
      
      // Combined week stats (current + previous for growth)
      weekStats,
      weekReceipts,
      
      // Combined month stats
      monthStats,
      monthReceipts,
      
      // Order status breakdown (all time for pending)
      orderStatusBreakdown,
      
      // Recent orders (last 10)
      recentOrders,
      
      // Top customers this month
      topCustomers,
      
      // Daily sales trend (last 7 days)
      dailyTrend,
      
      // Top products sold this month
      topProducts,
      
      // Total customers served this month
      customersServed
    ] = await Promise.all([
      // Today's orders value and count in one query
      Order.aggregate([
        { $match: { bookedBy: userId, createdAt: { $gte: todayStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      
      // Today's receipts collected
      Payment.aggregate([
        { 
          $match: { 
            createdBy: userId,
            paymentType: 'receipt',
            paymentDate: { $gte: todayStart, $lte: todayEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      
      // Combined current + previous week stats
      Order.aggregate([
        { 
          $match: { 
            bookedBy: userId, 
            createdAt: { $gte: previousWeekStart, $lte: todayEnd } 
          } 
        },
        {
          $group: {
            _id: {
              $cond: [
                { $gte: ['$createdAt', weekStart] },
                'current',
                'previous'
              ]
            },
            total: { $sum: '$grandTotal' },
            count: { $sum: 1 }
          }
        }
      ]),
      
      // This week's receipts
      Payment.aggregate([
        { 
          $match: { 
            createdBy: userId,
            paymentType: 'receipt',
            paymentDate: { $gte: weekStart, $lte: todayEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      
      // This month's orders value and count
      Order.aggregate([
        { $match: { bookedBy: userId, createdAt: { $gte: monthStart, $lte: todayEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } }
      ]),
      
      // This month's receipts
      Payment.aggregate([
        { 
          $match: { 
            createdBy: userId,
            paymentType: 'receipt',
            paymentDate: { $gte: monthStart, $lte: todayEnd }
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
      ]),
      
      // Order status breakdown
      Order.aggregate([
        { $match: { bookedBy: userId } },
        { 
          $group: { 
            _id: '$status', 
            count: { $sum: 1 },
            value: { $sum: '$grandTotal' }
          } 
        }
      ]),
      
      // Recent orders
      Order.find({ bookedBy: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber customerName grandTotal status createdAt')
        .lean(),
      
      // Top customers this month
      Order.aggregate([
        { 
          $match: { 
            bookedBy: userId,
            createdAt: { $gte: monthStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: '$customer',
            customerName: { $first: '$customerName' },
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$grandTotal' }
          }
        },
        { $sort: { totalValue: -1 } },
        { $limit: 5 }
      ]),
      
      // Daily sales trend (last 7 days)
      Order.aggregate([
        { 
          $match: { 
            bookedBy: userId,
            createdAt: { $gte: weekStart, $lte: todayEnd }
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$grandTotal' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      
      // Top products sold this month
      Order.aggregate([
        { 
          $match: { 
            bookedBy: userId,
            createdAt: { $gte: monthStart, $lte: todayEnd }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            totalQuantity: { $sum: '$items.quantity' },
            totalValue: { $sum: '$items.netAmount' }
          }
        },
        { $sort: { totalValue: -1 } },
        { $limit: 5 }
      ]),
      
      // Unique customers served this month
      Order.distinct('customer', { 
        bookedBy: userId,
        createdAt: { $gte: monthStart, $lte: todayEnd }
      })
    ]);

    // Parse week stats for current and previous
    const currentWeekData = weekStats.find(w => w._id === 'current') || { total: 0, count: 0 };
    const previousWeekData = weekStats.find(w => w._id === 'previous') || { total: 0, count: 0 };
    
    const weeklyGrowth = previousWeekData.total > 0 
      ? ((currentWeekData.total - previousWeekData.total) / previousWeekData.total * 100).toFixed(1)
      : 0;

    // Format order status breakdown
    const statusMap = {
      pending: { count: 0, value: 0 },
      confirmed: { count: 0, value: 0 },
      dispatched: { count: 0, value: 0 },
      delivered: { count: 0, value: 0 },
      cancelled: { count: 0, value: 0 },
      returned: { count: 0, value: 0 }
    };
    
    orderStatusBreakdown.forEach(item => {
      if (statusMap[item._id]) {
        statusMap[item._id] = { count: item.count, value: item.value };
      }
    });

    res.json({
      success: true,
      data: {
        user: {
          name: user?.fullName || 'Order Booker',
          area: user?.assignedArea || ''
        },
        summary: {
          today: {
            orders: todayStats[0]?.count || 0,
            ordersValue: todayStats[0]?.total || 0,
            receipts: todayReceipts[0]?.total || 0,
            receiptsCount: todayReceipts[0]?.count || 0
          },
          thisWeek: {
            orders: currentWeekData.count,
            ordersValue: currentWeekData.total,
            receipts: weekReceipts[0]?.total || 0,
            receiptsCount: weekReceipts[0]?.count || 0,
            growthPercent: parseFloat(weeklyGrowth)
          },
          thisMonth: {
            orders: monthStats[0]?.count || 0,
            ordersValue: monthStats[0]?.total || 0,
            receipts: monthReceipts[0]?.total || 0,
            receiptsCount: monthReceipts[0]?.count || 0,
            customersServed: customersServed.length
          }
        },
        orderStatus: statusMap,
        recentOrders: recentOrders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          amount: order.grandTotal,
          status: order.status,
          date: order.createdAt
        })),
        topCustomers: topCustomers.map(c => ({
          id: c._id,
          name: c.customerName,
          orders: c.totalOrders,
          value: c.totalValue
        })),
        topProducts: topProducts.map(p => ({
          id: p._id,
          name: p.productName,
          quantity: p.totalQuantity,
          value: p.totalValue
        })),
        dailyTrend: dailyTrend.map(d => ({
          date: d._id,
          orders: d.totalOrders,
          value: d.totalValue
        }))
      }
    });
  } catch (error) {
    console.error('Get order booker dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching dashboard data'
    });
  }
};

// @desc    Get order booker's own sales report
// @route   GET /api/dashboard/my-sales-report
// @access  Order Booker only
exports.getMySalesReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

    // Build query - bookedBy is the field in Order model
    const query = { bookedBy: userId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total, summary] = await Promise.all([
      Order.find(query)
        .populate('customer', 'businessName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query),
      Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$grandTotal' },
            totalItems: { $sum: { $size: '$items' } }
          }
        }
      ])
    ]);

    // Status breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          value: { $sum: '$grandTotal' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        orders: orders.map(order => ({
          id: order._id,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          customerName: order.customerName,
          customerBusiness: order.customer?.businessName,
          itemCount: order.items?.length || 0,
          grandTotal: order.grandTotal,
          status: order.status,
          createdAt: order.createdAt
        })),
        summary: summary[0] || { totalOrders: 0, totalValue: 0, totalItems: 0 },
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item._id] = { count: item.count, value: item.value };
          return acc;
        }, {}),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get my sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sales report'
    });
  }
};

// @desc    Get order booker's own collections report
// @route   GET /api/dashboard/my-collections-report
// @access  Order Booker only
exports.getMyCollectionsReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    // Build query for receipts created by this user
    const query = { 
      createdBy: userId,
      paymentType: 'receipt'
    };

    if (startDate && endDate) {
      query.paymentDate = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [receipts, total, summary] = await Promise.all([
      Payment.find(query)
        .populate('partyId', 'businessName contactPerson')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalReceipts: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            cashAmount: {
              $sum: { $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$amount', 0] }
            },
            bankAmount: {
              $sum: { $cond: [{ $ne: ['$paymentMethod', 'cash'] }, '$amount', 0] }
            }
          }
        }
      ])
    ]);

    // Daily breakdown
    const dailyBreakdown = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          count: { $sum: 1 },
          amount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 30 }
    ]);

    res.json({
      success: true,
      data: {
        receipts: receipts.map(receipt => ({
          id: receipt._id,
          receiptNumber: receipt.paymentNumber,
          paymentDate: receipt.paymentDate,
          customerName: receipt.partyName,
          customerBusiness: receipt.partyId?.businessName,
          amount: receipt.amount,
          paymentMethod: receipt.paymentMethod,
          reference: receipt.transactionReference || receipt.chequeNumber,
          notes: receipt.remarks
        })),
        summary: summary[0] || { totalReceipts: 0, totalAmount: 0, cashAmount: 0, bankAmount: 0 },
        dailyBreakdown: dailyBreakdown.map(d => ({
          date: d._id,
          count: d.count,
          amount: d.amount
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get my collections report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching collections report'
    });
  }
};

// @desc    Get order booker's performance summary
// @route   GET /api/dashboard/my-performance
// @access  Order Booker only
exports.getMyPerformance = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);
    const { period = 'month' } = req.query;
    
    const now = new Date();
    let startDate, previousStartDate, previousEndDate;
    
    // Determine date ranges based on period
    if (period === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      previousStartDate = new Date(startDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
      previousEndDate = new Date(startDate);
      previousEndDate.setMilliseconds(-1);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEndDate = new Date(startDate);
      previousEndDate.setMilliseconds(-1);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      previousEndDate = new Date(startDate);
      previousEndDate.setMilliseconds(-1);
    }

    const endDate = now;

    // Current period stats - use bookedBy for Order, createdBy for Payment
    const [currentOrders, currentReceipts, customersServed, productsSold] = await Promise.all([
      Order.aggregate([
        { $match: { bookedBy: userId, createdAt: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            value: { $sum: '$grandTotal' },
            delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            createdBy: userId, 
            paymentType: 'receipt',
            paymentDate: { $gte: startDate, $lte: endDate }
          }
        },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } }
      ]),
      Order.distinct('customer', { 
        bookedBy: userId, 
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Order.aggregate([
        { $match: { bookedBy: userId, createdAt: { $gte: startDate, $lte: endDate } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$items.quantity' },
            uniqueProducts: { $addToSet: '$items.product' }
          }
        }
      ])
    ]);

    // Previous period stats for comparison
    const [previousOrders, previousReceipts] = await Promise.all([
      Order.aggregate([
        { $match: { bookedBy: userId, createdAt: { $gte: previousStartDate, $lte: previousEndDate } } },
        { $group: { _id: null, count: { $sum: 1 }, value: { $sum: '$grandTotal' } } }
      ]),
      Payment.aggregate([
        { 
          $match: { 
            createdBy: userId, 
            paymentType: 'receipt',
            paymentDate: { $gte: previousStartDate, $lte: previousEndDate }
          }
        },
        { $group: { _id: null, amount: { $sum: '$amount' } } }
      ])
    ]);

    // Calculate growth percentages
    const currentOrderValue = currentOrders[0]?.value || 0;
    const previousOrderValue = previousOrders[0]?.value || 0;
    const orderGrowth = previousOrderValue > 0 
      ? ((currentOrderValue - previousOrderValue) / previousOrderValue * 100).toFixed(1)
      : 0;

    const currentReceiptAmount = currentReceipts[0]?.amount || 0;
    const previousReceiptAmount = previousReceipts[0]?.amount || 0;
    const receiptGrowth = previousReceiptAmount > 0 
      ? ((currentReceiptAmount - previousReceiptAmount) / previousReceiptAmount * 100).toFixed(1)
      : 0;

    // Daily trend
    const dailyTrend = await Order.aggregate([
      { $match: { bookedBy: userId, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          value: { $sum: '$grandTotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top customers
    const topCustomers = await Order.aggregate([
      { $match: { bookedBy: userId, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$customer',
          customerName: { $first: '$customerName' },
          orders: { $sum: 1 },
          value: { $sum: '$grandTotal' }
        }
      },
      { $sort: { value: -1 } },
      { $limit: 10 }
    ]);

    // Top products
    const topProducts = await Order.aggregate([
      { $match: { bookedBy: userId, createdAt: { $gte: startDate, $lte: endDate } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.productName' },
          quantity: { $sum: '$items.quantity' },
          value: { $sum: '$items.netAmount' }
        }
      },
      { $sort: { value: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        period,
        summary: {
          orders: {
            count: currentOrders[0]?.count || 0,
            value: currentOrderValue,
            delivered: currentOrders[0]?.delivered || 0,
            cancelled: currentOrders[0]?.cancelled || 0,
            growthPercent: parseFloat(orderGrowth)
          },
          collections: {
            count: currentReceipts[0]?.count || 0,
            amount: currentReceiptAmount,
            growthPercent: parseFloat(receiptGrowth)
          },
          customers: {
            served: customersServed.length
          },
          products: {
            quantitySold: productsSold[0]?.totalQuantity || 0,
            uniqueProducts: productsSold[0]?.uniqueProducts?.length || 0
          }
        },
        dailyTrend: dailyTrend.map(d => ({
          date: d._id,
          orders: d.orders,
          value: d.value
        })),
        topCustomers: topCustomers.map(c => ({
          id: c._id,
          name: c.customerName,
          orders: c.orders,
          value: c.value
        })),
        topProducts: topProducts.map(p => ({
          id: p._id,
          name: p.productName,
          quantity: p.quantity,
          value: p.value
        }))
      }
    });
  } catch (error) {
    console.error('Get my performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching performance data'
    });
  }
};
