import { z } from "zod";

// Constant for match statuses
export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};


// 1) List matches query: optional limit as coerced positive integer, max 100
export const listMatchesQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

// 2) Match ID param: required id as coerced positive integer
export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Common score schema (non-negative coerced integers)
const nonNegativeInt = z.coerce.number().int().min(0);

// 3) Create match schema
export const createMatchSchema = z
  .object({
    sport: z.string().min(1, "sport is required"),
    homeTeam: z.string().min(1, "homeTeam is required"),
    awayTeam: z.string().min(1, "awayTeam is required"),
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime(),
    homeScore: nonNegativeInt.optional(),
    awayScore: nonNegativeInt.optional(),
  })
  .superRefine((data, ctx) => {
    const { startTime, endTime } = data;
    // Only check chronological order if both are valid ISO strings
    if (isIsoDateString(startTime) && isIsoDateString(endTime)) {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (!(end > start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "endTime must be after startTime",
          path: ["endTime"],
        });
      }
    }
  });

// 4) Update score schema: required homeScore and awayScore as coerced non-negative integers
export const updateScoreSchema = z.object({
  homeScore: nonNegativeInt,
  awayScore: nonNegativeInt,
});
