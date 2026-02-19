/**
 * Database Connection
 *
 * Configures PostgreSQL connection pool and Drizzle ORM client.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { databaseUrl } from '../config/index.js';
import * as schema from './schema.js';

const { Pool } = pkg;

// Configure connection pool
export const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Handle pool errors
pool.on('error', (err: Error) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// Create Drizzle client with schema
export const db = drizzle(pool, { schema });

// Export type
export type Database = typeof db;
