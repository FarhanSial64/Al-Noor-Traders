import api from './api';

const customerService = {
  getCustomers: async (params = {}) => {
    const response = await api.get('/customers', { params });
    return response.data;
  },

  getCustomer: async (id) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
  },

  getNextCustomerCode: async () => {
    const response = await api.get('/customers/next-code');
    return response.data;
  },

  createCustomer: async (customerData) => {
    const response = await api.post('/customers', customerData);
    return response.data;
  },

  updateCustomer: async (id, customerData) => {
    const response = await api.put(`/customers/${id}`, customerData);
    return response.data;
  },

  deleteCustomer: async (id) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data;
  },

  getCustomerLedger: async (id, params = {}) => {
    const response = await api.get(`/customers/${id}/ledger`, { params });
    return response.data;
  },
};

export default customerService;
