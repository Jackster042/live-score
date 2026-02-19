/**
 * Redis Client
 *
 * Provides connection management and utilities for Redis operations.
 * Uses ioredis for robust connection handling and cluster support.
 */

import { Redis } from 'ioredis';
import { redisUrl } from '../config/index.js';

// Redis client instance
let redis: InstanceType<typeof Redis> | null = null;
let subscriber: InstanceType<typeof Redis> | null = null;

/**
 * Creates a new Redis client with standard configuration
 */
function createClient(options: Partial<RedisOptions> = {}): InstanceType<typeof Redis> {
  const client = new Redis(redisUrl, {
    retryStrategy: (times: number) => {
      const delay = Math.min((times as number) * 50, 2000);
      console.log(`   Redis reconnecting... attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    ...options,
  });

  client.on('connect', () => {
    console.log('   Redis: Connected');
  });

  client.on('ready', () => {
    console.log('   Redis: Ready');
  });

  client.on('error', (err: Error) => {
    console.error('   Redis Error:', err.message);
  });

  client.on('reconnecting', () => {
    console.log('   Redis: Reconnecting...');
  });

  client.on('end', () => {
    console.log('   Redis: Connection closed');
  });

  return client;
}

/**
 * Initialize Redis connections
 * Must be called before using Redis
 */
export async function initRedis(): Promise<{ redis: Redis; subscriber: Redis }> {
  if (redis) {
    return { redis, subscriber: subscriber! };
  }

  console.log('🔌 Initializing Redis...');

  // Main Redis client for commands
  redis = createClient();

  // Separate subscriber client for pub/sub
  // Redis requires separate connections for pub/sub and commands
  subscriber = createClient({
    // Subscriber doesn't need offline queue - it should receive messages immediately
    enableOfflineQueue: false,
  });

  // Wait for both to be ready
  await Promise.all([
    new Promise<void>(resolve => redis!.once('ready', resolve)),
    new Promise<void>(resolve => subscriber!.once('ready', resolve)),
  ]);

  console.log('✅ Redis initialized\n');
  return { redis, subscriber };
}

/**
 * Get the main Redis client
 */
export function getRedis(): InstanceType<typeof Redis> {
  if (!redis) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redis;
}

/**
 * Get the subscriber Redis client
 */
export function getSubscriber(): InstanceType<typeof Redis> {
  if (!subscriber) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return subscriber;
}

/**
 * Close Redis connections gracefully
 */
export async function closeRedis(): Promise<void> {
  console.log('\n🔌 Closing Redis connections...');

  const promises: Promise<void>[] = [];

  if (redis) {
    promises.push(redis.quit().then(() => {}));
    redis = null;
  }

  if (subscriber) {
    promises.push(subscriber.quit().then(() => {}));
    subscriber = null;
  }

  await Promise.all(promises);
  console.log('✅ Redis connections closed');
}

/**
 * Publish a message to a Redis channel
 */
export async function publish(channel: string, message: unknown): Promise<void> {
  const client = getRedis();
  await client.publish(channel, JSON.stringify(message));
}

/**
 * Subscribe to a Redis channel
 */
export function subscribe(
  channel: string,
  handler: (receivedChannel: string, message: unknown) => void,
  pattern = false
): void {
  const sub = getSubscriber();

  const messageHandler = (receivedChannel: string, message: string) => {
    try {
      const parsed = JSON.parse(message);
      handler(receivedChannel, parsed);
    } catch (err) {
      console.error('Failed to parse Redis message:', err);
      handler(receivedChannel, message);
    }
  };

  if (pattern) {
    void sub.psubscribe(channel);
    sub.on('pmessage', (_pattern: string, receivedChannel: string, message: string) => {
      messageHandler(receivedChannel, message);
    });
  } else {
    void sub.subscribe(channel);
    sub.on('message', messageHandler);
  }
}

/**
 * Unsubscribe from a Redis channel
 */
export function unsubscribe(channel: string, pattern = false): void {
  const sub = getSubscriber();

  if (pattern) {
    void sub.punsubscribe(channel);
  } else {
    void sub.unsubscribe(channel);
  }
}

/**
 * Cache a value with optional TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number | null = null
): Promise<void> {
  const client = getRedis();
  const serialized = JSON.stringify(value);

  if (ttlSeconds) {
    await client.setex(key, ttlSeconds, serialized);
  } else {
    await client.set(key, serialized);
  }
}

/**
 * Get a cached value
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  const value = await client.get(key);

  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * Delete a cached value
 */
export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  await client.del(key);
}

/**
 * Health check for Redis
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const client = getRedis();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

// Type import for Redis options
import type { RedisOptions } from 'ioredis';
