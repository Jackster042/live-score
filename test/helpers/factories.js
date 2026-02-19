/**
 * Test Data Factories
 * 
 * Generate realistic test data using Faker.js.
 * Provides consistent, randomized data for tests.
 */

import { faker } from '@faker-js/faker';

/**
 * Generate a fake match
 * @param {Object} overrides - Override any generated values
 * @returns {Object}
 */
export function createMatch(overrides = {}) {
  const now = new Date();
  const startTime = new Date(now.getTime() + faker.number.int({ min: 1, max: 60 }) * 60000);
  const endTime = new Date(startTime.getTime() + faker.number.int({ min: 90, max: 180 }) * 60000);
  
  return {
    sport: faker.helpers.arrayElement(['soccer', 'basketball', 'tennis', 'baseball']),
    homeTeam: faker.company.name() + ' FC',
    awayTeam: faker.company.name() + ' FC',
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    homeScore: faker.number.int({ min: 0, max: 5 }),
    awayScore: faker.number.int({ min: 0, max: 5 }),
    ...overrides,
  };
}

/**
 * Generate a fake match with specific status
 * @param {string} status - 'scheduled', 'live', or 'finished'
 * @param {Object} overrides - Override any generated values
 * @returns {Object}
 */
export function createMatchWithStatus(status, overrides = {}) {
  const now = new Date();
  
  let startTime, endTime;
  
  switch (status) {
    case 'scheduled':
      startTime = new Date(now.getTime() + 3600000); // 1 hour from now
      endTime = new Date(startTime.getTime() + 7200000); // 2 hours after start
      break;
    case 'live':
      startTime = new Date(now.getTime() - 3600000); // 1 hour ago
      endTime = new Date(now.getTime() + 3600000); // 1 hour from now
      break;
    case 'finished':
      startTime = new Date(now.getTime() - 7200000); // 2 hours ago
      endTime = new Date(now.getTime() - 3600000); // 1 hour ago
      break;
    default:
      throw new Error(`Unknown status: ${status}`);
  }
  
  return createMatch({
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    ...overrides,
  });
}

/**
 * Generate a fake commentary entry
 * @param {number} matchId - Match ID
 * @param {Object} overrides - Override any generated values
 * @returns {Object}
 */
export function createCommentary(matchId, overrides = {}) {
  return {
    matchId,
    minute: faker.number.int({ min: 1, max: 90 }),
    sequence: faker.number.int({ min: 1, max: 100 }),
    period: faker.number.int({ min: 1, max: 2 }),
    eventType: faker.helpers.arrayElement(['goal', 'card', 'substitution', 'commentary']),
    actor: faker.person.fullName(),
    team: faker.helpers.arrayElement(['home', 'away']),
    message: faker.lorem.sentence(),
    metadata: {},
    tags: [],
    ...overrides,
  };
}

/**
 * Generate multiple items
 * @param {Function} factory - Factory function
 * @param {number} count - Number to generate
 * @param {Object} overrides - Default overrides
 * @returns {Array}
 */
export function createMany(factory, count, overrides = {}) {
  return Array.from({ length: count }, (_, i) => factory({
    ...overrides,
    // Add index to ensure unique values if needed
    ...overrides._index && { id: i + 1 },
  }));
}
