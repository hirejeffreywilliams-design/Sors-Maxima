import { db } from "./db";
import { users } from "./dbSchema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const verificationCodes = new Map<string, { code: string; expires: number; email: string }>();

// ─── Password Reset Tokens ───────────────────────────────────────────────────
const resetTokens = new Map<string, { email: string; expires: number }>();

export function generateResetToken(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + 60 * 60 * 1000; // 1 hour
  resetTokens.set(token, { email, expires });
  return token;
}

export function consumeResetToken(token: string): string | null {
  const record = resetTokens.get(token);
  if (!record) return null;
  if (Date.now() > record.expires) {
    resetTokens.delete(token);
    return null;
  }
  resetTokens.delete(token);
  return record.email;
}

export function isValidResetToken(token: string): boolean {
  const record = resetTokens.get(token);
  if (!record) return false;
  if (Date.now() > record.expires) { resetTokens.delete(token); return false; }
  return true;
}

export function generateAndStoreCode(userId: string, email: string): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = Date.now() + 15 * 60 * 1000;
  verificationCodes.set(userId, { code, expires, email });
  return code;
}

export function validateCode(userId: string, inputCode: string): boolean {
  const record = verificationCodes.get(userId);
  if (!record) return false;
  if (record.code !== inputCode) return false;
  if (Date.now() > record.expires) return false;
  verificationCodes.delete(userId);
  return true;
}

export async function markEmailVerified(userId: number): Promise<void> {
  await db.update(users).set({ emailVerified: true } as any).where(eq(users.id, userId));
}

export async function getEmailVerifiedStatus(userId: number): Promise<boolean> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return (user as any)?.emailVerified ?? false;
}
