import api from './api';

const expenseService = {
  // ========== EXPENSE CATEGORIES ==========
  
  /**
   * Get all expense categories
   */
  getCategories: async () => {
    const response = await api.get('/expenses/categories');
    return response.data;
  },

  /**
   * Create expense category
   */
  createCategory: async (categoryData) => {
    const response = await api.post('/expenses/categories', categoryData);
    return response.data;
  },

  /**
   * Update expense category
   */
  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/expenses/categories/${id}`, categoryData);
    return response.data;
  },

  /**
   * Delete expense category
   */
  deleteCategory: async (id) => {
    const response = await api.delete(`/expenses/categories/${id}`);
    return response.data;
  },

  // ========== EXPENSES ==========

  /**
   * Get all expenses with filters
   */
  getExpenses: async (params = {}) => {
    const response = await api.get('/expenses', { params });
    return response.data;
  },

  /**
   * Get expense by ID
   */
  getExpense: async (id) => {
    const response = await api.get(`/expenses/${id}`);
    return response.data;
  },

  /**
   * Create expense
   */
  createExpense: async (expenseData) => {
    const response = await api.post('/expenses', expenseData);
    return response.data;
  },

  /**
   * Update expense
   */
  updateExpense: async (id, expenseData) => {
    const response = await api.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  /**
   * Delete expense
   */
  deleteExpense: async (id) => {
    const response = await api.delete(`/expenses/${id}`);
    return response.data;
  },

  // ========== SUMMARY & REPORTS ==========

  /**
   * Get expense summary
   */
  getSummary: async (params = {}) => {
    const response = await api.get('/expenses/summary', { params });
    return response.data;
  },

  /**
   * Get expense accounts from Chart of Accounts
   */
  getExpenseAccounts: async () => {
    const response = await api.get('/expenses/accounts');
    return response.data;
  }
};

export default expenseService;
