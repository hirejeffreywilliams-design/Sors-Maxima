import { randomBytes, createHmac } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { logWarn, logError, logInfo } from "./errorLogger";

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  ip: string;
  userId?: string;
  details: string;
  metadata?: Record<string, unknown>;
  resolved: boolean;
}

type SecurityEventType =
  | "csrf_violation"
  | "xss_attempt"
  | "sql_injection_attempt"
  | "session_hijack"
  | "brute_force"
  | "suspicious_payload"
  | "rate_limit_exceeded"
  | "unauthorized_access"
  | "invalid_token"
  | "ip_blocked"
  | "unusual_activity"
  | "data_exfiltration_attempt";

interface RateBucket {
  count: number;
  windowStart: number;
}

class SecurityService {
  private events: SecurityEvent[] = [];
  private maxEvents = 5000;
  private blockedIPs: Map<string, { until: number; reason: string }> = new Map();
  private rateBuckets: Map<string, RateBucket> = new Map();
  private sessionFingerprints: Map<string, string> = new Map();

  private generateId(): string {
    return `sec_${Date.now()}_${randomBytes(4).toString("hex")}`;
  }

  recordEvent(
    type: SecurityEventType,
    severity: SecurityEvent["severity"],
    source: string,
    ip: string,
    details: string,
    options?: { userId?: string; metadata?: Record<string, unknown> }
  ): string {
    const id = this.generateId();
    const event: SecurityEvent = {
      id,
      timestamp: new Date().toISOString(),
      type,
      severity,
      source,
      ip,
      details,
      userId: options?.userId,
      metadata: options?.metadata,
      resolved: false,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }

    if (severity === "critical" || severity === "high") {
      logWarn(`[SECURITY] ${severity.toUpperCase()}: ${type} - ${details}`, {
        ip,
        source,
        userId: options?.userId,
      });
    }

    return id;
  }

  getEvents(options?: {
    type?: SecurityEventType;
    severity?: SecurityEvent["severity"];
    limit?: number;
    since?: string;
    resolved?: boolean;
  }): SecurityEvent[] {
    let result = [...this.events];

    if (options?.type) result = result.filter((e) => e.type === options.type);
    if (options?.severity) result = result.filter((e) => e.severity === options.severity);
    if (options?.resolved !== undefined) result = result.filter((e) => e.resolved === options.resolved);
    if (options?.since) {
      const sinceDate = new Date(options.since);
      result = result.filter((e) => new Date(e.timestamp) >= sinceDate);
    }
    if (options?.limit) result = result.slice(0, options.limit);

    return result;
  }

  resolveEvent(id: string): boolean {
    const event = this.events.find((e) => e.id === id);
    if (event) {
      event.resolved = true;
      return true;
    }
    return false;
  }

  getStats() {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const recent24h = this.events.filter((e) => new Date(e.timestamp) >= last24h);
    const recentHour = this.events.filter((e) => new Date(e.timestamp) >= lastHour);

    return {
      total: this.events.length,
      last24Hours: recent24h.length,
      lastHour: recentHour.length,
      unresolved: this.events.filter((e) => !e.resolved).length,
      bySeverity: {
        critical: this.events.filter((e) => e.severity === "critical").length,
        high: this.events.filter((e) => e.severity === "high").length,
        medium: this.events.filter((e) => e.severity === "medium").length,
        low: this.events.filter((e) => e.severity === "low").length,
      },
      byType: this.events.reduce(
        (acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
      blockedIPs: this.blockedIPs.size,
      recentTrend: {
        hour: recentHour.length,
        day: recent24h.length,
      },
    };
  }

  blockIP(ip: string, durationMs: number, reason: string) {
    this.blockedIPs.set(ip, { until: Date.now() + durationMs, reason });
    this.recordEvent("ip_blocked", "high", "security_service", ip, `IP blocked: ${reason}`);
  }

  unblockIP(ip: string): boolean {
    return this.blockedIPs.delete(ip);
  }

  isBlocked(ip: string): boolean {
    const entry = this.blockedIPs.get(ip);
    if (!entry) return false;
    if (Date.now() > entry.until) {
      this.blockedIPs.delete(ip);
      return false;
    }
    return true;
  }

  getBlockedIPs(): Array<{ ip: string; until: string; reason: string }> {
    const result: Array<{ ip: string; until: string; reason: string }> = [];
    this.blockedIPs.forEach((v, ip) => {
      if (Date.now() < v.until) {
        result.push({ ip, until: new Date(v.until).toISOString(), reason: v.reason });
      }
    });
    return result;
  }

  checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const bucket = this.rateBuckets.get(key);

    if (!bucket || now - bucket.windowStart > windowMs) {
      this.rateBuckets.set(key, { count: 1, windowStart: now });
      return true;
    }

    bucket.count++;
    if (bucket.count > maxRequests) {
      return false;
    }
    return true;
  }

  generateFingerprint(req: Request): string {
    const components = [
      req.headers["user-agent"] || "",
      req.headers["accept-language"] || "",
      req.headers["accept-encoding"] || "",
    ];
    return createHmac("sha256", "fingerprint-salt")
      .update(components.join("|"))
      .digest("hex")
      .substring(0, 16);
  }

  validateSessionFingerprint(sessionId: string, fingerprint: string): boolean {
    const stored = this.sessionFingerprints.get(sessionId);
    if (!stored) {
      this.sessionFingerprints.set(sessionId, fingerprint);
      return true;
    }
    return stored === fingerprint;
  }

  clearSessionFingerprint(sessionId: string) {
    this.sessionFingerprints.delete(sessionId);
  }
}

export const securityService = new SecurityService();

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /eval\s*\(/i,
  /document\.(cookie|location|write)/i,
  /window\.(location|open)/i,
  /innerHTML\s*=/i,
  /\.\s*fromCharCode/i,
];

const SQL_PATTERNS = [
  /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b\s)/i,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /(--|#|\/\*)/,
  /('|\"|;)\s*(OR|AND|UNION)/i,
  /\bSLEEP\s*\(\s*\d/i,
  /\bBENCHMARK\s*\(/i,
];

function containsXSS(value: string): boolean {
  return XSS_PATTERNS.some((p) => p.test(value));
}

function containsSQLi(value: string): boolean {
  return SQL_PATTERNS.some((p) => p.test(value));
}

function deepScanObject(obj: unknown, path = ""): { xss: string[]; sqli: string[] } {
  const findings = { xss: [] as string[], sqli: [] as string[] };

  if (typeof obj === "string") {
    if (containsXSS(obj)) findings.xss.push(path || "value");
    if (containsSQLi(obj)) findings.sqli.push(path || "value");
  } else if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      const sub = deepScanObject(item, `${path}[${i}]`);
      findings.xss.push(...sub.xss);
      findings.sqli.push(...sub.sqli);
    });
  } else if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const sub = deepScanObject(value, path ? `${path}.${key}` : key);
      findings.xss.push(...sub.xss);
      findings.sqli.push(...sub.sqli);
    }
  }

  return findings;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://site.api.espn.com https://api.stripe.com; font-src 'self' data:; frame-ancestors 'none';"
  );
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
}

