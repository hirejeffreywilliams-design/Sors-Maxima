import { Router } from "express";
import { tradingCards, userCardCollections, cardTrades, users, subscriptions, cardAuditLog } from "../dbSchema";
import { db } from "../db";
import { eq, and, desc, or, gt, sql, asc, isNull, ne } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Safe userId extraction — returns null if session is missing or userId is non-numeric
function sessionUserId(req: any): number | null {
  if (!req.session?.isAuthenticated || !req.session?.userId) return null;
  const n = Number(req.session.userId);
  return isNaN(n) ? null : n;
}

// GET /api/cards/collection — user's owned cards
router.get("/collection", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);
  
  try {
    const userCards = await db
      .select({
        collection: userCardCollections,
        card: tradingCards,
      })
      .from(userCardCollections)
      .innerJoin(tradingCards, eq(userCardCollections.cardId, tradingCards.id))
      .where(eq(userCardCollections.userId, userId))
      .orderBy(desc(userCardCollections.acquiredAt));
      
    res.json(userCards);
  } catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).json({ message: "Failed to fetch collection" });
  }
});

// GET /api/cards/marketplace — all listed cards (recent/notable)
router.get("/marketplace", async (req, res) => {
  try {
    const marketplaceCards = await db
      .select()
      .from(tradingCards)
      .orderBy(desc(tradingCards.createdAt))
      .limit(50);
      
    res.json(marketplaceCards);
  } catch (error) {
    console.error("Error fetching marketplace:", error);
    res.status(500).json({ message: "Failed to fetch marketplace" });
  }
});

// GET /api/cards/packs/available — check daily pack availability
router.get("/packs/available", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);

  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const subscription = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    const tier = (subscription[0]?.tier || user?.tier || "free").toLowerCase();

    // Sharp=3/week, Edge=5/week, Max=daily
    const limits: Record<string, number> = {
      free: 0,
      pro: 3, // Sharp
      elite: 5, // Edge
      whale: 7, // Max (daily)
    };

    const weeklyLimit = limits[tier] || 0;

    // Count packs opened in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const openedLastWeek = await db
      .select()
      .from(userCardCollections)
      .where(
        and(
          eq(userCardCollections.userId, userId),
          eq(userCardCollections.acquiredVia, "pack"),
          gt(userCardCollections.acquiredAt, sevenDaysAgo)
        )
      );

    // We open 3 cards per pack, so divide by 3 to get pack count
    const packsOpened = Math.floor(openedLastWeek.length / 3);
    const remaining = Math.max(0, weeklyLimit - packsOpened);

    // Check last pack opening time for daily limit on Whale
    const [lastOpening] = await db
      .select()
      .from(userCardCollections)
      .where(
        and(
          eq(userCardCollections.userId, userId),
          eq(userCardCollections.acquiredVia, "pack")
        )
      )
      .orderBy(desc(userCardCollections.acquiredAt))
      .limit(1);

    let canOpenToday = remaining > 0;
    if (tier === "whale" && lastOpening) {
      const lastDate = new Date(lastOpening.acquiredAt).toDateString();
      const todayDate = new Date().toDateString();
      if (lastDate === todayDate) {
        canOpenToday = false;
      }
    }

    res.json({
      available: canOpenToday,
      remainingToday: remaining,
      nextPackAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error("Error checking pack availability:", error);
    res.status(500).json({ message: "Failed to check pack availability" });
  }
});

