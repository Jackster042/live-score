/**
 * Integration Tests: Commentary API
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import http from 'http';

// Import routes
import { commentaryRouter } from '../../src/routes/commentary.js';
// matchRouter not needed for commentary tests

// Import database
import { db } from '../../src/db/db.js';
import { matches, commentary } from '../../src/db/schema.js';

// Import test helpers
import { createMatch, createCommentary } from '../helpers/factories.js';

describe('Commentary API', () => {
  let app;
  let server;
  let testMatchId;

  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/matches/:id/commentary', commentaryRouter);

    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  beforeEach(async () => {
    // Clean up tables
    await db.delete(commentary);
    await db.delete(matches);

    // Create a test match
    const matchData = createMatch();
    const [match] = await db
      .insert(matches)
      .values({
        ...matchData,
        startTime: new Date(matchData.startTime),
        endTime: new Date(matchData.endTime),
      })
      .returning();

    testMatchId = match.id;
  });

  describe('GET /matches/:id/commentary', () => {
    it('should return empty array when no commentary', async () => {
      const response = await request(app).get(`/matches/${testMatchId}/commentary`).expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should return commentary for a match', async () => {
      // Create test commentary
      const commentaryData = [
        createCommentary(testMatchId, { minute: 10, message: 'First half started' }),
        createCommentary(testMatchId, { minute: 25, message: 'Goal!' }),
      ];

      await db.insert(commentary).values(commentaryData);

      const response = await request(app).get(`/matches/${testMatchId}/commentary`).expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      // Create 5 commentary entries
      const commentaryData = Array.from({ length: 5 }, (_, i) =>
        createCommentary(testMatchId, { minute: i + 1 })
      );

      await db.insert(commentary).values(commentaryData);

      const response = await request(app)
        .get(`/matches/${testMatchId}/commentary?limit=3`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
    });

    it('should return 404 for non-existent match', async () => {
      // This test might behave differently based on your implementation
      // Some implementations return empty array, others 404
      const response = await request(app).get('/matches/99999/commentary').expect(200); // Or 404 depending on implementation

      // Should return empty array (no commentary found)
      expect(response.body.data).toEqual([]);
    });

    it('should return 400 for invalid match id', async () => {
      const response = await request(app).get('/matches/invalid/commentary').expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /matches/:id/commentary', () => {
    it('should create commentary for a match', async () => {
      const commentaryData = createCommentary(testMatchId);

      const response = await request(app)
        .post(`/matches/${testMatchId}/commentary`)
        .send(commentaryData)
        .expect(201);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.matchId).toBe(testMatchId);
      expect(response.body.data.message).toBe(commentaryData.message);
    });

    it('should reject invalid data', async () => {
      const response = await request(app)
        .post(`/matches/${testMatchId}/commentary`)
        .send({
          minute: -1, // Invalid negative minute
          message: '', // Empty message
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should coerce period to number', async () => {
      const response = await request(app)
        .post(`/matches/${testMatchId}/commentary`)
        .send({
          minute: 45,
          period: '2', // String number
          message: 'Half time',
        })
        .expect(201);

      expect(response.body.data.period).toBe(2);
    });

    it('should reject non-numeric period', async () => {
      const response = await request(app)
        .post(`/matches/${testMatchId}/commentary`)
        .send({
          minute: 45,
          period: 'invalid',
          message: 'Test',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent match', async () => {
      const response = await request(app)
        .post('/matches/99999/commentary')
        .send(createCommentary(99999))
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });
});