export function ipBlockMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  if (securityService.isBlocked(ip)) {
    return res.status(403).json({ error: "Access denied" });
  }
  next();
}

export function inputSanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== "object") return next();

  const ip = getClientIp(req);
  const findings = deepScanObject(req.body);

  if (findings.xss.length > 0) {
    securityService.recordEvent("xss_attempt", "high", req.path, ip, `XSS attempt in fields: ${findings.xss.join(", ")}`, {
      userId: req.session?.userId,
      metadata: { fields: findings.xss, method: req.method },
    });
    return res.status(400).json({ error: "Invalid input detected" });
  }

  if (findings.sqli.length > 0) {
    securityService.recordEvent(
      "sql_injection_attempt",
      "critical",
      req.path,
      ip,
      `SQL injection attempt in fields: ${findings.sqli.join(", ")}`,
      {
        userId: req.session?.userId,
        metadata: { fields: findings.sqli, method: req.method },
      }
    );
    return res.status(400).json({ error: "Invalid input detected" });
  }

  next();
}

export function apiRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `api:${ip}`;

  if (!securityService.checkRateLimit(key, 100, 60 * 1000)) {
    securityService.recordEvent("rate_limit_exceeded", "medium", req.path, ip, "API rate limit exceeded (100/min)", {
      userId: req.session?.userId,
    });
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  next();
}

export function sessionFingerprintMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAuthenticated || !req.session.userId) return next();

  const fingerprint = securityService.generateFingerprint(req);
  const sessionId = req.session.userId;
  const stored = (securityService as any).sessionFingerprints.get(sessionId);

  if (stored && stored !== fingerprint) {
    const ip = getClientIp(req);
    securityService.recordEvent("session_hijack", "high", req.path, ip, "Session fingerprint mismatch detected", {
      userId: req.session.userId,
      metadata: { expectedFingerprint: "stored", receivedFingerprint: fingerprint },
    });
  }

  if (!stored) {
    (securityService as any).sessionFingerprints.set(sessionId, fingerprint);
  }

  next();
}

export function sensitiveRouteRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  const key = `sensitive:${ip}:${req.path}`;

  if (!securityService.checkRateLimit(key, 10, 60 * 1000)) {
    securityService.recordEvent("rate_limit_exceeded", "high", req.path, ip, "Sensitive route rate limit exceeded (10/min)", {
      userId: req.session?.userId,
    });

    const recentViolations = securityService.getEvents({
      type: "rate_limit_exceeded",
      since: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    }).filter((e) => e.ip === ip);

    if (recentViolations.length > 5) {
      securityService.blockIP(ip, 15 * 60 * 1000, "Repeated rate limit violations");
    }

    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  next();
}

const csrfTokens: Map<string, { token: string; expiresAt: number }> = new Map();

export function csrfTokenMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" && req.path === "/api/auth/csrf-token") {
    const sessionId = req.session?.userId || req.sessionID || "anon";
    const token = randomBytes(32).toString("hex");
    csrfTokens.set(sessionId, { token, expiresAt: Date.now() + 60 * 60 * 1000 });
    return res.json({ csrfToken: token });
  }
  next();
}

export function csrfValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();
  if (req.path.includes("/webhook")) return next();

  const contentType = req.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    if (req.path.startsWith("/api") && !req.path.includes("/webhook")) {
      return res.status(400).json({ error: "Content-Type must be application/json" });
    }
    return next();
  }

  next();
}

export type { SecurityEvent, SecurityEventType };