// POST /api/cards/packs/open — open a pack (3 cards, tier-gated)
router.post("/packs/open", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);
  
  try {
    const availableCards = await db
      .select()
      .from(tradingCards)
      .limit(20);
      
    if (availableCards.length < 3) {
      return res.status(400).json({ message: "Not enough cards available to open a pack" });
    }
    
    const selected = availableCards
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
      
    const openedCards = [];
    
    for (const card of selected) {
      const instanceNum = (card.copiesIssued || 0) + 1;
      const sigKey = process.env.SESSION_SECRET || "sors-maxima-intelligence-2025";
      const cardSignature = crypto
        .createHash("sha256")
        .update(`${userId}:${card.id}:${instanceNum}:${sigKey}`)
        .digest("hex");

      const [collectionEntry] = await db
        .insert(userCardCollections)
        .values({
          userId: userId,
          cardId: card.id,
          instanceNumber: instanceNum,
          acquiredVia: "pack",
          acquiredAt: new Date(),
          isShowcase: false,
          cardSignature,
          isPublicShowcase: false,
        })
        .returning();
        
      await db
        .update(tradingCards)
        .set({ copiesIssued: instanceNum })
        .where(eq(tradingCards.id, card.id));
        
      openedCards.push({
        ...collectionEntry,
        card
      });
    }
    
    res.json(openedCards);
  } catch (error) {
    console.error("Error opening pack:", error);
    res.status(500).json({ message: "Failed to open pack" });
  }
});

// POST /api/cards/trades — create trade offer
router.post("/trades", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);
  const { toUserId, offeredCollectionIds, requestedCardId, message } = req.body;
  
  try {
    const [trade] = await db
      .insert(cardTrades)
      .values({
        fromUserId: userId,
        toUserId: Number(toUserId),
        offeredCollectionIds,
        requestedCardId,
        message,
        status: "pending",
        createdAt: new Date(),
      })
      .returning();
      
    res.json(trade);
  } catch (error) {
    console.error("Error creating trade:", error);
    res.status(500).json({ message: "Failed to create trade" });
  }
});

// PUT /api/cards/trades/:id — accept/decline/cancel trade
router.put("/trades/:id", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);
  const { id } = req.params;
  const { status } = req.body; 
  
  try {
    const [trade] = await db
      .select()
      .from(cardTrades)
      .where(eq(cardTrades.id, parseInt(id)));
      
    if (!trade) return res.status(404).json({ message: "Trade not found" });
    
    if (status === "accepted") {
      if (trade.toUserId !== userId) return res.sendStatus(403);
      
      const offeredIds = trade.offeredCollectionIds as number[];
      for (const collId of offeredIds) {
        await db
          .update(userCardCollections)
          .set({ userId: trade.toUserId, acquiredVia: "trade" })
          .where(eq(userCardCollections.id, collId));
      }
      
      if (trade.requestedCardId) {
        const [requestedItem] = await db
          .select()
          .from(userCardCollections)
          .where(and(
            eq(userCardCollections.userId, trade.toUserId),
            eq(userCardCollections.cardId, trade.requestedCardId)
          ))
          .limit(1);
          
        if (requestedItem) {
          await db
            .update(userCardCollections)
            .set({ userId: trade.fromUserId, acquiredVia: "trade" })
            .where(eq(userCardCollections.id, requestedItem.id));
        }
      }
    } else if (status === "cancelled") {
      if (trade.fromUserId !== userId) return res.sendStatus(403);
    } else if (status === "declined") {
      if (trade.toUserId !== userId) return res.sendStatus(403);
    }
    
    const [updatedTrade] = await db
      .update(cardTrades)
      .set({ status })
      .where(eq(cardTrades.id, parseInt(id)))
      .returning();
      
    res.json(updatedTrade);
  } catch (error) {
    console.error("Error updating trade:", error);
    res.status(500).json({ message: "Failed to update trade" });
  }
});

// GET /api/cards/trades — user's trade inbox/outbox
router.get("/trades", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);
  
  try {
    const allTrades = await db
      .select()
      .from(cardTrades)
      .where(or(
        eq(cardTrades.fromUserId, userId),
        eq(cardTrades.toUserId, userId)
      ));
      
    res.json(allTrades);
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({ message: "Failed to fetch trades" });
  }
});

