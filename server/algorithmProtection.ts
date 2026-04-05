import {
  createHmac,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from "crypto";

const BASE_SECRET = (() => {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] ADMIN_PASSWORD must be set in production for algorithm protection');
  }
  const generated = randomBytes(32).toString('hex');
  console.warn('[SECURITY] No ADMIN_PASSWORD env var set — using auto-generated key for algorithm protection.');
  return generated;
})();

const DERIVED_SALT = process.env.ALGORITHM_SALT || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] ALGORITHM_SALT must be set in production');
  }
  return randomBytes(16).toString('hex');
})();

function deriveKey(purpose: string, length: number = 32): Buffer {
  return scryptSync(BASE_SECRET + purpose, DERIVED_SALT, length);
}

export class AlgorithmFingerprint {
  private hmacKey: Buffer;

  constructor() {
    this.hmacKey = deriveKey("algorithm-fingerprint-hmac");
  }

  sign(payload: Record<string, unknown>): string {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return createHmac("sha256", this.hmacKey).update(canonical).digest("hex");
  }

  stamp(payload: Record<string, unknown>): Record<string, unknown> & { signature: string; timestamp: number; fingerprintVersion: string } {
    const timestamp = Date.now();
    const fingerprintVersion = "SM-FP-v2.0";
    const augmented = { ...payload, timestamp, fingerprintVersion };
    const signature = this.sign(augmented);
    return { ...augmented, signature };
  }

