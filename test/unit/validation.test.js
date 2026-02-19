/**
 * Unit Tests: Validation Schemas
 */

import { describe, it, expect } from 'vitest';
import { 
  createMatchSchema, 
  listMatchesQuerySchema,
  matchIdParamSchema,
  updateScoreSchema 
} from '../../src/validation/matches.js';
import { 
  createCommentarySchema, 
  listCommentaryQuerySchema 
} from '../../src/validation/commentary.js';

describe('createMatchSchema', () => {
  it('should validate valid match data', () => {
    const data = {
      sport: 'soccer',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: '2026-02-19T18:00:00Z',
      endTime: '2026-02-19T20:00:00Z',
    };
    
    const result = createMatchSchema.safeParse(data);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject when endTime is before startTime', () => {
    const data = {
      sport: 'soccer',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: '2026-02-19T20:00:00Z',
      endTime: '2026-02-19T18:00:00Z',
    };
    
    const result = createMatchSchema.safeParse(data);
    
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain('endTime must be chronologically after startTime');
  });
  
  it('should reject empty sport', () => {
    const data = {
      sport: '',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: '2026-02-19T18:00:00Z',
      endTime: '2026-02-19T20:00:00Z',
    };
    
    const result = createMatchSchema.safeParse(data);
    
    expect(result.success).toBe(false);
  });
  
  it('should reject invalid ISO datetime', () => {
    const data = {
      sport: 'soccer',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: 'not-a-date',
      endTime: '2026-02-19T20:00:00Z',
    };
    
    const result = createMatchSchema.safeParse(data);
    
    expect(result.success).toBe(false);
  });
  
  it('should accept optional scores', () => {
    const data = {
      sport: 'soccer',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: '2026-02-19T18:00:00Z',
      endTime: '2026-02-19T20:00:00Z',
      homeScore: 2,
      awayScore: 1,
    };
    
    const result = createMatchSchema.safeParse(data);
    
    expect(result.success).toBe(true);
  });
  
  it('should reject negative scores', () => {
    const data = {
      sport: 'soccer',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      startTime: '2026-02-19T18:00:00Z',
      endTime: '2026-02-19T20:00:00Z',
      homeScore: -1,
    };
    
    const result = createMatchSchema.safeParse(data);
    
    expect(result.success).toBe(false);
  });
});

describe('listMatchesQuerySchema', () => {
  it('should accept empty query', () => {
    const result = listMatchesQuerySchema.safeParse({});
    
    expect(result.success).toBe(true);
  });
  
  it('should accept valid limit', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: '50' });
    
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(50);
  });
  
  it('should reject limit above 100', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: '150' });
    
    expect(result.success).toBe(false);
  });
  
  it('should reject negative limit', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: '-10' });
    
    expect(result.success).toBe(false);
  });
  
  it('should coerce string to number', () => {
    const result = listMatchesQuerySchema.safeParse({ limit: '25' });
    
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(25);
  });
});

describe('matchIdParamSchema', () => {
  it('should accept valid id', () => {
    const result = matchIdParamSchema.safeParse({ id: '123' });
    
    expect(result.success).toBe(true);
    expect(result.data.id).toBe(123);
  });
  
  it('should reject negative id', () => {
    const result = matchIdParamSchema.safeParse({ id: '-1' });
    
    expect(result.success).toBe(false);
  });
  
  it('should reject zero', () => {
    const result = matchIdParamSchema.safeParse({ id: '0' });
    
    expect(result.success).toBe(false);
  });
  
  it('should reject non-numeric id', () => {
    const result = matchIdParamSchema.safeParse({ id: 'abc' });
    
    expect(result.success).toBe(false);
  });
});

describe('createCommentarySchema', () => {
  it('should validate valid commentary', () => {
    const data = {
      minute: 45,
      sequence: 1,
      period: 1,
      eventType: 'goal',
      actor: 'Player Name',
      team: 'home',
      message: 'Amazing goal!',
    };
    
    const result = createCommentarySchema.safeParse(data);
    
    expect(result.success).toBe(true);
  });
  
  it('should require message', () => {
    const data = {
      minute: 45,
      message: '',
    };
    
    const result = createCommentarySchema.safeParse(data);
    
    expect(result.success).toBe(false);
  });
  
  it('should accept minimal commentary', () => {
    const data = {
      minute: 0,
      message: 'Match started',
    };
    
    const result = createCommentarySchema.safeParse(data);
    
    expect(result.success).toBe(true);
  });
});
