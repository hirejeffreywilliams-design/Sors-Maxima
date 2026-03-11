import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PageHeroStat {
  label: string;
  value: string | number;
  color?: "green" | "amber" | "blue" | "red" | "default";
}

export interface PageHeroProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  variant?: "default" | "gold" | "blue" | "violet";
  icon?: React.ReactNode;
  stats?: PageHeroStat[];
  actions?: React.ReactNode;
}

const variantStyles: Record<string, { outer: string; badge: string; icon: string; stat: string }> = {
  default: {
    outer: "page-hero",
    badge: "bg-primary/10 text-primary border-primary/20",
    icon: "text-primary",
    stat: "text-primary",
  },
  gold: {
    outer: "page-hero page-hero-gold",
    badge: "bg-amber-500/10 text-amber-500 border-amber-500/25",
    icon: "text-amber-500",
    stat: "text-amber-500",
  },
  blue: {
    outer: "page-hero page-hero-blue",
    badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/25",
    icon: "text-indigo-400",
    stat: "text-indigo-400",
  },
  violet: {
    outer: "page-hero page-hero-violet",
    badge: "bg-purple-500/10 text-purple-400 border-purple-500/25",
    icon: "text-purple-400",
    stat: "text-purple-400",
  },
};

const statColorMap: Record<string, string> = {
  green: "text-emerald-500 dark:text-emerald-400",
  amber: "text-amber-500",
  blue: "text-indigo-400",
  red: "text-red-500",
  default: "",
};

export function PageHero({
  title,
  subtitle,
  description,
  badge,
  variant = "default",
  icon,
  stats,
  actions,
  className,
  ...rest
}: PageHeroProps) {
  const styles = variantStyles[variant] ?? variantStyles.default;

  return (
    <div className={cn(styles.outer, className)} data-testid="page-hero" {...rest}>
      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          {badge && (
            <Badge
              variant="outline"
              className={cn("text-[10px] h-5 px-2 font-semibold tracking-wide uppercase", styles.badge)}
            >
              {badge}
            </Badge>
          )}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 gradient-heading">
            {icon && <span className={cn("shrink-0", styles.icon)}>{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{subtitle}</p>
          )}
          {description && (
            <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-2xl">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>

      {stats && stats.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 sm:gap-6 flex-wrap">
          {stats.map((stat, i) => (
            <div key={i} className="flex flex-col min-w-[56px]">
              <span
                className={cn(
                  "text-lg font-black stat-number leading-none",
                  stat.color ? statColorMap[stat.color] : styles.stat
                )}
              >
                {stat.value}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
