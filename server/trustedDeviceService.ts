import { randomBytes, createHash } from "crypto";

export interface TrustedDevice {
  id: string;
  userId: string;
  hashedToken: string;
  deviceName: string;
  userAgent: string;
  ipAddress: string;
  ipSubnet: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  revoked: boolean;
}

interface DeviceTokenResult {
  rawToken: string;
  device: TrustedDevice;
}

const DEVICE_TOKEN_TTL_DAYS = 60;
const MAX_DEVICES_PER_USER = 10;
const MAX_TRUST_REQUESTS_PER_DAY = 5;

const trustedDevices = new Map<string, TrustedDevice>();
const trustRateLimit = new Map<string, number[]>();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function extractIpSubnet(ip: string): string {
  const parts = ip.split(".");
  if (parts.length === 4) {
    return parts.slice(0, 3).join(".") + ".0/24";
  }
  return ip;
}

function generateDeviceId(): string {
  return randomBytes(16).toString("hex");
}

function generateDeviceToken(): string {
  return randomBytes(48).toString("hex");
}

function parseUserAgent(ua: string): string {
  if (!ua) return "Unknown Device";
  if (/iPhone|iPad/i.test(ua)) return "iOS Device";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Windows/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Chrome on Windows";
    if (/Firefox/i.test(ua)) return "Firefox on Windows";
    if (/Edg/i.test(ua)) return "Edge on Windows";
    return "Windows Browser";
  }
  if (/Mac OS/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Chrome on Mac";
    if (/Safari/i.test(ua)) return "Safari on Mac";
    if (/Firefox/i.test(ua)) return "Firefox on Mac";
    return "Mac Browser";
  }
  if (/Linux/i.test(ua)) {
    if (/Chrome/i.test(ua)) return "Chrome on Linux";
    if (/Firefox/i.test(ua)) return "Firefox on Linux";
    return "Linux Browser";
  }
  return "Unknown Browser";
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const timestamps = trustRateLimit.get(userId) || [];
  const recent = timestamps.filter((t) => t > dayAgo);
  trustRateLimit.set(userId, recent);
  return recent.length >= MAX_TRUST_REQUESTS_PER_DAY;
}

function recordTrustRequest(userId: string): void {
  const timestamps = trustRateLimit.get(userId) || [];
  timestamps.push(Date.now());
  trustRateLimit.set(userId, timestamps);
}

export function createTrustedDevice(
  userId: string,
  userAgent: string,
  ipAddress: string
): DeviceTokenResult | { error: string } {
  if (isRateLimited(userId)) {
    return { error: "Too many device trust requests today. Try again tomorrow." };
  }

  const userDevices = Array.from(trustedDevices.values()).filter(
    (d) => d.userId === userId && !d.revoked && new Date(d.expiresAt) > new Date()
  );

  if (userDevices.length >= MAX_DEVICES_PER_USER) {
    return { error: `Maximum of ${MAX_DEVICES_PER_USER} trusted devices reached. Revoke an existing device first.` };
  }

  const deviceId = generateDeviceId();
  const rawToken = generateDeviceToken();
  const hashedToken = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const device: TrustedDevice = {
    id: deviceId,
    userId,
    hashedToken,
    deviceName: parseUserAgent(userAgent),
    userAgent: userAgent.substring(0, 200),
    ipAddress,
    ipSubnet: extractIpSubnet(ipAddress),
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revoked: false,
  };

  trustedDevices.set(deviceId, device);
  recordTrustRequest(userId);

  return { rawToken: `${deviceId}:${rawToken}`, device };
}

