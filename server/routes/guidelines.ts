import type { Express, Request, Response } from "express";
import { db } from "../db";
import { sql } from "drizzle-orm";

export function registerGuidelinesRoutes(app: Express): void {

  // GET /api/guidelines — public, returns all active rules grouped by category
  app.get("/api/guidelines", async (_req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT id, category, title, body, rule_order
        FROM platform_rules
        WHERE is_active = TRUE
        ORDER BY category ASC, rule_order ASC
      `);

      const grouped: Record<string, any[]> = {};
      for (const row of rows.rows as any[]) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push({
          id: row.id,
          title: row.title,
          body: row.body,
          order: row.rule_order,
        });
      }

      const categories = Object.entries(grouped).map(([category, rules]) => ({
        category,
        rules,
      }));

      res.json({ categories });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch guidelines" });
    }
  });

  // GET /api/admin/guidelines — admin: all rules including inactive
  app.get("/api/admin/guidelines", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    try {
      const rows = await db.execute(sql`
        SELECT id, category, title, body, rule_order, is_active, created_at, updated_at
        FROM platform_rules
        ORDER BY category ASC, rule_order ASC
      `);
      res.json({ rules: rows.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch rules" });
    }
  });

  // POST /api/admin/guidelines — create new rule
  app.post("/api/admin/guidelines", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    const { category, title, body, rule_order, is_active } = req.body;
    if (!category || !title || !body) {
      return res.status(400).json({ error: "category, title, and body are required" });
    }
    try {
      const result = await db.execute(sql`
        INSERT INTO platform_rules (category, title, body, rule_order, is_active, created_at, updated_at)
        VALUES (${category}, ${title}, ${body}, ${rule_order ?? 0}, ${is_active !== false}, NOW(), NOW())
        RETURNING *
      `);
      res.json({ rule: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to create rule" });
    }
  });

  // PATCH /api/admin/guidelines/:id — update rule
  app.patch("/api/admin/guidelines/:id", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    const { id } = req.params;
    const { category, title, body, rule_order, is_active } = req.body;
    try {
      const result = await db.execute(sql`
        UPDATE platform_rules
        SET
          category    = COALESCE(${category ?? null}, category),
          title       = COALESCE(${title ?? null}, title),
          body        = COALESCE(${body ?? null}, body),
          rule_order  = COALESCE(${rule_order ?? null}, rule_order),
          is_active   = COALESCE(${is_active ?? null}, is_active),
          updated_at  = NOW()
        WHERE id = ${parseInt(id)}
        RETURNING *
      `);
      if (result.rows.length === 0) return res.status(404).json({ error: "Rule not found" });
      res.json({ rule: result.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to update rule" });
    }
  });

  // DELETE /api/admin/guidelines/:id — delete rule
  app.delete("/api/admin/guidelines/:id", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    const { id } = req.params;
    try {
      await db.execute(sql`DELETE FROM platform_rules WHERE id = ${parseInt(id)}`);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to delete rule" });
    }
  });
}
