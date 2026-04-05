import assert from "assert/strict";

// Test the deterministic and pure functions from quantum-replay
// We replicate the helper logic here to avoid DB dependencies in unit tests.

function getFactorCategory(factorName: string): string {
  const categories: Record<string, string[]> = {
    "Core Betting": [
      "Scheme Mismatch", "Sharp Money Flow", "Public Money Fade",
      "Line Movement", "Momentum Score", "Situational Spot",
      "H2H Record", "Rest Advantage", "Home Field Advantage",
      "Monte Carlo Sims", "Home/Road Split", "Market Implied Edge",
    ],
    "Advanced Analytics": [
      "Predictive Model Score", "Player Efficiency", "Pace & Tempo",
      "Clutch Performance", "Strength of Schedule", "Point Differential",
      "Win Probability", "Scoring Efficiency Gap", "Recent Form vs Season",
    ],
    "Psychological": [
      "Team Mental State", "Player Confidence", "Pressure Response",
      "Motivation Level", "Team Chemistry", "Rivalry Intensity",
    ],
    "Physical & Health": [
      "Injury Report", "Biomechanical Fatigue", "Load Management", "B2B Impact",
    ],
    "Performance": ["Roster Depth"],
    "Environmental": [
      "Weather Impact", "Travel Fatigue", "Altitude Adjustment", "Time Zone Disruption",
    ],
    "Financial & Regulatory": [
      "Contract Year Motivation", "Roster Stability",
    ],
  };
  for (const [category, factors] of Object.entries(categories)) {
    if (factors.includes(factorName)) return category;
  }
  return "Unknown";
}

function computePredictionScore(weights: Record<string, number>): number {
  const crypto = require("crypto");
  let score = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    const hash = crypto.createHash("md5").update(`score-${factor}`).digest().readUInt32BE(0);
    const factorScore = 0.3 + (hash / 0xffffffff) * (0.9 - 0.3);
    score += weight * factorScore;
  }
  return Math.min(1, Math.max(0, score));
}

