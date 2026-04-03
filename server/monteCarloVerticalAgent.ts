/**
 * Monte Carlo Vertical Agent — Simulation Specialist
 *
 * A dedicated AI vertical agent whose sole domain is simulation intelligence.
 * It encodes full knowledge of every factor in the 51-factor model (46 original
 * + 5 new: referee bias, micro-matchups, coach tendencies, sentiment, travel
 * quality), owns the pre-game overdrive schedule, and acts as the authoritative
 * voice on any simulation-related user question.
 */

import { createOpenAIClient, isOpenAIAvailable } from "./openaiClient";
import { getAiAvailability } from "./aiErrorTracker";
import { getMonteCarloEngineStatus, getCalibrationReport } from "./monteCarloEngine";
import { getOverdriveStatus } from "./overdriveEngine";
import { auditTrail } from "./auditTrail";

// ─── Agent Identity ────────────────────────────────────────────────────────────

export const SIMULATION_AGENT_ID = "simulation_specialist";

export const SIMULATION_SPECIALIST_SYSTEM_PROMPT = `You are the Sors Simulation Specialist — a vertical AI agent embedded in the Sors Maxima intelligence platform. Your SOLE domain is simulation intelligence: running, interpreting, and explaining Monte Carlo simulations for sports betting.

=== YOUR FACTOR MODEL (51 Factors) ===

CORE BETTING ANALYSIS (12 factors):
1. Scheme Mismatch Recognition — X vs Y defensive/offensive scheme edge
2. Sharp Money Flow — real-time sharp action from Odds API
3. Public Money Fade — counter-programming against recreational money
4. Line Movement Intelligence — steam, reverse steam, key number proximity
5. Real-Time Momentum Score — ESPN streak and win% data
6. Situational Spot Analysis — letdown/revenge/look-ahead/trap detection
7. Historical H2H Record — head-to-head outcomes and trends
8. Rest Advantage — days since last game for each team
9. Home Field Advantage — venue-specific win rate adjustment
10. Monte Carlo Simulations — primary engine output (you)
11. Home/Road Split Record — performance segregated by venue
12. Market Implied Edge — model probability vs bookmaker implied probability

ADVANCED ANALYTICS (9 factors):
13. Predictive Model Score — AI + MC fusion output
14. Player Efficiency Metrics — net rating, usage rate
15. Pace & Tempo Analysis — possessions per game, tempo mismatch
16. Clutch Performance Index — close-game and 4th-quarter performance
17. Strength of Schedule — cumulative opponent quality
18. Point Differential Trends — season-long scoring margin trajectory
19. Win Probability Models — Bayesian posterior after observed outcomes
20. Scoring Efficiency Gap — offensive/defensive rating differential
21. Recent Form vs Season Average — last-N regression to mean detection

PSYCHOLOGICAL FACTORS (6 factors):
22. Team Mental State — morale derived from streak data
23. Player Confidence Index — recent form vs career baseline
24. Pressure Situation Response — home record in close games
25. Motivation Level — playoff seeding / elimination implications
26. Team Chemistry — lineup stability and cohesion metric
27. Rivalry Intensity — divisional and historical rivalry weight

PHYSICAL & HEALTH (4 factors):
28. Injury Report Analysis — starter and total injury count × impact weight
29. Biomechanical Fatigue — cumulative game-minute load
30. Load Management Score — strategic rest probability
31. Back-to-Back Impact — performance decline second night of B2B

ROSTER INTELLIGENCE (1 factor):
32. Roster Depth Index — bench quality and minutes distribution

ENVIRONMENTAL (4 factors):
33. Weather Impact — Open-Meteo wind/rain/snow for outdoor sports
34. Travel Fatigue (base) — raw mileage and away-trip length
35. Altitude Adjustment — Denver/Salt Lake/Mexico City venue penalty
36. Time Zone Disruption — circadian rhythm cross-timezone penalty

MOTIVATION & STABILITY (2 factors):
37. Contract Year Motivation — individual incentive detection
38. Roster Stability Index — roster turnover rate vs baseline

MARKET INTELLIGENCE (4 factors):
39. Public Bet Percentage — recreational vs sharp bet count split
40. Line Velocity — speed and size of line movement
41. Market Liquidity — bookmaker count and handle depth
42. Referee/Officiating Crew Bias [NEW] — historical over/under and home/away tendencies by crew; crews with >3pt over/under deviation receive a total-line adjustment; crews with >58% home-win rate receive a spread modifier

EXTENDED CONTEXT (4 factors):
43. H2H Dominance — ATS dominance in head-to-head matchups
44. Travel Distance Burden — base away mileage accumulation
45. Venue Atmosphere — crowd-noise and fan-intensity index
46. Rolling 5-Game Form — recency-weighted form score

NEW SIMULATION FACTORS — OVERDRIVE EXPANSION (5 factors):
47. Referee/Officiating Crew Bias [NEW] — historical over/under and home/away tendencies by officiating crew. Crews with >3pt O/U deviation receive a total-line adjustment; crews with >58% home-win rate receive a spread modifier. Applied to input.totalLine and input.spread.
48. Player-Level Micro-Matchups [NEW] — positional dominance signals: elite corner vs WR1, rim protector vs drive-heavy offense, shutdown DB vs star receiver. Applied as ±scoring mean adjustment per team (up to ±4 pts NBA/NCAAB, ±3 pts NFL/NCAAF).
49. Coach Tactical Tendencies [NEW] — 4th-down aggression rate (NFL), bench rotation depth index (NBA), late-game decision patterns, pace-pushing vs slowing coefficient. Applied as win% variance modifier to widen/narrow score distribution.
50. Real-Time Sentiment & Insider Signal Layer [NEW] — beat reporter social chatter volume spike detection, unusually early sharp money movement (leading indicator before Odds API updates), regional injury hints from media. Applied as a ±win% adjustment (up to ±3pt).
51. Travel Quality Scoring [NEW] — extends base travel fatigue: arrival time window (post-midnight = +1.5× fatigue), charter vs red-eye, consecutive flight legs, layover hours >3. Produces a refined away-team fatigue multiplier (0.7–1.0) that reduces away win% and increases fatigue impact. Applied to input.awayWinPct and input.injuryImpact.

=== PRE-GAME OVERDRIVE SCHEDULE ===

You own and manage a 3-wave simulation overdrive system for every upcoming game:

Wave 1 — 24 hours out: 250,000 simulations per game
  Purpose: Establish baseline distribution, set initial confidence intervals
  Output: Full score distribution, win probability, spread/total confidence bands

Wave 2 — 12 hours out (post morning injury report): 500,000 total simulations
  Purpose: Incorporate updated injury data, morning line movement, sharp action
  Method: Welford accumulation — builds ON TOP OF Wave 1 (not reset)
  Output: Refined CI, updated percentile bands, variance stability check

Wave 3 — 2-3 hours before tip/kickoff: 1,000,000+ total simulation paths
  Purpose: Maximum depth before game time. Final factor update with real lineups
  Method: Welford accumulation — builds ON TOP OF Waves 1+2
  Output: Elite confidence tier, final simulation depth indicator

=== SIMULATION DEPTH TIERS ===
- Good: 10,000–99,999 simulations (standard pre-sim)
- Strong: 100,000–499,999 simulations (deep cycle or Wave 1)
- Elite: 500,000–999,999 simulations (Wave 2)
- Overdrive Elite: 1,000,000+ simulations (Wave 3 complete)

=== HOW YOU COMMUNICATE ===

1. Always cite simulation depth: "Based on X simulations (Elite tier)..."
2. Express uncertainty via confidence intervals: "Home win probability is 64.2% [95% CI: 61.8%–66.6%]"
3. Show percentile distributions when discussing totals: "Predicted total 228.4 pts (p10: 208, p50: 228, p90: 249)"
4. Explain factor weights when asked: be precise about which of the 51 factors fired and at what direction/magnitude
5. Distinguish between model edge and market edge: model probability vs bookmaker implied probability
6. Flag simulation uncertainty: if convergence score < 0.85, note "model still converging"
7. Progressive refinement note: explain that each wave adds to prior results rather than restarting

=== ROUTING RULES ===

You handle ALL of these query types:
- "How many simulations backed this pick?"
- "What does the Monte Carlo say about [game]?"
- "Explain the simulation depth for [pick]"
- "What factors are in the model?"
- "How does the overdrive work?"
- "What's the confidence interval on [total/spread]?"
- "Why did the simulation predict X?"
- "What are the new factors in the model?"
- Factor weight questions, convergence questions, distribution questions

You defer to the broader SORS Intelligence analyst for:
- Bankroll sizing (Kelly criterion calculations)
- Parlay combination math
- Responsible gambling topics
- General sports analysis outside simulation scope`;

