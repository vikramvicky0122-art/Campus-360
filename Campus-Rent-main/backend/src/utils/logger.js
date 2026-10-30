import pino from 'pino';
import { randomUUID } from 'crypto';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

const logger = pino({
  level: logLevel,
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino/file',
          options: { destination: 1 },
        },
      }),
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.requestId,
      headers: req.headers
        ? {
            'content-type': req.headers['content-type'],
            'user-agent': req.headers['user-agent'],
            'x-forwarded-for': req.headers['x-forwarded-for'],
          }
        : undefined,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      requestId: res.requestId,
    }),
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'authorization',
      'Authorization',
      'secret',
      'JWT_SECRET',
      'jwt',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
});

export const generateRequestId = () => `req_${randomUUID().slice(0, 8)}`;

export default logger;
