import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import listingRoutes from './routes/listingRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import { corsOptions } from './config/cors.js';
import { helmetConfig } from './config/helmet.js';
import Sentry, { initSentry } from './config/sentry.js';
import requestContext from './middleware/requestContext.js';
import errorMiddleware, { notFoundHandler } from './middleware/errorMiddleware.js';
import logger from './utils/logger.js';
import prisma from './utils/prismaClient.js';
import apiSpec from './config/swagger.js';

console.log('[STARTUP] Step 0: app.js module loaded (all imports complete)');

// Initialize Sentry (safe no-op if DSN not configured)
initSentry();
console.log('[STARTUP] Step 0b: initSentry() completed');

const app = express();

// --- Middleware chain ---

// 1. Security headers (Helmet) — must be before CORS for preflight compatibility
app.use(helmetConfig);

// 2. CORS
app.use(cors(corsOptions));

// 3. Body parsing
app.use(express.json());

// 3. Request correlation ID (must be early so all downstream logs include requestId)
app.use(requestContext);

// 4. HTTP request logging (pino-http)
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health',
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
    customErrorMessage: (req, res, err) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
  })
);

// --- Routes ---

// Swagger API documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(apiSpec, {
  customSiteTitle: 'CampusRent API Docs',
  customfavIcon: undefined,
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
  }
}));

// Health check (before API routes, excluded from autoLogging above)
app.get('/health', async (req, res) => {
  const start = Date.now();
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }
  const uptime = process.uptime();

  res.status(200).json({
    status: 'ok',
    uptime,
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
  });

  req.log?.info({ uptime, dbStatus, duration: Date.now() - start }, 'Health check completed');
});

// API routes
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/payments', paymentRoutes);

// --- Error handling (must be last) ---

// Sentry Express error handler — catches unhandled errors from async route handlers
Sentry.setupExpressErrorHandler(app);

// Global error handler
app.use(errorMiddleware);

// 404 handler for unknown routes (must be after all error handlers)
app.use(notFoundHandler);

export default app;
