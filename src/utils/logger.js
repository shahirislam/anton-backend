const winston = require('winston');

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${stack || message}`;
  
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  
  return log;
});

const fs = require('fs');
const path = require('path');

// Ensure logs directory exists (only if not in production or if explicitly needed)
const logsDir = path.join(process.cwd(), 'logs');
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (error) {
    console.warn('Could not create logs directory:', error.message);
  }
}

const transports = [
  // Always add console transport for Render logs
  new winston.transports.Console({
  format: combine(
      colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    )
  })
];

// Only add file transports if logs directory exists or in development
if (fs.existsSync(logsDir) || process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'anton-api' },
  transports: transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      )
    }),
    ...(fs.existsSync(logsDir) ? [new winston.transports.File({ filename: 'logs/exceptions.log' })] : [])
  ],
  rejectionHandlers: [
    new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat
    )
    }),
    ...(fs.existsSync(logsDir) ? [new winston.transports.File({ filename: 'logs/rejections.log' })] : [])
  ],
});

module.exports = logger;

