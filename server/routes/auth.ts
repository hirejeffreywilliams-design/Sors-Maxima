import type { Express } from "express";
import { registerUser, loginUser, getUserById, resetPassword, adminResetPassword } from "../dbAuthService";
import { createTrustedDevice, validateDeviceToken, getUserDevices, revokeDevice, revokeAllDevices, refreshDeviceToken, getDeviceStats } from "../trustedDeviceService";
import { sensitiveRouteRateLimitMiddleware } from "../securityMiddleware";
import { getClientIp, requireAdmin } from "./helpers";

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

      req.session.isAuthenticated = true;
      req.session.username = username;
      req.session.userId = String(result.userId);
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
        req.session.isAuthenticated = true;
        req.session.username = ADMIN_USERNAME;
        req.session.userId = 'admin';
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
      return res.json({ 
        success: true, 
        username: result.user!.username,
        isAdmin: result.user!.isAdmin
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/reset-password", sensitiveRouteRateLimitMiddleware, async (req, res) => {
    try {
      const { username, email, newPassword } = req.body;

      if (!username || !email || !newPassword) {
        return res.status(400).json({ error: "Username, email, and new password are all required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }

      if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "Password must include uppercase, lowercase, and a number" });
      }

      const result = await resetPassword(username, email, newPassword);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, message: "Password has been reset. You can now sign in with your new password." });
    } catch (err) {
      console.error("Password reset error:", err);
      return res.status(500).json({ error: "Password reset failed" });
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
      return res.json({ 
        authenticated: true, 
        username: req.session.username,
        isAdmin: req.session.isAdmin || false,
        role: req.session.role || 'user'
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
          req.session.isAuthenticated = true;
          req.session.username = ADMIN_USERNAME;
          req.session.userId = 'admin';
          req.session.isAdmin = true;
          req.session.role = 'admin';
          return res.json({ authenticated: true, username: ADMIN_USERNAME, isAdmin: true, role: 'admin' });
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

            return res.json({
              authenticated: true,
              username: user.username,
              isAdmin: user.isAdmin,
              role: user.isAdmin ? 'admin' : 'user',
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
