import assert from "assert/strict";
import {
  analyzeLeg,
  analyzeTicket,
  getAllFactors,
} from "../quantumFusionEngine";
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

  test("analyzeLeg returns valid FusionResult with all required fields", () => {
    const result = analyzeLeg("NBA" as Sport, "Lakers ML", -150);
    assert.equal(typeof result.overallScore, "number");
    assert.ok(result.overallScore >= 0 && result.overallScore <= 100, `overallScore ${result.overallScore} should be 0-100`);
    assert.equal(typeof result.confidence, "number");
    assert.equal(typeof result.grade, "string");
    assert.ok(result.grade.length > 0, "grade should not be empty");
    assert.ok(result.quantumState !== undefined, "quantumState should exist");
    assert.equal(typeof result.quantumState.coherence, "number");
    assert.equal(typeof result.quantumState.entanglement, "number");
    assert.equal(typeof result.quantumState.superposition, "number");
    assert.ok(Array.isArray(result.signals), "signals should be an array");
    assert.ok(result.signals.length > 0, "signals should not be empty");
    assert.ok(result.correlationMatrix !== undefined, "correlationMatrix should exist");
    assert.equal(typeof result.expectedValue, "number");
    assert.equal(typeof result.riskAdjustedReturn, "number");
    assert.equal(typeof result.kellyCriterion, "number");
    assert.equal(typeof result.optimalStake, "number");
    assert.equal(typeof result.edgePercentage, "number");
    assert.equal(typeof result.winProbability, "number");
    assert.ok(["strong_bet", "moderate_bet", "lean_bet", "avoid", "fade"].includes(result.recommendation));
    assert.ok(Array.isArray(result.insights), "insights should be an array");
    assert.ok(Array.isArray(result.synergies), "synergies should be an array");
    assert.equal(typeof result.learningContribution, "number");
  });

  test("analyzeLeg works for different sports", () => {
    const sports: Sport[] = ["NBA", "NFL", "MLB", "NHL"];
    for (const sport of sports) {
      const result = analyzeLeg(sport, `${sport} test pick`, +120);
      assert.equal(typeof result.overallScore, "number", `${sport} should return overallScore`);
      assert.ok(result.signals.length > 0, `${sport} should produce signals`);
    }
  });

  test("analyzeTicket combines legs correctly", () => {
    const legs = [
      { id: "leg1", sport: "NBA" as Sport, description: "Lakers ML", odds: -150 },
      { id: "leg2", sport: "NFL" as Sport, description: "Chiefs +3", odds: -110 },
    ];
    const result = analyzeTicket(legs);
    assert.ok(result.ticketId.length > 0, "ticketId should not be empty");
    assert.equal(result.legs.length, 2, "should have 2 leg analyses");
    assert.ok(result.combinedFusion !== undefined, "combinedFusion should exist");
    assert.equal(typeof result.combinedFusion.overallScore, "number");
    assert.equal(typeof result.correlationBonus, "number");
    assert.equal(typeof result.diversificationScore, "number");
    assert.ok(["conservative", "moderate", "aggressive"].includes(result.riskProfile));
    assert.equal(typeof result.expectedPayout, "number");
  });

  test("FUSION_WEIGHTS has a sane number of factors", () => {
    const factors = getAllFactors();
    // Avoid brittle coupling to a magic number as factors evolve.
    assert.ok(factors.length >= 30, `Expected at least 30 factors, got ${factors.length}`);
    assert.ok(factors.length <= 120, `Expected at most 120 factors, got ${factors.length}`);
  });

  test("All FUSION_WEIGHTS have valid structure", () => {
    const factors = getAllFactors();
    for (const f of factors) {
      assert.equal(typeof f.factor, "string");
      assert.equal(typeof f.weight, "number");
      assert.ok(f.weight > 0, `Weight for ${f.factor} should be > 0`);
      assert.equal(typeof f.confidence, "number");
      assert.equal(typeof f.historicalAccuracy, "number");
      assert.ok(["improving", "stable", "declining"].includes(f.recentTrend));
      assert.equal(typeof f.learningRate, "number");
    }
  });

  return { file: "quantumFusionEngine.test.ts", passed, failed, errors };
}
