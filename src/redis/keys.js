/**
 * Redis Key Naming Convention
 * 
 * Centralizes all Redis key patterns for consistency
 * and easy refactoring.
 */

/**
 * WebSocket channel keys for pub/sub
 */
export const wsChannels = {
  /**
   * Channel for new match announcements
   * @returns {string}
   */
  matchCreated: () => 'ws:match:created',

  /**
   * Channel for match commentary updates
   * @param {number} matchId
   * @returns {string}
   */
  matchCommentary: (matchId) => `ws:match:${matchId}:commentary`,

  /**
   * Channel for match score updates
   * @param {number} matchId
   * @returns {string}
   */
  matchScore: (matchId) => `ws:match:${matchId}:score`,

  /**
   * Channel for match status changes
   * @param {number} matchId
   * @returns {string}
   */
  matchStatus: (matchId) => `ws:match:${matchId}:status`,
};

/**
 * Cache keys for API responses
 */
export const cacheKeys = {
  /**
   * Cached match list
   * @param {string} filter - Optional filter identifier
   * @returns {string}
   */
  matchList: (filter = 'default') => `cache:matches:list:${filter}`,

  /**
   * Cached single match
   * @param {number} matchId
   * @returns {string}
   */
  match: (matchId) => `cache:match:${matchId}`,

  /**
   * Cached commentary list
   * @param {number} matchId
   * @returns {string}
   */
  commentary: (matchId) => `cache:commentary:${matchId}`,
};

/**
 * Job queue keys for BullMQ
 */
export const queueKeys = {
  /**
   * Main job queue
   * @returns {string}
   */
  main: () => 'queue:main',

  /**
   * Job queue for match status transitions
   * @returns {string}
   */
  matchStatus: () => 'queue:match:status',

  /**
   * Job queue for cleanup tasks
   * @returns {string}
   */
  cleanup: () => 'queue:cleanup',
};

/**
 * Rate limiting keys
 */
export const rateLimitKeys = {
  /**
   * Rate limit counter for IP
   * @param {string} ip
   * @param {string} endpoint
   * @returns {string}
   */
  ipEndpoint: (ip, endpoint) => `ratelimit:${ip}:${endpoint}`,
};
