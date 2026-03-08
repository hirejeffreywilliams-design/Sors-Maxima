import { Router } from "express";
import { tradingCards, userCardCollections, cardTrades, users, subscriptions } from "../dbSchema";
import { db } from "../db";
import { eq, and, desc, or, gt } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /api/cards/collection — user's owned cards
router.get("/collection", async (req, res) => {
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const userId = Number(req.session.userId);
  
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
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const userId = Number(req.session.userId);

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
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const userId = Number(req.session.userId);
  
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
      const [collectionEntry] = await db
        .insert(userCardCollections)
        .values({
          userId: userId,
          cardId: card.id,
          instanceNumber: (card.copiesIssued || 0) + 1,
          acquiredVia: "pack",
          acquiredAt: new Date(),
          isShowcase: false,
        })
        .returning();
        
      await db
        .update(tradingCards)
        .set({ copiesIssued: (card.copiesIssued || 0) + 1 })
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
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const userId = Number(req.session.userId);
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
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const userId = Number(req.session.userId);
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
  if (!req.session?.isAuthenticated || !req.session?.userId) return res.sendStatus(401);
  const userId = Number(req.session.userId);
  
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
