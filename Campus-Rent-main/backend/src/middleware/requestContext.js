import * as Sentry from '@sentry/node';
import logger, { generateRequestId } from '../utils/logger.js';

const requestContext = (req, res, next) => {
  const requestId = generateRequestId();
  req.requestId = requestId;
  req.log = logger.child({ requestId });
  res.setHeader('X-Request-Id', requestId);

  // Set route/method tags on Sentry scope once the request is matched
  res.on('finish', () => {
    Sentry.setTag('request_id', requestId);
    Sentry.setTag('method', req.method);
    Sentry.setTag('status_code', String(res.statusCode));
    if (req.route?.path) {
      Sentry.setTag('route', req.route.path);
      Sentry.setTag('route_pattern', req.method + ' ' + req.route.path);
    }
  });

  next();
};

export default requestContext;
