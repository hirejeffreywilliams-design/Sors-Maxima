import { db } from "./db";
import { users, tokenStore } from "./dbSchema";
import { eq, and, gt, lt } from "drizzle-orm";
import crypto from "crypto";

// ─── Password Reset Tokens (DB-persisted) ────────────────────────────────────

export async function generateResetToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Clean up any existing reset tokens for this email first
  await db.delete(tokenStore).where(
    and(eq(tokenStore.type, "reset"), eq(tokenStore.identifier, email))
  );

  await db.insert(tokenStore).values({
    token,
    type: "reset",
    identifier: email,
    expiresAt,
  });

  return token;
}

export async function consumeResetToken(token: string): Promise<string | null> {
  const [record] = await db
    .select()
    .from(tokenStore)
    .where(and(eq(tokenStore.token, token), eq(tokenStore.type, "reset")))
    .limit(1);

  if (!record) return null;

  if (new Date() > record.expiresAt) {
    await db.delete(tokenStore).where(eq(tokenStore.token, token));
    return null;
  }

  await db.delete(tokenStore).where(eq(tokenStore.token, token));
  return record.identifier;
}

export async function isValidResetToken(token: string): Promise<boolean> {
  const [record] = await db
    .select()
    .from(tokenStore)
    .where(and(eq(tokenStore.token, token), eq(tokenStore.type, "reset")))
    .limit(1);

  if (!record) return false;

  if (new Date() > record.expiresAt) {
    await db.delete(tokenStore).where(eq(tokenStore.token, token));
    return false;
  }

  return true;
}

// ─── Email Verification Codes (DB-persisted) ─────────────────────────────────

export async function generateAndStoreCode(userId: string, email: string): Promise<string> {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Replace any existing code for this user
  await db.delete(tokenStore).where(
    and(eq(tokenStore.type, "verify"), eq(tokenStore.identifier, userId))
  );

  await db.insert(tokenStore).values({
    token: crypto.randomBytes(16).toString("hex"),
    type: "verify",
    identifier: userId,
    code,
    expiresAt,
  });

  return code;
}

export async function validateCode(userId: string, inputCode: string): Promise<boolean> {
  const [record] = await db
    .select()
    .from(tokenStore)
    .where(and(eq(tokenStore.type, "verify"), eq(tokenStore.identifier, userId)))
    .limit(1);

  if (!record || record.code !== inputCode) return false;

  if (new Date() > record.expiresAt) {
    await db.delete(tokenStore).where(eq(tokenStore.token, record.token));
    return false;
  }

  await db.delete(tokenStore).where(eq(tokenStore.token, record.token));
  return true;
}

export async function markEmailVerified(userId: number): Promise<void> {
  await db.update(users).set({ emailVerified: true } as any).where(eq(users.id, userId));
}

export async function getEmailVerifiedStatus(userId: number): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return (user as any)?.emailVerified ?? false;
}

// Periodic cleanup of expired tokens (call once on startup)
export async function cleanupExpiredTokens(): Promise<void> {
  try {
    await db.delete(tokenStore).where(lt(tokenStore.expiresAt, new Date()));
  } catch {
    // Non-critical — tokens expire on access anyway
  }
}
