import { createHash, randomBytes } from "crypto";

const SIGNAL_SALT = randomBytes(32).toString("hex");

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "mailnesia.com", "maildrop.cc", "10minutemail.com",
  "trashmail.com", "fakeinbox.com", "tempinbox.com", "discard.email",
  "getnada.com", "emailondeck.com", "temp-mail.org", "mohmal.com",
  "burnermail.io", "inboxbear.com", "mailsac.com", "harakirimail.com",
  "trashmail.me", "binkmail.com", "spamgourmet.com", "mytemp.email",
  "filzmail.com", "emailfake.com", "crazymailing.com", "armyspy.com",
  "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com", "jourrapide.com",
  "rhyta.com", "superrito.com", "teleworm.us", "tmpmail.net", "tmpmail.org",
  "mailcatch.com", "mintemail.com", "mt2015.com", "spamfree24.org",
  "thankyou2010.com", "trash-mail.at", "trashymail.com", "wegwerfmail.de",
  "wegwerfmail.net", "wh4f.org", "mailnator.com", "boun.cr",
]);

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

type RiskLevel = "low" | "medium" | "high" | "critical";
type FraudAction = "allow" | "verify" | "block";

interface SignalRecord {
  hashedSignal: string;
  signalType: "email" | "device_fp" | "ip" | "phone" | "payment_token" | "user_agent" | "normalized_name";
  userIds: Set<string>;
  createdAt: string;
  lastSeenAt: string;
}

interface TrialFraudCase {
  caseId: string;
  userId: string;
  username: string;
  email: string;
  riskScore: number;
  riskLevel: RiskLevel;
  signals: FraudSignalDetail[];
  action: FraudAction;
  status: "open" | "reviewed" | "cleared" | "blocked";
  reviewedBy: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FraudSignalDetail {
  type: string;
  description: string;
  weight: number;
  matched: boolean;
  details?: string;
}

interface RegistrationRisk {
  riskScore: number;
  riskLevel: RiskLevel;
  action: FraudAction;
  signals: FraudSignalDetail[];
  reason: string;
  caseId: string | null;
}

interface IPVelocityEntry {
  ip: string;
  timestamps: number[];
  userIds: Set<string>;
}

interface DeviceFingerprintData {
  canvas: string;
  webgl: string;
  fonts: string;
  screen: string;
  timezone: string;
  language: string;
  platform: string;
  userAgent: string;
  colorDepth: number;
  hardwareConcurrency: number;
  touchSupport: boolean;
  cookiesEnabled: boolean;
}

const signalGraph = new Map<string, SignalRecord>();
const fraudCases = new Map<string, TrialFraudCase>();
const ipVelocity = new Map<string, IPVelocityEntry>();
const deviceToUsers = new Map<string, Set<string>>();
const emailClusterMap = new Map<string, Set<string>>();
const trialGrantedSignals = new Map<string, Set<string>>();
const userSignals = new Map<string, Set<string>>();

const SIGNAL_WEIGHTS: Record<string, number> = {
  duplicate_payment_token: 40,
  duplicate_phone: 25,
  duplicate_device_fp: 20,
  same_ip_velocity: 15,
  name_address_similarity: 15,
  disposable_email: 30,
  email_plus_alias: 20,
  email_dot_trick: 15,
  ip_subnet_match: 10,
  vpn_proxy_detected: 10,
  behavior_heuristics: 10,
  user_agent_match: 5,
  rapid_signup: 25,
  prior_trial_device: 35,
  prior_trial_ip: 20,
  suspicious_email_pattern: 15,
  emulator_detected: 20,
  automation_detected: 25,
};

const RISK_THRESHOLDS = {
  low: 20,
  medium: 45,
  high: 70,
  critical: 90,
};

function hashSignal(value: string): string {
  return createHash("sha256").update(`${SIGNAL_SALT}:${value}`).digest("hex");
}

function normalizeEmail(email: string): { normalized: string; original: string; flags: string[] } {
  const flags: string[] = [];
  const lower = email.toLowerCase().trim();
  const [localPart, domain] = lower.split("@");
  if (!localPart || !domain) return { normalized: lower, original: email, flags };

  let normalizedLocal = localPart;

  if (GMAIL_DOMAINS.has(domain)) {
    if (normalizedLocal.includes("+")) {
      flags.push("plus_alias");
      normalizedLocal = normalizedLocal.split("+")[0];
    }
    if (normalizedLocal.includes(".")) {
      flags.push("dot_trick");
      normalizedLocal = normalizedLocal.replace(/\./g, "");
    }
  } else {
    if (normalizedLocal.includes("+")) {
      flags.push("plus_alias");
      normalizedLocal = normalizedLocal.split("+")[0];
    }
  }

  const normalizedDomain = domain === "googlemail.com" ? "gmail.com" : domain;
  const normalized = `${normalizedLocal}@${normalizedDomain}`;

  if (DISPOSABLE_DOMAINS.has(domain)) {
    flags.push("disposable_domain");
  }

  const suspiciousPatterns = [
    /^[a-z]{1,2}\d{5,}@/,
    /^test\d*@/,
    /^temp\d*@/,
    /^fake\d*@/,
    /^throw\d*@/,
    /^spam\d*@/,
    /^\d{8,}@/,
  ];
  for (const pat of suspiciousPatterns) {
    if (pat.test(normalized)) {
      flags.push("suspicious_pattern");
      break;
    }
  }

  return { normalized, original: email, flags };
}

function generateDeviceFingerprint(data: Partial<DeviceFingerprintData>): string {
  const components = [
    data.canvas || "",
    data.webgl || "",
    data.fonts || "",
    data.screen || "",
    data.timezone || "",
    data.platform || "",
    String(data.colorDepth || 0),
    String(data.hardwareConcurrency || 0),
    String(data.touchSupport || false),
  ].join("|");

  return hashSignal(components);
}

function detectVPNProxy(ip: string, userAgent: string): { isVPN: boolean; isProxy: boolean; confidence: number } {
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^192\.168\./,
    /^127\./,
  ];
  const isPrivate = privateRanges.some((r) => r.test(ip));

