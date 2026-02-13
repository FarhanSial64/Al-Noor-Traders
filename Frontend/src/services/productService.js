import api from './api';

const productService = {
  // Products
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Categories
  getCategories: async () => {
    const response = await api.get('/products/master/categories');
    return response.data;
  },

  createCategory: async (categoryData) => {
    const response = await api.post('/products/master/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/products/master/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await api.delete(`/products/master/categories/${id}`);
    return response.data;
  },

  // Brands
  getBrands: async () => {
    const response = await api.get('/products/master/brands');
    return response.data;
  },

  createBrand: async (brandData) => {
    const response = await api.post('/products/master/brands', brandData);
    return response.data;
  },

  updateBrand: async (id, brandData) => {
    const response = await api.put(`/products/master/brands/${id}`, brandData);
    return response.data;
  },

  deleteBrand: async (id) => {
    const response = await api.delete(`/products/master/brands/${id}`);
    return response.data;
  },

  // Units
  getUnits: async () => {
    const response = await api.get('/products/master/units');
    return response.data;
  },

  createUnit: async (unitData) => {
    const response = await api.post('/products/master/units', unitData);
    return response.data;
  },

  updateUnit: async (id, unitData) => {
    const response = await api.put(`/products/master/units/${id}`, unitData);
    return response.data;
  },

  deleteUnit: async (id) => {
    const response = await api.delete(`/products/master/units/${id}`);
    return response.data;
  },
};

export default productService;
