import type { Express } from "express";
import { registerUser, loginUser, getUserById, resetPassword, adminResetPassword, changePassword, getUserByEmail, resetPasswordByEmail, getOrCreateAdminUser } from "../dbAuthService";
import { createTrustedDevice, validateDeviceToken, getUserDevices, revokeDevice, revokeAllDevices, refreshDeviceToken, getDeviceStats } from "../trustedDeviceService";
import { sensitiveRouteRateLimitMiddleware } from "../securityMiddleware";
import { getClientIp, requireAdmin } from "./helpers";
import { stripeService } from "../stripeService";
import { generateAndStoreCode, validateCode, markEmailVerified, getEmailVerifiedStatus, generateResetToken, consumeResetToken, isValidResetToken } from "../emailVerification";
import { sendVerificationEmail, sendPasswordResetEmail } from "../emailService";
import { getFounderData } from "../foundersEngine";

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const { email, username, password, deviceFingerprint, dateOfBirth } = req.body;
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!email || !username || !password) {
        return res.status(400).json({ error: "Email, username, and password are required" });
      }

      if (!dateOfBirth) {
        return res.status(400).json({ error: "Date of birth is required for age verification" });
      }

      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime())) {
        return res.status(400).json({ error: "Invalid date of birth" });
      }
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const monthDiff = now.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
      if (age < 21) {
        return res.status(403).json({ error: "You must be at least 21 years old to create an account on this platform" });
      }

      const result = await registerUser(username, email, password, ip, userAgent, deviceFingerprint);

      if (!result.success) {
        const statusCode = result.fraudRisk?.action === 'block' ? 403 : 400;
        return res.status(statusCode).json({ 
          error: result.error,
          requiresVerification: result.fraudRisk?.action === 'verify',
        });
      }

      const userIdStr = String(result.userId);
      const code = await generateAndStoreCode(userIdStr, email);
      sendVerificationEmail(email, username, code).catch(err => {
        console.error("Failed to send verification email on registration:", err);
      });

      req.session.isAuthenticated = true;
      req.session.username = username;
      req.session.userId = userIdStr;
      req.session.isAdmin = false;
      req.session.role = 'user';

      return res.json({ 
        success: true, 
        username,
        email,
        requiresVerification: result.fraudRisk?.action === 'verify',
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (userId === "admin") {
        return res.status(400).json({ error: "Admin account does not require email verification" });
      }

      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      const isValid = await validateCode(userId, code);
      if (!isValid) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      await markEmailVerified(Number(userId));
      return res.json({ success: true });
    } catch (err) {
      console.error("Email verification error:", err);
      return res.status(500).json({ error: "Verification failed" });
    }
  });

  const lastVerificationSent = new Map<string, number>();

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (userId === "admin") {
        return res.status(400).json({ error: "Admin account does not require email verification" });
      }

      const now = Date.now();
      const lastSent = lastVerificationSent.get(userId) || 0;
      const cooldown = 60 * 1000;
      if (now - lastSent < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastSent)) / 1000);
        return res.status(429).json({ error: `Please wait ${remaining} seconds before requesting a new code` });
      }

      const user = await getUserById(Number(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const code = await generateAndStoreCode(userId, user.email);
      await sendVerificationEmail(user.email, user.username, code);
      lastVerificationSent.set(userId, now);

      return res.json({ success: true, cooldownSeconds: 60 });
    } catch (err) {
      console.error("Resend verification error:", err);
      return res.status(500).json({ error: "Failed to resend verification code" });
    }
  });

  app.get("/api/auth/verification-status", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (userId === "admin") {
        return res.json({ email: process.env.ADMIN_EMAIL || "hirejeffreywilliams@gmail.com" });
      }
      const user = await getUserById(Number(userId));
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json({ email: user.email });
    } catch (err) {
      console.error("Verification status error:", err);
      return res.status(500).json({ error: "Failed to get status" });
    }
  });

  app.post("/api/auth/login", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const { username, password, trustDevice } = req.body;
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
      const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
      const isAdminLogin = ADMIN_USERNAME && ADMIN_PASSWORD && username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

      if (isAdminLogin) {
        // Look up (or create) the admin's DB row so all profile endpoints
        // get a real numeric userId — preventing NaN errors.
        const adminNumericId = await getOrCreateAdminUser(ADMIN_USERNAME!).catch(() => null);
        req.session.isAuthenticated = true;
        req.session.username = ADMIN_USERNAME;
        req.session.userId = adminNumericId ? String(adminNumericId) : 'admin';
        req.session.isAdmin = true;
        req.session.role = 'admin';

        if (trustDevice) {
          const result = createTrustedDevice('admin', userAgent, ip);
          if ('rawToken' in result) {
            res.cookie('device_token', result.rawToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              maxAge: 60 * 24 * 60 * 60 * 1000,
              path: '/',
            });
          }
        }

        await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
        return res.json({ success: true, username: ADMIN_USERNAME, isAdmin: true });
      }

      const result = await loginUser(username, password, ip);

      if (!result.success) {
        return res.status(401).json({ error: result.error });
      }

      req.session.isAuthenticated = true;
      req.session.username = result.user!.username;
      req.session.userId = String(result.user!.id);
      req.session.isAdmin = result.user!.isAdmin;
      req.session.role = result.user!.isAdmin ? 'admin' : 'user';

      if (trustDevice) {
        const deviceResult = createTrustedDevice(String(result.user!.id), userAgent, ip);
        if ('rawToken' in deviceResult) {
          res.cookie('device_token', deviceResult.rawToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 24 * 60 * 60 * 1000,
            path: '/',
          });
        }
      }

      await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));

      const loginFounderData = await getFounderData(result.user!.username).catch(() => null);
      const loginFounderFields = loginFounderData ? {
        isFounder: loginFounderData.isFounder,
        founderNumber: loginFounderData.founderNumber,
        founderType: loginFounderData.founderType,
        founderReferralCode: loginFounderData.founderReferralCode,
        founderCreditsEarned: loginFounderData.founderCreditsEarned,
      } : {};

      return res.json({ 
        success: true, 
        username: result.user!.username,
        isAdmin: result.user!.isAdmin,
        ...loginFounderFields,
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // Step 1: Request a reset link via email
  app.post("/api/auth/forgot-password", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required" });
      }

      // Always return success (don't reveal if email exists)
      const user = await getUserByEmail(email.trim().toLowerCase());
      if (user && !user.isBanned) {
        const token = await generateResetToken(email.trim().toLowerCase());
        const host = (req.headers["x-forwarded-host"] as string) || req.headers.host || process.env.REPLIT_DOMAINS?.split(",")[0] || "localhost:5000";
        const protocol = host.includes("localhost") ? "http" : "https";
        const resetLink = `${protocol}://${host}/reset-password?token=${token}`;
        await sendPasswordResetEmail(user.email, user.username, resetLink);
      }

      return res.json({ success: true, message: "If an account with that email exists, we've sent reset instructions." });
    } catch (err) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Step 2: Validate a reset token (used by the frontend before showing the form)
  app.get("/api/auth/reset-password/validate", async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      return res.status(400).json({ valid: false, error: "Token is required" });
    }
    return res.json({ valid: await isValidResetToken(token) });
  });

  // Step 2: Submit new password with token
  app.post("/api/auth/reset-password", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Reset token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must include uppercase, lowercase, and a number" });
      }

      const email = await consumeResetToken(token);
      if (!email) {
        return res.status(400).json({ error: "This reset link has expired or already been used. Please request a new one." });
      }

      const result = await resetPasswordByEmail(email, newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, message: "Password updated. You can now sign in with your new password." });
    } catch (err) {
      console.error("Password reset error:", err);
      return res.status(500).json({ error: "Password reset failed" });
    }
  });

  app.post("/api/auth/change-password", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (userId === "admin") {
        return res.status(403).json({ error: "Admin password is managed via environment configuration. Contact your system administrator to update it." });
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must include uppercase, lowercase, and a number" });
      }

      if (confirmPassword && newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      const result = await changePassword(Number(userId), currentPassword, newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      return res.status(500).json({ error: "Password change failed" });
    }
  });

  app.post("/api/admin/reset-user-password", requireAdmin, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;

      if (!userId || !newPassword) {
        return res.status(400).json({ error: "User ID and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }

      const result = await adminResetPassword(Number(userId), newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, message: "User password has been reset" });
    } catch (err) {
      console.error("Admin password reset error:", err);
      return res.status(500).json({ error: "Password reset failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    const deviceToken = req.cookies?.device_token;
    if (deviceToken && deviceToken.includes(":")) {
      const [deviceId] = deviceToken.split(":", 2);
      const userId = req.session?.userId;
      if (userId) {
        revokeDevice(userId, deviceId);
      }
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.clearCookie("device_token");
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/check", async (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    if (req.session?.isAuthenticated) {
      const isAdmin = req.session.isAdmin || false;
      const userId = req.session.userId;
      let tier = 'free';
      let emailVerified = true;
      let founderFields: {
        isFounder?: boolean;
        founderNumber?: number | null;
        founderType?: string | null;
        founderReferralCode?: string | null;
        founderCreditsEarned?: number;
      } = {};

      if (isAdmin) {
        tier = 'whale';
      } else if (req.session.username && userId) {
        const [sub, founderData] = await Promise.all([
          stripeService.getUserSubscription(req.session.username).catch(() => null),
          getFounderData(req.session.username).catch(() => null),
        ]);
        tier = sub?.subscriptionTier || 'free';
        emailVerified = await getEmailVerifiedStatus(Number(userId)).catch(() => false);
        if (founderData) {
          founderFields = {
            isFounder: founderData.isFounder,
            founderNumber: founderData.founderNumber,
            founderType: founderData.founderType,
            founderReferralCode: founderData.founderReferralCode,
            founderCreditsEarned: founderData.founderCreditsEarned,
          };
        }
      }
      return res.json({ 
        authenticated: true, 
        username: req.session.username,
        isAdmin,
        role: req.session.role || 'user',
        tier,
        emailVerified,
        ...founderFields,
      });
    }

    const deviceToken = req.cookies?.device_token;
    if (deviceToken) {
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      const validation = validateDeviceToken(deviceToken, userAgent, ip);

      if (validation.valid && validation.userId && !validation.requiresReauth) {
        if (validation.userId === 'admin') {
          const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
          const adminNumericId = await getOrCreateAdminUser(ADMIN_USERNAME).catch(() => null);
          req.session.isAuthenticated = true;
          req.session.username = ADMIN_USERNAME;
          req.session.userId = adminNumericId ? String(adminNumericId) : 'admin';
          req.session.isAdmin = true;
          req.session.role = 'admin';
          return res.json({ authenticated: true, username: ADMIN_USERNAME, isAdmin: true, role: 'admin', tier: 'whale', emailVerified: true });
        }

        try {
          const user = await getUserById(parseInt(validation.userId));
          if (user && !user.isBanned) {
            req.session.isAuthenticated = true;
            req.session.username = user.username;
            req.session.userId = String(user.id);
            req.session.isAdmin = user.isAdmin;
            req.session.role = user.isAdmin ? 'admin' : 'user';

            const refreshed = refreshDeviceToken(deviceToken, userAgent, ip);
            if (refreshed) {
              res.cookie('device_token', refreshed.rawToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 24 * 60 * 60 * 1000,
                path: '/',
              });
            }

            const [sub, founderData2] = await Promise.all([
              stripeService.getUserSubscription(user.username).catch(() => null),
              getFounderData(user.username).catch(() => null),
            ]);
            const tier = user.isAdmin ? 'whale' : (sub?.subscriptionTier || 'free');
            const emailVerified = (user as any).emailVerified ?? false;
            const founderFields2 = founderData2 ? {
              isFounder: founderData2.isFounder,
              founderNumber: founderData2.founderNumber,
              founderType: founderData2.founderType,
              founderReferralCode: founderData2.founderReferralCode,
              founderCreditsEarned: founderData2.founderCreditsEarned,
            } : {};

            return res.json({
              authenticated: true,
              username: user.username,
              isAdmin: user.isAdmin,
              role: user.isAdmin ? 'admin' : 'user',
              tier,
              emailVerified,
              ...founderFields2,
            });
          }
        } catch (err) {
          // DB lookup failed, fall through
        }
      }

      if (validation.requiresReauth) {
        res.clearCookie("device_token");
      }
    }

    return res.json({ authenticated: false });
  });

  app.get("/api/devices", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const currentDeviceToken = req.cookies?.device_token;
    const currentDeviceId = currentDeviceToken?.includes(":") ? currentDeviceToken.split(":")[0] : null;
    const devices = getUserDevices(userId).map((d) => ({
      ...d,
      current: d.id === currentDeviceId,
    }));
    res.json(devices);
  });

  app.post("/api/devices/:deviceId/revoke", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { deviceId } = req.params;
    const success = revokeDevice(userId, deviceId);
    if (!success) {
      return res.status(404).json({ error: "Device not found" });
    }

    const currentDeviceToken = req.cookies?.device_token;
    if (currentDeviceToken?.startsWith(deviceId + ":")) {
      res.clearCookie("device_token");
    }

    res.json({ success: true });
  });

  app.post("/api/devices/revoke-all", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const count = revokeAllDevices(userId);
    res.clearCookie("device_token");
    res.json({ success: true, revokedCount: count });
  });

  app.post("/api/auth/logout-all", (req, res) => {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    revokeAllDevices(userId);
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.clearCookie("device_token");
      return res.json({ success: true });
    });
  });

  app.get("/api/admin/device-stats", requireAdmin, (_req, res) => {
    res.json(getDeviceStats());
  });
}