  const proxyHeaders = ["via", "x-forwarded-for", "x-real-ip"];
  const suspiciousUA = /headless|phantom|selenium|puppeteer|playwright|automation/i.test(userAgent);

  return {
    isVPN: false,
    isProxy: !isPrivate && suspiciousUA,
    confidence: suspiciousUA ? 0.6 : 0.1,
  };
}

function detectAutomation(userAgent: string): { isBot: boolean; isEmulator: boolean; confidence: number } {
  const botPatterns = /bot|crawler|spider|headless|phantom|selenium|puppeteer|playwright|webdriver|jsdom/i;
  const emulatorPatterns = /android.*sdk|emulator|simulator|genymotion|bluestacks/i;

  const isBot = botPatterns.test(userAgent);
  const isEmulator = emulatorPatterns.test(userAgent);

  return {
    isBot,
    isEmulator,
    confidence: isBot ? 0.9 : isEmulator ? 0.7 : 0,
  };
}

function getIPSubnet(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  return ip;
}

function recordSignal(signalType: SignalRecord["signalType"], rawValue: string, userId: string): string {
  const hashedValue = hashSignal(rawValue);
  const existing = signalGraph.get(hashedValue);

  if (existing) {
    existing.userIds.add(userId);
    existing.lastSeenAt = new Date().toISOString();
  } else {
    signalGraph.set(hashedValue, {
      hashedSignal: hashedValue,
      signalType,
      userIds: new Set([userId]),
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    });
  }

  if (!userSignals.has(userId)) {
    userSignals.set(userId, new Set());
  }
  userSignals.get(userId)!.add(hashedValue);

  return hashedValue;
}

function recordIPVelocity(ip: string, userId: string): void {
  const entry = ipVelocity.get(ip) || { ip, timestamps: [], userIds: new Set<string>() };
  entry.timestamps.push(Date.now());
  entry.userIds.add(userId);

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  entry.timestamps = entry.timestamps.filter((t) => t > oneHourAgo);

  ipVelocity.set(ip, entry);
}