export function validateDeviceToken(
  cookieValue: string,
  userAgent: string,
  ipAddress: string
): { valid: boolean; userId?: string; username?: string; isAdmin?: boolean; deviceId?: string; requiresReauth?: boolean } {
  if (!cookieValue || !cookieValue.includes(":")) {
    return { valid: false };
  }

  const [deviceId, rawToken] = cookieValue.split(":", 2);
  const device = trustedDevices.get(deviceId);

  if (!device) {
    return { valid: false };
  }

  if (device.revoked) {
    return { valid: false };
  }

  if (new Date(device.expiresAt) < new Date()) {
    trustedDevices.delete(deviceId);
    return { valid: false };
  }

  const hashedInput = hashToken(rawToken);
  if (hashedInput !== device.hashedToken) {
    return { valid: false };
  }

  const currentSubnet = extractIpSubnet(ipAddress);
  const ipChanged = currentSubnet !== device.ipSubnet;

  const normalizedStored = device.userAgent.toLowerCase().substring(0, 100);
  const normalizedCurrent = userAgent.toLowerCase().substring(0, 100);
  const uaChanged = normalizedStored !== normalizedCurrent;

  if (ipChanged && uaChanged) {
    return { valid: false, requiresReauth: true };
  }

  device.lastUsedAt = new Date().toISOString();
  device.ipAddress = ipAddress;
  if (!ipChanged) {
    device.ipSubnet = currentSubnet;
  }

  return {
    valid: true,
    userId: device.userId,
    deviceId: device.id,
    requiresReauth: ipChanged || uaChanged,
  };
}

export function getUserDevices(userId: string): Array<{
  id: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}> {
  return Array.from(trustedDevices.values())
    .filter((d) => d.userId === userId && !d.revoked && new Date(d.expiresAt) > new Date())
    .map((d) => ({
      id: d.id,
      deviceName: d.deviceName,
      ipAddress: d.ipAddress.substring(0, d.ipAddress.lastIndexOf(".")) + ".***",
      createdAt: d.createdAt,
      lastUsedAt: d.lastUsedAt,
      expiresAt: d.expiresAt,
      current: false,
    }))
    .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
}

export function revokeDevice(userId: string, deviceId: string): boolean {
  const device = trustedDevices.get(deviceId);
  if (!device || device.userId !== userId) {
    return false;
  }
  device.revoked = true;
  return true;
}

export function revokeAllDevices(userId: string): number {
  let count = 0;
  Array.from(trustedDevices.values()).forEach((device) => {
    if (device.userId === userId && !device.revoked) {
      device.revoked = true;
      count++;
    }
  });
  return count;
}

export function refreshDeviceToken(
  cookieValue: string,
  userAgent: string,
  ipAddress: string
): DeviceTokenResult | null {
  if (!cookieValue || !cookieValue.includes(":")) {
    return null;
  }

  const [deviceId, rawToken] = cookieValue.split(":", 2);
  const device = trustedDevices.get(deviceId);

  if (!device || device.revoked || new Date(device.expiresAt) < new Date()) {
    return null;
  }

  const hashedInput = hashToken(rawToken);
  if (hashedInput !== device.hashedToken) {
    return null;
  }

  const newRawToken = generateDeviceToken();
  device.hashedToken = hashToken(newRawToken);
  device.lastUsedAt = new Date().toISOString();
  device.expiresAt = new Date(Date.now() + DEVICE_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  device.userAgent = userAgent.substring(0, 200);
  device.ipAddress = ipAddress;
  device.ipSubnet = extractIpSubnet(ipAddress);

  return { rawToken: `${deviceId}:${newRawToken}`, device };
}

export function getDeviceStats(): {
  totalDevices: number;
  activeDevices: number;
  revokedDevices: number;
  expiredDevices: number;
} {
  const now = new Date();
  let active = 0;
  let revoked = 0;
  let expired = 0;

  Array.from(trustedDevices.values()).forEach((device) => {
    if (device.revoked) {
      revoked++;
    } else if (new Date(device.expiresAt) < now) {
      expired++;
    } else {
      active++;
    }
  });

  return {
    totalDevices: trustedDevices.size,
    activeDevices: active,
    revokedDevices: revoked,
    expiredDevices: expired,
  };
}