  verifySignature(payload: Record<string, unknown>): boolean {
    const { signature, ...rest } = payload as Record<string, unknown> & { signature?: string };
    if (typeof signature !== "string") return false;
    const expected = this.sign(rest);
    if (expected.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

export class ObfuscatedConstants {
  private salt: string;
  private store: Map<string, string>;

  constructor() {
    this.salt = createHash("sha256").update(BASE_SECRET + "obfuscation-layer").digest("hex");
    this.store = new Map();
    this.initializeConstants();
  }

  private getRotatingKey(): Buffer {
    const dateKey = new Date().toISOString().split("T")[0];
    return createHash("sha256")
      .update(this.salt + dateKey)
      .digest();
  }

  encode(value: number): string {
    const key = this.getRotatingKey();
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(value, 0);
    const encoded = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      encoded[i] = buf[i] ^ key[i % key.length];
    }
    return encoded.toString("base64");
  }

  decode(encoded: string): number {
    const key = this.getRotatingKey();
    const buf = Buffer.from(encoded, "base64");
    const decoded = Buffer.alloc(8);
    for (let i = 0; i < 8; i++) {
      decoded[i] = buf[i] ^ key[i % key.length];
    }
    return decoded.readDoubleBE(0);
  }

  private initializeConstants(): void {
    const constants: Record<string, number> = {
      goldenRatio: 1.6180339887498949,
      euler: 2.7182818284590452,
      fusionAlpha: 0.7231056,
      fusionBeta: 0.2814923,
      kellyEdgeThreshold: 0.0312,
      vigAdjustment: 0.04545,
      sigmoidSharpness: 3.7219,
      bayesianPriorWeight: 0.6184,
      entropyNormalization: 1.4427,
      choleskyRegularization: 0.00147,
      waveletThreshold: 0.06731,
      correlationDecay: 0.9412,
      momentumHalfLife: 0.6931,
      edgeSmoothingFactor: 0.2386,
      probabilityCeiling: 0.9724,
      probabilityFloor: 0.0276,
    };
    for (const [name, value] of Object.entries(constants)) {
      this.store.set(name, this.encode(value));
    }
  }

  get(name: string): number {
    const encoded = this.store.get(name);
    if (encoded === undefined) {
      throw new Error(`Unknown constant: ${name}`);
    }
    return this.decode(encoded);
  }

  list(): string[] {
    return Array.from(this.store.keys());
  }
}

export class ProprietaryTransform {
  private constants: ObfuscatedConstants;

  constructor(constants?: ObfuscatedConstants) {
    this.constants = constants || new ObfuscatedConstants();
  }

  applySigmoidWarp(probability: number, sharpness: number): number {
    const alpha = this.constants.get("fusionAlpha");
    const ceiling = this.constants.get("probabilityCeiling");
    const floor = this.constants.get("probabilityFloor");
    const shifted = probability - 0.5;
    const k = sharpness * this.constants.get("sigmoidSharpness");
    const raw = 1 / (1 + Math.exp(-k * shifted * alpha));
    const range = ceiling - floor;
    return floor + range * raw;
  }

  applyBayesianUpdate(prior: number, likelihood: number, evidence: number): number {
    const priorWeight = this.constants.get("bayesianPriorWeight");
    const floor = this.constants.get("probabilityFloor");
    const ceiling = this.constants.get("probabilityCeiling");
    const weightedPrior = prior * priorWeight + (1 - priorWeight) * 0.5;
    const numerator = likelihood * weightedPrior;
    const denominator = evidence > 0 ? evidence : likelihood * weightedPrior + (1 - likelihood) * (1 - weightedPrior);
    const posterior = numerator / denominator;
    return Math.max(floor, Math.min(ceiling, posterior));
  }

  applyCholeskyCorrelation(probabilities: number[], correlationMatrix: number[][]): number[] {
    const n = probabilities.length;
    const reg = this.constants.get("choleskyRegularization");
    const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          const diag = correlationMatrix[i][i] + reg - sum;
          L[i][j] = Math.sqrt(Math.max(diag, reg));
        } else {
          L[i][j] = (correlationMatrix[i][j] - sum) / L[j][j];
        }
      }
    }
    const z = probabilities.map((p) => {
      const clamped = Math.max(0.001, Math.min(0.999, p));
      return -Math.log(1 / clamped - 1);
    });
    const correlated: number[] = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        correlated[i] += L[i][j] * z[j];
      }
    }
    const decay = this.constants.get("correlationDecay");
    return correlated.map((v) => 1 / (1 + Math.exp(-v * decay)));
  }

  applyEntropyWeighting(signals: { value: number; confidence: number }[]): number {
    if (signals.length === 0) return 0.5;
    const norm = this.constants.get("entropyNormalization");
    const totalConfidence = signals.reduce((s, sig) => s + sig.confidence, 0);
    if (totalConfidence === 0) return 0.5;
    const weights = signals.map((sig) => {
      const p = Math.max(0.001, Math.min(0.999, sig.confidence / 100));
      const entropy = -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
      const informationGain = (1 - entropy) * norm;
      return informationGain * sig.confidence;
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    if (totalWeight === 0) return 0.5;
    let result = 0;
    for (let i = 0; i < signals.length; i++) {
      result += (weights[i] / totalWeight) * signals[i].value;
    }
    const floor = this.constants.get("probabilityFloor");
    const ceiling = this.constants.get("probabilityCeiling");
    return Math.max(floor, Math.min(ceiling, result));
  }

  applyWaveletDenoising(timeSeries: number[]): number[] {
    if (timeSeries.length < 2) return [...timeSeries];
    const threshold = this.constants.get("waveletThreshold");
    const smoothing = this.constants.get("edgeSmoothingFactor");
    const len = timeSeries.length;
    const padLen = Math.pow(2, Math.ceil(Math.log2(len)));
    const padded = new Array(padLen).fill(0);
    for (let i = 0; i < len; i++) padded[i] = timeSeries[i];
    for (let i = len; i < padLen; i++) padded[i] = timeSeries[len - 1];
    let current = [...padded];
    const details: number[][] = [];
    let halfLen = padLen;
    while (halfLen >= 2) {
      const half = halfLen / 2;
      const approx = new Array(half).fill(0);
      const detail = new Array(half).fill(0);
      for (let i = 0; i < half; i++) {
        approx[i] = (current[2 * i] + current[2 * i + 1]) * 0.7071067811865476;
        detail[i] = (current[2 * i] - current[2 * i + 1]) * 0.7071067811865476;
      }
      for (let i = 0; i < half; i++) {
        if (Math.abs(detail[i]) < threshold) {
          detail[i] = 0;
        } else {
          detail[i] *= (1 - smoothing);
        }
      }
      details.push(detail);
      current = [...approx, ...current.slice(half)];
      halfLen = half;
    }
    for (let level = details.length - 1; level >= 0; level--) {
      const detail = details[level];
      const half = detail.length;
      const reconstructed = new Array(half * 2).fill(0);
      for (let i = 0; i < half; i++) {
        reconstructed[2 * i] = (current[i] + detail[i]) * 0.7071067811865476;
        reconstructed[2 * i + 1] = (current[i] - detail[i]) * 0.7071067811865476;
      }
      current = [...reconstructed, ...current.slice(half)];
    }
    return current.slice(0, len);
  }
}

export class TemporalGuard {
  private measurements: Map<string, { start: number; expectedMs: number }>;
  private history: Map<string, number[]>;
  private anomalyThreshold: number;
  private maxHistory: number;

  constructor() {
    this.measurements = new Map();
    this.history = new Map();
    this.anomalyThreshold = 10;
    this.maxHistory = 100;
  }

  startMeasure(operationId: string, expectedMs: number = 50): void {
    this.measurements.set(operationId, {
      start: performance.now(),
      expectedMs,
    });
  }

  endMeasure(operationId: string): { elapsed: number; ratio: number; flagged: boolean } {
    const measurement = this.measurements.get(operationId);
    if (!measurement) {
      return { elapsed: 0, ratio: 0, flagged: false };
    }
    const elapsed = performance.now() - measurement.start;
    const ratio = elapsed / measurement.expectedMs;
    this.measurements.delete(operationId);
    const histKey = operationId.replace(/_[a-f0-9]+$/i, "");
    if (!this.history.has(histKey)) {
      this.history.set(histKey, []);
    }
    const hist = this.history.get(histKey)!;
    hist.push(elapsed);
    if (hist.length > this.maxHistory) {
      hist.shift();
    }
    const flagged = ratio > this.anomalyThreshold;
    return { elapsed, ratio, flagged };
  }

  isAnomaly(operationId: string): boolean {
    const histKey = operationId.replace(/_[a-f0-9]+$/i, "");
    const hist = this.history.get(histKey);
    if (!hist || hist.length < 5) return false;
    const sorted = [...hist].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mad = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
    const medianAbsDev = mad[Math.floor(mad.length / 2)] || 1;
    const latest = hist[hist.length - 1];
    const zScore = Math.abs(latest - median) / (medianAbsDev * 1.4826);
    return zScore > 3.5;
  }

  getStats(): Record<string, { count: number; avgMs: number; p95Ms: number; anomalies: number }> {
    const stats: Record<string, { count: number; avgMs: number; p95Ms: number; anomalies: number }> = {};
    this.history.forEach((hist, key) => {
      const sorted = [...hist].sort((a, b) => a - b);
      const avg = hist.reduce((s, v) => s + v, 0) / hist.length;
      const p95 = sorted[Math.floor(sorted.length * 0.95)] || avg;
      const median = sorted[Math.floor(sorted.length / 2)];
      const mad = sorted.map((v) => Math.abs(v - median)).sort((a, b) => a - b);
      const medianAbsDev = mad[Math.floor(mad.length / 2)] || 1;
      let anomalies = 0;
      for (const v of hist) {
        if (Math.abs(v - median) / (medianAbsDev * 1.4826) > 3.5) anomalies++;
      }
      stats[key] = {
        count: hist.length,
        avgMs: parseFloat(avg.toFixed(3)),
        p95Ms: parseFloat(p95.toFixed(3)),
        anomalies,
      };
    });
    return stats;
  }
}

export function encryptAlgorithmState(state: object): string {
  const key = deriveKey("algorithm-state-encryption", 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = JSON.stringify(state);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

export function decryptAlgorithmState(encrypted: string): object {
  const key = deriveKey("algorithm-state-encryption", 32);
  const combined = Buffer.from(encrypted, "base64");
  const iv = combined.subarray(0, 12);
  const authTag = combined.subarray(12, 28);
  const ciphertext = combined.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString("utf8"));
}

export class NonceManager {
  private nonces: Map<string, number>;
  private ttlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null;

  constructor(ttlMs: number = 5 * 60 * 1000) {
    this.nonces = new Map();
    this.ttlMs = ttlMs;
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  generate(): string {
    const nonce = randomBytes(24).toString("base64url");
    this.nonces.set(nonce, Date.now());
    return nonce;
  }

  validate(nonce: string): boolean {
    const created = this.nonces.get(nonce);
    if (created === undefined) return false;
    this.nonces.delete(nonce);
    const age = Date.now() - created;
    return age <= this.ttlMs;
  }

  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.ttlMs;
    this.nonces.forEach((created, nonce) => {
      if (created < cutoff) {
        this.nonces.delete(nonce);
      }
    });
  }

  activeCount(): number {
    return this.nonces.size;
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.nonces.clear();
  }
}

export const protectionSuite = {
  fingerprint: new AlgorithmFingerprint(),
  constants: new ObfuscatedConstants(),
  transform: new ProprietaryTransform(),
  guard: new TemporalGuard(),
  nonce: new NonceManager(),
  encryptState: encryptAlgorithmState,
  decryptState: decryptAlgorithmState,
};
