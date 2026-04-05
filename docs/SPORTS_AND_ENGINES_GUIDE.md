# Sports Coverage & Engine Guide — Sors Maxima

**Classification: CONFIDENTIAL — Owner Eyes Only**
**Last Updated: March 2026**

---

## Sports Supported

### Currently Active
| Sport | League | Data Source | Season |
|---|---|---|---|
| Basketball | NBA | ESPN + BallDontLie | Oct–Jun |
| Hockey | NHL | ESPN | Oct–Jun |
| College Basketball | NCAAB | ESPN | Nov–Apr |
| MMA | UFC/Bellator | Custom engine | Year-round |
| Soccer | EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, Champions League | API-Football | Aug–May |
| Baseball | MLB | ESPN + MLB Stats API | Apr–Oct |
| Football | NFL | ESPN | Sep–Feb |
| College Football | NCAAF | ESPN | Aug–Jan |

### Data Refresh Rates
| Data Type | Refresh Rate | Source |
|---|---|---|
| Live scores | Every 60 seconds | ESPN Scoreboard |
| Odds | Every 5 minutes | The Odds API |
| Injury reports | Every 15 minutes | ESPN Injuries |
| Rosters | Every 6 hours | ESPN Rosters |
| Weather (outdoor sports) | Every 30 minutes | Open-Meteo |
| Team rosters | Every 6 hours | ESPN Roster Provider |
| Player stats | On-demand | BallDontLie, MLB Stats |

---

## The 46-Factor Quantum Fusion Engine

The core prediction engine processes 46 data-backed factors organized into 8 categories for every game.

### Category 1: Core Betting Analysis (12 factors)
| Factor | What It Measures |
|---|---|
| Scheme Mismatch | Offensive vs. defensive scheme compatibility |
| Sharp Money Flow | Where professional bettors are putting money |
| Public Fade | Opposite of where casual public money is going |
| Line Movement | Direction and speed of odds changes since open |
| Momentum Score | Team's recent form and trajectory |
| Situational Spot | Rest advantages, schedule spots, trap games |
| Historical H2H | Head-to-head historical performance |
| Rest Advantage | Days of rest differential between teams |
| Home Field | Home/away advantage calibrated per sport |
| Monte Carlo | 10,000 probability simulations per game |
| Home/Road Split | Season-specific home vs. road performance |
| Market Implied Edge | Gap between market price and model probability |

### Category 2: Advanced Analytics (9 factors)
| Factor | What It Measures |
|---|---|
| Predictive Model | Composite ML model output |
| Player Efficiency | Individual player efficiency ratings |
| Pace/Tempo | Game pace and how it affects total scoring |
| Clutch Index | Performance in high-leverage situations |
| Strength of Schedule | Quality of opponents faced this season |
| Point Differential | Average margin of victory/loss |
| Win Probability | Pre-game baseline win probability |
| Scoring Efficiency Gap | Offensive vs. defensive efficiency delta |
| Recent Form/Momentum | Last 10 games performance trend |

### Category 3: Psychological Factors (6 factors)
| Factor | What It Measures |
|---|---|
| Mental State | Team morale indicators |
| Confidence Index | Implied confidence from recent results |
| Pressure Response | Historical performance in high-pressure games |
| Motivation Level | Playoff implications, rivalry factors |
| Team Chemistry | Roster stability and cohesion indicators |
| Rivalry Intensity | Historical intensity of specific matchups |

### Category 4: Physical & Health (4 factors)
| Factor | What It Measures |
|---|---|
| Injury Impact | Key player availability and injury severity |
| Load Management | Minutes restrictions and back-to-back fatigue |
| Travel Fatigue | Distance traveled, time zones crossed |
| Roster Depth | Bench quality when starters are limited |

### Category 5: Performance Metrics (1 factor)
| Factor | What It Measures |
|---|---|
| True Shooting % | Efficiency across all shot types (NBA specific) |

