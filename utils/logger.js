import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logsDir = path.resolve('logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(errors({ stack: true }), timestamp(), logFormat),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
  ],
  exceptionHandlers: [new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })],
});

logger.add(
  new winston.transports.Console({
    format: combine(timestamp(), logFormat),
  })
);

export default logger;
