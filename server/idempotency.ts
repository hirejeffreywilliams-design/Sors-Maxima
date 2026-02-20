interface IdempotencyRecord {
  key: string;
  response: {
    status: number;
    body: unknown;
  };
  createdAt: number;
  expiresAt: number;
}

class IdempotencyStore {
  private records: Map<string, IdempotencyRecord> = new Map();
  private defaultTTL = 24 * 60 * 60 * 1000;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  generateKey(): string {
    return `idem_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  get(key: string): IdempotencyRecord | null {
    const record = this.records.get(key);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.records.delete(key);
      return null;
    }

    return record;
  }

  set(key: string, status: number, body: unknown, ttl?: number): void {
    const now = Date.now();
    this.records.set(key, {
      key,
      response: { status, body },
      createdAt: now,
      expiresAt: now + (ttl || this.defaultTTL),
    });
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.records.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of Array.from(this.records)) {
      if (now > record.expiresAt) {
        this.records.delete(key);
      }
    }
  }

  getStats() {
    return {
      totalRecords: this.records.size,
      oldestRecord: this.records.size > 0
        ? Math.min(...Array.from(this.records.values()).map((r) => r.createdAt))
        : null,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.records.clear();
  }
}

export const idempotencyStore = new IdempotencyStore();
export type { IdempotencyRecord };
