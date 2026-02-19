/**
 * Database Schema Definitions
 *
 * Uses Drizzle ORM with PostgreSQL.
 * Exports both table definitions and inferred types.
 */

import { pgTable, serial, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// ==========================================
// Enums
// ==========================================

export const matchStatusEnum = pgEnum('match_status', ['scheduled', 'live', 'finished']);

// ==========================================
// Tables
// ==========================================

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  sport: text('sport').notNull(),
  homeTeam: text('home_team').notNull(),
  awayTeam: text('away_team').notNull(),
  status: matchStatusEnum('status').notNull().default('scheduled'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const commentary = pgTable('commentary', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  minute: integer('minute').notNull(),
  sequence: integer('sequence').notNull(),
  period: integer('period').notNull(),
  eventType: text('event_type').notNull(),
  actor: text('actor'),
  team: text('team'),
  message: text('message').notNull(),
  metadata: jsonb('metadata'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ==========================================
// Inferred Types
// ==========================================

export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
export type Commentary = typeof commentary.$inferSelect;
export type NewCommentary = typeof commentary.$inferInsert;

// ==========================================
// Additional Types
// ==========================================

export type MatchStatus = 'scheduled' | 'live' | 'finished';
