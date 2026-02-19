/**
 * Match Status Transition Processor
 *
 * Handles automatic status transitions for matches:
 * - scheduled → live (at match startTime)
 * - live → finished (at match endTime)
 */

import { db } from '../../db/db.js';
import { matches } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { publish } from '../../redis/client.js';
import { wsChannels } from '../../redis/keys.js';
import type { Job } from 'bullmq';

interface MatchStatusJobData {
  matchId: number;
  fromStatus: string;
  toStatus: string;
}

/**
 * Process match status transition
 */
export async function processMatchStatusTransition(
  job: Job<MatchStatusJobData>
): Promise<Record<string, unknown>> {
  const { matchId, fromStatus, toStatus } = job.data;

  console.log(`   Processing: Match ${matchId} ${fromStatus} → ${toStatus}`);

  // Fetch current match state
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));

  if (!match) {
    console.error(`   ❌ Match ${matchId} not found`);
    throw new Error(`Match ${matchId} not found`);
  }

  // Validate current status matches expectation
  if (match.status !== fromStatus) {
    console.warn(
      `   ⚠️ Match ${matchId} status is '${match.status}', expected '${fromStatus}'. Skipping transition.`
    );
    // Don't throw - this is a valid case (e.g., manually updated)
    return { skipped: true, reason: 'status_mismatch', currentStatus: match.status };
  }

  // Perform status update
  const [updated] = await db
    .update(matches)
    .set({ status: toStatus as 'scheduled' | 'live' | 'finished' })
    .where(eq(matches.id, matchId))
    .returning();

  if (!updated) {
    console.error(`   ❌ Failed to update match ${matchId}`);
    throw new Error(`Failed to update match ${matchId}`);
  }

  // Broadcast status change via Redis pub/sub
  await publish(wsChannels.matchStatus(matchId), {
    type: 'match_status_changed',
    data: {
      matchId,
      oldStatus: fromStatus,
      newStatus: toStatus,
      timestamp: new Date().toISOString(),
    },
  });

  console.log(`   ✅ Match ${matchId} status updated: ${fromStatus} → ${toStatus}`);

  return {
    success: true,
    matchId,
    oldStatus: fromStatus,
    newStatus: toStatus,
  };
}

/**
 * Job processor map
 */
export const matchStatusProcessors: Record<
  string,
  (job: Job<MatchStatusJobData>) => Promise<Record<string, unknown>>
> = {
  'match:transition-to-live': processMatchStatusTransition,
  'match:transition-to-finished': processMatchStatusTransition,
};
