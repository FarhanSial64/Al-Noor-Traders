const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings
      maxPoolSize: 10,
      minPoolSize: 2,
      
      // Timeout settings
      serverSelectionTimeoutMS: 10000,  // 10 seconds to find a server
      socketTimeoutMS: 45000,           // 45 seconds for socket operations
      connectTimeoutMS: 10000,          // 10 seconds to establish connection
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Heartbeat
      heartbeatFrequencyMS: 10000,      // Check server health every 10 seconds
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected successfully');
    });

  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    // Don't exit immediately, retry after a delay
    console.log('Retrying connection in 5 seconds...');
    setTimeout(() => connectDB(), 5000);
  }
};

module.exports = connectDB;