// GET /api/cards/hall-of-fame — top performing cards
router.get("/hall-of-fame", async (req, res) => {
  try {
    const hofCards = await db
      .select()
      .from(tradingCards)
      .where(eq(tradingCards.settledResult, "won"))
      .orderBy(desc(tradingCards.ev))
      .limit(20);
      
    res.json(hofCards);
  } catch (error) {
    console.error("Error fetching hall of fame:", error);
    res.status(500).json({ message: "Failed to fetch hall of fame" });
  }
});

// GET /api/cards/verify/:collectionId — verify card authenticity
router.get("/verify/:collectionId", async (req, res) => {
  const { collectionId } = req.params;
  const verifierIp = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "unknown").split(",")[0].trim();
  const verifierUA = req.headers["user-agent"] || null;
  const collId = parseInt(collectionId);

  try {
    const [entry] = await db
      .select({ collection: userCardCollections, card: tradingCards, user: users })
      .from(userCardCollections)
      .innerJoin(tradingCards, eq(userCardCollections.cardId, tradingCards.id))
      .innerJoin(users, eq(userCardCollections.userId, users.id))
      .where(eq(userCardCollections.id, collId))
      .limit(1);

    if (!entry) {
      // Log failed lookup — could be someone sharing a fake/non-existent card
      const { logCardVerification } = await import("../communityIntegrityEngine");
      await logCardVerification({
        collectionId: collId,
        cardId: "unknown",
        issuedToUserId: null,
        verifierIp,
        verifierUserAgent: verifierUA,
        result: "not_found",
      });
      return res.status(404).json({ authentic: false, message: "Card not found" });
    }

    const sigKey = process.env.SESSION_SECRET || "sors-maxima-intelligence-2025";
    const expectedSig = crypto
      .createHash("sha256")
      .update(`${entry.collection.userId}:${entry.collection.cardId}:${entry.collection.instanceNumber}:${sigKey}`)
      .digest("hex");

    const authentic = entry.collection.cardSignature === expectedSig;

    // Log every verification attempt with outcome
    const { logCardVerification } = await import("../communityIntegrityEngine");
    await logCardVerification({
      collectionId: collId,
      cardId: entry.collection.cardId,
      issuedToUserId: entry.collection.userId,
      verifierIp,
      verifierUserAgent: verifierUA,
      result: authentic ? "authentic" : "tampered",
    });

    res.json({
      authentic,
      verificationCode: entry.collection.cardSignature?.slice(-12).toUpperCase() || "LEGACY",
      card: { grade: entry.card.grade, sport: entry.card.sport, pick: entry.card.pick, game: entry.card.game },
      instanceNumber: entry.collection.instanceNumber,
      issuedTo: entry.user.username,
      acquiredAt: entry.collection.acquiredAt,
    });
  } catch (error) {
    console.error("Error verifying card:", error);
    res.status(500).json({ authentic: false, message: "Verification failed" });
  }
});

// GET /api/cards/community/feed — public showcase cards from all users
router.get("/community/feed", async (req, res) => {
  try {
    const feed = await db
      .select({
        collection: userCardCollections,
        card: tradingCards,
        username: users.username,
      })
      .from(userCardCollections)
      .innerJoin(tradingCards, eq(userCardCollections.cardId, tradingCards.id))
      .innerJoin(users, eq(userCardCollections.userId, users.id))
      .where(eq(userCardCollections.isPublicShowcase, true))
      .orderBy(desc(userCardCollections.acquiredAt))
      .limit(60);

    res.json(feed);
  } catch (error) {
    console.error("Error fetching community feed:", error);
    res.status(500).json({ message: "Failed to fetch community feed" });
  }
});

