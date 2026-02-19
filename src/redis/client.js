/**
 * Redis Client
 * 
 * Provides connection management and utilities for Redis operations.
 * Uses ioredis for robust connection handling and cluster support.
 */

import Redis from 'ioredis';
import { redisUrl } from '../config/index.js';

// Redis client instance
let redis = null;
let subscriber = null;

/**
 * Creates a new Redis client with standard configuration
 * @param {Object} options - Additional ioredis options
 * @returns {Redis}
 */
function createClient(options = {}) {
  const client = new Redis(redisUrl, {
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
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

  client.on('error', (err) => {
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
export async function initRedis() {
  if (redis) {
    return { redis, subscriber };
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
    new Promise((resolve) => redis.once('ready', resolve)),
    new Promise((resolve) => subscriber.once('ready', resolve)),
  ]);

  console.log('✅ Redis initialized\n');
  return { redis, subscriber };
}

/**
 * Get the main Redis client
 * @returns {Redis}
 */
export function getRedis() {
  if (!redis) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redis;
}

/**
 * Get the subscriber Redis client
 * @returns {Redis}
 */
export function getSubscriber() {
  if (!subscriber) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return subscriber;
}

/**
 * Close Redis connections gracefully
 */
export async function closeRedis() {
  console.log('\n🔌 Closing Redis connections...');
  
  const promises = [];
  
  if (redis) {
    promises.push(redis.quit());
    redis = null;
  }
  
  if (subscriber) {
    promises.push(subscriber.quit());
    subscriber = null;
  }
  
  await Promise.all(promises);
  console.log('✅ Redis connections closed');
}

/**
 * Publish a message to a Redis channel
 * @param {string} channel - Channel name
 * @param {Object} message - Message to publish (will be JSON stringified)
 */
export async function publish(channel, message) {
  const client = getRedis();
  await client.publish(channel, JSON.stringify(message));
}

/**
 * Subscribe to a Redis channel
 * @param {string} channel - Channel name or pattern
 * @param {Function} handler - Message handler (channel, message) => void
 * @param {boolean} pattern - Whether to use psubscribe for pattern matching
 */
export function subscribe(channel, handler, pattern = false) {
  const sub = getSubscriber();
  
  const messageHandler = (receivedChannel, message) => {
    try {
      const parsed = JSON.parse(message);
      handler(receivedChannel, parsed);
    } catch (err) {
      console.error('Failed to parse Redis message:', err);
      handler(receivedChannel, message);
    }
  };

  if (pattern) {
    sub.psubscribe(channel);
    sub.on('pmessage', (pattern, receivedChannel, message) => {
      messageHandler(receivedChannel, message);
    });
  } else {
    sub.subscribe(channel);
    sub.on('message', messageHandler);
  }
}

/**
 * Unsubscribe from a Redis channel
 * @param {string} channel - Channel name or pattern
 * @param {boolean} pattern - Whether it was a pattern subscription
 */
export function unsubscribe(channel, pattern = false) {
  const sub = getSubscriber();
  
  if (pattern) {
    sub.punsubscribe(channel);
  } else {
    sub.unsubscribe(channel);
  }
}

/**
 * Cache a value with optional TTL
 * @param {string} key - Cache key
 * @param {Object} value - Value to cache
 * @param {number} ttlSeconds - TTL in seconds (optional)
 */
export async function cacheSet(key, value, ttlSeconds = null) {
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
 * @param {string} key - Cache key
 * @returns {Object|null} Parsed value or null if not found
 */
export async function cacheGet(key) {
  const client = getRedis();
  const value = await client.get(key);
  
  if (!value) return null;
  
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Delete a cached value
 * @param {string} key - Cache key
 */
export async function cacheDel(key) {
  const client = getRedis();
  await client.del(key);
}

/**
 * Health check for Redis
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  try {
    const client = getRedis();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
