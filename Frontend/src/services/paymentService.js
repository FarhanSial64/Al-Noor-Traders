import api from './api';

const paymentService = {
  // Receipts (from customers)
  getReceipts: async (params = {}) => {
    const response = await api.get('/payments/receipts', { params });
    return response.data;
  },

  createReceipt: async (receiptData) => {
    const response = await api.post('/payments/receipts', receiptData);
    return response.data;
  },

  updateReceipt: async (id, receiptData) => {
    const response = await api.put(`/payments/receipts/${id}`, receiptData);
    return response.data;
  },

  deleteReceipt: async (id) => {
    const response = await api.delete(`/payments/receipts/${id}`);
    return response.data;
  },

  // Payments (to vendors)
  getPayments: async (params = {}) => {
    const response = await api.get('/payments/payments', { params });
    return response.data;
  },

  createPayment: async (paymentData) => {
    const response = await api.post('/payments/payments', paymentData);
    return response.data;
  },

  updatePayment: async (id, paymentData) => {
    const response = await api.put(`/payments/payments/${id}`, paymentData);
    return response.data;
  },

  deletePayment: async (id) => {
    const response = await api.delete(`/payments/payments/${id}`);
    return response.data;
  },

  // Get payment details
  getPaymentDetails: async (id) => {
    const response = await api.get(`/payments/${id}`);
    return response.data;
  },
};

export default paymentService;