// POST /api/cards/showcase/toggle — toggle public showcase for a collection item
router.post("/showcase/toggle", async (req, res) => {
  const userId = sessionUserId(req);
  if (!userId) return res.sendStatus(401);
  const { collectionId } = req.body;

  if (!collectionId) return res.status(400).json({ message: "collectionId required" });

  try {
    const [entry] = await db
      .select()
      .from(userCardCollections)
      .where(and(eq(userCardCollections.id, Number(collectionId)), eq(userCardCollections.userId, userId)))
      .limit(1);

    if (!entry) return res.status(404).json({ message: "Card not in your collection" });

    const [updated] = await db
      .update(userCardCollections)
      .set({ isPublicShowcase: !entry.isPublicShowcase })
      .where(eq(userCardCollections.id, entry.id))
      .returning();

    res.json({ isPublicShowcase: updated.isPublicShowcase, collectionId: updated.id });
  } catch (error) {
    console.error("Error toggling showcase:", error);
    res.status(500).json({ message: "Failed to toggle showcase" });
  }
});

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

// GET /api/cards/admin/all — every card ever minted + ownership counts
router.get("/admin/all", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  try {
    const allCards = await db
      .select()
      .from(tradingCards)
      .orderBy(desc(tradingCards.createdAt));

    // For each card get ownership details
    const withOwners = await Promise.all(
      allCards.map(async (card) => {
        const owners = await db
          .select({ userId: userCardCollections.userId, instanceNumber: userCardCollections.instanceNumber, acquiredVia: userCardCollections.acquiredVia, username: users.username })
          .from(userCardCollections)
          .innerJoin(users, eq(userCardCollections.userId, users.id))
          .where(eq(userCardCollections.cardId, card.id));
        return { ...card, owners };
      })
    );
    res.json(withOwners);
  } catch (err) {
    console.error("admin/all cards error:", err);
    res.status(500).json({ message: "Failed to fetch all cards" });
  }
});

