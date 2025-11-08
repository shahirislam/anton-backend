require('dotenv').config();

const logger = require('./utils/logger');
const validateEnv = require('./config/validateEnv');
const { closeDB } = require('./config/db');
validateEnv();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;
const GRACEFUL_SHUTDOWN_TIMEOUT = parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '10000', 10);

let server;

const startServer = async () => {
  try {
    console.log('Starting server...');
    console.log(`PORT: ${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    
    await connectDB();
    console.log('Database connected successfully');

    server = app.listen(PORT, '0.0.0.0', () => {
      const message = `Server running on port ${PORT}`;
      console.log(message);
      logger.info(message, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      });
    });

    server.on('error', (error) => {
      console.error('Server error:', error);
      logger.error('Server error', { error: error.message, stack: error.stack });
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    console.error('Stack:', error.stack);
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 * Stops accepting new connections, waits for in-flight requests, then closes database
 */
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed. Waiting for in-flight requests to complete...');

      try {
        await closeDB();
        logger.info('Database connection closed.');
        
        logger.info('Graceful shutdown completed.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown', {
          error: error.message,
          stack: error.stack,
        });
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded. Forcing shutdown...');
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT);
  } else {
    try {
      await closeDB();
      process.exit(0);
    } catch (error) {
      logger.error('Error closing database during shutdown', {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  gracefulShutdown('uncaughtException').then(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: promise.toString(),
  });
});

startServer();

