import * as Sentry from '@sentry/node';
import prisma from '../utils/prismaClient.js';
import logger from '../utils/logger.js';

const dsn = process.env.SENTRY_DSN;
const isProd = process.env.NODE_ENV === 'production';
const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

export const initSentry = () => {
  if (!dsn && !isProd) {
    logger.debug('Sentry DSN not configured - skipping initialization.');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    enabled: Boolean(dsn),
    tracesSampleRate: isProd ? 0.1 : 0.0,
    integrations: [
      Sentry.prismaIntegration({ client: prisma }),
      Sentry.expressIntegration(),
    ],
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
        delete event.request.headers['x-api-key'];
      }
      if (event.user) {
        event.user = { id: event.user.id };
      }
      if (event.request?.data) {
        delete event.request.data;
      }
      return event;
    },
    denyUrls: [
      /\/health/,
    ],
  });

  logger.info({ environment, dsnConfigured: Boolean(dsn) }, 'Sentry initialized');
};

export const captureError = (error, context = {}) => {
  if (!dsn) return;

  Sentry.withScope((scope) => {
    if (context.userId) {
      scope.setUser({ id: context.userId });
    }
    if (context.requestId) {
      scope.setTag('request_id', context.requestId);
    }
    if (context.route) {
      scope.setTag('route', context.route);
    }
    if (context.method) {
      scope.setTag('method', context.method);
    }
    if (context.isOperational !== undefined) {
      scope.setTag('is_operational', String(context.isOperational));
    }
    if (context.statusCode) {
      scope.setTag('status_code', String(context.statusCode));
    }
    scope.setLevel('error');
    Sentry.captureException(error);
  });
};

export default Sentry;