// GET /api/cards/admin/stats — mint statistics
router.get("/admin/stats", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  try {
    const allCards = await db.select().from(tradingCards);
    const allCollections = await db.select().from(userCardCollections);

    const bySport: Record<string, number> = {};
    const byGrade: Record<string, number> = {};
    let totalCopies = 0;
    let settledWon = 0;
    let settledLost = 0;

    for (const c of allCards) {
      bySport[c.sport] = (bySport[c.sport] || 0) + 1;
      byGrade[c.grade] = (byGrade[c.grade] || 0) + 1;
      totalCopies += c.copiesIssued || 0;
      if (c.settledResult === "won") settledWon++;
      if (c.settledResult === "lost") settledLost++;
    }

    res.json({
      totalCards: allCards.length,
      totalCopies,
      totalCollectionEntries: allCollections.length,
      bySport,
      byGrade,
      settledWon,
      settledLost,
      pending: allCards.filter((c) => c.settledResult === "pending" || !c.settledResult).length,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// POST /api/cards/admin/seed — mint demo showcase cards (admin only)
router.post("/admin/seed", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminUserId = sessionUserId(req);
  if (!adminUserId) return res.status(400).json({ message: "Admin user ID required" });

  const SEED_CARDS = [
    { sport: "NBA", pick: "LeBron James Over 28.5 Points", betType: "player_points", odds: -115, confidence: 72, ev: 14.8, grade: "A+", game: "Lakers vs Celtics", maxCopies: 25, settledResult: "won" },
    { sport: "NHL", pick: "Vegas Golden Knights -1.5", betType: "puck_line", odds: 195, confidence: 68, ev: 22.3, grade: "A", game: "Oilers @ Golden Knights", maxCopies: 50, settledResult: "won" },
    { sport: "NCAAB", pick: "Kansas Jayhawks -7", betType: "spread", odds: -110, confidence: 65, ev: 11.4, grade: "B+", game: "Kansas vs Texas", maxCopies: 100, settledResult: "pending" },
    { sport: "NBA", pick: "Stephen Curry Over 5.5 Three Pointers", betType: "player_threes", odds: -120, confidence: 74, ev: 16.2, grade: "A+", game: "Warriors vs Suns", maxCopies: 10, settledResult: "won" },
    { sport: "NFL", pick: "Patrick Mahomes Over 285.5 Passing Yards", betType: "player_pass_yards", odds: -110, confidence: 69, ev: 13.7, grade: "A", game: "Chiefs @ Raiders", maxCopies: 75, settledResult: "won" },
    { sport: "NHL", pick: "Colorado Avalanche ML", betType: "moneyline", odds: -135, confidence: 63, ev: 9.8, grade: "B+", game: "Avalanche vs Blues", maxCopies: 200, settledResult: "lost" },
  ];

  const inserted: any[] = [];
  for (const seed of SEED_CARDS) {
    const cardId = `seed-${seed.sport.toLowerCase()}-${crypto.randomBytes(4).toString("hex")}`;
    try {
      const [card] = await db.insert(tradingCards).values({
        id: cardId,
        sport: seed.sport,
        pick: seed.pick,
        betType: seed.betType,
        odds: seed.odds,
        confidence: seed.confidence,
        ev: seed.ev,
        grade: seed.grade,
        game: seed.game,
        gameTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
        maxCopies: seed.maxCopies,
        copiesIssued: 1,
        settledResult: seed.settledResult,
        cardType: "admin_seeded",
        createdAt: new Date(),
      }).onConflictDoNothing().returning();

      if (card) {
        await db.insert(userCardCollections).values({
          userId: adminUserId,
          cardId: card.id,
          instanceNumber: 1,
          acquiredVia: "admin_seed",
          isShowcase: true,
          isPublicShowcase: true,
          acquiredAt: new Date(),
        }).onConflictDoNothing();
        inserted.push(card);
      }
    } catch (e) {
      // Skip duplicates
    }
  }

  res.json({ seeded: inserted.length, cards: inserted });
});

// ─── ADMIN: CARD REGISTRY ────────────────────────────────────────────────────

// GET /api/cards/admin/registry — full card listing with type, status, owners
router.get("/admin/registry", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  try {
    const allCards = await db
      .select()
      .from(tradingCards)
      .orderBy(desc(tradingCards.createdAt));

    const withOwners = await Promise.all(
      allCards.map(async (card) => {
        const owners = await db
          .select({ id: userCardCollections.id, userId: userCardCollections.userId, instanceNumber: userCardCollections.instanceNumber, acquiredVia: userCardCollections.acquiredVia, isRevoked: userCardCollections.isRevoked, isFeatured: userCardCollections.isFeatured, isPublicShowcase: userCardCollections.isPublicShowcase, username: users.username })
          .from(userCardCollections)
          .innerJoin(users, eq(userCardCollections.userId, users.id))
          .where(eq(userCardCollections.cardId, card.id));
        return { ...card, owners };
      })
    );

    res.json(withOwners);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch registry" });
  }
});

// POST /api/cards/admin/:cardId/freeze — freeze a card (disables all operations)
router.post("/admin/:cardId/freeze", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const { cardId } = req.params;
  const { reason } = req.body;

  try {
    const [card] = await db
      .update(tradingCards)
      .set({ isFrozen: true, frozenReason: reason || "Admin freeze", frozenAt: new Date(), frozenBy: adminId })
      .where(eq(tradingCards.id, cardId))
      .returning();

    if (!card) return res.status(404).json({ message: "Card not found" });

    await db.insert(cardAuditLog).values({
      actionType: "freeze",
      cardId,
      adminId,
      reason: reason || "Admin freeze",
      metadata: { cardGrade: card.grade, cardSport: card.sport },
    });

    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ message: "Failed to freeze card" });
  }
});