### Category 6: Environmental (4 factors)
| Factor | What It Measures |
|---|---|
| Weather Impact | Wind, precipitation, temperature (outdoor sports) |
| Altitude | Mile-high game adjustments |
| Surface Type | Grass vs. turf (NFL/soccer) |
| Game Time | Day vs. night games, early vs. late starts |

### Category 7: Market Dynamics (8 factors)
| Factor | What It Measures |
|---|---|
| Market Efficiency | How sharp the market is for this game |
| Bookmaker Consensus | Agreement or disagreement across books |
| CLV Projection | Expected closing line value |
| Steam Detection | Rapid odds movement indicating sharp action |
| Reverse Line Movement | Line moves opposite of public money direction |
| Market Maker Position | Inferred position of major sportsbooks |
| Early Money | Where the first money went when the line opened |
| Late Money | Where money is flowing in the last hours |

### Category 8: Financial & Regulatory (2 factors)
| Factor | What It Measures |
|---|---|
| Referee Tendency | Historical officiating tendencies (fouls, calls) |
| Scheduling Equity | Whether schedule gives one team an unfair advantage |

---

## Monte Carlo Simulation Engine

The Monte Carlo engine runs **10,000 simulations per game** during normal operation and **100,000 simulations per game** during the midnight deep simulation run.

| Mode | Simulations | When |
|---|---|---|
| Standard | 10,000 | Every 5 minutes during active games |
| Deep | 100,000 | Every night at midnight |
| Morning pre-sim | 10,000 | Every day at 7 AM ET |

The deep simulation runs overnight when server load is lowest, producing the most accurate pre-game picks for the following day.

---

## Continuous Learning System

The platform learns from its own picks. Here's how:

1. **Pick Published** — A pick is generated and shown to users
2. **Game Settles** — The outcome is recorded (win/loss/push)
3. **Calibration** — The engine adjusts factor weights based on actual results
4. **Retraining** — The ML model is retrained with updated outcome data
5. **Improvement** — Next picks for similar situations improve

This cycle runs automatically every time a pick settles. You can also trigger manual recalibration from `/admin/training`.

The platform currently tracks **987+ settled picks** in its training dataset with a **55.9% win rate** — above the 52.4% break-even threshold for standard -110 lines.

---

## Pick Grading Calibration

The Brier Score measures prediction calibration — how well the model's confidence percentages match actual outcomes.

| Brier Score | Meaning |
|---|---|
| Below 0.20 | Excellent (professional grade) |
| 0.20–0.25 | Good |
| 0.25–0.30 | Average |
| Above 0.30 | Poor — model needs recalibration |

Monitor this in `/admin/model-integrity`. If the score is degrading, trigger a recalibration from `/admin/training`.

---

## Data Provider Health

If any data provider goes down, the system degrades gracefully:

| Provider Down | Impact | Fallback |
|---|---|---|
| ESPN Scoreboard | No live scores | Last known scores served from cache |
| The Odds API | No market odds | Factors using market data drop, others continue |
| Open-Meteo | No weather data | Weather factor removed from outdoor picks |
| BallDontLie | No NBA player stats | NBA props deactivated |
| API-Football | No soccer data | International page goes offline |
| OpenAI | No AI features | Static responses shown, picks continue unaffected |

Monitor provider health in real time at `/admin/pipeline` and `/admin/data-provenance`.

---

## Sport-Specific Factor Weights

Each sport applies different emphasis to factors:

| Sport | Strongest Predictors |
|---|---|
| NBA | Rest advantage (back-to-backs), load management, pace/tempo |
| NFL | Scheme mismatch, weather impact, home field (crowd noise) |
| MLB | Starting pitcher quality, bullpen fatigue, weather |
| NHL | Goalie performance, back-to-back fatigue, travel |
| NCAAB | Home court (loudest in sports), recruiting class, fatigue |
| Soccer | Historical H2H, form momentum, weather, referee tendency |
| MMA | Stylistic matchup, reach/physical advantages, camp quality |

These weights are automatically calibrated by the learning engine based on actual outcomes but can be manually adjusted in `/admin/sport-analysis`.

---

