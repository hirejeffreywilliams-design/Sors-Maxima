import { Express, Request } from "express";
import { db } from "../db";
import { applications, insertApplicationSchema } from "../dbSchema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "./helpers";
import { sendApplicationConfirmation, sendApplicationApproved, sendApplicationRejected } from "../emailService";
import { sensitiveRouteRateLimitMiddleware } from "../securityMiddleware";

function numericUserId(req: Request): number | null {
  const raw = req.session?.userId;
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

export function registerApplyRoutes(app: Express) {
  // POST /api/apply (public, no auth)
  app.post("/api/apply", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const result = insertApplicationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid application data", details: result.error.format() });
      }

      const [application] = await db.insert(applications).values({
        ...result.data,
        userId: numericUserId(req),
        status: "pending",
      }).returning();

      await sendApplicationConfirmation(application.email, application.username, application.tier);

      res.json(application);
    } catch (err) {
      console.error("Application error:", err);
      res.status(500).json({ error: "Failed to submit application" });
    }
  });

  // GET /api/admin/applications
  app.get("/api/admin/applications", requireAdmin, async (_req, res) => {
    try {
      const apps = await db.select().from(applications).orderBy(desc(applications.createdAt));
      res.json(apps);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
      res.status(500).json({ error: "Failed to fetch applications" });
    }
  });

  // PATCH /api/admin/applications/:id
  app.patch("/api/admin/applications/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;

      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const [app] = await db.update(applications)
        .set({ status, adminNotes })
        .where(eq(applications.id, id))
        .returning();

      if (status === "approved") {
        await sendApplicationApproved(app.email, app.username, app.tier);
      } else if (status === "rejected") {
        await sendApplicationRejected(app.email, app.username, app.tier, adminNotes);
      }

      res.json(app);
    } catch (err) {
      console.error("Failed to update application:", err);
      res.status(500).json({ error: "Failed to update application" });
    }
  });
}