function checkIPVelocity(ip: string): { signupsLastHour: number; uniqueUsers: number; isHighVelocity: boolean } {
  const entry = ipVelocity.get(ip);
  if (!entry) return { signupsLastHour: 0, uniqueUsers: 0, isHighVelocity: false };

  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentTimestamps = entry.timestamps.filter((t) => t > oneHourAgo);

  return {
    signupsLastHour: recentTimestamps.length,
    uniqueUsers: entry.userIds.size,
    isHighVelocity: recentTimestamps.length >= 3,
  };
}

function markTrialGranted(userId: string, signalHashes: string[]): void {
  for (const hash of signalHashes) {
    if (!trialGrantedSignals.has(hash)) {
      trialGrantedSignals.set(hash, new Set());
    }
    trialGrantedSignals.get(hash)!.add(userId);
  }
}

function checkPriorTrialOnSignal(signalHash: string, currentUserId: string): string[] {
  const priorUsers = trialGrantedSignals.get(signalHash);
  if (!priorUsers) return [];
  return Array.from(priorUsers).filter((uid) => uid !== currentUserId);
}

export function evaluateRegistrationRisk(params: {
  email: string;
  username: string;
  ip: string;
  userAgent: string;
  userId: string;
  deviceFingerprint?: Partial<DeviceFingerprintData>;
  phone?: string;
  paymentToken?: string;
}): RegistrationRisk {
  const { email, username, ip, userAgent, userId, deviceFingerprint, phone, paymentToken } = params;
  const signals: FraudSignalDetail[] = [];
  let totalScore = 0;

  const emailInfo = normalizeEmail(email);
  const emailHash = recordSignal("email", emailInfo.normalized, userId);

  if (emailInfo.flags.includes("disposable_domain")) {
    const w = SIGNAL_WEIGHTS.disposable_email;
    totalScore += w;
    signals.push({ type: "disposable_email", description: "Disposable email domain detected", weight: w, matched: true, details: `Domain flagged as disposable` });
  }

  if (emailInfo.flags.includes("plus_alias")) {
    const w = SIGNAL_WEIGHTS.email_plus_alias;
    totalScore += w;
    signals.push({ type: "email_plus_alias", description: "Email plus-alias detected", weight: w, matched: true, details: `Plus alias used in email` });
  }

  if (emailInfo.flags.includes("dot_trick")) {
    const w = SIGNAL_WEIGHTS.email_dot_trick;
    totalScore += w;
    signals.push({ type: "email_dot_trick", description: "Gmail dot trick detected", weight: w, matched: true, details: `Dots added in Gmail address` });
  }

  if (emailInfo.flags.includes("suspicious_pattern")) {
    const w = SIGNAL_WEIGHTS.suspicious_email_pattern;
    totalScore += w;
    signals.push({ type: "suspicious_email_pattern", description: "Suspicious email pattern", weight: w, matched: true });
  }

  const normalizedEmailRecord = signalGraph.get(emailHash);
  if (normalizedEmailRecord && normalizedEmailRecord.userIds.size > 1) {
    const priorTrials = checkPriorTrialOnSignal(emailHash, userId);
    if (priorTrials.length > 0) {
      const w = SIGNAL_WEIGHTS.prior_trial_device;
      totalScore += w;
      signals.push({ type: "duplicate_normalized_email", description: "Normalized email matches prior trial user", weight: w, matched: true, details: `${priorTrials.length} prior trial(s) on same normalized email` });
    }
  }

  const emailClusterKey = hashSignal(emailInfo.normalized.split("@")[0].slice(0, 4));
  if (!emailClusterMap.has(emailClusterKey)) {
    emailClusterMap.set(emailClusterKey, new Set());
  }
  emailClusterMap.get(emailClusterKey)!.add(userId);

  recordSignal("ip", ip, userId);
  recordIPVelocity(ip, userId);
  const ipCheck = checkIPVelocity(ip);

  if (ipCheck.isHighVelocity) {
    const w = SIGNAL_WEIGHTS.rapid_signup;
    totalScore += w;
    signals.push({ type: "rapid_signup", description: "Rapid signup velocity from same IP", weight: w, matched: true, details: `${ipCheck.signupsLastHour} signups in last hour from this IP` });
  }

  if (ipCheck.uniqueUsers > 1) {
    const w = SIGNAL_WEIGHTS.same_ip_velocity;
    totalScore += w;
    signals.push({ type: "same_ip_velocity", description: "Multiple users from same IP", weight: w, matched: true, details: `${ipCheck.uniqueUsers} users from this IP` });
  }

  const ipSubnet = getIPSubnet(ip);
  const subnetHash = recordSignal("ip", ipSubnet, userId);
  const subnetRecord = signalGraph.get(subnetHash);
  if (subnetRecord && subnetRecord.userIds.size > 2) {
    const w = SIGNAL_WEIGHTS.ip_subnet_match;
    totalScore += w;
    signals.push({ type: "ip_subnet_match", description: "Multiple accounts from same subnet", weight: w, matched: true, details: `${subnetRecord.userIds.size} users in subnet ${ipSubnet}` });
  }

  const priorTrialsOnIP = checkPriorTrialOnSignal(hashSignal(ip), userId);
  if (priorTrialsOnIP.length > 0) {
    const w = SIGNAL_WEIGHTS.prior_trial_ip;
    totalScore += w;
    signals.push({ type: "prior_trial_ip", description: "IP previously used for trial", weight: w, matched: true, details: `${priorTrialsOnIP.length} prior trial(s) from this IP` });
  }

  if (deviceFingerprint) {
    const fpHash = generateDeviceFingerprint(deviceFingerprint);
    recordSignal("device_fp", fpHash, userId);

    if (!deviceToUsers.has(fpHash)) {
      deviceToUsers.set(fpHash, new Set());
    }
    deviceToUsers.get(fpHash)!.add(userId);

    if (deviceToUsers.get(fpHash)!.size > 1) {
      const w = SIGNAL_WEIGHTS.duplicate_device_fp;
      totalScore += w;
      signals.push({ type: "duplicate_device_fp", description: "Device fingerprint matches another user", weight: w, matched: true, details: `${deviceToUsers.get(fpHash)!.size} users on this device` });
    }

    const priorTrialsOnDevice = checkPriorTrialOnSignal(fpHash, userId);
    if (priorTrialsOnDevice.length > 0) {
      const w = SIGNAL_WEIGHTS.prior_trial_device;
      totalScore += w;
      signals.push({ type: "prior_trial_device", description: "Device previously used for trial", weight: w, matched: true, details: `${priorTrialsOnDevice.length} prior trial(s) on this device` });
    }
  }

  const uaHash = recordSignal("user_agent", userAgent, userId);
  const uaRecord = signalGraph.get(uaHash);
  if (uaRecord && uaRecord.userIds.size > 2) {
    const w = SIGNAL_WEIGHTS.user_agent_match;
    totalScore += w;
    signals.push({ type: "user_agent_match", description: "User agent matches multiple accounts", weight: w, matched: true, details: `${uaRecord.userIds.size} users with identical UA` });
  }

  const vpnCheck = detectVPNProxy(ip, userAgent);
  if (vpnCheck.isProxy || vpnCheck.isVPN) {
    const w = SIGNAL_WEIGHTS.vpn_proxy_detected;
    totalScore += w;
    signals.push({ type: "vpn_proxy_detected", description: "VPN/proxy detected", weight: w, matched: true, details: `Confidence: ${(vpnCheck.confidence * 100).toFixed(0)}%` });
  }

  const autoCheck = detectAutomation(userAgent);
  if (autoCheck.isBot) {
    const w = SIGNAL_WEIGHTS.automation_detected;
    totalScore += w;
    signals.push({ type: "automation_detected", description: "Automation/bot detected", weight: w, matched: true });
  }
  if (autoCheck.isEmulator) {
    const w = SIGNAL_WEIGHTS.emulator_detected;
    totalScore += w;
    signals.push({ type: "emulator_detected", description: "Emulator detected", weight: w, matched: true });
  }

  if (phone) {
    const phoneHash = recordSignal("phone", phone.replace(/\D/g, ""), userId);
    const phoneRecord = signalGraph.get(phoneHash);
    if (phoneRecord && phoneRecord.userIds.size > 1) {
      const w = SIGNAL_WEIGHTS.duplicate_phone;
      totalScore += w;
      signals.push({ type: "duplicate_phone", description: "Phone number matches another account", weight: w, matched: true });
    }
  }

  if (paymentToken) {
    const ptHash = recordSignal("payment_token", paymentToken, userId);
    const ptRecord = signalGraph.get(ptHash);
    if (ptRecord && ptRecord.userIds.size > 1) {
      const w = SIGNAL_WEIGHTS.duplicate_payment_token;
      totalScore += w;
      signals.push({ type: "duplicate_payment_token", description: "Payment method matches another account", weight: w, matched: true });
    }
  }

  const cappedScore = Math.min(100, totalScore);
  let riskLevel: RiskLevel;
  let action: FraudAction;

  if (cappedScore >= RISK_THRESHOLDS.critical) {
    riskLevel = "critical";
    action = "block";
  } else if (cappedScore >= RISK_THRESHOLDS.high) {
    riskLevel = "high";
    action = "block";
  } else if (cappedScore >= RISK_THRESHOLDS.medium) {
    riskLevel = "medium";
    action = "verify";
  } else if (cappedScore >= RISK_THRESHOLDS.low) {
    riskLevel = "low";
    action = "allow";
  } else {
    riskLevel = "low";
    action = "allow";
  }

  let caseId: string | null = null;
  if (cappedScore >= RISK_THRESHOLDS.medium) {
    caseId = `FRD-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
    const fraudCase: TrialFraudCase = {
      caseId,
      userId,
      username,
      email: emailInfo.normalized,
      riskScore: cappedScore,
      riskLevel,
      signals: signals.filter((s) => s.matched),
      action,
      status: "open",
      reviewedBy: null,
      reviewNotes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    fraudCases.set(caseId, fraudCase);
    console.log(`[FRAUD] Case ${caseId} created for ${username} (score: ${cappedScore}, action: ${action})`);
  }

  const matchedSignals = signals.filter((s) => s.matched);
  const reason =
    matchedSignals.length === 0
      ? "No risk signals detected"
      : `${matchedSignals.length} risk signal(s): ${matchedSignals.map((s) => s.type).join(", ")}`;

  return { riskScore: cappedScore, riskLevel, action, signals, reason, caseId };
}

export function remapUserId(tempId: string, realId: string): void {
  const sigs = userSignals.get(tempId);
  if (sigs) {
    userSignals.delete(tempId);
    userSignals.set(realId, sigs);

    sigs.forEach((hash) => {
      const record = signalGraph.get(hash);
      if (record) {
        record.userIds.delete(tempId);
        record.userIds.add(realId);
      }
    });
  }

  deviceToUsers.forEach((users) => {
    if (users.has(tempId)) {
      users.delete(tempId);
      users.add(realId);
    }
  });

  emailClusterMap.forEach((users) => {
    if (users.has(tempId)) {
      users.delete(tempId);
      users.add(realId);
    }
  });

  ipVelocity.forEach((entry) => {
    if (entry.userIds.has(tempId)) {
      entry.userIds.delete(tempId);
      entry.userIds.add(realId);
    }
  });

  fraudCases.forEach((fc) => {
    if (fc.userId === tempId) {
      fc.userId = realId;
    }
  });
}

export function onTrialGranted(userId: string): void {
  const userSigs = userSignals.get(userId);
  if (userSigs) {
    markTrialGranted(userId, Array.from(userSigs));
  }
}

export function getAllFraudCases(filters?: {
  status?: string;
  riskLevel?: string;
  limit?: number;
}): TrialFraudCase[] {
  let cases = Array.from(fraudCases.values());

  if (filters?.status) {
    cases = cases.filter((c) => c.status === filters.status);
  }
  if (filters?.riskLevel) {
    cases = cases.filter((c) => c.riskLevel === filters.riskLevel);
  }

  cases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (filters?.limit) {
    cases = cases.slice(0, filters.limit);
  }

  return cases;
}

export function getFraudCase(caseId: string): TrialFraudCase | null {
  return fraudCases.get(caseId) || null;
}

export function updateFraudCase(
  caseId: string,
  update: { status?: TrialFraudCase["status"]; reviewedBy?: string; reviewNotes?: string }
): TrialFraudCase | null {
  const fc = fraudCases.get(caseId);
  if (!fc) return null;

  if (update.status) fc.status = update.status;
  if (update.reviewedBy) fc.reviewedBy = update.reviewedBy;
  if (update.reviewNotes) fc.reviewNotes = update.reviewNotes;
  fc.updatedAt = new Date().toISOString();

  fraudCases.set(caseId, fc);
  console.log(`[FRAUD] Case ${caseId} updated: status=${fc.status}, reviewedBy=${fc.reviewedBy}`);
  return fc;
}

export function getFraudStats(): {
  totalCases: number;
  openCases: number;
  blockedCases: number;
  clearedCases: number;
  averageRiskScore: number;
  riskDistribution: Record<RiskLevel, number>;
  topSignals: Array<{ signal: string; count: number }>;
  signupsLastHour: number;
  trialsGranted: number;
  fraudRate: number;
} {
  const cases = Array.from(fraudCases.values());
  const open = cases.filter((c) => c.status === "open").length;
  const blocked = cases.filter((c) => c.status === "blocked").length;
  const cleared = cases.filter((c) => c.status === "cleared").length;
  const avgScore = cases.length > 0 ? cases.reduce((s, c) => s + c.riskScore, 0) / cases.length : 0;

  const riskDist: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  cases.forEach((c) => riskDist[c.riskLevel]++);

  const signalCounts = new Map<string, number>();
  cases.forEach((c) => {
    c.signals.forEach((s) => {
      signalCounts.set(s.type, (signalCounts.get(s.type) || 0) + 1);
    });
  });
  const topSignals = Array.from(signalCounts.entries())
    .map(([signal, count]) => ({ signal, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  let signupsLastHour = 0;
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  ipVelocity.forEach((entry) => {
    signupsLastHour += entry.timestamps.filter((t) => t > oneHourAgo).length;
  });

  let trialsGranted = 0;
  trialGrantedSignals.forEach((users) => {
    trialsGranted = Math.max(trialsGranted, users.size);
  });

  const totalSignups = Math.max(1, signalGraph.size);
  const fraudRate = cases.length > 0 ? (cases.filter((c) => c.action === "block").length / totalSignups) * 100 : 0;

  return {
    totalCases: cases.length,
    openCases: open,
    blockedCases: blocked,
    clearedCases: cleared,
    averageRiskScore: Math.round(avgScore),
    riskDistribution: riskDist,
    topSignals,
    signupsLastHour,
    trialsGranted,
    fraudRate: Math.round(fraudRate * 100) / 100,
  };
}

export function getIdentityGraph(userId: string): {
  userId: string;
  linkedSignals: Array<{ type: string; sharedWith: number; hash: string }>;
  clusterSize: number;
  connectedUsers: string[];
} {
  const sigs = userSignals.get(userId);
  if (!sigs) return { userId, linkedSignals: [], clusterSize: 1, connectedUsers: [] };

  const linkedSignals: Array<{ type: string; sharedWith: number; hash: string }> = [];
  const connectedUserSet = new Set<string>();

  sigs.forEach((hash) => {
    const record = signalGraph.get(hash);
    if (record) {
      const shared = record.userIds.size - 1;
      if (shared > 0) {
        linkedSignals.push({ type: record.signalType, sharedWith: shared, hash: hash.slice(0, 12) + "..." });
        record.userIds.forEach((uid) => {
          if (uid !== userId) connectedUserSet.add(uid);
        });
      }
    }
  });

  return {
    userId,
    linkedSignals,
    clusterSize: connectedUserSet.size + 1,
    connectedUsers: Array.from(connectedUserSet),
  };
}

export function getThrottleStatus(ip: string): {
  canCreateTrial: boolean;
  cooldownMinutes: number;
  reason: string;
} {
  const velocity = checkIPVelocity(ip);

  if (velocity.signupsLastHour >= 5) {
    return { canCreateTrial: false, cooldownMinutes: 60, reason: "Too many signups from this location. Please try again later." };
  }
  if (velocity.signupsLastHour >= 3) {
    return { canCreateTrial: true, cooldownMinutes: 0, reason: "Elevated activity detected. Additional verification may be required." };
  }

  return { canCreateTrial: true, cooldownMinutes: 0, reason: "" };
}

export { normalizeEmail, hashSignal, generateDeviceFingerprint, detectAutomation, detectVPNProxy };
export type { TrialFraudCase, FraudSignalDetail, RegistrationRisk, DeviceFingerprintData, RiskLevel, FraudAction };
