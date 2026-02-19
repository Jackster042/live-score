/**
 * Shared Type Definitions
 * 
 * These types are used across the application.
 * Most types are inferred from Drizzle ORM schemas and Zod validations.
 */

import type { z } from 'zod';
import type { createMatchSchema, listMatchesQuerySchema, matchIdParamSchema, updateScoreSchema } from '../validation/matches.js';
import type { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';

// ==========================================
// Match Types (from Zod schemas)
// ==========================================

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type ListMatchesQuery = z.infer<typeof listMatchesQuerySchema>;
export type MatchIdParam = z.infer<typeof matchIdParamSchema>;
export type UpdateScoreInput = z.infer<typeof updateScoreSchema>;

export const MATCH_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  FINISHED: 'finished',
} as const;

export type MatchStatus = typeof MATCH_STATUS[keyof typeof MATCH_STATUS];

// ==========================================
// Commentary Types (from Zod schemas)
// ==========================================

export type CreateCommentaryInput = z.infer<typeof createCommentarySchema>;
export type ListCommentaryQuery = z.infer<typeof listCommentaryQuerySchema>;

// ==========================================
// API Response Types
// ==========================================

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

// ==========================================
// WebSocket Types
// ==========================================

export type ClientMessage =
  | { type: 'subscribe'; matchId: number }
  | { type: 'unsubscribe'; matchId: number };

export type ServerMessage =
  | { type: 'welcome'; message: string; instance: string }
  | { type: 'subscribed'; matchId: number }
  | { type: 'unsubscribed'; matchId: number }
  | { type: 'match_created'; data: unknown }
  | { type: 'commentary'; data: unknown }
  | { type: 'match_status_changed'; data: unknown }
  | { type: 'error'; message: string };

// ==========================================
// Job Types
// ==========================================

export interface MatchStatusJobData {
  matchId: number;
  fromStatus: MatchStatus;
  toStatus: MatchStatus;
}

// ==========================================
// Configuration Types
// ==========================================

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  host: string;
  databaseUrl: string;
  redisUrl: string;
  arcjetMode: 'LIVE' | 'DRY_RUN';
  arcjetKey: string;
}
