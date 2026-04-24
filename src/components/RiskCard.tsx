import { cn } from "@/lib/utils";
import type { ConditionResult } from "@/types";

interface Props {
  name: string;
  result: ConditionResult;
  delayMs?: number;
}

const fmtPct = (v: number | null) => (v == null ? "N/A" : `${v.toFixed(1)}%`);

export const RiskCard = ({ name, result, delayMs = 0 }: Props) => {
  const isHigh = result.risk_level === "HIGH";
  const max = result.threshold * 1.5;
  const fillPct = Math.min((result.predicted / max) * 100, 100);
  const tickPct = (result.threshold / max) * 100;

  return (
    <article
      className={cn(
        "relative rounded-xl bg-card shadow-card hover:shadow-card-hover transition-base overflow-hidden animate-fade-in-up",
        "border border-border",
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          isHigh ? "bg-destructive" : "bg-primary",
        )}
      />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-base">{name}</h3>
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-md tracking-wide whitespace-nowrap",
              isHigh
                ? "bg-destructive-soft text-destructive-deep"
                : "bg-primary-soft text-primary-deep",
            )}
          >
            {isHigh ? "ABOVE BENCHMARK" : "BELOW BENCHMARK"}
          </span>
        </div>

        <div
          className={cn(
            "text-4xl font-bold mb-4 tabular-nums",
            isHigh ? "text-destructive-deep" : "text-primary-deep",
          )}
        >
          {result.predicted.toFixed(1)}
          <span className="text-2xl font-semibold">%</span>
        </div>

        <div className="relative mb-1">
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full animate-progress",
                isHigh ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          <div
            className="absolute top-[-3px] h-[14px] w-px bg-foreground/60"
            style={{ left: `${tickPct}%` }}
            aria-hidden
          />
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          benchmark: {result.threshold.toFixed(1)}%
        </p>

        {result.actual != null && (
          <div className="text-[13px] text-muted-foreground mb-3">
            County value: <span className="text-foreground font-medium">{fmtPct(result.actual)}</span>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground/80 border-t border-border pt-2 flex items-center justify-between gap-2 tabular-nums">
          <span>
            R² <span className="text-foreground font-medium">{result.r2.toFixed(3)}</span>
          </span>
          <span>
            p <span className="text-foreground font-medium">
              {result.p_value < 0.001 ? "< 0.001" : result.p_value.toFixed(3)}
            </span>
          </span>
          <span>n = {result.n.toLocaleString()}</span>
        </div>
      </div>
    </article>
  );
};
