import { Router, type Request, type Response } from 'express';
import { db } from '../db/db.js';
import { commentary as commentaryTable } from '../db/schema.js';
import { createCommentarySchema, listCommentaryQuerySchema } from '../validation/commentary.js';
import { matchIdParamSchema } from '../validation/matches.js';
import { eq, desc } from 'drizzle-orm';

export const commentaryRouter = Router({ mergeParams: true });

// List commentary entries for a match
commentaryRouter.get('/', async (req: Request, res: Response) => {
  // Validate path param :id (mounted at /matches/:id/commentary)
  const paramsParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({
      error: 'Invalid path parameters',
      details: paramsParsed.error.issues,
    });
  }

  // Validate query params
  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({
      error: 'Invalid query parameters',
      details: queryParsed.error.issues,
    });
  }

  const MAX_LIMIT = 100;
  const limit = Math.min(queryParsed.data.limit ?? 100, MAX_LIMIT);
  const matchId = paramsParsed.data.id;

  try {
    const rows = await db
      .select()
      .from(commentaryTable)
      .where(eq(commentaryTable.matchId, matchId))
      .orderBy(desc(commentaryTable.createdAt))
      .limit(limit);

    return res.status(200).json({ data: rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to fetch commentary' });
  }
});

// Create a commentary entry for a match
commentaryRouter.post('/', async (req: Request, res: Response) => {
  // Validate path param :id (mounted at /matches/:id/commentary)
  const paramsParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({
      error: 'Invalid path parameters',
      details: paramsParsed.error.issues,
    });
  }

  // Validate request body
  const bodyParsed = createCommentarySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: bodyParsed.error.issues,
    });
  }

  const matchId = paramsParsed.data.id;
  const data = bodyParsed.data;

  try {
    const insertData = {
      matchId,
      minute: data.minute,
      sequence: data.sequence ?? 0,
      period: data.period ?? 1,
      eventType: data.eventType ?? 'commentary',
      actor: data.actor ?? null,
      team: data.team ?? null,
      message: data.message,
      metadata: data.metadata ?? null,
      tags: data.tags ?? null,
    };
    const [row] = await db.insert(commentaryTable).values(insertData).returning();

    if (res.app.locals['broadcastCommentary']) {
      res.app.locals['broadcastCommentary'](row!.matchId, row);
    }

    return res.status(201).json({ data: row });
  } catch (error) {
    console.error(error);
    // Handle possible FK violation (match not found)
    if (error && typeof error === 'object' && (error as { code?: string }).code === '23503') {
      return res.status(404).json({ error: 'Match not found' });
    }

    return res.status(500).json({ error: 'Failed to create commentary' });
  }
});
