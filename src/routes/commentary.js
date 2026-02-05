import { Router } from "express";
import { db } from "../db/db.js";
import { commentary as commentaryTable } from "../db/schema.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";
import { eq, desc } from "drizzle-orm";

export const commentaryRouter = Router({ mergeParams: true });

// List commentary entries for a match
commentaryRouter.get("/", async (req, res) => {
  // Validate path param :id (mounted at /matches/:id/commentary)
  const paramsParsed = matchIdParamSchema.safeParse(req.params);
  console.log("paramsParsed from commentary controller", paramsParsed);
  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "Invalid path parameters",
      details: paramsParsed.error.issues,
    });
  }

  // Validate query params
  const queryParsed = listCommentaryQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
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
    return res.status(500).json({ error: "Failed to fetch commentary" });
  }
});

// Create a commentary entry for a match
commentaryRouter.post("/", async (req, res) => {
  // Validate path param :id (mounted at /matches/:id/commentary)
  console.log("params", req.params)
  const paramsParsed = matchIdParamSchema.safeParse(req.params);
  if (!paramsParsed.success) {
    return res.status(400).json({
      error: "Invalid path parameters",
      details: paramsParsed.error.issues,
    });
  }

  // Validate request body
  const bodyParsed = createCommentarySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: bodyParsed.error.issues,
    });
  }

  const matchId = paramsParsed.data.id;
  const data = bodyParsed.data;

  // The DB schema expects period as an integer; attempt to coerce if provided as a string
  let periodValue = data.period;
  if (typeof periodValue === "string") {
    const maybeInt = Number.parseInt(periodValue, 10);
    if (Number.isNaN(maybeInt)) {
      return res.status(400).json({
        error: "Invalid request body",
        details: [
          {
            path: ["period"],
            message: "period must be a number-compatible value",
          },
        ],
      });
    }
    periodValue = maybeInt;
  }

  try {
    const [row] = await db
      .insert(commentaryTable)
      .values({
        matchId,
        minute: data.minute,
        sequence: data.sequence,
        period: periodValue,
        eventType: data.eventType,
        actor: data.actor,
        team: data.team,
        message: data.message,
        metadata: data.metadata,
        tags: data.tags,
      })
      .returning();

    if(res.app.locals.broadcastCommentary) {
      res.app.locals.broadcastCommentary(row.matchId, row);
    }

    return res.status(201).json({ data: row });
  } catch (error) {
    console.error(error);
    // Handle possible FK violation (match not found)
    if (error && typeof error === "object" && error.code === "23503") {
      return res.status(404).json({ error: "Match not found" });
    }

    return res.status(500).json({ error: "Failed to create commentary" });
  }
});