import api from './api';

const purchaseService = {
  getPurchases: async (params = {}) => {
    const response = await api.get('/purchases', { params });
    return response.data;
  },

  getPurchase: async (id) => {
    const response = await api.get(`/purchases/${id}`);
    return response.data;
  },

  createPurchase: async (purchaseData) => {
    const response = await api.post('/purchases', purchaseData);
    return response.data;
  },

  updatePurchase: async (id, purchaseData) => {
    const response = await api.put(`/purchases/${id}`, purchaseData);
    return response.data;
  },

  updatePurchaseStatus: async (id, status) => {
    const response = await api.put(`/purchases/${id}/status`, { status });
    return response.data;
  },

  receiveGoods: async (id, receivedItems) => {
    const response = await api.put(`/purchases/${id}/receive`, { receivedItems });
    return response.data;
  },

  deletePurchase: async (id) => {
    const response = await api.delete(`/purchases/${id}`);
    return response.data;
  },
};

export default purchaseService;
