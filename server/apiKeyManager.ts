type ServiceName = "odds" | "apifootball" | "balldontlie" | "openai" | "resend" | "stripe";

interface KeyState {
  key: string;
  remaining: number | null;
  cooldownUntil: number | null;
  errorCount: number;
}

const LOW_THRESHOLD: Record<ServiceName, number> = {
  odds: 5000,
  apifootball: 25,
  balldontlie: 10,
  openai: 0,
  resend: 0,
  stripe: 0,
};

const COOLDOWN_MS = 60 * 60 * 1000;

class ApiKeyManager {
  private keys: Record<ServiceName, KeyState[]> = {
    odds: [],
    apifootball: [],
    balldontlie: [],
    openai: [],
    resend: [],
    stripe: [],
  };

  constructor() {
    this.loadKeys();
  }

  private loadKeys() {
    const load = (service: ServiceName, envBase: string) => {
      const states: KeyState[] = [];
      const primary = process.env[envBase]?.trim();
      if (primary) states.push({ key: primary, remaining: null, cooldownUntil: null, errorCount: 0 });
      for (let i = 2; i <= 5; i++) {
        const backup = process.env[`${envBase}_${i}`]?.trim();
        if (backup) states.push({ key: backup, remaining: null, cooldownUntil: null, errorCount: 0 });
      }
      this.keys[service] = states;
      if (states.length > 0) {
        console.log(`[ApiKeyManager] ${service}: ${states.length} key(s) loaded`);
      }
    };

    load("odds", "THE_ODDS_API_KEY");
    load("apifootball", "API_FOOTBALL_KEY");
    load("balldontlie", "BALLDONTLIE_API_KEY");
    load("openai", "OPENAI_API_KEY");
    load("resend", "RESEND_API_KEY");
    load("stripe", "STRIPE_SECRET_KEY");
  }

  getKey(service: ServiceName): string | null {
    const states = this.keys[service];
    if (!states || states.length === 0) return null;

    const now = Date.now();

    for (const state of states) {
      if (state.cooldownUntil && now < state.cooldownUntil) continue;
      if (state.remaining !== null && state.remaining <= LOW_THRESHOLD[service]) continue;
      return state.key;
    }

    const active = states.find(s => !s.cooldownUntil || now >= s.cooldownUntil);
    if (active) return active.key;

    return states[0].key;
  }

  reportUsage(service: ServiceName, key: string, remaining: number) {
    const state = this.keys[service]?.find(s => s.key === key);
    if (!state) return;

    const wasOk = state.remaining === null || state.remaining > LOW_THRESHOLD[service];
    state.remaining = remaining;

    if (wasOk && remaining <= LOW_THRESHOLD[service]) {
      const all = this.keys[service];
      const idx = all.indexOf(state);
      const next = all.find((s, i) => i !== idx && (!s.cooldownUntil || Date.now() >= s.cooldownUntil));
      if (next) {
        console.warn(`[ApiKeyManager] ${service} key #${idx + 1} low (${remaining} remaining) — rotating to backup key`);
      } else {
        console.warn(`[ApiKeyManager] ${service} key #${idx + 1} low (${remaining} remaining) — no backup available`);
      }
    }
  }

  reportError(service: ServiceName, key: string, statusCode: number) {
    const state = this.keys[service]?.find(s => s.key === key);
    if (!state) return;

    state.errorCount++;

    if (statusCode === 429) {
      state.cooldownUntil = Date.now() + COOLDOWN_MS;
      const all = this.keys[service];
      const idx = all.indexOf(state);
      const next = all.find((s, i) => i !== idx && (!s.cooldownUntil || Date.now() >= s.cooldownUntil));
      if (next) {
        console.warn(`[ApiKeyManager] ${service} key #${idx + 1} rate limited (429) — rotating to backup key for 1hr`);
      } else {
        console.warn(`[ApiKeyManager] ${service} key #${idx + 1} rate limited (429) — no backup key available, cooling down for 1hr`);
      }
    }
  }

  forceRotate(service: ServiceName): { rotated: boolean; fromIndex: number; toIndex: number } {
    const states = this.keys[service];
    if (!states || states.length <= 1) return { rotated: false, fromIndex: 0, toIndex: 0 };
    const first = states.shift()!;
    states.push(first);
    this.keys[service] = states;
    console.log(`[ApiKeyManager] ${service}: force rotated — moved key #1 to end, new active is previous key #2`);
    return { rotated: true, fromIndex: 0, toIndex: states.length - 1 };
  }

  getStatus(service: ServiceName): { totalKeys: number; activeKeys: number; keyStates: { index: number; remaining: number | null; coolingDown: boolean; errorCount: number }[] } {
    const states = this.keys[service] || [];
    const now = Date.now();
    const activeIdx = states.findIndex(s => !s.cooldownUntil || now >= s.cooldownUntil);
    return {
      totalKeys: states.length,
      activeKeys: states.filter(s => !s.cooldownUntil || now >= s.cooldownUntil).length,
      activeKeyIndex: activeIdx >= 0 ? activeIdx + 1 : null,
      keyStates: states.map((s, i) => ({
        index: i + 1,
        remaining: s.remaining,
        coolingDown: !!(s.cooldownUntil && now < s.cooldownUntil),
        errorCount: s.errorCount,
        isActive: i === activeIdx,
      })),
    };
  }

  getAllStatus() {
    const all: Record<string, ReturnType<typeof this.getStatus>> = {};
    const services: ServiceName[] = ["odds", "apifootball", "balldontlie", "openai", "resend", "stripe"];
    for (const svc of services) {
      if (this.keys[svc]?.length > 0) {
        all[svc] = this.getStatus(svc);
      }
    }
    return all;
  }
}

export const apiKeyManager = new ApiKeyManager();
