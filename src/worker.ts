/**
 * Background Worker Entry Point
 *
 * This worker processes background jobs using BullMQ.
 * Run this file to start the worker process.
 */

import { config } from './config/index.js';
import { initRedis, closeRedis } from './redis/client.js';
import { initQueues } from './jobs/queue.js';
import { initWorkers, closeWorkers } from './jobs/worker.js';

console.log('🔧 Starting Live Score Worker...');
console.log(`   Environment: ${config.nodeEnv}`);
console.log(`   Redis: ${config.redisUrl.replace(/:\/\/.*@/, '://***@')}`);

// Initialize services
async function startWorker(): Promise<void> {
  try {
    // Initialize Redis (required for BullMQ)
    await initRedis();

    // Initialize job queues
    initQueues();

    // Start workers
    initWorkers();

    console.log('\n✅ Worker is running and processing jobs...\n');
  } catch (err) {
    console.error('❌ Failed to start worker:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n👋 Worker received ${signal}. Shutting down gracefully...`);

  // Close workers (finish current jobs)
  await closeWorkers();

  // Close Redis connections
  await closeRedis();

  console.log('✅ Worker shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

// Start the worker
void startWorker();

// Keep process alive
setInterval(() => {
  // Heartbeat - process is alive
}, 5000);
