import assert from "assert/strict";
import {
  omnidlosClient,
  type EcosystemEvent,
  type MomentumBoost,
  type UserContext,
} from "../services/omnidlos-client";

export default async function run() {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    const maybePromise = (async () => {
      try {
        await fn();
        passed++;
        console.log(`  PASS: ${name}`);
      } catch (e: any) {
        failed++;
        errors.push(`${name}: ${e.message}`);
      }
    })();
    return maybePromise;
  }

  // ─── Authentication tests ─────────────────────────────────────────────

  await test("authenticate returns a token in dev mode", async () => {
    const token = await omnidlosClient.authenticate();
    assert.ok(token.accessToken, "should have an access token");
    assert.ok(token.expiresAt > Date.now(), "token should not be expired");
  });

  await test("authenticate returns cached token on second call", async () => {
    const token1 = await omnidlosClient.authenticate();
    const token2 = await omnidlosClient.authenticate();
    assert.equal(token1.accessToken, token2.accessToken, "should return same cached token");
  });

  // ─── Registration test ────────────────────────────────────────────────

  await test("registerApp succeeds in dev mode", async () => {
    const result = await omnidlosClient.registerApp();
    assert.equal(result.registered, true);
    assert.ok(result.appId.length > 0, "should have an appId");
    assert.equal(result.appId, "sors-maxima-dev");
  });

  // ─── Event sending test ───────────────────────────────────────────────

  await test("sendEvent does not throw in dev mode", async () => {
    const event: EcosystemEvent = {
      type: "prediction_made",
      userId: "test-user-1",
      timestamp: new Date().toISOString(),
      payload: { sport: "NBA", confidence: 0.85 },
    };
    // Should not throw
    await omnidlosClient.sendEvent(event);
  });

  await test("sendEvent accepts all event types", async () => {
    const types: EcosystemEvent["type"][] = [
      "prediction_made",
      "winning_streak",
      "risk_tolerance_change",
      "achievement_unlocked",
    ];
    for (const type of types) {
      await omnidlosClient.sendEvent({
        type,
        userId: "test-user-1",
        timestamp: new Date().toISOString(),
        payload: {},
      });
    }
    // If we got here without throwing, all event types are accepted
    assert.ok(true);
  });

  // ─── MomentumBoost type validation ────────────────────────────────────

  await test("MomentumBoost type shape is valid", () => {
    const boost: MomentumBoost = {
      sportContribution: 45,
      streakBonus: 10,
      accuracyMultiplier: 1.25,
      totalBoost: 55,
      lifeMomentumDelta: 8,
    };
    assert.equal(typeof boost.sportContribution, "number");
    assert.equal(typeof boost.streakBonus, "number");
    assert.equal(typeof boost.accuracyMultiplier, "number");
    assert.equal(typeof boost.totalBoost, "number");
    assert.equal(typeof boost.lifeMomentumDelta, "number");
  });

  // ─── UserContext type validation ──────────────────────────────────────

  await test("UserContext type shape is valid", () => {
    const ctx: UserContext = {
      emotionalState: "focused",
      momentumScore: 72,
      confidenceLevel: 0.78,
      recentActivity: ["login", "prediction_viewed"],
      lastUpdated: new Date().toISOString(),
    };
    assert.equal(typeof ctx.emotionalState, "string");
    assert.equal(typeof ctx.momentumScore, "number");
    assert.equal(typeof ctx.confidenceLevel, "number");
    assert.ok(Array.isArray(ctx.recentActivity));
    assert.equal(typeof ctx.lastUpdated, "string");
  });

  return { file: "ecosystemClient.test.ts", passed, failed, errors };
}