// POST /api/cards/admin/:cardId/unfreeze — unfreeze a card
router.post("/admin/:cardId/unfreeze", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const { cardId } = req.params;

  try {
    const [card] = await db
      .update(tradingCards)
      .set({ isFrozen: false, frozenReason: null, frozenAt: null, frozenBy: null })
      .where(eq(tradingCards.id, cardId))
      .returning();

    if (!card) return res.status(404).json({ message: "Card not found" });

    await db.insert(cardAuditLog).values({
      actionType: "unfreeze",
      cardId,
      adminId,
      reason: "Admin unfreeze",
      metadata: {},
    });

    res.json({ success: true, card });
  } catch (err) {
    res.status(500).json({ message: "Failed to unfreeze card" });
  }
});

// POST /api/cards/admin/collection/:id/revoke — revoke a user's specific card copy
router.post("/admin/collection/:id/revoke", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const collId = parseInt(req.params.id);
  const { reason } = req.body;

  try {
    const [entry] = await db
      .update(userCardCollections)
      .set({ isRevoked: true, revokedReason: reason || "Admin revoke", revokedAt: new Date(), revokedBy: adminId, isPublicShowcase: false, isFeatured: false })
      .where(eq(userCardCollections.id, collId))
      .returning();

    if (!entry) return res.status(404).json({ message: "Collection entry not found" });

    await db.insert(cardAuditLog).values({
      actionType: "revoke",
      cardId: entry.cardId,
      collectionId: collId,
      targetUserId: entry.userId,
      adminId,
      reason: reason || "Admin revoke",
      metadata: {},
    });

    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke card" });
  }
});

// POST /api/cards/admin/collection/:id/restore — restore revoked card
router.post("/admin/collection/:id/restore", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const collId = parseInt(req.params.id);

  try {
    const [entry] = await db
      .update(userCardCollections)
      .set({ isRevoked: false, revokedReason: null, revokedAt: null, revokedBy: null })
      .where(eq(userCardCollections.id, collId))
      .returning();

    if (!entry) return res.status(404).json({ message: "Collection entry not found" });

    await db.insert(cardAuditLog).values({
      actionType: "restore",
      cardId: entry.cardId,
      collectionId: collId,
      targetUserId: entry.userId,
      adminId,
      reason: "Admin restore",
      metadata: {},
    });

    res.json({ success: true, entry });
  } catch (err) {
    res.status(500).json({ message: "Failed to restore card" });
  }
});

// POST /api/cards/admin/manual-mint — admin manually issues a card to a user
router.post("/admin/manual-mint", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const { username, sport, pick, grade, betType, odds, confidence, ev, game, maxCopies, cardType } = req.body;

  if (!username || !sport || !pick || !grade) {
    return res.status(400).json({ message: "username, sport, pick, grade required" });
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const cardId = `admin-${crypto.randomBytes(6).toString("hex")}`;

    const [newCard] = await db.insert(tradingCards).values({
      id: cardId,
      sport: sport || "NBA",
      pick: pick || "Manual Pick",
      grade: grade || "B",
      betType: betType || "moneyline",
      odds: Number(odds) || -110,
      confidence: Number(confidence) || 65,
      ev: Number(ev) || 10,
      game: game || "Manual Game",
      gameTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
      maxCopies: Number(maxCopies) || 10,
      copiesIssued: 1,
      cardType: cardType || "admin_seeded",
      createdAt: new Date(),
    }).returning();

    const sigKey = process.env.SESSION_SECRET || "sors-maxima-intelligence-2025";
    const sig = crypto.createHash("sha256").update(`${targetUser.id}:${cardId}:1:${sigKey}`).digest("hex");

    const [collEntry] = await db.insert(userCardCollections).values({
      userId: targetUser.id,
      cardId,
      instanceNumber: 1,
      acquiredVia: "admin_issued",
      acquiredAt: new Date(),
      isShowcase: false,
      cardSignature: sig,
      isPublicShowcase: false,
    }).returning();

    await db.insert(cardAuditLog).values({
      actionType: "manual_mint",
      cardId,
      collectionId: collEntry.id,
      targetUserId: targetUser.id,
      adminId,
      reason: `Manually issued to ${username}`,
      metadata: { sport, grade, cardType: cardType || "admin_seeded" },
    });

    res.json({ success: true, card: newCard, collection: collEntry, issuedTo: username });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to mint card", error: err.message });
  }
});

