import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import dotenv from 'dotenv';
import { corsOptions } from './config/cors.js';
import { socketAuth } from './socket/auth.js';
import { registerSocketHandlers } from './socket/handler.js';
import logger from './utils/logger.js';

console.log('[STARTUP] Step 1: server.js loaded (all imports complete)');

// Load environment variables
dotenv.config();
console.log('[STARTUP] Step 2: dotenv.config() completed');

const PORT = process.env.PORT || 5000;
console.log('[STARTUP] Step 3: PORT =', PORT);

console.log('[STARTUP] Step 4: calling createServer(app)');
const httpServer = createServer(app);
console.log('[STARTUP] Step 5: createServer completed');

console.log('[STARTUP] Step 6: initializing Socket.IO');
try {
  const io = new Server(httpServer, {
    cors: corsOptions,
    transports: ['websocket', 'polling']
  });
  console.log('[STARTUP] Step 7: Socket.IO initialized');

  // Apply JWT authentication middleware to all socket connections
  io.use(socketAuth);
  console.log('[STARTUP] Step 7b: socketAuth middleware applied');

  // Register all socket event handlers
  registerSocketHandlers(io);
  console.log('[STARTUP] Step 8: socket handlers registered');

  // Make io accessible to other modules (for emitting from REST handlers)
  app.set('io', io);
  console.log('[STARTUP] Step 8b: io attached to app');

  console.log('[STARTUP] Step 9: about to call listen(PORT =', PORT, ')');
  httpServer.listen(PORT, () => {
    console.log('[STARTUP] Step 10: listen CALLBACK EXECUTED - server is listening');
    logger.info({ port: PORT }, `Server is running on port ${PORT}`);
  });
  console.log('[STARTUP] Step 9b: listen() call returned (non-blocking)');
} catch (err) {
  console.log('[STARTUP] ERROR caught during startup:', err.message);
  console.log('[STARTUP] ERROR stack:', err.stack);
  throw err;
}
