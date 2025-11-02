const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000;
const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const connectDB = async (retries = MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, CONNECTION_OPTIONS);
      
      logger.info('MongoDB Connected', { host: conn.connection.host });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error', { error: err.message, stack: err.stack });
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected. Attempting to reconnect...');
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected successfully');
      });

      return conn;
    } catch (error) {
      logger.error('MongoDB connection attempt failed', {
        attempt,
        maxRetries: retries,
        error: error.message,
      });
      
      if (attempt === retries) {
        logger.error('Failed to connect to MongoDB after all retry attempts. Exiting application...');
        process.exit(1);
      }

      const delay = Math.min(RETRY_DELAY * Math.pow(2, attempt - 1), 30000);
      logger.info(`Retrying in ${delay / 1000} seconds...`, { delay: delay / 1000 });
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

/**
 * Gracefully close MongoDB connection
 * Used during server shutdown to ensure clean disconnection
 */
const closeDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed gracefully');
    } else {
      logger.info('MongoDB connection already closed');
    }
  } catch (error) {
    logger.error('Error closing MongoDB connection', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

module.exports = connectDB;
module.exports.closeDB = closeDB;