// GET /api/cards/admin/audit-log — paginated admin action log
router.get("/admin/audit-log", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = (page - 1) * limit;

  try {
    const rows = await db
      .select({
        log: cardAuditLog,
        adminUsername: users.username,
      })
      .from(cardAuditLog)
      .leftJoin(users, eq(cardAuditLog.adminId, users.id))
      .orderBy(desc(cardAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(cardAuditLog);

    res.json({ rows, total: count, page, limit });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch audit log" });
  }
});

// GET /api/cards/admin/security/stats — fraud + verification stats
router.get("/admin/security/stats", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const verifyTodayRes = await db.execute(sql`
      SELECT count(*)::int as total, 
             count(*) FILTER (WHERE result = 'authentic')::int as authentic,
             count(*) FILTER (WHERE result = 'tampered')::int as tampered,
             count(*) FILTER (WHERE result = 'not_found')::int as not_found
      FROM card_verification_log 
      WHERE verified_at >= ${today}
    `).catch(() => ({ rows: [{ total: 0, authentic: 0, tampered: 0, not_found: 0 }] }));

    const topIpsRes = await db.execute(sql`
      SELECT ip_address, count(*)::int as verifications
      FROM card_verification_log 
      WHERE verified_at >= NOW() - INTERVAL '24 hours'
      GROUP BY ip_address 
      ORDER BY verifications DESC 
      LIMIT 10
    `).catch(() => ({ rows: [] }));

    const fraudAlertsRes = await db.execute(sql`
      SELECT id, alert_type, severity, username, details, created_at, reviewed
      FROM community_fraud_alerts 
      ORDER BY created_at DESC 
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    const verifyToday = (verifyTodayRes as any)?.rows?.[0] || { total: 0, authentic: 0, tampered: 0, not_found: 0 };
    const topIps = (topIpsRes as any)?.rows || [];
    const fraudAlerts = (fraudAlertsRes as any)?.rows || [];

    const [frozenCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tradingCards).where(eq(tradingCards.isFrozen, true));
    const [revokedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(userCardCollections).where(eq(userCardCollections.isRevoked, true));

    res.json({
      verifyToday,
      topIps,
      fraudAlerts,
      frozenCards: frozenCount?.count || 0,
      revokedCopies: revokedCount?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch security stats" });
  }
});

// GET /api/cards/admin/community-showcase — all publicly showcased cards
router.get("/admin/community-showcase", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  try {
    const feed = await db
      .select({
        collection: userCardCollections,
        card: tradingCards,
        username: users.username,
      })
      .from(userCardCollections)
      .innerJoin(tradingCards, eq(userCardCollections.cardId, tradingCards.id))
      .innerJoin(users, eq(userCardCollections.userId, users.id))
      .where(eq(userCardCollections.isPublicShowcase, true))
      .orderBy(desc(userCardCollections.acquiredAt));

    res.json(feed);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch community showcase" });
  }
});

// POST /api/cards/admin/community/:id/hide — remove from public showcase
router.post("/admin/community/:id/hide", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const collId = parseInt(req.params.id);

  try {
    const [entry] = await db
      .update(userCardCollections)
      .set({ isPublicShowcase: false, isFeatured: false })
      .where(eq(userCardCollections.id, collId))
      .returning();

    await db.insert(cardAuditLog).values({
      actionType: "community_hide",
      cardId: entry?.cardId,
      collectionId: collId,
      targetUserId: entry?.userId,
      adminId,
      reason: "Removed from community showcase by admin",
      metadata: {},
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to hide card" });
  }
});

// POST /api/cards/admin/community/:id/feature — feature a card in spotlight
router.post("/admin/community/:id/feature", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  const adminId = sessionUserId(req);
  const collId = parseInt(req.params.id);

  try {
    const [current] = await db.select().from(userCardCollections).where(eq(userCardCollections.id, collId)).limit(1);
    if (!current) return res.status(404).json({ message: "Not found" });

    const [entry] = await db
      .update(userCardCollections)
      .set({ isFeatured: !current.isFeatured })
      .where(eq(userCardCollections.id, collId))
      .returning();

    await db.insert(cardAuditLog).values({
      actionType: entry.isFeatured ? "community_feature" : "community_unfeature",
      cardId: entry.cardId,
      collectionId: collId,
      targetUserId: entry.userId,
      adminId,
      reason: entry.isFeatured ? "Featured in community spotlight" : "Removed from spotlight",
      metadata: {},
    });

    res.json({ success: true, isFeatured: entry.isFeatured });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle feature" });
  }
});

// GET /api/cards/admin/analytics — system analytics
router.get("/admin/analytics", async (req, res) => {
  if (!req.session?.isAdmin) return res.sendStatus(403);
  try {
    const totalsRes = await db.execute(sql`
      SELECT 
        count(*)::int as total_cards,
        count(*) FILTER (WHERE card_type = 'system')::int as system_cards,
        count(*) FILTER (WHERE card_type = 'member')::int as member_cards,
        count(*) FILTER (WHERE card_type = 'admin_seeded')::int as admin_seeded_cards,
        count(*) FILTER (WHERE is_frozen = true)::int as frozen_cards,
        count(*) FILTER (WHERE settled_result = 'won')::int as won_cards,
        count(*) FILTER (WHERE settled_result = 'lost')::int as lost_cards,
        count(*) FILTER (WHERE settled_result = 'pending' OR settled_result IS NULL)::int as pending_cards
      FROM trading_cards
    `);

    const collTotalsRes = await db.execute(sql`
      SELECT 
        count(*)::int as total_copies,
        count(*) FILTER (WHERE is_revoked = true)::int as revoked_copies,
        count(*) FILTER (WHERE is_public_showcase = true)::int as showcased_copies,
        count(*) FILTER (WHERE is_featured = true)::int as featured_copies,
        count(*) FILTER (WHERE acquired_via = 'pack')::int as pack_opens
      FROM user_card_collections
    `);

    const gradeDistribRes = await db.execute(sql`
      SELECT grade, count(*)::int as count 
      FROM trading_cards 
      GROUP BY grade 
      ORDER BY grade
    `);

    const sportDistribRes = await db.execute(sql`
      SELECT sport, count(*)::int as count 
      FROM trading_cards 
      GROUP BY sport 
      ORDER BY count DESC
    `);

    const totals = (totalsRes as any)?.rows?.[0] || {};
    const collTotals = (collTotalsRes as any)?.rows?.[0] || {};
    const gradeDistrib = (gradeDistribRes as any)?.rows || [];
    const sportDistrib = (sportDistribRes as any)?.rows || [];

    const recentActivity = await db
      .select({ log: cardAuditLog, username: users.username })
      .from(cardAuditLog)
      .leftJoin(users, eq(cardAuditLog.adminId, users.id))
      .orderBy(desc(cardAuditLog.createdAt))
      .limit(10);

    res.json({
      totals,
      collTotals,
      gradeDistrib,
      sportDistrib,
      recentActivity,
    });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch analytics", error: err.message });
  }
});

// POST /api/cards/mint — mint cards from a pick (called by pick engine)
router.post("/mint", async (req, res) => {
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const cardData = req.body;
  
  try {
    const [newCard] = await db
      .insert(tradingCards)
      .values({
        ...cardData,
        id: cardData.id || crypto.randomUUID(),
        createdAt: new Date(),
      })
      .returning();
      
    res.json(newCard);
  } catch (error) {
    console.error("Error minting card:", error);
    res.status(500).json({ message: "Failed to mint card" });
  }
});

export default router;
