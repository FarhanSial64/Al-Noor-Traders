import api from './api';

const inventoryService = {
  getStock: async (params = {}) => {
    const response = await api.get('/inventory/stock', { params });
    return response.data;
  },

  getProductStock: async (productId) => {
    const response = await api.get(`/inventory/stock/${productId}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await api.get('/inventory/low-stock');
    return response.data;
  },

  getStockMovements: async (productId, params = {}) => {
    const response = await api.get(`/inventory/movements/${productId}`, { params });
    return response.data;
  },

  getAllMovements: async (params = {}) => {
    const response = await api.get('/inventory/movements', { params });
    return response.data;
  },

  createAdjustment: async (adjustmentData) => {
    const response = await api.post('/inventory/adjustment', adjustmentData);
    return response.data;
  },

  adjustStock: async (adjustmentData) => {
    // Map frontend adjustment types to backend expected values
    const typeMap = {
      'adjustment_in': 'add',
      'adjustment_out': 'remove'
    };
    const payload = {
      productId: adjustmentData.product,
      quantity: adjustmentData.quantity,
      adjustmentType: typeMap[adjustmentData.adjustmentType] || adjustmentData.adjustmentType,
      reason: adjustmentData.reason,
      notes: adjustmentData.notes
    };
    const response = await api.post('/inventory/adjustment', payload);
    return response.data;
  },

  getAdjustments: async (params = {}) => {
    const response = await api.get('/inventory/adjustments', { params });
    return response.data;
  },

  getValuation: async (params = {}) => {
    const response = await api.get('/inventory/valuation', { params });
    return response.data;
  },

  getPricingReport: async (params = {}) => {
    const response = await api.get('/inventory/pricing-report', { params });
    return response.data;
  },
};

export default inventoryService;
