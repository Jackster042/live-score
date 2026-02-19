import { Router, type Request, type Response } from 'express';
import { createMatchSchema, listMatchesQuerySchema } from '../validation/matches.js';
import { db } from '../db/db.js';
import { matches } from '../db/schema.js';
import { getMatchStatus } from '../utls/match-status.js';
import { desc } from 'drizzle-orm';
import { initQueues, scheduleMatchStatusJobs } from '../jobs/queue.js';
// Match type not needed in this file

const MAX_LIMIT = 100;

export const matchRouter = Router();

matchRouter.get('/', async (req: Request, res: Response) => {
  const parsed = listMatchesQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid query',
      details: parsed.error.issues,
    });
  }

  try {
    const limit = Math.min(parsed.data.limit ?? 50, MAX_LIMIT);

    const data = await db.select().from(matches).orderBy(desc(matches.createdAt)).limit(limit);

    res.json({
      data,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to fetch match',
    });
    return;
  }
});

matchRouter.post('/', async (req: Request, res: Response) => {
  const parsed = createMatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request body',
    });
    return;
  }

  const {
    data: { startTime, endTime, homeScore, awayScore },
  } = parsed;

  try {
    const [event] = await db
      .insert(matches)
      .values({
        ...parsed.data,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        homeScore: homeScore ?? 0,
        awayScore: awayScore ?? 0,
        status: getMatchStatus(startTime, endTime)!,
      })
      .returning();

    // Broadcast to WebSocket clients
    if (res.app.locals['broadcastMatchCreated']) {
      res.app.locals['broadcastMatchCreated'](event);
    }

    // Schedule automatic status transition jobs
    try {
      initQueues(); // Ensure queues are initialized
      await scheduleMatchStatusJobs(event!.id, new Date(startTime), new Date(endTime));
    } catch (jobErr) {
      // Log but don't fail request - jobs are non-critical
      console.error('Failed to schedule status jobs:', jobErr);
    }

    res.status(201).json({
      data: event,
    });
    return;
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Failed to create match',
    });
    return;
  }
});
