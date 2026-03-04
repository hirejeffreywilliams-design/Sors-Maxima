import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";

interface CacheEntry {
  body: string;
  etag: string;
  cachedAt: number;
  ttl: number;
  statusCode: number;
  contentType: string;
}

const cache = new Map<string, CacheEntry>();

let hitCount = 0;
let missCount = 0;
let bypassCount = 0;

setInterval(() => {
  const now = Date.now();
  let expired = 0;
  for (const [key, entry] of cache.entries()) {
    if (now - entry.cachedAt > entry.ttl) {
      cache.delete(key);
      expired++;
    }
  }
  if (expired > 0) {
    console.log(`[ResponseCache] Evicted ${expired} expired entries. Cache size: ${cache.size}. Hits: ${hitCount}, Misses: ${missCount}, Bypasses: ${bypassCount}`);
  }
}, 60_000);

export function responseCacheMiddleware(ttlMs: number, keyFn?: (req: Request) => string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn ? keyFn(req) : req.originalUrl;

    const existing = cache.get(key);
    if (existing && Date.now() - existing.cachedAt < existing.ttl) {
      const clientEtag = req.headers["if-none-match"];
      if (clientEtag && clientEtag === existing.etag) {
        hitCount++;
        res.status(304).end();
        return;
      }
      hitCount++;
      res.setHeader("X-Cache", "HIT");
      res.setHeader("ETag", existing.etag);
      res.setHeader("Cache-Control", `private, max-age=${Math.floor(existing.ttl / 1000)}`);
      res.setHeader("Content-Type", existing.contentType || "application/json");
      res.status(existing.statusCode).send(existing.body);
      return;
    }

    missCount++;
    const originalJson = res.json.bind(res);
    res.json = (body: any): Response => {
      try {
        const bodyStr = JSON.stringify(body);
        const etag = `"${createHash("md5").update(bodyStr).digest("hex").slice(0, 16)}"`;
        const contentType = res.getHeader("Content-Type") as string || "application/json; charset=utf-8";
        cache.set(key, {
          body: bodyStr,
          etag,
          cachedAt: Date.now(),
          ttl: ttlMs,
          statusCode: res.statusCode || 200,
          contentType,
        });
        res.setHeader("X-Cache", "MISS");
        res.setHeader("ETag", etag);
        res.setHeader("Cache-Control", `private, max-age=${Math.floor(ttlMs / 1000)}`);
        const clientEtag = req.headers["if-none-match"];
        if (clientEtag && clientEtag === etag) {
          res.status(304).end();
          return res;
        }
      } catch {}
      return originalJson(body);
    };
    next();
  };
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

export function getCacheStats() {
  return {
    size: cache.size,
    hitCount,
    missCount,
    bypassCount,
    hitRate: hitCount + missCount > 0 ? Math.round((hitCount / (hitCount + missCount)) * 100) : 0,
    entries: [...cache.entries()].map(([key, v]) => ({
      key,
      ageMs: Date.now() - v.cachedAt,
      ttl: v.ttl,
      bodyBytes: v.body.length,
    })),
  };
}
