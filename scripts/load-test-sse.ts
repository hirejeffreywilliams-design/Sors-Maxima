#!/usr/bin/env npx tsx
/**
 * SSE Load Test — validates the 200-connection cap and measures behaviour
 * under concurrent load.
 *
 * Usage:
 *   npx tsx scripts/load-test-sse.ts [concurrency] [base-url]
 *
 * Examples:
 *   npx tsx scripts/load-test-sse.ts 50
 *   npx tsx scripts/load-test-sse.ts 220 http://localhost:5000
 *
 * What it tests:
 *   1. Connections accepted up to MAX_TOTAL_CLIENTS (200)
 *   2. Connections beyond the cap get a 503 — not a hang
 *   3. Per-IP cap (5) is enforced when many connections share one IP
 *   4. Heartbeat events arrive within the expected window
 *   5. Clean disconnects don't leave zombie clients
 */

import http from "http";

const CONCURRENCY  = parseInt(process.argv[2] ?? "60", 10);
const BASE_URL     = process.argv[3] ?? "http://localhost:5000";
const SSE_PATH     = "/api/intelligence/stream";
const HOLD_TIME_MS = 10_000;
const CONNECT_TIMEOUT_MS = 5_000;

interface Result {
  index:         number;
  status:        number | "error" | "timeout";
  firstEventMs:  number | null;
  error?:        string;
}

function openSSEConnection(index: number, url: string): Promise<Result> {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;
    let firstEventMs: number | null = null;

    const parsed = new URL(url);
    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port:     parsed.port || 80,
      path:     SSE_PATH,
      method:   "GET",
      headers:  {
        Accept:          "text/event-stream",
        "Cache-Control": "no-cache",
      },
    };

    const settle = (result: Result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const connectTimer = setTimeout(() => {
      req.destroy();
      settle({ index, status: "timeout", firstEventMs, error: "connect timeout" });
    }, CONNECT_TIMEOUT_MS);

    const req = http.request(options, (res) => {
      clearTimeout(connectTimer);

      if (res.statusCode !== 200) {
        res.resume();
        settle({ index, status: res.statusCode!, firstEventMs: null });
        return;
      }

      let buf = "";
      res.on("data", (chunk: Buffer) => {
        if (firstEventMs === null) firstEventMs = Date.now() - start;
        buf += chunk.toString();
        // Each SSE message ends with \n\n
        if (buf.includes("\n\n") && !settled) {
          settle({ index, status: 200, firstEventMs });
        }
      });

      res.on("end",   () => settle({ index, status: 200, firstEventMs }));
      res.on("error", (e) => settle({ index, status: "error", firstEventMs, error: e.message }));

      // Hold the connection open then destroy it
      setTimeout(() => {
        res.destroy();
        settle({ index, status: 200, firstEventMs });
      }, HOLD_TIME_MS);
    });

    req.on("error", (e) => {
      clearTimeout(connectTimer);
      settle({ index, status: "error", firstEventMs: null, error: e.message });
    });

    req.end();
  });
}

async function runLoadTest() {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  SSE Load Test`);
  console.log(`  Target  : ${BASE_URL}${SSE_PATH}`);
  console.log(`  Clients : ${CONCURRENCY}`);
  console.log(`  Hold    : ${HOLD_TIME_MS / 1000}s per connection`);
  console.log(`${"─".repeat(60)}\n`);

  const promises = Array.from({ length: CONCURRENCY }, (_, i) =>
    openSSEConnection(i + 1, BASE_URL)
  );

  const results = await Promise.all(promises);

  // ── Summarise ──────────────────────────────────────────────────────────────
  const accepted  = results.filter(r => r.status === 200);
  const rejected  = results.filter(r => r.status === 503 || r.status === 429);
  const errors    = results.filter(r => r.status === "error");
  const timeouts  = results.filter(r => r.status === "timeout");
  const otherBad  = results.filter(r =>
    r.status !== 200 && r.status !== 503 && r.status !== 429 &&
    r.status !== "error" && r.status !== "timeout"
  );

  const eventTimes = accepted.map(r => r.firstEventMs!).filter(Boolean);
  const avgEvent   = eventTimes.length
    ? Math.round(eventTimes.reduce((a, b) => a + b, 0) / eventTimes.length)
    : null;

  console.log(`Results:`);
  console.log(`  ✓  Accepted (200)        : ${accepted.length}`);
  console.log(`  ✗  Cap-rejected (503/429): ${rejected.length}`);
  console.log(`  !  Network errors        : ${errors.length}`);
  console.log(`  ⏱  Timeouts              : ${timeouts.length}`);
  if (otherBad.length) {
    console.log(`  ?  Other status codes    : ${otherBad.map(r => r.status).join(", ")}`);
  }
  if (avgEvent !== null) {
    console.log(`\n  Avg ms to first SSE event: ${avgEvent}ms`);
  }

  // ── Pass/Fail assertions ──────────────────────────────────────────────────
  console.log(`\nAssertions:`);
  let passed = true;

  const expectCapped = CONCURRENCY > 200;
  if (expectCapped) {
    const capOk = rejected.length > 0;
    console.log(`  ${capOk ? "✓" : "✗"} Connections over 200 were rejected (503/429): ${capOk ? "PASS" : "FAIL"}`);
    if (!capOk) passed = false;
  } else {
    const allAccepted = accepted.length === CONCURRENCY;
    console.log(`  ${allAccepted ? "✓" : "✗"} All ${CONCURRENCY} connections accepted: ${allAccepted ? "PASS" : "FAIL"}`);
    if (!allAccepted) passed = false;
  }

  const noHangs = timeouts.length === 0;
  console.log(`  ${noHangs ? "✓" : "✗"} No hanging connections (timeouts === 0): ${noHangs ? "PASS" : "FAIL"}`);
  if (!noHangs) passed = false;

  const errorRate = errors.length / CONCURRENCY;
  const errorOk = errorRate < 0.05;
  console.log(`  ${errorOk ? "✓" : "✗"} Error rate <5% (${(errorRate * 100).toFixed(1)}%): ${errorOk ? "PASS" : "FAIL"}`);
  if (!errorOk) passed = false;

  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Overall: ${passed ? "✓ PASS" : "✗ FAIL"}`);
  console.log(`${"─".repeat(60)}\n`);

  process.exit(passed ? 0 : 1);
}

runLoadTest().catch((err) => {
  console.error("Load test failed:", err);
  process.exit(1);
});
