/**
 * Integration Tests: Matches API
 * 
 * These tests use supertest to make HTTP requests to the API.
 * Requires database connection.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import http from 'http';

// Import routes
import { matchRouter } from '../../src/routes/matches.js';

// Import database
import { db, pool } from '../../src/db/db.js';
import { matches } from '../../src/db/schema.js';

// Import test helpers
import { createMatch, createMatchWithStatus } from '../helpers/factories.js';

describe('Matches API', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use('/matches', matchRouter);
    
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, resolve));
  });
  
  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    // Note: We don't close the pool here as it may be used by other tests
  });
  
  beforeEach(async () => {
    // Clean up matches table before each test
    await db.delete(matches);
  });
  
  describe('GET /matches', () => {
    it('should return empty array when no matches', async () => {
      const response = await request(app)
        .get('/matches')
        .expect(200);
      
      expect(response.body.data).toEqual([]);
    });
    
    it('should return list of matches', async () => {
      // Create test matches
      const matchData1 = createMatch();
      const matchData2 = createMatch();
      
      await db.insert(matches).values([
        { ...matchData1, startTime: new Date(matchData1.startTime), endTime: new Date(matchData1.endTime) },
        { ...matchData2, startTime: new Date(matchData2.startTime), endTime: new Date(matchData2.endTime) },
      ]);
      
      const response = await request(app)
        .get('/matches')
        .expect(200);
      
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('sport');
    });
    
    it('should respect limit parameter', async () => {
      // Create 5 matches
      const matchData = Array.from({ length: 5 }, () => createMatch());
      await db.insert(matches).values(matchData.map(m => ({
        ...m,
        startTime: new Date(m.startTime),
        endTime: new Date(m.endTime),
      })));
      
      const response = await request(app)
        .get('/matches?limit=3')
        .expect(200);
      
      expect(response.body.data).toHaveLength(3);
    });
    
    it('should reject invalid limit', async () => {
      const response = await request(app)
        .get('/matches?limit=invalid')
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
  });
  
  describe('POST /matches', () => {
    it('should create a new match', async () => {
      const matchData = createMatch();
      
      const response = await request(app)
        .post('/matches')
        .send(matchData)
        .expect(201);
      
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.sport).toBe(matchData.sport);
      expect(response.body.data.homeTeam).toBe(matchData.homeTeam);
      expect(response.body.data.awayTeam).toBe(matchData.awayTeam);
    });
    
    it('should reject invalid data', async () => {
      const response = await request(app)
        .post('/matches')
        .send({
          sport: '', // Empty sport
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          startTime: '2026-02-19T18:00:00Z',
          endTime: '2026-02-19T20:00:00Z',
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should reject when endTime is before startTime', async () => {
      const response = await request(app)
        .post('/matches')
        .send({
          sport: 'soccer',
          homeTeam: 'Team A',
          awayTeam: 'Team B',
          startTime: '2026-02-19T20:00:00Z',
          endTime: '2026-02-19T18:00:00Z',
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('should set correct initial status', async () => {
      const matchData = createMatchWithStatus('scheduled');
      
      const response = await request(app)
        .post('/matches')
        .send(matchData)
        .expect(201);
      
      expect(response.body.data.status).toBe('scheduled');
    });
    
    it('should set default scores to 0', async () => {
      const matchData = createMatch();
      delete matchData.homeScore;
      delete matchData.awayScore;
      
      const response = await request(app)
        .post('/matches')
        .send(matchData)
        .expect(201);
      
      expect(response.body.data.homeScore).toBe(0);
      expect(response.body.data.awayScore).toBe(0);
    });
  });
});
