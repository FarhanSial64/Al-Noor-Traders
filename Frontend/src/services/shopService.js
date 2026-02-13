import api from './api';

const shopService = {
  // Get products for shop
  getProducts: async (params = {}) => {
    const response = await api.get('/shop/products', { params });
    return response.data;
  },

  // Get single product
  getProduct: async (id) => {
    const response = await api.get(`/shop/products/${id}`);
    return response.data;
  },

  // Get categories
  getCategories: async () => {
    const response = await api.get('/shop/categories');
    return response.data;
  },

  // Place order
  placeOrder: async (orderData) => {
    const response = await api.post('/shop/order', orderData);
    return response.data;
  },

  // Get my orders
  getMyOrders: async () => {
    const response = await api.get('/shop/orders');
    return response.data;
  },

  // Get order detail
  getOrderDetail: async (id) => {
    const response = await api.get(`/shop/orders/${id}`);
    return response.data;
  },

  // Get loyalty data
  getLoyalty: async () => {
    const response = await api.get('/shop/loyalty');
    return response.data;
  },

  // Get customer profile with loyalty (combined endpoint)
  getProfile: async () => {
    const response = await api.get('/shop/profile');
    return response.data;
  },
};

export default shopService;
