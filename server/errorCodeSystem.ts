interface ErrorCodeDefinition {
  code: string;
  category: ErrorCategory;
  title: string;
  description: string;
  suggestedFix: string;
  severity: "info" | "warning" | "error" | "critical";
  docLink?: string;
}

type ErrorCategory =
  | "AUTH"
  | "PAYMENT"
  | "API"
  | "DATA"
  | "SECURITY"
  | "SYSTEM"
  | "INTEGRATION"
  | "SESSION"
  | "RATE_LIMIT"
  | "VALIDATION";

const ERROR_CODES: Record<string, ErrorCodeDefinition> = {
  "AUTH-001": {
    code: "AUTH-001",
    category: "AUTH",
    title: "Invalid Credentials",
    description: "Login attempt with wrong username or password.",
    suggestedFix: "Verify user exists in database. Check if account is locked. Confirm password hashing matches.",
    severity: "warning",
  },
  "AUTH-002": {
    code: "AUTH-002",
    category: "AUTH",
    title: "Account Locked",
    description: "User account has been locked due to too many failed login attempts.",
    suggestedFix: "Wait for lockout period (30 min) to expire, or manually unlock through admin panel user management.",
    severity: "warning",
  },
  "AUTH-003": {
    code: "AUTH-003",
    category: "AUTH",
    title: "Session Expired",
    description: "User session has expired or was invalidated.",
    suggestedFix: "User needs to log in again. Check session cookie settings and maxAge configuration.",
    severity: "info",
  },
  "AUTH-004": {
    code: "AUTH-004",
    category: "AUTH",
    title: "Unauthorized Admin Access",
    description: "Non-admin user attempted to access admin-only endpoint.",
    suggestedFix: "Verify user role. Check if admin credentials are correctly set in environment variables.",
    severity: "error",
  },
  "AUTH-005": {
    code: "AUTH-005",
    category: "AUTH",
    title: "Account Banned",
    description: "Banned user attempted to access the system.",
    suggestedFix: "Review ban reason in admin panel. Unban through user management if appropriate.",
    severity: "warning",
  },
  "AUTH-006": {
    code: "AUTH-006",
    category: "AUTH",
    title: "Registration Blocked",
    description: "Too many accounts created from the same IP address.",
    suggestedFix: "Check for fraud patterns. May be legitimate shared network. Review IP in security events.",
    severity: "warning",
  },
  "PAYMENT-001": {
    code: "PAYMENT-001",
    category: "PAYMENT",
    title: "Stripe Webhook Failed",
    description: "Stripe webhook signature verification or processing failed.",
    suggestedFix: "Verify STRIPE_WEBHOOK_SECRET is correct. Check webhook endpoint URL in Stripe dashboard. Review raw webhook payload.",
    severity: "critical",
  },
  "PAYMENT-002": {
    code: "PAYMENT-002",
    category: "PAYMENT",
    title: "Checkout Session Failed",
    description: "Failed to create Stripe checkout session.",
    suggestedFix: "Verify STRIPE_SECRET_KEY is valid. Check Stripe API status. Verify price IDs exist in Stripe dashboard.",
    severity: "error",
  },
  "PAYMENT-003": {
    code: "PAYMENT-003",
    category: "PAYMENT",
    title: "Subscription Update Failed",
    description: "Could not update user subscription tier after payment.",
    suggestedFix: "Check database connectivity. Verify user ID exists. Manually update subscription tier through admin panel.",
    severity: "critical",
  },
  "PAYMENT-004": {
    code: "PAYMENT-004",
    category: "PAYMENT",
    title: "Duplicate Payment Detected",
    description: "Potential duplicate payment or webhook received more than once.",
    suggestedFix: "Idempotency system should handle this. Check idempotency store. Review Stripe dashboard for duplicate charges.",
    severity: "warning",
  },
  "API-001": {
    code: "API-001",
    category: "API",
    title: "ESPN API Unavailable",
    description: "Failed to fetch data from ESPN free API.",
    suggestedFix: "ESPN API may be temporarily down. Data is cached so previous results will serve. Check network connectivity.",
    severity: "warning",
  },
  "API-002": {
    code: "API-002",
    category: "API",
    title: "OpenAI API Error",
    description: "AI integration call to OpenAI API failed.",
    suggestedFix: "Check AI_INTEGRATIONS_OPENAI_API_KEY. Verify API quota and rate limits. May be temporary API outage.",
    severity: "error",
  },
  "API-003": {
    code: "API-003",
    category: "API",
    title: "Rate Limited by External Service",
    description: "External API returned 429 Too Many Requests.",
    suggestedFix: "Reduce request frequency. Check cache TTLs to minimize API calls. Consider implementing request queuing.",
    severity: "warning",
  },
  "DATA-001": {
    code: "DATA-001",
    category: "DATA",
    title: "Database Connection Failed",
    description: "Could not connect to PostgreSQL database.",
    suggestedFix: "Verify DATABASE_URL environment variable. Check database service status. Try restarting the application.",
    severity: "critical",
  },
  "DATA-002": {
    code: "DATA-002",
    category: "DATA",
    title: "Query Execution Failed",
    description: "Database query failed to execute.",
    suggestedFix: "Check query syntax. Verify table schema is up to date. Run pending migrations. Check database logs.",
    severity: "error",
  },
  "DATA-003": {
    code: "DATA-003",
    category: "DATA",
    title: "Data Validation Failed",
    description: "Request data failed Zod schema validation.",
    suggestedFix: "Check request payload against expected schema. Review validation error details for specific field failures.",
    severity: "info",
  },
  "SECURITY-001": {
    code: "SECURITY-001",
    category: "SECURITY",
    title: "XSS Attempt Detected",
    description: "Potential cross-site scripting attack detected in request payload.",
    suggestedFix: "Request was blocked. Review IP and user. Consider blocking IP if repeated. Check if legitimate user with odd input.",
    severity: "critical",
  },
  "SECURITY-002": {
    code: "SECURITY-002",
    category: "SECURITY",
    title: "SQL Injection Attempt",
    description: "Potential SQL injection detected in request payload.",
    suggestedFix: "Request was blocked. Review IP in security events. Consider permanent IP block. File incident report if needed.",
    severity: "critical",
  },
  "SECURITY-003": {
    code: "SECURITY-003",
    category: "SECURITY",
    title: "Session Hijack Suspected",
    description: "Session fingerprint mismatch - possible session token theft.",
    suggestedFix: "Session was invalidated. Check if user logged in from different browser/device. Review IP history for the user.",
    severity: "critical",
  },
  "SECURITY-004": {
    code: "SECURITY-004",
    category: "SECURITY",
    title: "Brute Force Attack",
    description: "Multiple failed authentication attempts from same source.",
    suggestedFix: "Rate limiting is active. Check if IP should be blocked. Review account lockout status.",
    severity: "high" as any,
  },
  "SECURITY-005": {
    code: "SECURITY-005",
    category: "SECURITY",
    title: "IP Address Blocked",
    description: "Request from a blocked IP address was denied.",
    suggestedFix: "Review block reason. Unblock through admin panel if false positive. Check for VPN/proxy usage.",
    severity: "warning",
  },
  "SYSTEM-001": {
    code: "SYSTEM-001",
    category: "SYSTEM",
    title: "Server Memory Warning",
    description: "Application memory usage is approaching limits.",
    suggestedFix: "Check for memory leaks. Review in-memory cache sizes. Consider reducing maxLogs/maxEntries limits.",
    severity: "warning",
  },
  "SYSTEM-002": {
    code: "SYSTEM-002",
    category: "SYSTEM",
    title: "Unhandled Error",
    description: "An unhandled error occurred in a request handler.",
    suggestedFix: "Review error stack trace. Add proper try/catch handling to the failing route. Check error logs for details.",
    severity: "error",
  },
  "SYSTEM-003": {
    code: "SYSTEM-003",
    category: "SYSTEM",
    title: "Feature Flag Disabled",
    description: "A feature was accessed but its feature flag is disabled.",
    suggestedFix: "Enable the feature flag through admin panel. Check if kill switch was activated.",
    severity: "info",
  },
  "RATE_LIMIT-001": {
    code: "RATE_LIMIT-001",
    category: "RATE_LIMIT",
    title: "API Rate Limit Hit",
    description: "User exceeded API request rate limit (100/min).",
    suggestedFix: "Normal protection. Check if user is automated/bot. Consider adjusting limits for legitimate high-volume users.",
    severity: "info",
  },
  "RATE_LIMIT-002": {
    code: "RATE_LIMIT-002",
    category: "RATE_LIMIT",
    title: "Sensitive Route Rate Limit",
    description: "Rate limit exceeded on sensitive endpoint (login, payment).",
    suggestedFix: "May indicate attack. Check IP history. Consider temporary IP block if repeated.",
    severity: "warning",
  },
  "VALIDATION-001": {
    code: "VALIDATION-001",
    category: "VALIDATION",
    title: "Invalid Request Body",
    description: "Request body failed schema validation.",
    suggestedFix: "Return validation errors to client. Check if API documentation is up to date.",
    severity: "info",
  },
  "INTEGRATION-001": {
    code: "INTEGRATION-001",
    category: "INTEGRATION",
    title: "Stripe Integration Error",
    description: "Error in Stripe payment integration.",
    suggestedFix: "Check Stripe API key configuration. Verify webhook secrets. Review Stripe dashboard for integration issues.",
    severity: "error",
  },
  "INTEGRATION-002": {
    code: "INTEGRATION-002",
    category: "INTEGRATION",
    title: "AI Integration Error",
    description: "Error communicating with AI/OpenAI service.",
    suggestedFix: "Check API key and base URL. Verify quota hasn't been exceeded. Try a test request directly.",
    severity: "error",
  },
  "SESSION-001": {
    code: "SESSION-001",
    category: "SESSION",
    title: "Session Creation Failed",
    description: "Failed to create or persist user session.",
    suggestedFix: "Check session store configuration. Verify cookie settings. Ensure SESSION_SECRET is set.",
    severity: "error",
  },
};

interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  lastChecked: string;
  details?: string;
  errorCode?: string;
}

class HealthMonitor {
  private checks: Map<string, HealthCheck> = new Map();

  async runAllChecks(): Promise<HealthCheck[]> {
    const results: HealthCheck[] = [];

    results.push(this.checkMemory());
    try {
      results.push(await this.checkDatabase());
    } catch {
      results.push({ name: "Database", status: "down", lastChecked: new Date().toISOString(), details: "Check threw unexpected error" });
    }
    try {
      results.push(this.checkErrorRate());
    } catch {
      results.push({ name: "Error Rate", status: "degraded", lastChecked: new Date().toISOString(), details: "Error rate check unavailable", errorCode: "SYSTEM-002" });
    }
    results.push(this.checkSessionStore());
    try {
      results.push(this.checkFeatureFlags());
    } catch {
      results.push({ name: "Feature Flags", status: "degraded", lastChecked: new Date().toISOString(), details: "Feature flag check unavailable", errorCode: "SYSTEM-003" });
    }

    results.forEach((r) => this.checks.set(r.name, r));
    return results;
  }

  private checkMemory(): HealthCheck {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    const utilization = (usage.heapUsed / usage.heapTotal) * 100;

    let status: HealthCheck["status"] = "healthy";
    let errorCode: string | undefined;
    if (utilization > 90) {
      status = "down";
      errorCode = "SYSTEM-001";
    } else if (utilization > 75) {
      status = "degraded";
      errorCode = "SYSTEM-001";
    }

    return {
      name: "Memory",
      status,
      lastChecked: new Date().toISOString(),
      details: `Heap: ${heapUsedMB}/${heapTotalMB} MB (${utilization.toFixed(1)}%), RSS: ${rssMB} MB`,
      errorCode,
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    try {
      const { pool } = await import("./db");
      const start = Date.now();
      await pool.query("SELECT 1");
      const latencyMs = Date.now() - start;

      let status: HealthCheck["status"] = "healthy";
      if (latencyMs > 1000) status = "degraded";

      return {
        name: "Database",
        status,
        latencyMs,
        lastChecked: new Date().toISOString(),
        details: `PostgreSQL responding in ${latencyMs}ms`,
      };
    } catch (err) {
      return {
        name: "Database",
        status: "down",
        lastChecked: new Date().toISOString(),
        details: `Connection failed: ${err instanceof Error ? err.message : String(err)}`,
        errorCode: "DATA-001",
      };
    }
  }

  private checkErrorRate(): HealthCheck {
    let recentErrors: any[] = [];
    try {
      const mod = require("./errorLogger");
      const logger = mod.errorLogger || mod.default?.errorLogger;
      if (logger?.getLogs) {
        recentErrors = logger.getLogs({
          level: "error",
          since: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        });
      }
    } catch {}

    let status: HealthCheck["status"] = "healthy";
    let errorCode: string | undefined;
    if (recentErrors.length > 50) {
      status = "down";
      errorCode = "SYSTEM-002";
    } else if (recentErrors.length > 20) {
      status = "degraded";
      errorCode = "SYSTEM-002";
    }

    return {
      name: "Error Rate",
      status,
      lastChecked: new Date().toISOString(),
      details: `${recentErrors.length} errors in last 5 minutes`,
      errorCode,
    };
  }

  private checkSessionStore(): HealthCheck {
    return {
      name: "Sessions",
      status: "healthy",
      lastChecked: new Date().toISOString(),
      details: "In-memory session store active",
    };
  }

  private checkFeatureFlags(): HealthCheck {
    try {
      const mod = require("./featureFlags");
      const flags = mod.featureFlags || mod.default?.featureFlags;
      if (flags?.getStats && flags?.isEnabled) {
        const stats = flags.getStats();
        const criticalFlags = ["stripe_payments", "quantum_fusion"];
        const disabledCritical = criticalFlags.filter((f: string) => !flags.isEnabled(f));

        let status: HealthCheck["status"] = "healthy";
        let errorCode: string | undefined;
        if (disabledCritical.length > 0) {
          status = "degraded";
          errorCode = "SYSTEM-003";
        }

        return {
          name: "Feature Flags",
          status,
          lastChecked: new Date().toISOString(),
          details: `${stats.enabled}/${stats.total} enabled${disabledCritical.length > 0 ? `, critical disabled: ${disabledCritical.join(", ")}` : ""}`,
          errorCode,
        };
      }
    } catch {}
    return {
      name: "Feature Flags",
      status: "degraded",
      lastChecked: new Date().toISOString(),
      details: "Feature flag check unavailable",
      errorCode: "SYSTEM-003",
    };
  }

  getLastResults(): HealthCheck[] {
    return Array.from(this.checks.values());
  }

  getOverallStatus(): "healthy" | "degraded" | "down" {
    const checks = this.getLastResults();
    if (checks.length === 0) return "healthy";
    if (checks.some((c) => c.status === "down")) return "down";
    if (checks.some((c) => c.status === "degraded")) return "degraded";
    return "healthy";
  }
}

export const healthMonitor = new HealthMonitor();

export function getErrorCode(code: string): ErrorCodeDefinition | undefined {
  return ERROR_CODES[code];
}

export function getAllErrorCodes(): ErrorCodeDefinition[] {
  return Object.values(ERROR_CODES);
}

export function getErrorCodesByCategory(category: ErrorCategory): ErrorCodeDefinition[] {
  return Object.values(ERROR_CODES).filter((e) => e.category === category);
}

export function searchErrorCodes(query: string): ErrorCodeDefinition[] {
  const lower = query.toLowerCase();
  return Object.values(ERROR_CODES).filter(
    (e) =>
      e.code.toLowerCase().includes(lower) ||
      e.title.toLowerCase().includes(lower) ||
      e.description.toLowerCase().includes(lower) ||
      e.category.toLowerCase().includes(lower)
  );
}

export function getCategories(): ErrorCategory[] {
  return Array.from(new Set(Object.values(ERROR_CODES).map((e) => e.category)));
}

export type { ErrorCodeDefinition, ErrorCategory, HealthCheck };
