import { Router} from "express"
import {createMatchSchema, listMatchesQuerySchema} from "../validation/matches.js";
import {db} from "../db/db.js";
import {matches} from "../db/schema.js";
import {getMatchStatus} from "../utls/match-status.js";
import { desc} from "drizzle-orm"

// TODO: SETUP CONSTANT FILE FOR THESE TYPE OF VALUES
const MAX_LIMIT = 100

export const matchRouter = Router()
matchRouter.get('/',async (req, res) => {
    const parsed =  listMatchesQuerySchema.safeParse(req.query)
    console.log(parsed)
    if(!parsed){
        return res.status(400)
            .json({
                error: "Invalid query",
                details: JSON.stringify(parsed.error)
            })
    }

    try{
        const limit = Math.min(parsed.data.limit ?? 50 , MAX_LIMIT)

        const data = await db
            .select()
            .from(matches)
            .orderBy((desc(matches.createdAt)))
            .limit(limit)

        res.json({
            data
        })

    }catch(error){
        console.error(error)
        return res.status(500).json({
            error:"Failed to fetch match",
            details: JSON.stringify(error)
        })
    }
})


matchRouter.post("/", async (req, res) => {
    const parsed = createMatchSchema.safeParse(req.body);
    const {data: {startTime, endTime, homeScore, awayScore }} = parsed;
    if(!parsed) {
        return res.satus(400)
            .json({
                error: "Not Found",
                details: JSON.stringify(parsed.error)
            })
    }

    try{
        const [event] = await db.insert(matches)
            .values({
                ...parsed.data,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                homeScore: homeScore ?? 0,
                awayScore: awayScore ?? 0,
                status: getMatchStatus(startTime, endTime)
            }).returning();

        res.status(201)
            .json({
                data: event
            })

    }catch(error){
        console.error(error)
        return res.status(500).json({
            error:"Failed to create match",
            details: JSON.stringify(error)
        })
    }
})

