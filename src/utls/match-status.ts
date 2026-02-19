/**
 * Match Status Utilities
 */

import { MATCH_STATUS, type MatchStatusValue } from '../validation/matches.js';
import type { Match } from '../db/schema.js';

/**
 * Calculate match status based on time
 * @param startTime - Match start time
 * @param endTime - Match end time
 * @param now - Current time (defaults to now)
 * @returns Match status or null if dates are invalid
 */
export function getMatchStatus(
  startTime: Date | string,
  endTime: Date | string,
  now: Date = new Date()
): MatchStatusValue | null {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  if (now < start) {
    return MATCH_STATUS.SCHEDULED;
  }

  if (now >= end) {
    return MATCH_STATUS.FINISHED;
  }

  return MATCH_STATUS.LIVE;
}

/**
 * Synchronize match status with current time
 * @param match - Match object (mutated with new status)
 * @param updateStatus - Callback to persist status change
 * @returns New status
 */
export async function syncMatchStatus(
  match: Match,
  updateStatus: (status: MatchStatusValue) => Promise<void>
): Promise<MatchStatusValue> {
  const nextStatus = getMatchStatus(match.startTime, match.endTime);
  
  if (!nextStatus) {
    return match.status as MatchStatusValue;
  }
  
  if (match.status !== nextStatus) {
    await updateStatus(nextStatus);
    (match as Match & { status: MatchStatusValue }).status = nextStatus;
  }
  
  return match.status as MatchStatusValue;
}
