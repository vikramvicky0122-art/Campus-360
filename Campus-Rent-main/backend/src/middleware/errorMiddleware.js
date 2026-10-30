import * as Sentry from '@sentry/node';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

const errorMiddleware = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req?.requestId || 'unknown';

  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const message = isOperational
    ? err.message
    : isProduction
      ? 'Internal server error.'
      : err.message || 'Internal server error.';

  // Capture 5xx errors in Sentry with enriched context
  if (statusCode >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag('request_id', requestId);
      scope.setTag('is_operational', String(isOperational));
      scope.setTag('status_code', String(statusCode));
      if (req?.user?.id) {
        scope.setUser({ id: req.user.id });
      }
      if (req?.method) {
        scope.setTag('method', req.method);
      }
      if (req?.url) {
        scope.setTag('url', req.url);
      }
      scope.setLevel('error');
      Sentry.captureException(err);
    });
  }

  const logFn = statusCode >= 500 ? 'error' : 'warn';
  logger[logFn](
    {
      err,
      requestId,
      statusCode,
      isOperational,
      ...(req?.method ? { method: req.method, url: req.url } : {}),
    },
    `[${requestId}] ${err.message || 'Unknown error'}`
  );

  const body = {
    success: false,
    message,
    ...(err.details ? { errors: err.details } : {}),
    requestId,
  };

  if (!isProduction && err.stack) {
    body.stack = err.stack.split('\n').slice(0, 6).join('\n');
  }

  res.status(statusCode).json(body);
};

export const notFoundHandler = (req, res) => {
  const requestId = req?.requestId || 'unknown';
  logger.warn({ requestId, method: req.method, url: req.url }, `[${requestId}] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
    requestId,
  });
};

export default errorMiddleware;
