import { db } from "./db";
import { users, subscriptions } from "./dbSchema";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logError, logWarn, logInfo } from "./errorLogger";
import { evaluateRegistrationRisk, remapUserId, type DeviceFingerprintData, type RegistrationRisk } from "./trialFraudEngine";

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

export interface DbUser {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  isAdmin: boolean;
  isBanned: boolean;
  banReason: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
}

export async function registerUser(
  username: string, 
  email: string, 
  password: string,
  ip?: string,
  userAgent?: string,
  deviceFingerprint?: Partial<DeviceFingerprintData>
): Promise<{ success: boolean; error?: string; userId?: number; fraudRisk?: RegistrationRisk }> {
  try {
    const existingUsername = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (existingUsername.length > 0) {
      return { success: false, error: "Username already exists" };
    }

    const existingEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingEmail.length > 0) {
      return { success: false, error: "Email already registered" };
    }

    const tempUserId = `pending-${Date.now()}`;
    const fraudRisk = evaluateRegistrationRisk({
      email,
      username,
      ip: ip || '0.0.0.0',
      userAgent: userAgent || 'unknown',
      userId: tempUserId,
      deviceFingerprint,
    });

    if (fraudRisk.action === 'block') {
      logWarn(`Registration blocked by fraud engine for ${username}: ${fraudRisk.reason} (score: ${fraudRisk.riskScore})`);
      return { success: false, error: "Unable to create account at this time. Please contact support if you believe this is an error.", fraudRisk };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const [newUser] = await db.insert(users).values({
      username,
      email,
      passwordHash,
      isAdmin: false,
      isBanned: false,
      loginAttempts: 0,
    }).returning();

    await db.insert(subscriptions).values({
      userId: newUser.id,
      tier: "free",
      status: "active",
    });

    remapUserId(tempUserId, String(newUser.id));

    if (fraudRisk.action === 'verify') {
      logWarn(`Registration flagged for verification: ${username} (score: ${fraudRisk.riskScore})`);
    }

    logInfo(`New user registered: ${username} (fraud score: ${fraudRisk.riskScore}, action: ${fraudRisk.action})`);
    return { success: true, userId: newUser.id, fraudRisk };
  } catch (error: any) {
    logError(error, { context: "registerUser", username });
    return { success: false, error: "Registration failed" };
  }
}

export async function loginUser(
  username: string, 
  password: string,
  ip?: string
): Promise<{ success: boolean; error?: string; user?: DbUser }> {
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    
    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const remainingMins = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      logWarn(`Login attempt on locked account: ${username}`);
      return { success: false, error: `Account locked. Try again in ${remainingMins} minutes` };
    }

    if (user.isBanned) {
      return { success: false, error: `Account suspended: ${user.banReason || "Contact support"}` };
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!validPassword) {
      const newAttempts = user.loginAttempts + 1;
      const updates: any = { loginAttempts: newAttempts };
      
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
        logWarn(`Account locked due to failed attempts: ${username}`);
      }
      
      await db.update(users).set(updates).where(eq(users.id, user.id));
      return { success: false, error: "Invalid credentials" };
    }

    await db.update(users).set({
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    }).where(eq(users.id, user.id));

    logInfo(`User logged in: ${username}`);
    return { success: true, user: user as DbUser };
  } catch (error: any) {
    logError(error, { context: "loginUser", username });
    return { success: false, error: "Login failed" };
  }
}

export async function getUserById(id: number): Promise<DbUser | null> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user as DbUser || null;
  } catch (error: any) {
    logError(error, { context: "getUserById", userId: id });
    return null;
  }
}

export async function getAllUsers(): Promise<DbUser[]> {
  try {
    const allUsers = await db.select().from(users);
    return allUsers as DbUser[];
  } catch (error: any) {
    logError(error, { context: "getAllUsers" });
    return [];
  }
}

export async function banUser(userId: number, reason: string): Promise<boolean> {
  try {
    await db.update(users).set({
      isBanned: true,
      banReason: reason,
    }).where(eq(users.id, userId));
    logInfo(`User banned: ${userId}, reason: ${reason}`);
    return true;
  } catch (error: any) {
    logError(error, { context: "banUser", userId });
    return false;
  }
}

export async function unbanUser(userId: number): Promise<boolean> {
  try {
    await db.update(users).set({
      isBanned: false,
      banReason: null,
    }).where(eq(users.id, userId));
    logInfo(`User unbanned: ${userId}`);
    return true;
  } catch (error: any) {
    logError(error, { context: "unbanUser", userId });
    return false;
  }
}

export async function getUserSubscription(userId: number): Promise<{
  tier: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
} | null> {
  try {
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
    if (!sub) return null;
    return {
      tier: sub.tier,
      status: sub.status,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
    };
  } catch (error: any) {
    logError(error, { context: "getUserSubscription", userId });
    return null;
  }
}

export async function resetPassword(
  username: string,
  email: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [user] = await db.select().from(users)
      .where(and(eq(users.username, username), eq(users.email, email)))
      .limit(1);

    if (!user) {
      return { success: false, error: "No account found matching that username and email combination" };
    }

    if (user.isBanned) {
      return { success: false, error: "This account has been suspended. Contact support for assistance." };
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(users).set({
      passwordHash,
      loginAttempts: 0,
      lockedUntil: null,
    }).where(eq(users.id, user.id));

    logInfo(`Password reset for user: ${username}`);
    return { success: true };
  } catch (error: any) {
    logError(error, { context: "resetPassword", username });
    return { success: false, error: "Password reset failed. Please try again." };
  }
}

export async function adminResetPassword(
  userId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await db.update(users).set({
      passwordHash,
      loginAttempts: 0,
      lockedUntil: null,
    }).where(eq(users.id, userId));

    logInfo(`Admin reset password for user: ${user.username} (id: ${userId})`);
    return { success: true };
  } catch (error: any) {
    logError(error, { context: "adminResetPassword", userId });
    return { success: false, error: "Password reset failed" };
  }
}

export async function updateSubscription(
  userId: number,
  updates: {
    tier?: string;
    status?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
  }
): Promise<boolean> {
  try {
    await db.update(subscriptions).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(subscriptions.userId, userId));
    logInfo(`Subscription updated for user ${userId}`);
    return true;
  } catch (error: any) {
    logError(error, { context: "updateSubscription", userId });
    return false;
  }
}
