type SupportedLocale = "en-US" | "en-GB" | "es" | "fr" | "de" | "pt-BR" | "ja";

interface LocaleConfig {
  locale: SupportedLocale;
  currency: string;
  timezone: string;
  dateFormat: Intl.DateTimeFormatOptions;
  numberFormat: Intl.NumberFormatOptions;
}

const localeConfigs: Record<SupportedLocale, LocaleConfig> = {
  "en-US": {
    locale: "en-US",
    currency: "USD",
    timezone: "America/New_York",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  "en-GB": {
    locale: "en-GB",
    currency: "GBP",
    timezone: "Europe/London",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  "es": {
    locale: "es",
    currency: "EUR",
    timezone: "Europe/Madrid",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  "fr": {
    locale: "fr",
    currency: "EUR",
    timezone: "Europe/Paris",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  "de": {
    locale: "de",
    currency: "EUR",
    timezone: "Europe/Berlin",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  "pt-BR": {
    locale: "pt-BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
  "ja": {
    locale: "ja",
    currency: "JPY",
    timezone: "Asia/Tokyo",
    dateFormat: { year: "numeric", month: "short", day: "numeric" },
    numberFormat: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
  },
};

class I18nService {
  private currentLocale: SupportedLocale;
  private config: LocaleConfig;

  constructor() {
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem("sors_locale") : null;
    this.currentLocale = (stored as SupportedLocale) || this.detectLocale();
    this.config = localeConfigs[this.currentLocale] || localeConfigs["en-US"];
  }

  private detectLocale(): SupportedLocale {
    if (typeof navigator === "undefined") return "en-US";
    const browserLang = navigator.language;
    if (browserLang in localeConfigs) return browserLang as SupportedLocale;
    const shortLang = browserLang.split("-")[0];
    const match = Object.keys(localeConfigs).find((k) => k.startsWith(shortLang));
    return (match as SupportedLocale) || "en-US";
  }

  setLocale(locale: SupportedLocale) {
    this.currentLocale = locale;
    this.config = localeConfigs[locale] || localeConfigs["en-US"];
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("sors_locale", locale);
    }
  }

  getLocale(): SupportedLocale {
    return this.currentLocale;
  }

  getAvailableLocales(): SupportedLocale[] {
    return Object.keys(localeConfigs) as SupportedLocale[];
  }

  formatCurrency(amount: number, currency?: string): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: "currency",
      currency: currency || this.config.currency,
      ...this.config.numberFormat,
    }).format(amount);
  }

  formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.currentLocale, options || this.config.numberFormat).format(num);
  }

  formatPercent(value: number, decimals = 1): string {
    return new Intl.NumberFormat(this.currentLocale, {
      style: "percent",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, options || this.config.dateFormat).format(d);
  }

  formatTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: this.config.timezone,
    }).format(d);
  }

  formatDateTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(this.currentLocale, {
      ...this.config.dateFormat,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: this.config.timezone,
    }).format(d);
  }

  formatRelativeTime(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return this.formatDate(d);
  }

  formatOdds(american: number): string {
    return american > 0 ? `+${american}` : `${american}`;
  }

  getTimezone(): string {
    return this.config.timezone;
  }

  getCurrency(): string {
    return this.config.currency;
  }
}

export const i18n = new I18nService();
export type { SupportedLocale, LocaleConfig };
