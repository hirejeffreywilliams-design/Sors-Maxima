# OmniScript Language Reference — Sors Maxima
## The Predictive Dimension
### © 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.

---

## Overview

This reference documents the OmniScript language as applied to **Sors Maxima** — The Predictive Dimension. It includes platform-specific types, engine patterns, service patterns, and IDB Signal flows specific to this platform.

For the complete OmniScript specification, see the root `omniscript-language-spec.md`.

---

## Table of Contents

1. [Core Language Primitives](#1-core-language-primitives)
2. [Platform-Specific Types](#2-platform-specific-types)
3. [Engine Patterns](#3-engine-patterns)
4. [Service Patterns](#4-service-patterns)
5. [IDB Signal Flows](#5-idb-signal-flows)
6. [Cross-Platform Communication](#6-cross-platform-communication)
7. [Error Handling](#7-error-handling)
8. [Standard Library Reference](#8-standard-library-reference)

---

## 1. Core Language Primitives

### Variable Declaration

```omni
// Immutable — use for IDs, config, thresholds
forge platformId: Text = "sors-maxima"
forge MAX_RESULTS: Integer = 100
forge CONFIDENCE_THRESHOLD: Probability = 85.0%

// Mutable — use for state that changes
weave activeEngines: Integer = 0
weave platformVibe: Vibe = Vibe.NEUTRAL

// Inferred — use for local computation
sculpt result = sync someEngine.compute(input)
```

### Functions

```omni
// Standard manifest
manifest computeScore(userId: Text, context: Any): flow<Float> {
  forge vibe  = sync Nova.Vibe.analyze(userId)
  forge score = vibe.intensity * 0.8 + vibe.frequency * 0.2
  propagate score
}

// Shorthand
manifest isAboveThreshold(score: Float) => score > 85.0

// Generic
manifest fuse<T: Dimensional>(items: Constellation<T>): T {
  propagate items.reduce((a, b) => a.merge(b))
}
```

### Control Flow

```omni
// when / otherwise
when (confidence > 90.0%) {
  acceptResult(result)
} otherwise when (confidence > 70.0%) {
  reviewResult(result)
} otherwise {
  rejectResult(result)
}

// traverse (for-of)
traverse engine in activeEngines {
  when (engine.status == Status.DORMANT) { skip }
  sync engine.compute(input)
}

// cycle (while)
weave retries = 0
cycle (retries < 3) {
  forge result = sync tryOperation()
  when (result.ok) { halt }
  retries += 1
}

// drift (async for-await)
drift signal in Nova.Bus.receive(channel: "sors-maxima.projection.complete") {
  sync handleSignal(signal)
}
```

---

## 2. Platform-Specific Types

```omni
// Sors Maxima core form types

form SorsMaximaProfile {
  id:          Text
  userId:      Text
  dimension:   Text = "The Predictive Dimension"
  vibe:        Vibe
  emotion:     Emotion
  status:      Status
  createdAt:   Timestamp
  updatedAt:   Timestamp
}

// Sors Maxima domain shapes
shape SorsMaximaConfig {
  platformId:   Text
  dimension:    Text
  engineCount:  Integer
  vaultName:    Text
  idbTopics:    Constellation<Text>
}

mask SorsMaximaStatus {
  INITIALIZING,
  CALIBRATING,
  ACTIVE,
  SIGNAL_HOLD,
  FAULTED,
  DIMENSIONAL_MAINTENANCE
}
```

---

## 3. Engine Patterns

All Sors Maxima engines implement the `Engine` essence:

```omni
essence Engine {
  manifest compute(input: Nexus<Text, Any>): flow<EngineResult>
  manifest calibrate(): flow<nil>
  manifest report(): EngineReport
}
```

### Registered Engines

| Engine | Priority | Description |
|---|---|---|
| `QuantumFusionCoreEngine` | CRITICAL | Primary fusion engine integrating all 62+ sub-engine outputs |
| `MonteCarloEngine` | HIGH | 500,000-simulation Probability Storm per Signal Event |
| `CorrelationWeaveEngine` | HIGH | Detects statistical dependencies across Probability Planes |
| `SituationalFactorEngine` | NORMAL | Analyzes revenge, rivalry, primetime, and motivation factors |
| `FatigueAnalysisEngine` | NORMAL | Back-to-back, travel distance, and rest-day impact modeling |
| `EnvironmentalFactorEngine` | NORMAL | Altitude, weather, temperature impact on Signal Events |
| `OfficialTendencyEngine` | NORMAL | Referee bias and historical foul-rate pattern analysis |
| `CoachingMatchupEngine` | NORMAL | Head-to-head coaching adjustment rating computation |
| `MarketEfficiencyEngine` | NORMAL | Probability Drift detection and steam-move identification |
| `SharpSignalDetector` | NORMAL | Intelligence Capital flow detection across Probability Planes |
| `EarlySettlementEngine` | NORMAL | Real-time settlement computation for live Dimensional Wagers |
| `ContinuousLearningOrchestrator` | NORMAL | Autonomous model retraining against historical Signal Archive |
| `AutonomousAdminIntelligenceEngine` | NORMAL | Platform health monitoring and self-optimization |
| `AcceleratedPatternEngine` | NORMAL | High-frequency pattern detection in live Probability Signals |
| `PlatformIntelligenceEngine` | NORMAL | Cross-sport signal harmonization and intelligence fusion |
| `QualityWatchdogEngine` | NORMAL | Real-time prediction quality monitoring and alert system |
| `BacktestEngine` | NORMAL | Historical Signal Archive validation for all prediction models |
| `InternationalSportsEngine` | NORMAL | Global Signal Event coverage across 40+ sports leagues |

### Engine Declaration Pattern

```omni
@engine(
  id: "engine-id-v1",
  platform: "Sors-Maxima",
  version: "1.0.0",
  priority: Priority.HIGH
)
engine MyEngine implements Engine {

  forge THRESHOLD: Probability = 85.0%
  weave lastRun: Timestamp? = nil

  manifest compute(input: Nexus<Text, Any>): flow<EngineResult> {
    // 1. Extract inputs
    forge userId = input.get("userId") as Text

    // 2. Parallel data fetch
    forge (vibe, emotion) = sync parallel {
      Nova.Vibe.analyze(userId, window: Duration.hours(24)),
      Nova.Emotion.getLatest(userId)
    }

    // 3. Core logic
    forge prediction = sync this.resolve(vibe, emotion)

    // 4. Propagate result
    propagate EngineResult {
      engineId:   "my-engine",
      confidence: prediction.confidence,
      prediction: prediction.value,
      timestamp:  Timestamp.now()
    }
  }

  manifest calibrate(): flow<nil> {
    this.lastRun = Timestamp.now()
  }

  manifest report(): EngineReport {
    propagate EngineReport {
      engineId: "my-engine",
      status:   Status.ACTIVE
    }
  }
}
```

---

## 4. Service Patterns

### Registered Services

| Service | Shield Level | Description |
|---|---|---|
| `PredictionPipelineService` | MAXIMUM | End-to-end Quantum Projection orchestration pipeline |
| `SettlementService` | HIGH | Automated resolution of Dimensional Wagers post-event |
| `WagerGuardianService` | HIGH | Responsible gambling monitoring and intervention system |
| `LiveSportsDataService` | STANDARD | Real-time Signal Event data ingestion from ESPN and partners |
| `NotificationService` | STANDARD | Push Signal Alerts for high-confidence Quantum Projections |
| `AnalyticsAgentService` | STANDARD | Intelligence metrics and platform performance reporting |
| `PrefetchSchedulerService` | STANDARD | Pre-computation of high-traffic Signal Event predictions |
| `RetentionSequenceService` | STANDARD | Re-engagement workflows for dormant Dimensional Citizens |

### Service Declaration Pattern

```omni
@service(
  id: "my-service",
  platform: "Sors-Maxima",
  shield: ShieldLevel.HIGH
)
service MyService {

  @inject forge vault: DataVault<Any>
  @inject forge auth: Nova.Auth

  @portal(endpoint: "sors-maxima.resource.get")
  @shield(require: ["AUTHENTICATED"])
  manifest getResource(id: Text, ctx: RequestContext): flow<Any> {
    forge identity = sync this.auth.verify(ctx)
    forge resource = sync this.vault.get(id)

    when (resource == nil) {
      fault ResourceNotFound { id }
    }

    propagate resource
  }
}
```

---

## 5. IDB Signal Flows

### Signal Topics for Sors Maxima

```omni
// Emit a platform signal
Nova.Bus.emit("sors-maxima.projection.complete", Signal {
  topic:    "sors-maxima.projection.complete",
  payload:  { userId: userId, data: result },
  origin:   "sors-maxima",
  priority: Priority.HIGH
})

// Subscribe to a signal channel
@on_signal(topic: "sors-maxima.wager.placed")
manifest onSignal(signal: Signal): flow<nil> {
  forge payload = signal.payload
  // Handle inbound signal
  Nova.Log.info(`Signal received: ${signal.topic}`)
}

// Drift over a signal stream
drift signal in Nova.Bus.receive(channel: "sors-maxima.signals") {
  sync processSignal(signal)
}
```

### Registered IDB Topics

| Topic | Direction | Description |
|---|---|---|
| `sors-maxima.projection.complete` | OUTBOUND | Platform signal from Sors Maxima |
| `sors-maxima.wager.placed` | OUTBOUND | Platform signal from Sors Maxima |
| `sors-maxima.signal.high-confidence` | OUTBOUND | Platform signal from Sors Maxima |

---

## 6. Cross-Platform Communication

```omni
// Portal call to another OmniDLOS platform
forge response = sync Nova.Bus.portalCall(
  target:   "4everacy",
  endpoint: "user.signals.get",
  payload:  { userId: userId }
)

// Receive a Dimensional Intelligence Share from another platform
@on_signal(topic: "cross-dimensional.intelligence.share", from: "Tree-AI")
manifest onDiscoverySignal(signal: Signal): flow<nil> {
  forge discoveries = signal.payload.get("discoveries") as Constellation<Any>
  sync processDiscoveries(discoveries)
}

// Broadcast to all 13 platforms via IDB
Nova.Bus.broadcast(Signal {
  topic:    "sors-maxima.cross-dimensional.broadcast",
  payload:  { platformId: "sors-maxima", data: result },
  origin:   "sors-maxima",
  priority: Priority.HIGH
})
```

---

## 7. Error Handling

```omni
// Fault declaration
fault SorsMaximaFault extends QuantumFault {
  platform:  Text = "Sors-Maxima"
  dimension: Text = "The Predictive Dimension"
  code:      Text
  context:   Nexus<Text, Any>?
}

// Handling faults
manifest safeCompute(input: Nexus<Text, Any>): flow<EngineResult?> {
  catch {
    propagate sync myEngine.compute(input)
  } on (QuantumFault fault) {
    Nova.Log.error(`Engine fault in Sors Maxima: ${fault.message}`)
    Nova.Metrics.pulse("sors-maxima.fault", 1.0, tags: { code: fault.code })
    propagate nil
  } always {
    Nova.Metrics.pulse("sors-maxima.compute.attempt", 1.0)
  }
}
```

---

## 8. Standard Library Reference

```omni
// Nova Standard Library — Sors Maxima commonly used APIs

// Vibe analysis
Nova.Vibe.analyze(userId, window: Duration.hours(24))   // → Vibe
Nova.Vibe.getPlatformVibe()                              // → Vibe

// Emotion intelligence
Nova.Emotion.getLatest(userId)                           // → Emotion
Nova.Emotion.getHistory(userId, window: Duration.days(7))

// Data vault operations
Nova.Data.query("SignalVault", { userId, limit: 100 })
Nova.Data.store("SignalVault", entry)
Nova.Data.get("SignalVault", id)

// IDB operations
Nova.Bus.emit(topic, signal)
Nova.Bus.receive(channel)
Nova.Bus.portalCall(target, endpoint, payload)
Nova.Bus.broadcast(signal)

// Auth and identity
Nova.Auth.verify(ctx)                                    // → Identity
Nova.Auth.identify(userId)                               // → UserProfile

// Cryptography
Nova.Crypto.uuid()
Nova.Crypto.sha3(input)
Nova.Crypto.encrypt(data, key)

// Metrics
Nova.Metrics.pulse(metric, value, tags)
Nova.Metrics.startPulseWatch(platformId)

// Logging
Nova.Log.info(message)
Nova.Log.warn(message)
Nova.Log.error(message)
```

---

*© 2024–2026 Jeffrey W Williams LLC. All Rights Reserved.*
*OmniScript is a proprietary language of Jeffrey W Williams LLC.*
