const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const customerRoutes = require('./routes/customerRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const orderRoutes = require('./routes/orderRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const accountingRoutes = require('./routes/accountingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const shopRoutes = require('./routes/shopRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

// Initialize express app
const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Connect to database
connectDB();

// ===== SECURITY MIDDLEWARE =====

// Helmet for security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000' || 'https://al-noor-traders.vercel.app',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 5 * 60 * 1000, // 5 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000, // limit each IP to 1000 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// ===== PARSING MIDDLEWARE =====

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// ===== LOGGING =====

// Morgan logging in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ===== API ROUTES =====

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Al Noor Traders DMS API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version info
app.get('/api/version', (req, res) => {
  res.json({
    success: true,
    version: '1.0.0',
    name: 'Al Noor Traders Distribution Management System',
    apiPrefix: '/api'
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/expenses', expenseRoutes);

// ===== STATIC FILES (for production) =====

if (process.env.NODE_ENV === 'production') {
  // Serve static files from React app
  app.use(express.static(path.join(__dirname, '../Frontend/build')));

  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/build', 'index.html'));
  });
}

// ===== ERROR HANDLING =====

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// ===== SERVER STARTUP =====

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║   🚀 AL NOOR TRADERS - DISTRIBUTION MANAGEMENT SYSTEM                     ║
║                                                                           ║
║   Server running in ${(process.env.NODE_ENV || 'development').padEnd(12)} mode                              ║
║   Port: ${String(PORT).padEnd(5)}                                                          ║
║   API: http://localhost:${PORT}/api                                         ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
  `);
});

// ===== GRACEFUL SHUTDOWN =====

process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

module.exports = app;
