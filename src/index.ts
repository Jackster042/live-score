import AgentAPI from 'apminsight';
AgentAPI.config();

import express from 'express';
import http from 'http';

import { config, port, host } from './config/index.js';
import { initRedis, closeRedis, healthCheck as redisHealthCheck } from './redis/client.js';
import { closeQueues } from './jobs/queue.js';
import { attachWebSocketServer } from './ws/server.js';
import { securityMiddleware } from './arcjet.js';

import { matchRouter } from './routes/matches.js';
import { commentaryRouter } from './routes/commentary.js';

console.log('🔧 Starting Live Score API...');
console.log(`   Environment: ${config.nodeEnv}`);
console.log(`   Port: ${port}`);
console.log(`   Host: ${host}`);

const app = express();
const server = http.createServer(app);

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint - includes Redis status
app.get('/health', async (_req, res) => {
  const redisHealthy = await redisHealthCheck();

  const status = redisHealthy ? 200 : 503;
  const healthStatus = redisHealthy ? 'healthy' : 'degraded';

  res.status(status).json({
    status: healthStatus,
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '1.0.0',
    environment: config.nodeEnv,
    services: {
      api: 'healthy',
      redis: redisHealthy ? 'connected' : 'disconnected',
    },
  });
});

// Readiness check - for Kubernetes/Docker
app.get('/health/ready', async (_req, res) => {
  const redisHealthy = await redisHealthCheck();

  if (redisHealthy) {
    res.status(200).json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: 'redis_unavailable' });
  }
});

// Root route
app.get('/', (_req, res) => {
  res.json({
    name: 'Live Score API',
    version: process.env['npm_package_version'] || '1.0.0',
    environment: config.nodeEnv,
    features: ['websocket', 'redis_pubsub', 'horizontal_scaling'],
    documentation: '/health',
    websocket: '/ws',
    endpoints: {
      matches: '/matches',
      commentary: '/matches/:id/commentary',
    },
  });
});

// Arcjet Security Middleware
app.use(securityMiddleware());

// Routes
app.use('/api/matches', matchRouter);
app.use('/api/matches/:id/commentary', commentaryRouter);

// Initialize WebSocket server
const { broadcastMatchCreated, broadcastCommentary } = attachWebSocketServer(server);
app.locals['broadcastMatchCreated'] = broadcastMatchCreated;
app.locals['broadcastCommentary'] = broadcastCommentary;

// Initialize Redis and start server
async function startServer(): Promise<void> {
  try {
    // Initialize Redis connection
    await initRedis();

    // Start HTTP server
    server.listen(port, host, () => {
      const baseUrl = host === '0.0.0.0' ? `http://localhost:${port}` : `http://${host}:${port}`;
      console.log(`\n🚀 Live Score API is running!`);
      console.log(`   REST API: ${baseUrl}`);
      console.log(`   WebSocket: ${baseUrl.replace(/^http/, 'ws')}/ws`);
      console.log(`   Health Check: ${baseUrl}/health\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n👋 Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new connections
  server.close(() => {
    console.log('   HTTP server closed');
  });

  // Close job queues
  await closeQueues();

  // Close Redis connections
  await closeRedis();

  console.log('✅ Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// Start the server
void startServer();
