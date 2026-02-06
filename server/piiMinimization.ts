function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***@***.***";
  const maskedLocal = local[0] + "***" + (local.length > 1 ? local[local.length - 1] : "");
  return `${maskedLocal}@${domain}`;
}

function maskIp(ip: string): string {
  if (ip.includes(".")) {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.***.***.`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts[0]}:${parts[1]}:****:****:****:****:****:****`;
  }
  return "***";
}

function maskUsername(username: string): string {
  if (username.length <= 2) return "**";
  return username[0] + "*".repeat(username.length - 2) + username[username.length - 1];
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "***-***-" + digits.slice(-4);
}

function redactSensitiveFields(obj: Record<string, unknown>, sensitiveKeys: string[] = []): Record<string, unknown> {
  const defaultSensitive = [
    "password", "passwordHash", "token", "secret", "apiKey",
    "ssn", "socialSecurity", "creditCard", "cardNumber",
    "cvv", "pin", "bankAccount",
  ];

  const allSensitive = [...defaultSensitive, ...sensitiveKeys];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (allSensitive.some((s) => lowerKey.includes(s.toLowerCase()))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = redactSensitiveFields(value as Record<string, unknown>, sensitiveKeys);
    } else {
      result[key] = value;
    }
  }

  return result;
}

function sanitizeForLogs(data: Record<string, unknown>): Record<string, unknown> {
  const result = { ...data };

  if (typeof result.email === "string") {
    result.email = maskEmail(result.email);
  }
  if (typeof result.ip === "string") {
    result.ip = maskIp(result.ip);
  }
  if (typeof result.username === "string" && result.username.length > 0) {
    result.maskedUsername = maskUsername(result.username as string);
  }
  if (typeof result.phone === "string") {
    result.phone = maskPhone(result.phone);
  }

  return redactSensitiveFields(result);
}

function isDataRetentionExpired(createdAt: string | Date, retentionDays: number): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > retentionDays;
}

export const piiUtils = {
  maskEmail,
  maskIp,
  maskUsername,
  maskPhone,
  redactSensitiveFields,
  sanitizeForLogs,
  isDataRetentionExpired,
};
