import api from './api';

const vendorService = {
  getVendors: async (params = {}) => {
    const response = await api.get('/vendors', { params });
    return response.data;
  },

  getVendor: async (id) => {
    const response = await api.get(`/vendors/${id}`);
    return response.data;
  },

  getNextVendorCode: async () => {
    const response = await api.get('/vendors/next-code');
    return response.data;
  },

  createVendor: async (vendorData) => {
    const response = await api.post('/vendors', vendorData);
    return response.data;
  },

  updateVendor: async (id, vendorData) => {
    const response = await api.put(`/vendors/${id}`, vendorData);
    return response.data;
  },

  deleteVendor: async (id) => {
    const response = await api.delete(`/vendors/${id}`);
    return response.data;
  },

  getVendorLedger: async (id, params = {}) => {
    const response = await api.get(`/vendors/${id}/ledger`, { params });
    return response.data;
  },
};

export default vendorService;