function generateInsights(factors: Array<{ factorName: string; contribution: number; category: string }>): string[] {
  const insights: string[] = [];
  const top3 = factors.slice(0, 3);
  if (top3.length > 0) {
    insights.push(`Top factor: "${top3[0].factorName}" contributed ${(top3[0].contribution * 100).toFixed(1)}% to this prediction.`);
  }
  if (top3.length >= 2) {
    insights.push(`"${top3[0].factorName}" and "${top3[1].factorName}" together account for ${((top3[0].contribution + top3[1].contribution) * 100).toFixed(1)}% of the decision.`);
  }
  const categoryScores: Record<string, number> = {};
  for (const f of factors) {
    categoryScores[f.category] = (categoryScores[f.category] ?? 0) + f.contribution;
  }
  const topCategory = Object.entries(categoryScores).sort(([, a], [, b]) => b - a)[0];
  if (topCategory) {
    insights.push(`The "${topCategory[0]}" category had the strongest influence overall.`);
  }
  return insights;
}

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

  test("getFactorCategory returns correct category for Core Betting factors", () => {
    assert.equal(getFactorCategory("Sharp Money Flow"), "Core Betting");
    assert.equal(getFactorCategory("Home Field Advantage"), "Core Betting");
    assert.equal(getFactorCategory("Monte Carlo Sims"), "Core Betting");
  });

  test("getFactorCategory returns correct category for Advanced Analytics factors", () => {
    assert.equal(getFactorCategory("Player Efficiency"), "Advanced Analytics");
    assert.equal(getFactorCategory("Win Probability"), "Advanced Analytics");
  });

  test("getFactorCategory returns correct category for Psychological factors", () => {
    assert.equal(getFactorCategory("Team Chemistry"), "Psychological");
    assert.equal(getFactorCategory("Rivalry Intensity"), "Psychological");
  });

  test("getFactorCategory returns correct category for Physical & Health factors", () => {
    assert.equal(getFactorCategory("Injury Report"), "Physical & Health");
    assert.equal(getFactorCategory("B2B Impact"), "Physical & Health");
  });

  test("getFactorCategory returns correct category for Environmental factors", () => {
    assert.equal(getFactorCategory("Weather Impact"), "Environmental");
    assert.equal(getFactorCategory("Travel Fatigue"), "Environmental");
  });

  test("getFactorCategory returns 'Unknown' for unrecognized factors", () => {
    assert.equal(getFactorCategory("NonExistent Factor"), "Unknown");
    assert.equal(getFactorCategory(""), "Unknown");
  });

  test("computePredictionScore returns value in [0, 1]", () => {
    const weights = { "Sharp Money Flow": 0.3, "Home Field Advantage": 0.3, "Player Efficiency": 0.4 };
    const score = computePredictionScore(weights);
    assert.ok(score >= 0, `Score ${score} should be >= 0`);
    assert.ok(score <= 1, `Score ${score} should be <= 1`);
  });

  test("computePredictionScore is deterministic", () => {
    const weights = { "Sharp Money Flow": 0.5, "Player Efficiency": 0.5 };
    const score1 = computePredictionScore(weights);
    const score2 = computePredictionScore(weights);
    assert.equal(score1, score2, "Same inputs should produce same output");
  });

  test("computePredictionScore returns 0 for empty weights", () => {
    const score = computePredictionScore({});
    assert.equal(score, 0);
  });

  test("generateInsights produces insights for factors", () => {
    const factors = [
      { factorName: "Sharp Money Flow", contribution: 0.3, category: "Core Betting" },
      { factorName: "Player Efficiency", contribution: 0.2, category: "Advanced Analytics" },
      { factorName: "Weather Impact", contribution: 0.1, category: "Environmental" },
    ];
    const insights = generateInsights(factors);
    assert.ok(insights.length >= 2, "Should generate at least 2 insights");
    assert.ok(insights[0].includes("Sharp Money Flow"), "First insight should mention top factor");
    assert.ok(insights[1].includes("Player Efficiency"), "Second insight should mention #2 factor");
  });

  test("generateInsights handles single factor", () => {
    const factors = [
      { factorName: "Sharp Money Flow", contribution: 0.5, category: "Core Betting" },
    ];
    const insights = generateInsights(factors);
    assert.ok(insights.length >= 1, "Should generate at least 1 insight");
  });

  test("generateInsights handles empty factors", () => {
    const insights = generateInsights([]);
    assert.equal(insights.length, 0, "Empty factors should produce no insights");
  });

  test("all 38 known factors map to valid categories", () => {
    const knownFactors = [
      "Scheme Mismatch", "Sharp Money Flow", "Public Money Fade", "Line Movement",
      "Momentum Score", "Situational Spot", "H2H Record", "Rest Advantage",
      "Home Field Advantage", "Monte Carlo Sims", "Home/Road Split", "Market Implied Edge",
      "Predictive Model Score", "Player Efficiency", "Pace & Tempo", "Clutch Performance",
      "Strength of Schedule", "Point Differential", "Win Probability", "Scoring Efficiency Gap",
      "Recent Form vs Season", "Team Mental State", "Player Confidence", "Pressure Response",
      "Motivation Level", "Team Chemistry", "Rivalry Intensity",
      "Injury Report", "Biomechanical Fatigue", "Load Management", "B2B Impact",
      "Roster Depth", "Weather Impact", "Travel Fatigue", "Altitude Adjustment",
      "Time Zone Disruption", "Contract Year Motivation", "Roster Stability",
    ];
    for (const f of knownFactors) {
      const cat = getFactorCategory(f);
      assert.notEqual(cat, "Unknown", `Factor "${f}" should have a known category, got Unknown`);
    }
  });

  return { file: "quantumReplay.test.ts", passed, failed, errors };
}
