import api from './api';

const settingsService = {
  getBusinessSettings: async () => {
    const response = await api.get('/settings/business');
    return response.data;
  },

  updateBusinessSettings: async (settingsData) => {
    const response = await api.put('/settings/business', settingsData);
    return response.data;
  },
};

export default settingsService;
