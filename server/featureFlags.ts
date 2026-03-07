import { isSportInSeason } from "./sportSeasons";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();

  constructor() {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags() {
    const defaults: Array<Omit<FeatureFlag, "createdAt" | "updatedAt">> = [
      {
        id: "live_odds",
        name: "Live Odds Feed",
        description: "Enable real-time odds from external providers",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "quantum_fusion",
        name: "Sors Prediction Engine",
        description: "Advanced 46-factor analysis engine",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "ai_assistant",
        name: "AI Betting Assistant",
        description: "AI-powered chat assistant for betting analysis",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "tipster_communities",
        name: "Tipster Communities",
        description: "Community tipster marketplace",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "advanced_correlations",
        name: "Advanced Correlation Engine",
        description: "Advanced correlation modeling",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "ml_projections",
        name: "ML Prop Projections",
        description: "Machine learning player prop projections",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "nfl_player_props",
        name: "NFL Player Props",
        description: "NFL player prop picks (passing yards, rushing yards, receiving yards, TDs, receptions). Auto-activates when NFL preseason begins in August.",
        enabled: false,
        rolloutPercentage: 0,
        metadata: { autoEnableMonth: 8, autoDisableMonth: 3, sport: "NFL" },
      },
      {
        id: "mlb_player_props",
        name: "MLB Player Props",
        description: "MLB player prop picks (strikeouts, hits, RBIs, home runs). Auto-activates when MLB season begins in April.",
        enabled: false,
        rolloutPercentage: 0,
        metadata: { autoEnableMonth: 4, autoDisableMonth: 10, sport: "MLB" },
      },
      {
        id: "ncaaf_player_props",
        name: "NCAAF Player Props",
        description: "College football player prop picks (passing yards, rushing yards, receiving yards). Auto-activates in August.",
        enabled: false,
        rolloutPercentage: 0,
        metadata: { autoEnableMonth: 8, autoDisableMonth: 1, sport: "NCAAF" },
      },
      {
        id: "paper_trading",
        name: "Paper Trading",
        description: "Risk-free practice betting mode",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "scheme_recognition",
        name: "Scheme Recognition",
        description: "AI coaching scheme analysis",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "bankroll_simulator",
        name: "Bankroll Simulator",
        description: "AI-powered bankroll simulation",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "stripe_payments",
        name: "Stripe Payments",
        description: "Payment processing for subscriptions",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "international_soccer",
        name: "International Soccer Leagues",
        description: "EPL, La Liga, Bundesliga, Serie A, Ligue 1, MLS, Champions League, and international competitions",
        enabled: true,
        rolloutPercentage: 100,
      },
      {
        id: "advanced_command_center",
        name: "Advanced Command Center",
        description: "Enables Best Tickets, Matchup Parlays, and Daily Edge Parlay sections for all members. Admin always sees these. Disable for a simplified member experience during launch phase.",
        enabled: false,
        rolloutPercentage: 0,
        metadata: { adminAlwaysSees: true, launchPhaseControl: true },
      },
      {
        id: "live_cashout_advisor",
        name: "Live Cash-Out Advisor",
        description: "AI-powered real-time cash-out recommendations during live games",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "auto_bet_placement",
        name: "Auto Bet Placement",
        description: "Automatically place bets on connected sportsbook accounts when high-confidence picks are found",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "social_copy_betting",
        name: "Social Copy Betting",
        description: "Allow users to auto-copy bets from top-performing tipsters in the community",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "live_streaming_odds",
        name: "Live Streaming Odds Feed",
        description: "WebSocket-powered real-time odds streaming with sub-second updates",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "ai_parlay_autopilot",
        name: "AI Parlay Autopilot",
        description: "Fully automated daily parlay generation and delivery based on user preferences",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "advanced_backtesting",
        name: "Advanced Backtesting Suite",
        description: "Run historical backtests across multiple seasons with custom strategy parameters",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "cross_sport_correlation",
        name: "Cross-Sport Correlation Engine",
        description: "Find hidden correlations between different sports for cross-sport parlays",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "referee_umpire_analysis",
        name: "Referee & Umpire Analysis",
        description: "Track referee tendencies for cards, penalties, and over/under trends",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "weather_impact_model",
        name: "Weather Impact Model",
        description: "Advanced weather analysis showing impact on game outcomes and totals",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "sharp_money_tracker",
        name: "Sharp Money Tracker",
        description: "Track and follow where professional bettors are putting their money",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "custom_alerts_webhook",
        name: "Custom Alerts via Webhook",
        description: "Send custom betting alerts to Discord, Slack, or Telegram via webhooks",
        enabled: false,
        rolloutPercentage: 0,
      },
      {
        id: "multi_currency_bankroll",
        name: "Multi-Currency Bankroll",
        description: "Track bankroll across multiple currencies with auto-conversion",
        enabled: false,
        rolloutPercentage: 0,
      },
    ];

    const now = new Date().toISOString();
    defaults.forEach((flag) => {
      this.flags.set(flag.id, {
        ...flag,
        createdAt: now,
        updatedAt: now,
      });
    });
  }

  isEnabled(flagId: string, userId?: string): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;
    if (!flag.enabled) return false;

    if (flag.rolloutPercentage >= 100) return true;
    if (flag.rolloutPercentage <= 0) return false;

    const seed = userId || `anon-${Date.now().toString(36)}`;
    let hash = 0;
    const str = `${flagId}:${seed}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return (Math.abs(hash) % 100) < flag.rolloutPercentage;
  }

  getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  setFlag(flagId: string, updates: Partial<Pick<FeatureFlag, "enabled" | "rolloutPercentage" | "metadata">>): FeatureFlag | null {
    const flag = this.flags.get(flagId);
    if (!flag) return null;

    const updated = {
      ...flag,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.flags.set(flagId, updated);
    return updated;
  }

  createFlag(data: {
    id: string;
    name: string;
    description: string;
    enabled?: boolean;
    rolloutPercentage?: number;
  }): FeatureFlag {
    const now = new Date().toISOString();
    const flag: FeatureFlag = {
      id: data.id,
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? false,
      rolloutPercentage: data.rolloutPercentage ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    this.flags.set(flag.id, flag);
    return flag;
  }

  syncSeasonFlags(): void {
    this.flags.forEach((flag) => {
      const meta = flag.metadata as any;
      if (!meta?.sport) return;

      const inSeason = isSportInSeason(meta.sport);
      const wasEnabled = flag.enabled;

      flag.enabled = inSeason;
      flag.rolloutPercentage = inSeason ? 100 : 0;
      flag.updatedAt = new Date().toISOString();

      if (wasEnabled !== inSeason) {
        console.log(`[FeatureFlags] ${flag.name}: ${inSeason ? "AUTO-ENABLED (season active)" : "AUTO-DISABLED (offseason)"}`);
      }
    });
  }

  killSwitch(flagId: string): boolean {
    const flag = this.flags.get(flagId);
    if (!flag) return false;

    flag.enabled = false;
    flag.rolloutPercentage = 0;
    flag.updatedAt = new Date().toISOString();
    return true;
  }

  enableAll(): void {
    this.flags.forEach((flag) => {
      flag.enabled = true;
      flag.rolloutPercentage = 100;
      flag.updatedAt = new Date().toISOString();
    });
  }

  getStats() {
    const all = this.getAllFlags();
    return {
      total: all.length,
      enabled: all.filter((f) => f.enabled).length,
      disabled: all.filter((f) => !f.enabled).length,
      partialRollout: all.filter((f) => f.enabled && f.rolloutPercentage < 100).length,
    };
  }
}

export const featureFlags = new FeatureFlagService();
export type { FeatureFlag };
