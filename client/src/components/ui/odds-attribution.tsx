import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Database, BookOpen } from "lucide-react";

const BOOK_COLORS: Record<string, string> = {
  "DraftKings":   "#53d338",
  "FanDuel":      "#1493ff",
  "BetMGM":       "#c8a951",
  "Caesars":      "#004f9f",
  "PointsBet":    "#c8102e",
  "BetRivers":    "#003087",
  "WynnBET":      "#9a7c4d",
  "Unibet":       "#147b45",
  "Barstool":     "#d62828",
  "ESPN Bet":     "#cc0000",
  "bet365":       "#027b5b",
  "Hard Rock":    "#1a1a1a",
};

const BOOK_SHORT: Record<string, string> = {
  "DraftKings":   "DK",
  "FanDuel":      "FD",
  "BetMGM":       "MGM",
  "Caesars":      "CZR",
  "PointsBet":    "PB",
  "BetRivers":    "BR",
  "WynnBET":      "WYN",
  "Unibet":       "UNI",
  "Barstool":     "BST",
  "ESPN Bet":     "ESPN",
  "bet365":       "365",
  "Hard Rock":    "HR",
};

function formatOdds(odds: number): string {
  if (!odds) return "—";
  return odds > 0 ? `+${odds}` : `${odds}`;
}

function BookBadge({ book, odds, isBest }: { book: string; odds: number; isBest?: boolean }) {
  const color = BOOK_COLORS[book] ?? "#6b7280";
  const shortName = BOOK_SHORT[book] ?? book.split(" ")[0];
  return (
    <div
      className="flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-bold shrink-0"
      style={{
        background: isBest ? `${color}18` : "rgba(255,255,255,0.04)",
        borderColor: isBest ? `${color}45` : "rgba(255,255,255,0.08)",
        color: isBest ? color : "rgba(255,255,255,0.5)",
      }}
      title={`${book}: ${formatOdds(odds)}`}
    >
      {isBest && <span className="w-1 h-1 rounded-full mr-0.5 shrink-0" style={{ background: color }} />}
      <span>{shortName}</span>
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
  const otherBooks = allBookOdds?.slice(1, 4) ?? [];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <div className="flex items-center gap-1">
          <BookOpen className="w-2.5 h-2.5 text-blue-400/60 shrink-0" />
          <span className="text-[8px] font-bold text-blue-400/70">The Odds API</span>
        </div>
        {bestBook && (
          <BookBadge book={bestBook.book} odds={bestBook.odds} isBest />
        )}
        {oddsBookCount && oddsBookCount > 1 && (
          <span className="text-[7px] text-white/25">+{oddsBookCount - 1} more</span>
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
              Best: {BOOK_SHORT[bestBook.book] ?? bestBook.book} ({formatOdds(bestBook.odds)})
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