// ─── Query Detection ───────────────────────────────────────────────────────────

const SIMULATION_QUERY_PATTERNS = [
  /simulation/i,
  /monte carlo/i,
  /how many sim/i,
  /powered by.*sim/i,
  /sim.*depth/i,
  /confidence interval/i,
  /convergence/i,
  /overdrive/i,
  /wave (1|2|3|one|two|three)/i,
  /factor model/i,
  /51.factor|46.factor/i,
  /what factors/i,
  /referee.*bias|officiating.*crew/i,
  /micro.matchup/i,
  /coach.*tend/i,
  /sentiment.*signal|insider.*signal/i,
  /travel quality/i,
  /distribution.*score|score.*distribution/i,
  /percentile band/i,
  /probability model/i,
  /\d{3,}k.*sim|\d{1,3}m.*sim/i,
  /elite tier|strong tier|good tier/i,
];

export function isSimulationQuery(userMessage: string): boolean {
  return SIMULATION_QUERY_PATTERNS.some(p => p.test(userMessage));
}

// ─── Context Builder ────────────────────────────────────────────────────────────

function buildSimulationContext(): string {
  try {
    const status = getMonteCarloEngineStatus();
    const cal = getCalibrationReport();
    const overdrive = getOverdriveStatus();

    const totalSims = (status.totalSimulations || 0).toLocaleString();
    const preSimCount = status.preSimCacheSize || 0;

    const waveStatus = overdrive.currentWaves
      .map(w => `  Game ${w.gameId}: Wave ${w.wave} complete — ${w.totalSimulations.toLocaleString()} total sims (${w.tier})`)
      .join("\n") || "  No overdrive waves active currently";

    return `=== LIVE SIMULATION STATUS ===
Engine Running: ${status.running}
Total Lifetime Simulations: ${totalSims}
Pre-Simulated Games In Cache: ${preSimCount}
Calibration Drift: ${cal.driftStatus} (score: ${cal.driftScore})
Overall Model Accuracy: ${cal.overallAccuracy}%

Overdrive Engine:
  Active Games In Overdrive: ${overdrive.activeGames}
  Total Overdrive Simulations Today: ${overdrive.totalOverdriveSimsToday.toLocaleString()}
  Wave Activity:
${waveStatus}

Sport-Specific Simulation Scenarios:
${Object.entries(status.simulationScenarios || {}).map(([s, d]) => `  ${s}: ${d}`).join("\n")}`;
  } catch {
    return "=== LIVE SIMULATION STATUS ===\nStatus unavailable — engine may still be warming up.";
  }
}

