/**
 * BullMQ Queue Configuration
 *
 * Defines job queues and their settings.
 * Each queue handles different types of background jobs.
 */

import { Queue, type Job } from 'bullmq';
import { redisUrl } from '../config/index.js';
import { queueKeys } from '../redis/keys.js';

// Queue instances
let mainQueue: Queue | null = null;
let matchStatusQueue: Queue | null = null;

/**
 * Default job options
 */
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  removeOnComplete: {
    age: 24 * 3600, // Keep completed jobs for 24 hours
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    count: 5000, // Keep last 5000 failed jobs
  },
};

/**
 * Initialize all job queues
 */
export function initQueues(): { mainQueue: Queue; matchStatusQueue: Queue } {
  if (mainQueue) {
    return { mainQueue, matchStatusQueue: matchStatusQueue! };
  }

  const connection = {
    url: redisUrl,
  };

  // Main job queue for general background tasks
  mainQueue = new Queue(queueKeys.main(), {
    connection,
    defaultJobOptions,
  });

  // Dedicated queue for match status transitions
  // Separate queue allows independent scaling and prioritization
  matchStatusQueue = new Queue(queueKeys.matchStatus(), {
    connection,
    defaultJobOptions: {
      ...defaultJobOptions,
      priority: 10, // Higher priority for time-sensitive status updates
    },
  });

  console.log('   BullMQ: Queues initialized');

  return { mainQueue, matchStatusQueue };
}

/**
 * Get the main job queue
 */
export function getMainQueue(): Queue {
  if (!mainQueue) {
    throw new Error('Queues not initialized. Call initQueues() first.');
  }
  return mainQueue;
}

/**
 * Get the match status job queue
 */
export function getMatchStatusQueue(): Queue {
  if (!matchStatusQueue) {
    throw new Error('Queues not initialized. Call initQueues() first.');
  }
  return matchStatusQueue;
}

/**
 * Close all queues gracefully
 */
export async function closeQueues(): Promise<void> {
  const promises: Promise<void>[] = [];

  if (mainQueue) {
    promises.push(mainQueue.close());
    mainQueue = null;
  }

  if (matchStatusQueue) {
    promises.push(matchStatusQueue.close());
    matchStatusQueue = null;
  }

  await Promise.all(promises);
  console.log('   BullMQ: Queues closed');
}

/**
 * Add a job to the main queue
 */
export async function addMainJob<T>(
  name: string,
  data: T,
  opts: Record<string, unknown> = {}
): Promise<Job<T>> {
  const queue = getMainQueue();
  return queue.add(name, data, opts);
}

/**
 * Add a job to the match status queue
 */
export async function addMatchStatusJob<T>(
  name: string,
  data: T,
  opts: Record<string, unknown> = {}
): Promise<Job<T>> {
  const queue = getMatchStatusQueue();
  return queue.add(name, data, opts);
}

/**
 * Schedule match status transition jobs
 */
export async function scheduleMatchStatusJobs(
  matchId: number,
  startTime: Date,
  endTime: Date
): Promise<void> {
  const now = new Date();

  // Schedule transition to 'live' at startTime
  if (startTime > now) {
    const delay = startTime.getTime() - now.getTime();
    await addMatchStatusJob(
      'match:transition-to-live',
      { matchId, fromStatus: 'scheduled', toStatus: 'live' },
      { delay, jobId: `match:${matchId}:start` }
    );
    console.log(
      `   Scheduled: Match ${matchId} → live at ${startTime.toISOString()} (in ${Math.round(delay / 1000)}s)`
    );
  }

  // Schedule transition to 'finished' at endTime
  if (endTime > now) {
    const delay = endTime.getTime() - now.getTime();
    await addMatchStatusJob(
      'match:transition-to-finished',
      { matchId, fromStatus: 'live', toStatus: 'finished' },
      { delay, jobId: `match:${matchId}:end` }
    );
    console.log(
      `   Scheduled: Match ${matchId} → finished at ${endTime.toISOString()} (in ${Math.round(delay / 1000)}s)`
    );
  }
}

/**
 * Cancel scheduled status jobs for a match
 */
export async function cancelMatchStatusJobs(matchId: number): Promise<void> {
  const queue = getMatchStatusQueue();

  // Remove scheduled start job
  await queue.remove(`match:${matchId}:start`);

  // Remove scheduled end job
  await queue.remove(`match:${matchId}:end`);

  console.log(`   Cancelled status jobs for match ${matchId}`);
}
