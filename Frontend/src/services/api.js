import axios from 'axios';

// Lazy store import to avoid circular dependency
let store;
export const injectStore = (_store) => {
  store = _store;
};

// Simple in-memory cache for GET requests
const cache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

const clearCache = () => {
  cache.clear();
};

const getCacheKey = (url, params) => {
  return `${url}?${JSON.stringify(params || {})}`;
};

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

// Request interceptor to add auth token and handle caching
api.interceptors.request.use(
  (config) => {
    if (store) {
      const state = store.getState();
      const token = state.auth.token;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Check cache for GET requests
    if (config.method === 'get' && !config.skipCache) {
      const cacheKey = getCacheKey(config.url, config.params);
      const cached = cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        config.adapter = () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        });
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and cache responses
api.interceptors.response.use(
  (response) => {
    // Cache GET responses
    if (response.config.method === 'get' && !response.config.skipCache) {
      const cacheKey = getCacheKey(response.config.url, response.config.params);
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }
    
    // Clear cache on mutations (POST, PUT, DELETE, PATCH)
    if (['post', 'put', 'delete', 'patch'].includes(response.config.method)) {
      clearCache();
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear all auth data and redirect
      localStorage.removeItem('token');
      // Clear redux-persist storage to prevent rehydration with stale auth state
      localStorage.removeItem('persist:alnoor-dms');
      clearCache();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Export clearCache for manual cache invalidation
export { clearCache };
export default api;
