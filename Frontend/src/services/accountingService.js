import api from './api';

const accountingService = {
  // Chart of Accounts
  getChartOfAccounts: async (params = {}) => {
    const response = await api.get('/accounting/accounts', { params });
    return response.data;
  },

  getAccountDetails: async (id) => {
    const response = await api.get(`/accounting/accounts/${id}`);
    return response.data;
  },

  // Journal Entries
  getJournalEntries: async (params = {}) => {
    const response = await api.get('/accounting/journal-entries', { params });
    return response.data;
  },

  getJournalEntry: async (id) => {
    const response = await api.get(`/accounting/journal-entries/${id}`);
    return response.data;
  },

  // Ledger
  getAccountLedger: async (accountId, params = {}) => {
    const response = await api.get(`/accounting/ledger/${accountId}`, { params });
    return response.data;
  },

  // Cash Book
  getCashBook: async (params = {}) => {
    const response = await api.get('/accounting/cash-book', { params });
    return response.data;
  },

  getCashBookSummary: async (params = {}) => {
    const response = await api.get('/accounting/cash-book/summary', { params });
    return response.data;
  },

  // Reports
  getTrialBalance: async (params = {}) => {
    const response = await api.get('/accounting/trial-balance', { params });
    return response.data;
  },

  getProfitAndLoss: async (params = {}) => {
    const response = await api.get('/accounting/profit-loss', { params });
    return response.data;
  },

  // Alias for getProfitAndLoss
  getProfitLoss: async (params = {}) => {
    const response = await api.get('/accounting/profit-loss', { params });
    return response.data;
  },

  // Receivables & Payables
  getReceivables: async () => {
    const response = await api.get('/accounting/receivables');
    return response.data;
  },

  getPayables: async () => {
    const response = await api.get('/accounting/payables');
    return response.data;
  },

  // Data Repair Utilities
  recalculateInvoiceProfits: async () => {
    const response = await api.post('/accounting/recalculate-profits');
    return response.data;
  },
};

export default accountingService;
