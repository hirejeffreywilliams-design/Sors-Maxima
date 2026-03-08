import type { Express, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

function requireUser(req: Request, res: Response): number | null {
  if (!req.session?.isAuthenticated || !req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return Number(req.session.userId);
}

export function registerResearchRoutes(app: Express): void {

  // GET /api/research/notes — get all notes for current user
  app.get("/api/research/notes", async (req, res) => {
    const userId = requireUser(req, res);
    if (!userId) return;
    try {
      const result = await db.execute(sql`
        SELECT * FROM research_notes
        WHERE user_id = ${userId}
        ORDER BY pinned DESC, updated_at DESC
      `) as any;
      res.json(result?.rows || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/research/notes — create a note
  app.post("/api/research/notes", async (req, res) => {
    const userId = requireUser(req, res);
    if (!userId) return;
    try {
      const { title, content, note_type, sport, related_game, related_pick, related_team, tags, pinned } = req.body;
      if (!content && !title) return res.status(400).json({ error: "Content or title is required" });
      const tagsArr = Array.isArray(tags) ? tags : [];
      const result = await db.execute(sql`
        INSERT INTO research_notes
          (user_id, title, content, note_type, sport, related_game, related_pick, related_team, tags, pinned)
        VALUES
          (${userId}, ${title || "Untitled Note"}, ${content || ""},
           ${note_type || "general"}, ${sport || null}, ${related_game || null},
           ${related_pick || null}, ${related_team || null},
           ${tagsArr}, ${pinned || false})
        RETURNING *
      `) as any;
      res.status(201).json(result?.rows?.[0] || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // PATCH /api/research/notes/:id — update a note
  app.patch("/api/research/notes/:id", async (req, res) => {
    const userId = requireUser(req, res);
    if (!userId) return;
    const noteId = parseInt(req.params.id);
    try {
      const { title, content, note_type, sport, related_game, related_pick, related_team, tags, pinned } = req.body;
      const tagsArr = Array.isArray(tags) ? tags : null;

      // Fetch current note first so we can apply partial updates
      const current = await db.execute(sql`
        SELECT * FROM research_notes WHERE id = ${noteId} AND user_id = ${userId}
      `) as any;
      const cur = current?.rows?.[0];
      if (!cur) return res.status(404).json({ error: "Note not found" });

      const result = await db.execute(sql`
        UPDATE research_notes
        SET
          title = ${title !== undefined ? title : cur.title},
          content = ${content !== undefined ? content : cur.content},
          note_type = ${note_type !== undefined ? note_type : cur.note_type},
          sport = ${sport !== undefined ? (sport || null) : cur.sport},
          related_game = ${related_game !== undefined ? (related_game || null) : cur.related_game},
          related_pick = ${related_pick !== undefined ? (related_pick || null) : cur.related_pick},
          related_team = ${related_team !== undefined ? (related_team || null) : cur.related_team},
          tags = ${tagsArr !== null ? tagsArr : cur.tags},
          pinned = ${pinned !== undefined ? pinned : cur.pinned},
          updated_at = NOW()
        WHERE id = ${noteId} AND user_id = ${userId}
        RETURNING *
      `) as any;
      res.json(result?.rows?.[0] || {});
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/research/notes/:id — delete a single note
  app.delete("/api/research/notes/:id", async (req, res) => {
    const userId = requireUser(req, res);
    if (!userId) return;
    const noteId = parseInt(req.params.id);
    try {
      await db.execute(sql`
        DELETE FROM research_notes WHERE id = ${noteId} AND user_id = ${userId}
      `);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/research/notes — clear ALL notes for user
  app.delete("/api/research/notes", async (req, res) => {
    const userId = requireUser(req, res);
    if (!userId) return;
    try {
      const result = await db.execute(sql`
        DELETE FROM research_notes WHERE user_id = ${userId} RETURNING id
      `) as any;
      res.json({ success: true, deleted: result?.rows?.length || 0 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

}
