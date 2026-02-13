// Debounce function for search inputs
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Throttle function for scroll events
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Format currency with memoization
const currencyCache = new Map();
export const formatCurrency = (amount) => {
  if (currencyCache.has(amount)) {
    return currencyCache.get(amount);
  }
  const formatted = new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
  currencyCache.set(amount, formatted);
  return formatted;
};

// Format date with memoization
const dateCache = new Map();
export const formatDate = (date) => {
  if (!date) return '-';
  const key = date.toString();
  if (dateCache.has(key)) {
    return dateCache.get(key);
  }
  const formatted = new Date(date).toLocaleDateString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  dateCache.set(key, formatted);
  return formatted;
};

// Format datetime
export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
