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
        description: "Gaussian copula correlation modeling",
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
        description: "Monte Carlo bankroll simulation",
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

    if (userId) {
      let hash = 0;
      const str = `${flagId}:${userId}`;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return (Math.abs(hash) % 100) < flag.rolloutPercentage;
    }

    return Math.random() * 100 < flag.rolloutPercentage;
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