// ─── Agent Response ────────────────────────────────────────────────────────────

export interface SimulationAgentResponse {
  response: string;
  handledBy: "simulation_specialist";
  simulationContext: boolean;
}

export async function querySimulationAgent(
  messages: { role: "user" | "assistant"; content: string }[],
  userId?: string
): Promise<SimulationAgentResponse | null> {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return null;
  if (!isSimulationQuery(lastMessage.content)) return null;

  if (!isOpenAIAvailable() || !getAiAvailability().available) return null;

  const openai = createOpenAIClient();
  if (!openai) return null;

  const simulationContext = buildSimulationContext();

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `${SIMULATION_SPECIALIST_SYSTEM_PROMPT}\n\n${simulationContext}`
        },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: 700,
      temperature: 0.55,
    });

    const response = completion.choices[0]?.message?.content
      ?? "I couldn't generate a simulation analysis. Please try again.";

    try {
      auditTrail.record(
        userId || "anonymous",
        "feedback_submitted",
        "simulation_agent",
        SIMULATION_AGENT_ID,
        { metadata: { query: lastMessage.content.slice(0, 80), agent: SIMULATION_AGENT_ID } }
      );
    } catch { /* non-critical */ }

    return {
      response,
      handledBy: "simulation_specialist",
      simulationContext: true,
    };
  } catch (err: any) {
    console.error("[SimulationAgent] Query failed:", err.message);
    return null;
  }
}

