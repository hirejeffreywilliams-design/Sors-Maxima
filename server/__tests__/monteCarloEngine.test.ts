import assert from "assert/strict";
import {
  MersenneTwister,
  recordOutcome,
  getCalibrationReport,
  getMonteCarloEngineStatus,
} from "../monteCarloEngine";

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

  test("MersenneTwister produces numbers in [0, 1)", () => {
    const rng = new MersenneTwister(42);
    for (let i = 0; i < 1000; i++) {
      const val = rng.next();
      assert.ok(val >= 0, `Value ${val} should be >= 0`);
      assert.ok(val < 1, `Value ${val} should be < 1`);
    }
  });

  test("MersenneTwister produces different values with different seeds", () => {
    const rng1 = new MersenneTwister(1);
    const rng2 = new MersenneTwister(2);
    const v1 = rng1.next();
    const v2 = rng2.next();
    assert.notEqual(v1, v2, "Different seeds should produce different values");
  });

  test("MersenneTwister produces consistent values with same seed", () => {
    const rng1 = new MersenneTwister(123);
    const rng2 = new MersenneTwister(123);
    for (let i = 0; i < 100; i++) {
      assert.equal(rng1.next(), rng2.next(), `Sequence should match at index ${i}`);
    }
  });

  test("recordOutcome updates learningData (predictions increase)", () => {
    const reportBefore = getCalibrationReport();
    const countBefore = reportBefore.totalPredictions;

    recordOutcome("test-game-1", "NBA", "moneyline", 0.65, 1);
    recordOutcome("test-game-2", "NFL", "spread", 0.55, 0);

    const reportAfter = getCalibrationReport();
    assert.ok(
      reportAfter.totalPredictions >= countBefore + 2,
      `Predictions should increase by at least 2, got ${reportAfter.totalPredictions} vs ${countBefore}`
    );
  });

  test("getCalibrationReport returns correct structure", () => {
    const report = getCalibrationReport();
    assert.equal(typeof report.overallAccuracy, "number");
    assert.equal(typeof report.totalPredictions, "number");
    assert.equal(typeof report.driftScore, "number");
    assert.ok(["healthy", "warning", "critical"].includes(report.driftStatus));
    assert.ok(Array.isArray(report.byProbBucket));
    assert.ok(Array.isArray(report.improvementTrend));
    assert.equal(typeof report.lastCalibration, "string");
    assert.equal(typeof report.totalSimulationsRun, "number");
    assert.equal(typeof report.bySport, "object");
    assert.equal(typeof report.byMarket, "object");
    assert.equal(typeof report.bayesianParams, "object");
  });

  test("getMonteCarloEngineStatus returns correct shape", () => {
    const status = getMonteCarloEngineStatus();
    assert.equal(typeof status.running, "boolean");
    assert.equal(typeof status.totalSimulations, "number");
    assert.equal(typeof status.preSimCacheSize, "number");
    assert.equal(typeof status.parlayCacheSize, "number");
    assert.equal(typeof status.predictionRecords, "number");
    assert.equal(typeof status.calibrationEntries, "number");
    assert.equal(typeof status.engineStartedAt, "string");
    assert.equal(typeof status.lastPreSimCycle, "string");
    assert.ok(Array.isArray(status.sportsCovered));
    assert.equal(typeof status.learningVersion, "number");
    assert.equal(typeof status.driftStatus, "string");
    assert.equal(typeof status.uptime, "number");
  });

  return { file: "monteCarloEngine.test.ts", passed, failed, errors };
}
