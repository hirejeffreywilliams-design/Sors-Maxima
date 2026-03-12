import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Database, BookOpen } from "lucide-react";

interface BookConfig {
  color: string;
  short: string;
  url?: string;
}

const BOOK_REGISTRY: Record<string, BookConfig> = {
  // US Tier 1 — major operators (keyed by display name AND API key)
  "DraftKings":              { color: "#53d338", short: "DK",   url: "https://www.draftkings.com" },
  "draftkings":              { color: "#53d338", short: "DK",   url: "https://www.draftkings.com" },
  "FanDuel":                 { color: "#1493ff", short: "FD",   url: "https://www.fanduel.com" },
  "fanduel":                 { color: "#1493ff", short: "FD",   url: "https://www.fanduel.com" },
  "BetMGM":                  { color: "#c8a951", short: "MGM",  url: "https://www.betmgm.com" },
  "betmgm":                  { color: "#c8a951", short: "MGM",  url: "https://www.betmgm.com" },
  "Caesars":                 { color: "#004f9f", short: "CZR",  url: "https://www.caesarssportsbook.com" },
  "caesars":                 { color: "#004f9f", short: "CZR",  url: "https://www.caesarssportsbook.com" },
  "ESPN BET":                { color: "#cc0000", short: "ESPN", url: "https://www.espnbet.com" },
  "espnbet":                 { color: "#cc0000", short: "ESPN", url: "https://www.espnbet.com" },
  "bet365":                  { color: "#027b5b", short: "365",  url: "https://www.bet365.com" },
  "bet365_us":               { color: "#027b5b", short: "365",  url: "https://www.bet365.com" },
  "Fanatics Sportsbook":     { color: "#c8102e", short: "FAN",  url: "https://sportsbook.fanatics.com" },
  "Fanatics":                { color: "#c8102e", short: "FAN",  url: "https://sportsbook.fanatics.com" },
  "fanatics":                { color: "#c8102e", short: "FAN",  url: "https://sportsbook.fanatics.com" },
  "Hard Rock Bet":           { color: "#b22222", short: "HR",   url: "https://www.hardrockbet.com" },
  "hardrockbet":             { color: "#b22222", short: "HR",   url: "https://www.hardrockbet.com" },
  // US Tier 2 — established mid-size books
  "BetRivers":               { color: "#003087", short: "BR",   url: "https://www.betrivers.com" },
  "betrivers":               { color: "#003087", short: "BR",   url: "https://www.betrivers.com" },
  "PointsBet (US)":          { color: "#cc0000", short: "PB",   url: "https://www.pointsbet.com" },
  "PointsBet":               { color: "#cc0000", short: "PB",   url: "https://www.pointsbet.com" },
  "pointsbet_us":            { color: "#cc0000", short: "PB",   url: "https://www.pointsbet.com" },
  "pointsbet":               { color: "#cc0000", short: "PB",   url: "https://www.pointsbet.com" },
  "Unibet (US)":             { color: "#147b45", short: "UNI",  url: "https://www.unibet.com" },
  "Unibet":                  { color: "#147b45", short: "UNI",  url: "https://www.unibet.com" },
  "unibet_us":               { color: "#147b45", short: "UNI",  url: "https://www.unibet.com" },
  "unibet":                  { color: "#147b45", short: "UNI",  url: "https://www.unibet.com" },
  "WynnBET":                 { color: "#b08d57", short: "WYN",  url: "https://www.wynnbet.com" },
  "wynnbet":                 { color: "#b08d57", short: "WYN",  url: "https://www.wynnbet.com" },
  "BetParx":                 { color: "#4a0e8f", short: "BPX",  url: "https://www.betparx.com" },
  "betparx":                 { color: "#4a0e8f", short: "BPX",  url: "https://www.betparx.com" },
  "Bally Bet":               { color: "#e86428", short: "BLY",  url: "https://www.ballybet.com" },
  "ballybet":                { color: "#e86428", short: "BLY",  url: "https://www.ballybet.com" },
  "Betway":                  { color: "#00a651", short: "BTW",  url: "https://betway.com/en/sports" },
  "betway_us":               { color: "#00a651", short: "BTW",  url: "https://betway.com/en/sports" },
  "Circa Sports":            { color: "#0047ab", short: "CRC",  url: "https://www.circasports.com" },
  "circasports":             { color: "#0047ab", short: "CRC",  url: "https://www.circasports.com" },
  "Fliff":                   { color: "#2563eb", short: "FLF",  url: "https://www.getfliff.com" },
  "fliff":                   { color: "#2563eb", short: "FLF",  url: "https://www.getfliff.com" },
  "SuperDraft":              { color: "#005cde", short: "SD",   url: "https://www.superdraft.com" },
  "superdraft":              { color: "#005cde", short: "SD",   url: "https://www.superdraft.com" },
  "Barstool Sportsbook":     { color: "#d62828", short: "BST",  url: "https://www.barstoolsportsbook.com" },
  "Barstool":                { color: "#d62828", short: "BST",  url: "https://www.barstoolsportsbook.com" },
  "barstool":                { color: "#d62828", short: "BST",  url: "https://www.barstoolsportsbook.com" },
  // Sharp / offshore reference books
  "Pinnacle":                { color: "#8b1a2e", short: "PIN",  url: "https://www.pinnacle.com" },
  "pinnacle":                { color: "#8b1a2e", short: "PIN",  url: "https://www.pinnacle.com" },
  "Betfair Exchange":        { color: "#f5a623", short: "BFX",  url: "https://www.betfair.com" },
  "Betfair Exchange (UK)":   { color: "#f5a623", short: "BFX",  url: "https://www.betfair.com" },
  "Betfair Exchange (EU)":   { color: "#f5a623", short: "BFX",  url: "https://www.betfair.com" },
  "betfair_ex_uk":           { color: "#f5a623", short: "BFX",  url: "https://www.betfair.com" },
  "betfair_ex_eu":           { color: "#f5a623", short: "BFX",  url: "https://www.betfair.com" },
  "BetOnline.ag":            { color: "#1e66ac", short: "BOL",  url: "https://www.betonline.ag" },
  "BetOnline":               { color: "#1e66ac", short: "BOL",  url: "https://www.betonline.ag" },
  "betonlineag":             { color: "#1e66ac", short: "BOL",  url: "https://www.betonline.ag" },
  "MyBookie.ag":             { color: "#b58e3f", short: "MBK",  url: "https://www.mybookie.ag" },
  "MyBookie":                { color: "#b58e3f", short: "MBK",  url: "https://www.mybookie.ag" },
  "mybookie_ag":             { color: "#b58e3f", short: "MBK",  url: "https://www.mybookie.ag" },
  "LowVig.ag":               { color: "#374151", short: "LVG",  url: "https://www.lowvig.ag" },
  "LowVig":                  { color: "#374151", short: "LVG",  url: "https://www.lowvig.ag" },
  "lowvig_ag":               { color: "#374151", short: "LVG",  url: "https://www.lowvig.ag" },
  "Bookmaker":               { color: "#1f2937", short: "BKM",  url: "https://www.bookmaker.eu" },
  "bookmaker_eu":            { color: "#1f2937", short: "BKM",  url: "https://www.bookmaker.eu" },
  "BetCris":                 { color: "#005f73", short: "BTC",  url: "https://www.betcris.com" },
  "betcris":                 { color: "#005f73", short: "BTC",  url: "https://www.betcris.com" },
};

