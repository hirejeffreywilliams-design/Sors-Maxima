import { db } from "./db";
import { users } from "./dbSchema";
import { eq } from "drizzle-orm";

const verificationCodes = new Map<string, { code: string; expires: number; email: string }>();

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
