import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss-clean';

import routes from './routes/index.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import logger from './utils/logger.js';

const app = express();

app.set('trust proxy', 1);

// Security headers
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(',') || '*',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(compression());

// Sanitization against NoSQL injection and XSS
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Request logging
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Global rate limiting (route-specific limiters apply additionally where defined)
app.use('/api', generalLimiter);

// Maintenance mode gate
app.use(async (req, res, next) => {
  try {
    if (req.path === '/api/v1/health' || req.path.startsWith('/api/v1/auth')) return next();
    const { getSettings } = await import('./models/Setting.js');
    const settings = await getSettings();
    if (settings.maintenanceMode.enabled) {
      return res.status(503).json({ success: false, message: settings.maintenanceMode.message });
    }
    next();
  } catch (err) {
    next();
  }
});

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