function getBookConfig(book: string): BookConfig {
  return BOOK_REGISTRY[book] ?? { color: "#6b7280", short: book.substring(0, 3).toUpperCase() };
}

function formatOdds(odds: number): string {
  if (!odds) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function BookBadge({ book, odds, isBest }: { book: string; odds: number; isBest?: boolean }) {
  const cfg = getBookConfig(book);
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-bold shrink-0"
      style={{
        background: isBest ? `${cfg.color}18` : "rgba(255,255,255,0.04)",
        borderColor: isBest ? `${cfg.color}45` : "rgba(255,255,255,0.08)",
        color: isBest ? cfg.color : "rgba(255,255,255,0.5)",
      }}
      title={`${book}: ${formatOdds(odds)}`}
    >
      {isBest && <span className="w-1 h-1 rounded-full mr-0.5 shrink-0" style={{ background: cfg.color }} />}
      <span>{cfg.short}</span>
      <span className="tabular-nums">{formatOdds(odds)}</span>
    </div>
  );
}

interface OddsAttributionProps {
  oddsSourceBook?: string;
  oddsBookCount?: number;
  oddsApiSource?: string;
  allBookOdds?: { book: string; odds: number }[];
  compact?: boolean;
}

export function OddsAttribution({
  oddsSourceBook,
  oddsBookCount,
  oddsApiSource,
  allBookOdds,
  compact = false,
}: OddsAttributionProps) {
  const [expanded, setExpanded] = useState(false);

  const hasRealData = oddsApiSource === "the-odds-api" && oddsBookCount && oddsBookCount > 0;

  if (!hasRealData) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <Database className="w-2.5 h-2.5 text-white/20 shrink-0" />
        <span className="text-[8px] text-white/20 font-medium">ESPN-derived odds</span>
      </div>
    );
  }

  const bestBook = allBookOdds?.[0];

  if (compact) {
    return (
      <div className="mt-1 space-y-1">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="flex items-center gap-1.5 flex-wrap group w-full text-left"
          data-testid="btn-odds-attribution-compact-toggle"
        >
          <div className="flex items-center gap-1">
            <BookOpen className="w-2.5 h-2.5 text-blue-400/60 shrink-0" />
            <span className="text-[8px] font-bold text-blue-400/70 group-hover:text-blue-400 transition-colors">The Odds API</span>
          </div>
          {bestBook && (
            <BookBadge book={bestBook.book} odds={bestBook.odds} isBest />
          )}
          {oddsBookCount && oddsBookCount > 1 && (
            <span className="text-[7px] text-white/25">+{oddsBookCount - 1} more</span>
          )}
          <span className="text-white/20 group-hover:text-white/40 transition-colors ml-auto">
            {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
          </span>
        </button>
        {expanded && allBookOdds && allBookOdds.length > 0 && (
          <div className="pl-4 space-y-1">
            <div className="flex flex-wrap gap-1">
              {allBookOdds.map((b, i) => (
                <BookBadge key={b.book} book={b.book} odds={b.odds} isBest={i === 0} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-1.5 space-y-1">
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
        className="flex items-center gap-1.5 w-full text-left group"
        data-testid="btn-odds-attribution-toggle"
      >
        <BookOpen className="w-2.5 h-2.5 text-blue-400/60 shrink-0" />
        <span className="text-[8px] font-bold text-blue-400/70 group-hover:text-blue-400 transition-colors">
          The Odds API
        </span>
        {bestBook && (
          <>
            <span className="text-[7px] text-white/20">·</span>
            <span className="text-[8px] font-bold text-white/40">
              Best: {getBookConfig(bestBook.book).short} ({formatOdds(bestBook.odds)})
            </span>
          </>
        )}
        {oddsBookCount && oddsBookCount > 0 && (
          <>
            <span className="text-[7px] text-white/20">·</span>
            <span className="text-[7px] text-white/25">{oddsBookCount} books</span>
          </>
        )}
        <span className="ml-auto text-white/20 group-hover:text-white/40 transition-colors">
          {expanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </span>
      </button>

      {expanded && allBookOdds && allBookOdds.length > 0 && (
        <div className="pl-4 space-y-1">
          <p className="text-[7px] font-bold uppercase tracking-widest text-white/20 mb-1">Where to place this bet</p>
          <div className="flex flex-wrap gap-1">
            {allBookOdds.map((b, i) => (
              <BookBadge key={b.book} book={b.book} odds={b.odds} isBest={i === 0} />
            ))}
          </div>
          <p className="text-[7px] text-white/20 mt-1 flex items-center gap-1">
            <ExternalLink className="w-2 h-2" />
            Odds sourced live from The Odds API · {new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
      )}
    </div>
  );
}
