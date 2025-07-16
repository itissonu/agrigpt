const winston = require('winston');
const { combine, timestamp, json, printf } = winston.format;

// Custom format to include request metadata
const customFormat = printf(({ level, message, timestamp, ...metadata }) => {
  return JSON.stringify({
    timestamp,
    level,
    message,
    metadata,
  });
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    json(),
    customFormat
  ),
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5, // Keep last 5 log files
      tailable: true,
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true,
    }),
    // Console transport for development
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        printf(({ level, message, timestamp, ...metadata }) => {
          return `[${timestamp}] ${level.toUpperCase()}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
        })
      ),
    }),
  ],
});

// Middleware to log incoming requests
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Request ${req.method} ${req.originalUrl}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      apiKey: req.headers['x-api-key'] || 'none',
    });
  });
  next();
};

module.exports = { logger, requestLogger };