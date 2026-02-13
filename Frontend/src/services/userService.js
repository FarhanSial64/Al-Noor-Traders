import api from './api';

const userService = {
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deactivateUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  resetPassword: async (id, newPassword) => {
    const response = await api.put(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },

  getOrderBookers: async () => {
    const response = await api.get('/users/role/order-bookers');
    return response.data;
  },

  // Password Reset Requests
  getPasswordResetRequests: async (params = {}) => {
    const response = await api.get('/users/password-reset-requests', { params });
    return response.data;
  },

  getPasswordResetRequestsCount: async () => {
    const response = await api.get('/users/password-reset-requests/count');
    return response.data;
  },

  processPasswordResetRequest: async (id, data) => {
    const response = await api.put(`/users/password-reset-requests/${id}`, data);
    return response.data;
  },
};

export default userService;
