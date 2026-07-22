import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

export const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let error = err;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for ${err.path}: ${err.value}`);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    error = ApiError.conflict(`Duplicate value for field: ${field}`);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest('Validation failed', details);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  if (!(error instanceof ApiError)) {
    error = new ApiError(err.statusCode || 500, err.message || 'Internal server error', null, false);
  }

  if (!error.isOperational || error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} - ${error.stack || error.message}`);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${error.message}`);
  }

  const response = {
    success: false,
    message: error.isOperational ? error.message : 'Internal server error',
  };

  if (error.details) response.details = error.details;
  if (process.env.NODE_ENV !== 'production' && !error.isOperational) {
    response.stack = err.stack;
  }

  res.status(error.statusCode || 500).json(response);
};