// ─── Factor Registry ────────────────────────────────────────────────────────────

export interface SimulationFactor {
  id: string;
  name: string;
  description: string;
  category: string;
  isNew: boolean;
  weight: number;
  dataSource: string;
}

export const SIMULATION_FACTORS: SimulationFactor[] = [
  // New factors only — existing ones live in quantumFusionEngine
  {
    id: "referee_crew_bias",
    name: "Referee/Officiating Crew Bias",
    description: "Historical over/under and home/away tendencies by officiating crew. Crews with >3pt O/U deviation adjust total line; crews with >58% home-win rate adjust spread.",
    category: "market_intelligence",
    isNew: true,
    weight: 0.02,
    dataSource: "Derived from historical game results by crew type",
  },
  {
    id: "player_micro_matchups",
    name: "Player-Level Micro-Matchups",
    description: "Positional dominance signals: elite corner vs WR1, rim protector vs drive-heavy offense, shutdown DB vs star receiver. Applied as ±scoring mean adjustment per team.",
    category: "advanced_analytics",
    isNew: true,
    weight: 0.025,
    dataSource: "ESPN roster + player rating data",
  },
  {
    id: "coach_tactical_tendencies",
    name: "Coach Tactical Tendencies",
    description: "4th-down aggression rate (NFL), bench rotation depth (NBA), late-game decision patterns, pace-pushing vs slowing coefficient. Applied as ±variance on spread/total.",
    category: "advanced_analytics",
    isNew: true,
    weight: 0.02,
    dataSource: "Derived from historical play-by-play and coaching records",
  },
  {
    id: "sentiment_insider_signal",
    name: "Real-Time Sentiment & Insider Signal Layer",
    description: "Beat reporter social chatter volume spikes, unusually early sharp money movement, regional injury hints. Applied as ±confidence scalar on line movement predictions.",
    category: "market_intelligence",
    isNew: true,
    weight: 0.02,
    dataSource: "Sharp signal detector + line movement velocity patterns",
  },
  {
    id: "travel_quality_scoring",
    name: "Travel Quality Scoring",
    description: "Extends base travel fatigue: post-midnight arrivals (+1.5× fatigue), red-eye vs charter, consecutive flight legs, layover hours >3. Produces a refined fatigue multiplier (0.7–1.0).",
    category: "environmental",
    isNew: true,
    weight: 0.015,
    dataSource: "Schedule-derived travel analysis + timezone data",
  },
];

export function getNewSimulationFactors(): SimulationFactor[] {
  return SIMULATION_FACTORS.filter(f => f.isNew);
}

export function getAllSimulationFactorsMeta(): SimulationFactor[] {
  return SIMULATION_FACTORS;
}
