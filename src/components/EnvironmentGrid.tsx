import { cn } from "@/lib/utils";
import type { Environment } from "@/types";

interface Props {
  county: string;
  state: string;
  env: Environment;
}

interface StatDef {
  key: keyof Environment;
  label: string;
  desc: string;
  format: (v: number) => string;
  isAlert?: (v: number, env: Environment) => boolean;
}

const currency = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const STATS: StatDef[] = [
  { key: "median_income", label: "Median Income", desc: "Median household income", format: currency },
  { key: "poverty_rate", label: "Poverty Rate", desc: "Adults below poverty line", format: (v) => `${v.toFixed(1)}%`, isAlert: (v) => v > 15 },
  { key: "food_insecurity_pct", label: "Food Insecurity", desc: "Households food insecure", format: (v) => `${v.toFixed(1)}%` },
  { key: "food_environment_index", label: "Food Env. Index", desc: "Food environment score (10 = best)", format: (v) => `${v.toFixed(1)} / 10`, isAlert: (v) => v < 6 },
  { key: "fast_food_density", label: "Fast Food Density", desc: "Fast food restaurants per 1,000 residents", format: (v) => `${v.toFixed(2)} per 1k`, isAlert: (v, e) => v > 0.5 && (e.grocery_density ?? 1) < 0.3 },
  { key: "grocery_density", label: "Grocery Density", desc: "Grocery stores per 1,000 residents", format: (v) => `${v.toFixed(2)} per 1k` },
  { key: "snap_participation", label: "SNAP Participation", desc: "SNAP benefit participation rate", format: (v) => `${v.toFixed(1)}%` },
  { key: "uninsured_pct", label: "Uninsured", desc: "Adults without health insurance", format: (v) => `${v.toFixed(1)}%`, isAlert: (v) => v > 15 },
  { key: "smoking_pct", label: "Smoking", desc: "Adults currently smoking", format: (v) => `${v.toFixed(1)}%` },
  { key: "insufficient_sleep_pct", label: "Insufficient Sleep", desc: "Adults reporting insufficient sleep", format: (v) => `${v.toFixed(1)}%` },
  { key: "rural_pct", label: "Rural Population", desc: "Rural population", format: (v) => `${v.toFixed(1)}%` },
];

export const EnvironmentGrid = ({ county, state, env }: Props) => {
  return (
    <section className="rounded-xl bg-card border border-border shadow-card p-6 md:p-8">
      <h2 className="text-xl font-semibold mb-1">Your County's Health Environment</h2>
      <p className="text-sm text-muted-foreground mb-6">
        {county} County, {state} — raw data inputs used by the model
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {STATS.map(({ key, label, desc, format, isAlert }) => {
          const value = env[key];
          const alert = value != null && isAlert?.(value, env);
          return (
            <div key={key} className="rounded-lg border border-border bg-background/60 p-4">
              <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase mb-1.5">
                {label}
              </p>
              <p className={cn(
                "text-xl font-bold tabular-nums mb-1",
                value == null ? "text-muted-foreground" : alert ? "text-destructive-deep" : "text-foreground",
              )}>
                {value == null ? "N/A" : format(value)}
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">{desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
