import type { Express } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "./helpers";
import { auditTrail } from "../auditTrail";

export function registerFeedbackRoutes(app: Express) {
  app.post("/api/feedback", async (req, res) => {
    try {
      const { category, rating, nps, subject, message, page } = req.body;
      if (!category || !message?.trim()) {
        return res.status(400).json({ error: "Category and message are required" });
      }
      const validCategories = ["bug", "feature", "general", "praise", "pick_feedback", "question"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: "Invalid category" });
      }
      const userId = req.session?.userId || null;
      const username = req.session?.username || "anonymous";

      const result = await db.execute(sql`
        INSERT INTO user_feedback (user_id, username, category, rating, nps, subject, message, page, status)
        VALUES (
          ${userId},
          ${username},
          ${category},
          ${rating ?? null},
          ${nps ?? null},
          ${subject?.trim().slice(0, 120) || null},
          ${String(message).trim().slice(0, 1000)},
          ${page || "/"},
          'open'
        )
        RETURNING id
      `);

      const id = result.rows[0]?.id;
      auditTrail.record(
        userId || "anonymous",
        "feedback_submitted",
        "feedback",
        String(id),
        { ip: req.ip || "unknown", metadata: { category, rating, nps } }
      );
      res.json({ success: true, id });
    } catch (err: any) {
      console.error("[Feedback] Submit error:", err.message);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  });

  app.get("/api/feedback/my", requireAuth, async (req, res) => {
    try {
      const userId = req.session!.userId;
      const result = await db.execute(sql`
        SELECT id, category, rating, nps, subject, message, page, status, admin_reply, admin_replied_at, created_at
        FROM user_feedback
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 50
      `);
      res.json(result.rows);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.get("/api/admin/feedback", requireAdmin, async (req, res) => {
    try {
      const { category, status, limit = "100", offset = "0" } = req.query as Record<string, string>;
      const catFilter = category && category !== "all" ? sql`AND category = ${category}` : sql``;
      const statusFilter = status && status !== "all" ? sql`AND status = ${status}` : sql``;
      const result = await db.execute(sql`
        SELECT id, user_id, username, category, rating, nps, subject, message, page, status, admin_reply, admin_replied_at, created_at
        FROM user_feedback
        WHERE 1=1 ${catFilter} ${statusFilter}
        ORDER BY created_at DESC
        LIMIT ${parseInt(limit)}
        OFFSET ${parseInt(offset)}
      `);
      const countResult = await db.execute(sql`
        SELECT COUNT(*) as total, 
               SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
               SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_count,
               ROUND(AVG(rating), 1) as avg_rating,
               ROUND(AVG(nps), 1) as avg_nps
        FROM user_feedback
        WHERE 1=1 ${catFilter} ${statusFilter}
      `);
      res.json({ items: result.rows, stats: countResult.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  });

  app.patch("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, admin_reply } = req.body;
      const validStatuses = ["open", "reviewed", "resolved", "closed"];
      if (status && !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      const repliedAt = admin_reply ? new Date() : null;
      await db.execute(sql`
        UPDATE user_feedback
        SET
          status = COALESCE(${status || null}, status),
          admin_reply = COALESCE(${admin_reply?.trim() || null}, admin_reply),
          admin_replied_at = CASE WHEN ${admin_reply?.trim() || null} IS NOT NULL THEN NOW() ELSE admin_replied_at END
        WHERE id = ${id}
      `);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update feedback" });
    }
  });

  app.delete("/api/admin/feedback/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.execute(sql`DELETE FROM user_feedback WHERE id = ${id}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete feedback" });
    }
  });
}
