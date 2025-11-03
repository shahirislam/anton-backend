const mongoose = require('mongoose');
const logger = require('./logger');

// Cache for transaction support check
let transactionSupportCache = null;

/**
 * Check if MongoDB connection supports transactions
 * Transactions require a replica set or mongos
 */
const supportsTransactions = async () => {
  // Return cached result if available
  if (transactionSupportCache !== null) {
    return transactionSupportCache;
  }

  try {
    // Try to start a session and transaction to detect support
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await session.abortTransaction();
      transactionSupportCache = true;
      return true;
    } catch (error) {
      // If error is about replica set, transactions are not supported
      if (error.message && error.message.includes('replica set')) {
        transactionSupportCache = false;
        logger.warn('MongoDB transactions not supported (standalone instance detected). Running without transactions. For production, consider setting up a replica set.');
        return false;
      }
      // For other errors, assume transactions are supported
      transactionSupportCache = true;
      return true;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    // If we can't even start a session, assume no support
    logger.warn('Could not determine transaction support', { error: error.message });
    transactionSupportCache = false;
    return false;
  }
};

/**
 * Execute a function within a transaction if supported, otherwise execute without
 * @param {Function} fn - Async function that receives a session object (null if no transactions)
 * @returns {Promise} - Result of the function execution
 */
const withTransaction = async (fn) => {
  const hasTransactionSupport = await supportsTransactions();
  
  if (!hasTransactionSupport) {
    // Run without transaction - pass null as session
    return await fn(null);
  }

  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    // If error is about replica set, retry without transaction
    if (error.message && error.message.includes('replica set')) {
      logger.warn('Transaction failed due to replica set requirement. Retrying without transaction.');
      transactionSupportCache = false;
      return await fn(null);
    }
    
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    await session.endSession();
  }
};

module.exports = {
  supportsTransactions,
  withTransaction,
};

