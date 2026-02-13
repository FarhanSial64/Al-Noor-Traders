import api from './api';

const dashboardService = {
  getStats: async (params = {}) => {
    const response = await api.get('/dashboard/stats', { params });
    return response.data;
  },

  getDistributorStats: async (params = {}) => {
    const response = await api.get('/dashboard/distributor-stats', { params });
    return response.data;
  },

  getSalesSummary: async (params = {}) => {
    const response = await api.get('/dashboard/sales-summary', { params });
    return response.data;
  },

  getSalesTrend: async (params = {}) => {
    const response = await api.get('/dashboard/sales-trend', { params });
    return response.data;
  },

  getCustomerAging: async () => {
    const response = await api.get('/dashboard/customer-aging');
    return response.data;
  },

  getPurchaseSummary: async (params = {}) => {
    const response = await api.get('/dashboard/purchase-summary', { params });
    return response.data;
  },

  getTopProducts: async (params = {}) => {
    const response = await api.get('/dashboard/top-products', { params });
    return response.data;
  },

  getTopCustomers: async (params = {}) => {
    const response = await api.get('/dashboard/top-customers', { params });
    return response.data;
  },

  getCashPosition: async () => {
    const response = await api.get('/dashboard/cash-position');
    return response.data;
  },

  getRecentActivity: async (params = {}) => {
    const response = await api.get('/dashboard/recent-activity', { params });
    return response.data;
  },

  getOrderBookerStats: async (params = {}) => {
    const response = await api.get('/dashboard/order-booker-stats', { params });
    return response.data;
  },

  getCustomerStats: async () => {
    const response = await api.get('/dashboard/customer-stats');
    return response.data;
  },

  getSalesReport: async (params = {}) => {
    const response = await api.get('/dashboard/sales-report', { params });
    return response.data;
  },

  getInvoiceOrderBookers: async () => {
    const response = await api.get('/dashboard/invoice-order-bookers');
    return response.data;
  },

  getPurchaseReport: async (params = {}) => {
    const response = await api.get('/dashboard/purchase-report', { params });
    return response.data;
  },

  getSaleSummary: async (params = {}) => {
    const response = await api.get('/dashboard/sale-summary', { params });
    return response.data;
  },

  getPurchaseSummaryProducts: async (params = {}) => {
    const response = await api.get('/dashboard/purchase-summary-products', { params });
    return response.data;
  },

  getOrdersForLoadForm: async (params = {}) => {
    const response = await api.get('/dashboard/load-form-orders', { params });
    return response.data;
  },

  generateLoadForm: async (data) => {
    const response = await api.post('/dashboard/generate-load-form', data);
    return response.data;
  },

  getOrderBookers: async () => {
    const response = await api.get('/dashboard/order-bookers');
    return response.data;
  },

  getOrderBookerDashboard: async () => {
    const response = await api.get('/dashboard/order-booker-dashboard');
    return response.data;
  },

  getMySalesReport: async (params = {}) => {
    const response = await api.get('/dashboard/my-sales-report', { params });
    return response.data;
  },

  getMyCollectionsReport: async (params = {}) => {
    const response = await api.get('/dashboard/my-collections-report', { params });
    return response.data;
  },

  getMyPerformance: async (params = {}) => {
    const response = await api.get('/dashboard/my-performance', { params });
    return response.data;
  },
};

export default dashboardService;
