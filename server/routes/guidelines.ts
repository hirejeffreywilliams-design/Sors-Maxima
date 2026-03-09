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

  // POST /api/admin/policy-standards/seed — seed default policies/procedures/standards
  app.post("/api/admin/policy-standards/seed", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    try {
      const { getDefaultPoliciesForSeeding } = await import("../companyStandards");
      const defaults = getDefaultPoliciesForSeeding();
      let inserted = 0;
      let skipped = 0;

      for (const entry of defaults) {
        const existing = await db.execute(sql`
          SELECT id FROM platform_rules WHERE category = ${entry.category} AND title = ${entry.title} LIMIT 1
        `);
        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }
        await db.execute(sql`
          INSERT INTO platform_rules (category, title, body, rule_order, is_active, created_at, updated_at)
          VALUES (${entry.category}, ${entry.title}, ${entry.body}, ${entry.rule_order}, TRUE, NOW(), NOW())
        `);
        inserted++;
      }

      res.json({ success: true, inserted, skipped, total: defaults.length });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to seed defaults: " + err.message });
    }
  });

  // GET /api/admin/policy-standards — grouped view of all policy/standards categories
  app.get("/api/admin/policy-standards", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    const POLICY_CATEGORIES = [
      "Company Policies",
      "Operational Procedures",
      "Model & Grade Standards",
      "AI Brand Standards",
    ];
    try {
      const rows = await db.execute(sql`
        SELECT id, category, title, body, rule_order, is_active, created_at, updated_at
        FROM platform_rules
        WHERE category = ANY(${POLICY_CATEGORIES})
        ORDER BY category ASC, rule_order ASC
      `);
      const grouped: Record<string, any[]> = {};
      for (const row of rows.rows as any[]) {
        if (!grouped[row.category]) grouped[row.category] = [];
        grouped[row.category].push(row);
      }
      const total = rows.rows.length;
      res.json({ grouped, total, categories: Object.keys(grouped) });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch policy standards" });
    }
  });

  // GET /api/admin/company-standards/metadata — expose grade thresholds + prohibited phrases from companyStandards.ts
  app.get("/api/admin/company-standards/metadata", async (req: Request, res: Response) => {
    if (!req.session?.isAdmin) return res.sendStatus(403);
    try {
      const {
        GRADE_STANDARDS, PROHIBITED_PHRASES, BRAND_VOICE, MODEL_STANDARDS,
        PLATFORM_NAME, MODEL_NAME, CASHOUT_BRAND,
      } = await import("../companyStandards");

      const gradeRows = Object.entries(GRADE_STANDARDS).map(([grade, cfg]: [string, any]) => ({
        grade,
        label: cfg.label,
        minConfidence: cfg.minConfidence,
        minEV: cfg.minEV,
      }));

      res.json({
        platformName: PLATFORM_NAME,
        modelName: MODEL_NAME,
        cashoutBrand: CASHOUT_BRAND,
        gradeRows,
        prohibitedPhrases: PROHIBITED_PHRASES,
        toneRequirements: BRAND_VOICE.tone,
        requiredDisclosures: BRAND_VOICE.requiredDisclosures,
        modelFactors: MODEL_STANDARDS.factorCount,
        simulationRuns: MODEL_STANDARDS.simulationRuns,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch company standards metadata" });
    }
  });

  // GET /api/policy-standards — public read of Company Policies and AI Brand Standards
  app.get("/api/policy-standards", async (_req: Request, res: Response) => {
    try {
      const rows = await db.execute(sql`
        SELECT id, category, title, body, rule_order
        FROM platform_rules
        WHERE category IN ('Company Policies', 'AI Brand Standards') AND is_active = TRUE
        ORDER BY category ASC, rule_order ASC
      `);
      res.json({ policies: rows.rows });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch policies" });
    }
  });
}
