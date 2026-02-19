/**
 * BullMQ Worker
 *
 * Processes background jobs from queues.
 * Run this in a separate process/container.
 */

import { Worker, type Job } from 'bullmq';
import { redisUrl } from '../config/index.js';
import { queueKeys } from '../redis/keys.js';
import { matchStatusProcessors } from './processors/match-status.js';

// Worker instances
let workers: Worker[] = [];

/**
 * Create a worker for a queue
 */
function createWorker<T>(
  queueName: string,
  processors: Record<string, (job: Job<T>) => Promise<unknown>>,
  opts: Record<string, unknown> = {}
): Worker {
  const connection = { url: redisUrl };

  const worker = new Worker(
    queueName,
    async (job: Job<T>) => {
      const processor = processors[job.name];

      if (!processor) {
        console.error(`   ❌ No processor found for job: ${job.name}`);
        throw new Error(`Unknown job type: ${job.name}`);
      }

      console.log(`   📦 Processing job: ${job.name} (ID: ${job.id})`);
      const startTime = Date.now();

      try {
        const result = await processor(job);
        const duration = Date.now() - startTime;
        console.log(`   ✅ Job completed: ${job.name} (${duration}ms)`);
        return result;
      } catch (err) {
        const duration = Date.now() - startTime;
        console.error(`   ❌ Job failed: ${job.name} (${duration}ms)`, (err as Error).message);
        throw err;
      }
    },
    {
      connection,
      concurrency: 10, // Process up to 10 jobs concurrently
      ...opts,
    }
  );

  // Event handlers
  worker.on('completed', () => {
    // Job completed successfully (already logged in processor)
  });

  worker.on('failed', (job: Job<T> | undefined, err: Error) => {
    console.error(`   💥 Job ${job?.name} (ID: ${job?.id}) failed:`, err.message);
  });

  worker.on('error', (err: Error) => {
    console.error('   Worker error:', err);
  });

  worker.on('stalled', (jobId: string) => {
    console.warn(`   ⚠️ Job stalled: ${jobId}`);
  });

  return worker;
}

/**
 * Initialize all workers
 */
export function initWorkers(): Worker[] {
  if (workers.length > 0) {
    return workers;
  }

  console.log('👷 Initializing BullMQ workers...');

  // Worker for match status transitions
  const matchStatusWorker = createWorker(queueKeys.matchStatus(), matchStatusProcessors, {
    concurrency: 5, // Status updates don't need high concurrency
  });

  workers.push(matchStatusWorker);

  console.log(`   Workers initialized: ${workers.length}`);

  return workers;
}

/**
 * Get all worker instances
 */
export function getWorkers(): Worker[] {
  return workers;
}

/**
 * Close all workers gracefully
 */
export async function closeWorkers(): Promise<void> {
  console.log('\n👷 Closing BullMQ workers...');

  await Promise.all(workers.map(w => w.close()));
  workers = [];

  console.log('   Workers closed');
}
