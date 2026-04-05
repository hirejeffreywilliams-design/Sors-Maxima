import assert from "assert/strict";
import {
  emotionalEdgeService,
  type EmotionalState,
} from "../services/emotional-edge";

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

  test("getBias returns correct bias for euphoria", () => {
    const bias = emotionalEdgeService.getBias("euphoria");
    assert.equal(bias.emotion, "euphoria");
    assert.equal(bias.bias, "overconfidence_warning");
    assert.ok(bias.riskAdjustment > 0, "euphoria should increase risk");
    assert.ok(bias.clarityPenalty > 0, "euphoria should penalize clarity");
    assert.ok(bias.recommendation.length > 0, "should have a recommendation");
  });

  test("getBias returns correct bias for anxiety", () => {
    const bias = emotionalEdgeService.getBias("anxiety");
    assert.equal(bias.emotion, "anxiety");
    assert.equal(bias.bias, "suggest_lower_risk");
    assert.ok(bias.riskAdjustment < 0, "anxiety should decrease risk tolerance");
  });

  test("getBias returns optimal state for calm", () => {
    const bias = emotionalEdgeService.getBias("calm");
    assert.equal(bias.bias, "optimal_state");
    assert.equal(bias.riskAdjustment, 0);
    assert.equal(bias.clarityPenalty, 0);
  });

  test("getBias returns optimal state for focus", () => {
    const bias = emotionalEdgeService.getBias("focus");
    assert.equal(bias.bias, "optimal_analysis");
    assert.equal(bias.riskAdjustment, 0);
    assert.equal(bias.clarityPenalty, 0);
  });

  test("getBias covers all 20 emotional states", () => {
    const profiles = emotionalEdgeService.getAllEmotionProfiles();
    assert.equal(profiles.length, 20, `Expected 20 emotions, got ${profiles.length}`);
    const unique = new Set(profiles.map(p => p.emotion));
    assert.equal(unique.size, 20, "All emotions should be unique");
  });

  test("clarity score is 100 for calm at low intensity with perfect confidence", () => {
    const score = emotionalEdgeService.calculateClarityScore(1.0, "calm", 0.5);
    assert.equal(score.score, 100);
    assert.equal(score.recommendation, "proceed");
    assert.equal(score.warnings.length, 0);
  });

  test("clarity score degrades with high-penalty emotions", () => {
    const calmScore = emotionalEdgeService.calculateClarityScore(0.8, "calm", 0.5);
    const angerScore = emotionalEdgeService.calculateClarityScore(0.8, "anger", 0.9);
    assert.ok(angerScore.score < calmScore.score, "anger should produce lower clarity than calm");
  });

  test("clarity score warns on high-risk emotions", () => {
    const score = emotionalEdgeService.calculateClarityScore(0.7, "desperation", 0.9);
    assert.ok(score.warnings.length > 0, "desperation should produce warnings");
  });

  test("clarity score recommendation is 'wait' for very low scores", () => {
    const score = emotionalEdgeService.calculateClarityScore(0.3, "anger", 1.0);
    assert.equal(score.recommendation, "wait");
  });

  test("fusion factor is 100 for calm at zero intensity", () => {
    const factor = emotionalEdgeService.computeFusionFactor("calm", 0);
    assert.equal(factor, 100);
  });

  test("fusion factor is 100 for focus at zero intensity", () => {
    const factor = emotionalEdgeService.computeFusionFactor("focus", 0);
    assert.equal(factor, 100);
  });

  test("fusion factor decreases with high-penalty emotions", () => {
    const calmFactor = emotionalEdgeService.computeFusionFactor("calm", 0.8);
    const angerFactor = emotionalEdgeService.computeFusionFactor("anger", 0.8);
    assert.ok(angerFactor < calmFactor, "anger should produce lower fusion factor");
  });

  test("fusion factor is bounded 0-100", () => {
    const allEmotions: EmotionalState[] = [
      "euphoria", "anxiety", "confidence", "frustration", "calm", "excitement",
      "fear", "hope", "anger", "relief", "desperation", "boredom", "greed",
      "regret", "focus", "impulsiveness", "resignation", "vindictiveness",
      "gratitude", "apathy",
    ];
    for (const emotion of allEmotions) {
      for (const intensity of [0, 0.5, 1]) {
        const factor = emotionalEdgeService.computeFusionFactor(emotion, intensity);
        assert.ok(factor >= 0, `${emotion}@${intensity}: factor ${factor} >= 0`);
        assert.ok(factor <= 100, `${emotion}@${intensity}: factor ${factor} <= 100`);
      }
    }
  });

  test("all emotion profiles have valid fields", () => {
    const profiles = emotionalEdgeService.getAllEmotionProfiles();
    for (const p of profiles) {
      assert.ok(p.emotion.length > 0);
      assert.ok(p.bias.length > 0);
      assert.ok(typeof p.riskAdjustment === "number");
      assert.ok(p.riskAdjustment >= -1 && p.riskAdjustment <= 1);
      assert.ok(p.clarityPenalty >= 0 && p.clarityPenalty <= 1);
      assert.ok(p.recommendation.length > 0);
    }
  });

  return { file: "emotionalEdge.test.ts", passed, failed, errors };
}
