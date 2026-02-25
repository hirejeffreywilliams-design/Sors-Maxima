// Authentication & Fraud Prevention Service
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { evaluateRegistrationRisk, remapUserId, type DeviceFingerprintData, type RegistrationRisk } from "./trialFraudEngine";

const scryptAsync = promisify(scrypt);

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: string;
  lastLoginAt: string | null;
  loginAttempts: number;
  lockedUntil: string | null;
  emailVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  riskScore: number;
  ipAddresses: string[];
  subscriptionTier: 'free' | 'pro' | 'elite' | 'whale';
}

// Fraud tracking
interface LoginAttempt {
  ip: string;
  email: string;
  timestamp: number;
  success: boolean;
  userAgent: string;
}

interface SuspiciousActivity {
  userId: string;
  type: 'multiple_accounts' | 'rapid_login_attempts' | 'ip_hopping' | 'suspicious_pattern' | 'chargebacks';
  details: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// In-memory storage (for development - use database in production)
const users = new Map<string, User>();
const loginAttempts: LoginAttempt[] = [];
const suspiciousActivities: SuspiciousActivity[] = [];
const ipToUsers = new Map<string, Set<string>>();
const emailToUser = new Map<string, string>();

// Rate limiting
const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
const maxLoginAttempts = 5;
const lockoutDuration = 30 * 60 * 1000; // 30 minutes

// Admin credentials from environment
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

class AuthService {
  // Password hashing with salt
  async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':');
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    const keyBuffer = Buffer.from(key, 'hex');
    return timingSafeEqual(derivedKey, keyBuffer);
  }

  // Generate secure session token
  generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Rate limiting check
  isRateLimited(ip: string, email: string): { limited: boolean; retryAfter?: number } {
    const now = Date.now();
    const recentAttempts = loginAttempts.filter(
      attempt => 
        (attempt.ip === ip || attempt.email === email) && 
        now - attempt.timestamp < rateLimitWindow &&
        !attempt.success
    );

    if (recentAttempts.length >= maxLoginAttempts) {
      const oldestAttempt = Math.min(...recentAttempts.map(a => a.timestamp));
      const retryAfter = Math.ceil((oldestAttempt + rateLimitWindow - now) / 1000);
      return { limited: true, retryAfter };
    }

    return { limited: false };
  }

  // Record login attempt
  recordLoginAttempt(ip: string, email: string, success: boolean, userAgent: string) {
    loginAttempts.push({
      ip,
      email,
      timestamp: Date.now(),
      success,
      userAgent
    });

    // Clean up old attempts (keep last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    while (loginAttempts.length > 0 && loginAttempts[0].timestamp < cutoff) {
      loginAttempts.shift();
    }
  }

  // Register new user
  async register(
    email: string, 
    username: string, 
    password: string, 
    ip: string,
    userAgent?: string,
    deviceFingerprint?: Partial<DeviceFingerprintData>
  ): Promise<{ success: boolean; user?: User; error?: string; fraudRisk?: RegistrationRisk }> {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Invalid email format" };
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
      return { success: false, error: "Username must be 3-20 characters" };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { success: false, error: "Username can only contain letters, numbers, and underscores" };
    }

    // Validate password strength
    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return { success: false, error: "Password must contain uppercase, lowercase, and numbers" };
    }

    // Check for existing email
    const normalizedEmail = email.toLowerCase().trim();
    if (emailToUser.has(normalizedEmail)) {
      return { success: false, error: "Email already registered" };
    }

    // Check for existing username
    const allUsers = Array.from(users.values());
    for (const user of allUsers) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return { success: false, error: "Username already taken" };
      }
    }

    // Fraud check: Multiple accounts from same IP
    const ipUsers = ipToUsers.get(ip);
    if (ipUsers && ipUsers.size >= 3) {
      this.logSuspiciousActivity({
        userId: 'pending',
        type: 'multiple_accounts',
        details: `Attempt to create 4th account from IP ${ip}`,
        timestamp: new Date().toISOString(),
        severity: 'high'
      });
      return { success: false, error: "Too many accounts created from this location" };
    }

    // Create user
    const userId = randomBytes(16).toString('hex');
    const passwordHash = await this.hashPassword(password);

    // Run fraud detection engine
    const fraudRisk = evaluateRegistrationRisk({
      email,
      username,
      ip,
      userAgent: userAgent || 'unknown',
      userId,
      deviceFingerprint,
    });

    if (fraudRisk.action === 'block') {
      this.logSuspiciousActivity({
        userId: 'pending',
        type: 'suspicious_pattern',
        details: `Registration blocked by fraud engine: ${fraudRisk.reason} (score: ${fraudRisk.riskScore})`,
        timestamp: new Date().toISOString(),
        severity: 'critical',
      });
      return { success: false, error: "Unable to create account at this time. Please contact support if you believe this is an error.", fraudRisk };
    }
    
    const user: User = {
      id: userId,
      email: normalizedEmail,
      username,
      passwordHash,
      role: 'user',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null,
      emailVerified: false,
      isBanned: false,
      banReason: null,
      riskScore: fraudRisk.riskScore,
      ipAddresses: [ip],
      subscriptionTier: 'free'
    };

    users.set(userId, user);
    emailToUser.set(normalizedEmail, userId);

    // Track IP
    if (!ipToUsers.has(ip)) {
      ipToUsers.set(ip, new Set());
    }
    ipToUsers.get(ip)!.add(userId);

    remapUserId(userId, userId);

    if (fraudRisk.action === 'verify') {
      this.logSuspiciousActivity({
        userId,
        type: 'suspicious_pattern',
        details: `Registration flagged for verification: ${fraudRisk.reason} (score: ${fraudRisk.riskScore})`,
        timestamp: new Date().toISOString(),
        severity: 'medium',
      });
    }

    return { success: true, user, fraudRisk };
  }

  // Login
  async login(
    emailOrUsername: string, 
    password: string, 
    ip: string, 
    userAgent: string
  ): Promise<{ success: boolean; user?: User; isAdmin?: boolean; error?: string }> {
    // Check rate limiting
    const rateLimitCheck = this.isRateLimited(ip, emailOrUsername);
    if (rateLimitCheck.limited) {
      return { 
        success: false, 
        error: `Too many login attempts. Try again in ${rateLimitCheck.retryAfter} seconds` 
      };
    }

    // Check if admin login
    if (emailOrUsername === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      this.recordLoginAttempt(ip, emailOrUsername, true, userAgent);
      return { 
        success: true, 
        isAdmin: true,
        user: {
          id: 'admin',
          email: 'admin@sorsmaxima.com',
          username: ADMIN_USERNAME!,
          passwordHash: '',
          role: 'admin',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          loginAttempts: 0,
          lockedUntil: null,
          emailVerified: true,
          isBanned: false,
          banReason: null,
          riskScore: 0,
          ipAddresses: [ip],
          subscriptionTier: 'whale'
        }
      };
    }

    // Find user by email or username
    let user: User | undefined;
    const normalizedInput = emailOrUsername.toLowerCase().trim();
    
    const userIdByEmail = emailToUser.get(normalizedInput);
    if (userIdByEmail) {
      user = users.get(userIdByEmail);
    } else {
      const allUsersForLogin = Array.from(users.values());
      for (const u of allUsersForLogin) {
        if (u.username.toLowerCase() === normalizedInput) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      this.recordLoginAttempt(ip, emailOrUsername, false, userAgent);
      return { success: false, error: "Invalid email/username or password" };
    }

    // Check if account is locked
    if (user.lockedUntil) {
      const lockExpiry = new Date(user.lockedUntil).getTime();
      if (Date.now() < lockExpiry) {
        const remainingMinutes = Math.ceil((lockExpiry - Date.now()) / 60000);
        return { success: false, error: `Account locked. Try again in ${remainingMinutes} minutes` };
      } else {
        // Unlock account
        user.lockedUntil = null;
        user.loginAttempts = 0;
      }
    }

    // Check if banned
    if (user.isBanned) {
      return { success: false, error: `Account suspended: ${user.banReason || 'Contact support'}` };
    }

    // Verify password
    const validPassword = await this.verifyPassword(password, user.passwordHash);
    
    if (!validPassword) {
      user.loginAttempts++;
      this.recordLoginAttempt(ip, user.email, false, userAgent);

      // Lock account after too many attempts
      if (user.loginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + lockoutDuration).toISOString();
        this.logSuspiciousActivity({
          userId: user.id,
          type: 'rapid_login_attempts',
          details: `Account locked after ${user.loginAttempts} failed attempts`,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
        return { success: false, error: "Account locked due to too many failed attempts" };
      }

      return { success: false, error: "Invalid email/username or password" };
    }

    // Successful login
    user.loginAttempts = 0;
    user.lastLoginAt = new Date().toISOString();
    
    // Track new IP
    if (!user.ipAddresses.includes(ip)) {
      user.ipAddresses.push(ip);
      
      // Suspicious if too many different IPs
      if (user.ipAddresses.length > 10) {
        user.riskScore += 10;
        this.logSuspiciousActivity({
          userId: user.id,
          type: 'ip_hopping',
          details: `Login from 10+ different IP addresses`,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
      }
    }

    this.recordLoginAttempt(ip, user.email, true, userAgent);
    
    return { success: true, user };
  }

  // Get user by ID
  getUser(userId: string): User | undefined {
    return users.get(userId);
  }

  // Get user by email
  getUserByEmail(email: string): User | undefined {
    const userId = emailToUser.get(email.toLowerCase());
    return userId ? users.get(userId) : undefined;
  }

  // Update user
  updateUser(userId: string, updates: Partial<User>): User | undefined {
    const user = users.get(userId);
    if (user) {
      Object.assign(user, updates);
    }
    return user;
  }

  // Ban user
  banUser(userId: string, reason: string): boolean {
    const user = users.get(userId);
    if (user && user.role !== 'admin') {
      user.isBanned = true;
      user.banReason = reason;
      return true;
    }
    return false;
  }

  // Unban user
  unbanUser(userId: string): boolean {
    const user = users.get(userId);
    if (user) {
      user.isBanned = false;
      user.banReason = null;
      return true;
    }
    return false;
  }

  // Log suspicious activity
  logSuspiciousActivity(activity: SuspiciousActivity) {
    suspiciousActivities.push(activity);
    console.warn(`[FRAUD ALERT] ${activity.severity.toUpperCase()}: ${activity.type} - ${activity.details}`);
  }

  // Get suspicious activities (admin only)
  getSuspiciousActivities(limit = 100): SuspiciousActivity[] {
    return suspiciousActivities.slice(-limit);
  }

  // Get all users (admin only)
  getAllUsers(): User[] {
    return Array.from(users.values()).map(u => ({
      ...u,
      passwordHash: '[HIDDEN]'
    }));
  }

  // Calculate fraud risk score
  calculateRiskScore(user: User): number {
    let score = user.riskScore;
    
    // Multiple IPs increase risk
    if (user.ipAddresses.length > 5) score += 15;
    if (user.ipAddresses.length > 10) score += 25;
    
    // Recent lockouts
    if (user.lockedUntil) score += 20;
    
    // Many failed login attempts
    if (user.loginAttempts > 3) score += 10;
    
    return Math.min(100, score);
  }

  // Check if user is high risk
  isHighRisk(userId: string): boolean {
    const user = users.get(userId);
    if (!user) return false;
    return this.calculateRiskScore(user) >= 50;
  }

  // Get user by ID or username
  getUserById(identifier: string): User | null {
    // Try direct lookup by ID
    const directUser = users.get(identifier);
    if (directUser) return directUser;
    
    // Search by username
    const entries = Array.from(users.entries());
    for (let i = 0; i < entries.length; i++) {
      const [, user] = entries[i];
      if (user.username === identifier) return user;
    }
    
    return null;
  }

  // Update user's subscription tier
  updateUserSubscription(userId: string, tier: 'free' | 'pro' | 'elite' | 'whale'): boolean {
    const user = users.get(userId);
    if (!user) {
      // Try to find by username
      const entries = Array.from(users.entries());
      for (let i = 0; i < entries.length; i++) {
        const [id, u] = entries[i];
        if (u.username === userId) {
          users.set(id, { ...u, subscriptionTier: tier });
          return true;
        }
      }
      return false;
    }
    
    users.set(userId, { ...user, subscriptionTier: tier });
    return true;
  }

  // Get all users (for admin)
  getAllUsersForAdmin(): User[] {
    return Array.from(users.values()).map(user => ({
      ...user,
      passwordHash: '[HIDDEN]', // Don't expose password hashes
    }));
  }
}

export const authService = new AuthService();
