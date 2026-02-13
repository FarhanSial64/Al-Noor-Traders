import api from './api';

const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data.success) {
      localStorage.setItem('token', response.data.data.token);
      return response.data.data;
    }
    throw new Error(response.data.message);
  },

  customerSignup: async (signupData) => {
    const response = await api.post('/auth/customer-signup', signupData);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data.message);
  },

  updateProfile: async (profileData) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  },

  forgotPassword: async (data) => {
    const response = await api.post('/auth/forgot-password', data);
    return response.data;
  },

  forceChangePassword: async (newPassword) => {
    const response = await api.put('/auth/force-change-password', { newPassword });
    return response.data;
  },

  verifyResetToken: async (token) => {
    const response = await api.get(`/auth/verify-reset-token/${token}`);
    return response.data;
  },

  resetPasswordWithToken: async (token, newPassword) => {
    const response = await api.post(`/auth/reset-password/${token}`, { newPassword });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};

export default authService;
