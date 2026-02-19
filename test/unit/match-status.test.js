/**
 * Unit Tests: Match Status Utilities
 */

import { describe, it, expect } from 'vitest';
import { getMatchStatus, syncMatchStatus } from '../../src/utls/match-status.js';
import { MATCH_STATUS } from '../../src/validation/matches.js';

describe('getMatchStatus', () => {
  it('should return SCHEDULED when current time is before start time', () => {
    const now = new Date('2026-02-19T12:00:00Z');
    const startTime = new Date('2026-02-19T13:00:00Z');
    const endTime = new Date('2026-02-19T15:00:00Z');
    
    const status = getMatchStatus(startTime, endTime, now);
    
    expect(status).toBe(MATCH_STATUS.SCHEDULED);
  });
  
  it('should return LIVE when current time is between start and end', () => {
    const now = new Date('2026-02-19T14:00:00Z');
    const startTime = new Date('2026-02-19T13:00:00Z');
    const endTime = new Date('2026-02-19T15:00:00Z');
    
    const status = getMatchStatus(startTime, endTime, now);
    
    expect(status).toBe(MATCH_STATUS.LIVE);
  });
  
  it('should return FINISHED when current time is after end time', () => {
    const now = new Date('2026-02-19T16:00:00Z');
    const startTime = new Date('2026-02-19T13:00:00Z');
    const endTime = new Date('2026-02-19T15:00:00Z');
    
    const status = getMatchStatus(startTime, endTime, now);
    
    expect(status).toBe(MATCH_STATUS.FINISHED);
  });
  
  it('should handle string date inputs', () => {
    const now = new Date('2026-02-19T14:00:00Z');
    const startTime = '2026-02-19T13:00:00Z';
    const endTime = '2026-02-19T15:00:00Z';
    
    const status = getMatchStatus(startTime, endTime, now);
    
    expect(status).toBe(MATCH_STATUS.LIVE);
  });
  
  it('should return null for invalid dates', () => {
    const status = getMatchStatus('invalid', 'invalid');
    
    expect(status).toBeNull();
  });
  
  it('should default to current time when not provided', () => {
    const startTime = new Date(Date.now() + 3600000); // 1 hour from now
    const endTime = new Date(Date.now() + 7200000);   // 2 hours from now
    
    const status = getMatchStatus(startTime, endTime);
    
    expect(status).toBe(MATCH_STATUS.SCHEDULED);
  });
  
  it('should handle exact start time as LIVE', () => {
    const now = new Date('2026-02-19T12:00:00Z');
    const startTime = new Date('2026-02-19T12:00:00Z');
    const endTime = new Date('2026-02-19T14:00:00Z');
    
    const status = getMatchStatus(startTime, endTime, now);
    
    expect(status).toBe(MATCH_STATUS.LIVE);
  });
  
  it('should handle exact end time as FINISHED', () => {
    const now = new Date('2026-02-19T14:00:00Z');
    const startTime = new Date('2026-02-19T12:00:00Z');
    const endTime = new Date('2026-02-19T14:00:00Z');
    
    const status = getMatchStatus(startTime, endTime, now);
    
    expect(status).toBe(MATCH_STATUS.FINISHED);
  });
});

describe('syncMatchStatus', () => {
  it('should update status when it has changed', async () => {
    const now = new Date('2026-02-19T14:00:00Z');
    const startTime = new Date('2026-02-19T13:00:00Z');
    const endTime = new Date('2026-02-19T15:00:00Z');
    
    const match = {
      id: 1,
      status: MATCH_STATUS.SCHEDULED,
      startTime,
      endTime,
    };
    
    let updatedStatus = null;
    const updateFn = async (status) => {
      updatedStatus = status;
    };
    
    const result = await syncMatchStatus(match, updateFn);
    
    expect(result).toBe(MATCH_STATUS.LIVE);
    expect(updatedStatus).toBe(MATCH_STATUS.LIVE);
    expect(match.status).toBe(MATCH_STATUS.LIVE);
  });
  
  it('should not update when status is unchanged', async () => {
    const now = new Date('2026-02-19T14:00:00Z');
    const startTime = new Date('2026-02-19T13:00:00Z');
    const endTime = new Date('2026-02-19T15:00:00Z');
    
    const match = {
      id: 1,
      status: MATCH_STATUS.LIVE, // Already correct
      startTime,
      endTime,
    };
    
    const updateFn = async () => {
      throw new Error('Should not be called');
    };
    
    const result = await syncMatchStatus(match, updateFn);
    
    expect(result).toBe(MATCH_STATUS.LIVE);
  });
  
  it('should return current status when dates are invalid', async () => {
    const match = {
      id: 1,
      status: MATCH_STATUS.SCHEDULED,
      startTime: 'invalid',
      endTime: 'invalid',
    };
    
    const updateFn = async () => {
      throw new Error('Should not be called');
    };
    
    const result = await syncMatchStatus(match, updateFn);
    
    expect(result).toBe(MATCH_STATUS.SCHEDULED);
  });
});