## OMNISCRIPT INTEGRATION

> © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

### OmniScript Powers Sors Maxima Sports Betting Intelligence Platform

**Sors Maxima Sports Betting Intelligence Platform** is implemented in **OmniScript** — the proprietary domain-specific language (file extension `.omni`) of the OmniDLOS / Omnivex ecosystem. OmniScript is the Cognitive Layer of the Four-Dimensional Operating System, designed to express computation, emotional intelligence, dimensional architecture, and temporal awareness in a single unified language.

#### OmniScript Constructs in Sors Maxima Sports Betting Intelligence Platform

The platform's core architecture is declared within the **`SportsIntelligenceUniverse`** — an OmniScript `universe` block operating at `Dimension.TEMPORAL`:

- **Primary Engine:** `BettingPredictionEngine` — registered in the OmniVault package registry
- **Supporting Engines:** `MonteCarloSimulationEngine`, `OddsArbitrageEngine`, `LifeChangerTicketEngine`
- **Services:** `FactorModelService`, `OddsAggregationService`, `IntelligenceCardService`
- **Nexus Points:** All external interfaces declared as typed OmniScript `portal` Nexus Points
- **Vaults:** All persistent data archived via `Nova.Vault` with Guardian Layer protection
- **Cross-Dimensional Bus:** `Nova.Bus` enables real-time Signal exchange with all 13 OmniDLOS platforms

#### OmniScript Code Sample

```omni
// Sors Maxima — 46-Factor Betting Prediction Engine
universe SportsIntelligenceUniverse {
  dimension: Dimension.TEMPORAL
  vibe: Vibe.PRECISION

  forge FACTOR_COUNT: Integer = 46
  forge SIMULATION_RUNS: Integer = 10_000
  forge MIN_EV_THRESHOLD: Float = 3.5
  forge CALIBRATION_WINDOW: Integer = 90  // days

  engine BettingPredictionEngine implements Intelligent {
    manifest flow analyzMatchup(homeTeam: Text, awayTeam: Text, market: Text): flow<Prediction> {
      forge factors    = sync FactorModelService.computeAll(homeTeam, awayTeam, FACTOR_COUNT)
      forge simulation = sync MonteCarloSimulationEngine.run(factors, runs: SIMULATION_RUNS)
      forge odds       = sync OddsAggregationService.fetch(homeTeam, awayTeam, market)

      forge ev: Float = simulation.expectedValue(odds)
      forge confidence: Probability = simulation.confidenceInterval(0.95)

      when (ev >= MIN_EV_THRESHOLD) {
        Nova.Bus.emit("pick.high-ev", { matchup: `${homeTeam} vs ${awayTeam}`, ev, confidence })
      }

      propagate Prediction { factors, simulation, odds, ev, confidence }
    }

    manifest flow generateLifeChangerTicket(date: Chronicle): flow<ParlayTicket> {
      forge picks = sync BettingPredictionEngine.getDailyBestPicks(date, minOdds: 1000)
      forge ticket = sync LifeChangerTicketEngine.compose(picks)
      Nova.Vault.archive("life-changer-ticket", ticket)
      propagate ticket
    }
  }
}
```

#### OmniDLOS Terminology Reference

| OmniDLOS Term | Meaning in Sors Maxima Sports Betting Intelligence Platform |
|---|---|
| **Nexus Point** | Any API or integration interface declared in OmniScript `portal` syntax |
| **Vault** | The encrypted, immutable data repository storing all platform state |
| **Guardian Layer** | The `@Guardian(level: N)` access control system protecting sensitive Engine operations |
| **Pulse** | The real-time scoring type used for all algorithmic outputs |
| **Signal** | A typed event propagated via `Nova.Bus` to the Inter-Dimensional Bus |
| **Chronicle** | The OmniScript temporal type — dates with legacy and historical awareness |
| **Constellation** | The OmniScript collection type — dimensional arrays with typed membership |
| **Universe** | The `SportsIntelligenceUniverse` namespace — the dimensional scope of the platform |

© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---
