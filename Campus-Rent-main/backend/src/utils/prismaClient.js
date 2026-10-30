import { PrismaClient } from '@prisma/client';
import logger from './logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const SLOW_QUERY_THRESHOLD_MS = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;

/**
 * Prisma Client with structured logging.
 *
 * - Logs all queries (development) or only warn+error (production)
 * - Flags slow queries exceeding SLOW_QUERY_THRESHOLD_MS (default 500ms)
 * - Never logs bind parameters (to avoid leaking sensitive data)
 */
const prisma = global.prisma || new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' },
  ],
});

// Query-level logging
prisma.$on('query', (e) => {
  if (e.duration >= SLOW_QUERY_THRESHOLD_MS) {
    logger.warn(
      { duration: e.duration, query: e.query },
      `SLOW QUERY (${e.duration}ms): ${e.query}`
    );
  } else if (!isProduction) {
    logger.debug(
      { duration: e.duration, query: e.query },
      `Query (${e.duration}ms)`
    );
  }
});

prisma.$on('info', (e) => {
  logger.info({ prisma: true }, e.message);
});

prisma.$on('warn', (e) => {
  logger.warn({ prisma: true }, e.message);
});

prisma.$on('error', (e) => {
  logger.error({ prisma: true }, e.message);
});

// Prevent multiple instances in development
if (!isProduction) {
  global.prisma = prisma;
}

export default prisma;

