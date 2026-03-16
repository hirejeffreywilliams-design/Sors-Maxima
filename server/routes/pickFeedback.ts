import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./helpers";
import { auditTrail } from "../auditTrail";

export function registerPickFeedbackRoutes(app: Express) {
  app.post("/api/picks/:pickId/feedback", requireAuth, async (req, res) => {
    try {
      const { pickId } = req.params;
      const { vote } = req.body;
      if (!vote || !["up", "down"].includes(vote)) {
        return res.status(400).json({ error: "Vote must be 'up' or 'down'" });
      }

      const userId = req.session!.userId;
      const username = req.session!.username || "anonymous";
      const sport = req.body.sport || null;
      const betType = req.body.betType || null;

      await db.execute(sql`
        INSERT INTO pick_feedback (pick_id, user_id, username, vote, sport, bet_type)
        VALUES (${pickId}, ${userId}, ${username}, ${vote}, ${sport}, ${betType})
        ON CONFLICT (pick_id, user_id)
        DO UPDATE SET vote = ${vote}
      `);

      auditTrail.record(
        String(userId),
        "pick_feedback",
        "pick",
        pickId,
        { metadata: { vote, sport, betType } }
      );

      const counts = await db.execute(sql`
        SELECT
          SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as up_count,
          SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as down_count
        FROM pick_feedback WHERE pick_id = ${pickId}
      `);
      const row = counts.rows[0] as any;

      res.json({
        success: true,
        pickId,
        userVote: vote,
        upCount: parseInt(row?.up_count || "0"),
        downCount: parseInt(row?.down_count || "0"),
      });
    } catch (err: any) {
      console.error("[PickFeedback] Submit error:", err.message);
      res.status(500).json({ error: "Failed to submit pick feedback" });
    }
  });

  app.get("/api/picks/:pickId/feedback", async (req, res) => {
    try {
      const { pickId } = req.params;
      const userId = req.session?.userId || null;

      const counts = await db.execute(sql`
        SELECT
          SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as up_count,
          SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as down_count
        FROM pick_feedback WHERE pick_id = ${pickId}
      `);
      const row = counts.rows[0] as any;

      let userVote: string | null = null;
      if (userId) {
        const userResult = await db.execute(sql`
          SELECT vote FROM pick_feedback WHERE pick_id = ${pickId} AND user_id = ${userId} LIMIT 1
        `);
        userVote = (userResult.rows[0] as any)?.vote || null;
      }

      res.json({
        pickId,
        userVote,
        upCount: parseInt(row?.up_count || "0"),
        downCount: parseInt(row?.down_count || "0"),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch pick feedback" });
    }
  });

  app.get("/api/picks/feedback/batch", async (req, res) => {
    try {
      const pickIds = (req.query.ids as string || "").split(",").filter(Boolean);
      if (pickIds.length === 0) return res.json({});

      const userId = req.session?.userId || null;

      const placeholders = pickIds.map((_, i) => `$${i + 1}`).join(",");
      const countsResult = await db.execute(sql.raw(
        `SELECT pick_id,
                SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as up_count,
                SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as down_count
         FROM pick_feedback WHERE pick_id IN (${placeholders})
         GROUP BY pick_id`,
        pickIds
      ));

      const result: Record<string, { upCount: number; downCount: number; userVote: string | null }> = {};
      for (const row of countsResult.rows as any[]) {
        result[row.pick_id] = {
          upCount: parseInt(row.up_count || "0"),
          downCount: parseInt(row.down_count || "0"),
          userVote: null,
        };
      }

      if (userId && pickIds.length > 0) {
        const votesResult = await db.execute(sql.raw(
          `SELECT pick_id, vote FROM pick_feedback WHERE user_id = ${userId} AND pick_id IN (${placeholders})`,
          pickIds
        ));
        for (const row of votesResult.rows as any[]) {
          if (result[row.pick_id]) {
            result[row.pick_id].userVote = row.vote;
          } else {
            result[row.pick_id] = { upCount: 0, downCount: 0, userVote: row.vote };
          }
        }
      }

      for (const id of pickIds) {
        if (!result[id]) result[id] = { upCount: 0, downCount: 0, userVote: null };
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch batch feedback" });
    }
  });

  app.get("/api/admin/pick-feedback/stats", requireAdmin, async (req, res) => {
    try {
      const summary = await db.execute(sql`
        SELECT
          COUNT(*) as total_votes,
          SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as total_up,
          SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as total_down,
          COUNT(DISTINCT user_id) as unique_voters,
          COUNT(DISTINCT pick_id) as unique_picks
        FROM pick_feedback
      `);

      const bySport = await db.execute(sql`
        SELECT sport,
               COUNT(*) as votes,
               SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as up_count,
               SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as down_count
        FROM pick_feedback
        WHERE sport IS NOT NULL
        GROUP BY sport
        ORDER BY votes DESC
      `);

      const recentNegative = await db.execute(sql`
        SELECT pf.pick_id, pf.sport, pf.bet_type, pf.created_at, pf.username
        FROM pick_feedback pf
        WHERE pf.vote = 'down'
        ORDER BY pf.created_at DESC
        LIMIT 20
      `);

      const helpfulness = await db.execute(sql`
        SELECT pick_id,
               SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END) as ups,
               SUM(CASE WHEN vote = 'down' THEN 1 ELSE 0 END) as downs,
               COUNT(*) as total
        FROM pick_feedback
        GROUP BY pick_id
        HAVING COUNT(*) >= 2
        ORDER BY (SUM(CASE WHEN vote = 'up' THEN 1 ELSE 0 END)::float / COUNT(*)) ASC
        LIMIT 10
      `);

      const stats = summary.rows[0] as any;
      res.json({
        totalVotes: parseInt(stats?.total_votes || "0"),
        totalUp: parseInt(stats?.total_up || "0"),
        totalDown: parseInt(stats?.total_down || "0"),
        uniqueVoters: parseInt(stats?.unique_voters || "0"),
        uniquePicks: parseInt(stats?.unique_picks || "0"),
        helpfulnessRate: stats?.total_votes > 0
          ? Math.round((parseInt(stats.total_up) / parseInt(stats.total_votes)) * 100)
          : 0,
        bySport: bySport.rows,
        recentNegative: recentNegative.rows,
        lowestRated: helpfulness.rows,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch pick feedback stats" });
    }
  });
}
