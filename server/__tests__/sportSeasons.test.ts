import assert from "assert/strict";
import { isSportInSeason, getInSeasonSports } from "../sportSeasons";
import type { Sport } from "../../shared/schema";

export default async function run() {
  const errors: string[] = [];
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void) {
    try {
      fn();
      passed++;
      console.log(`  PASS: ${name}`);
    } catch (e: any) {
      failed++;
      errors.push(`${name}: ${e.message}`);
    }
  }

  test("getInSeasonSports returns NBA in January", () => {
    const jan = new Date("2025-01-15");
    const sports = getInSeasonSports(jan);
    assert.ok(sports.includes("NBA"), `NBA should be in season in January, got ${sports}`);
  });

  test("getInSeasonSports returns NFL in October", () => {
    const oct = new Date("2025-10-15");
    const sports = getInSeasonSports(oct);
    assert.ok(sports.includes("NFL"), `NFL should be in season in October, got ${sports}`);
  });

  test("getInSeasonSports returns MLB in July", () => {
    const jul = new Date("2025-07-15");
    const sports = getInSeasonSports(jul);
    assert.ok(sports.includes("MLB"), `MLB should be in season in July, got ${sports}`);
  });

  test("getInSeasonSports does not return NFL in July", () => {
    const jul = new Date("2025-07-15");
    const sports = getInSeasonSports(jul);
    assert.ok(!sports.includes("NFL"), `NFL should NOT be in season in July, got ${sports}`);
  });

  test("getInSeasonSports does not return MLB in January", () => {
    const jan = new Date("2025-01-15");
    const sports = getInSeasonSports(jan);
    assert.ok(!sports.includes("MLB"), `MLB should NOT be in season in January, got ${sports}`);
  });

  test("isSportInSeason boundary: NBA starts in October", () => {
    const oct1 = new Date("2025-10-01");
    assert.ok(isSportInSeason("NBA", oct1), "NBA should be in season on Oct 1");
  });

  test("isSportInSeason boundary: NBA ends in June", () => {
    const jun30 = new Date("2025-06-30");
    assert.ok(isSportInSeason("NBA", jun30), "NBA should be in season on June 30");
  });

  test("isSportInSeason boundary: NBA not in season in July", () => {
    const jul15 = new Date("2025-07-15");
    assert.ok(!isSportInSeason("NBA", jul15), "NBA should NOT be in season in July");
  });

  test("isSportInSeason boundary: NFL starts in August", () => {
    const aug1 = new Date("2025-08-01");
    assert.ok(isSportInSeason("NFL", aug1), "NFL should be in season on Aug 1");
  });

  test("isSportInSeason boundary: NFL in season in February (Super Bowl)", () => {
    const feb = new Date("2025-02-01");
    assert.ok(isSportInSeason("NFL", feb), "NFL should be in season in Feb");
  });

  test("isSportInSeason boundary: NFL not in season in March", () => {
    const mar = new Date("2025-03-15");
    assert.ok(!isSportInSeason("NFL", mar), "NFL should NOT be in season in March");
  });

  test("isSportInSeason for unknown sport returns false", () => {
    assert.ok(!isSportInSeason("SOCCER" as Sport), "Unknown sport should return false");
  });

  test("getInSeasonSports returns array of Sport values", () => {
    const sports = getInSeasonSports();
    assert.ok(Array.isArray(sports), "Should return an array");
    const validSports = ["NBA", "NFL", "MLB", "NHL", "NCAAB", "NCAAF"];
    for (const s of sports) {
      assert.ok(validSports.includes(s), `${s} should be a valid sport`);
    }
  });

  return { file: "sportSeasons.test.ts", passed, failed, errors };
}
