import api from './api';

const orderService = {
  getOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  updateOrder: async (id, orderData) => {
    const response = await api.put(`/orders/${id}`, orderData);
    return response.data;
  },

  updateOrderStatus: async (id, status) => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },

  cancelOrder: async (id, reason) => {
    const response = await api.put(`/orders/${id}/cancel`, { reason });
    return response.data;
  },

  generateInvoice: async (id) => {
    const response = await api.post(`/orders/${id}/invoice`);
    return response.data;
  },

  processReturn: async (id, returnData) => {
    const response = await api.post(`/orders/${id}/return`, returnData);
    return response.data;
  },

  getMyOrders: async (params = {}) => {
    const response = await api.get('/orders/my-orders', { params });
    return response.data;
  },

  bulkGenerateInvoices: async (orderIds) => {
    const response = await api.post('/orders/bulk/generate-invoices', { orderIds });
    return response.data;
  },

  bulkUpdateStatus: async (orderIds, status) => {
    const response = await api.put('/orders/bulk/status', { orderIds, status });
    return response.data;
  },

  bulkGetInvoices: async (orderIds) => {
    const response = await api.post('/orders/bulk/invoices', { orderIds });
    return response.data;
  },
};

export default orderService;
