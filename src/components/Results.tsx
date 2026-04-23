import { AlertTriangle } from "lucide-react";
import { CONDITION_ORDER, type PredictResponse } from "@/types";
import { RiskCard } from "./RiskCard";
import { AIAnalysis } from "./AIAnalysis";
import { EnvironmentGrid } from "./EnvironmentGrid";

interface Props {
  data: PredictResponse;
}

export const Results = ({ data }: Props) => {
  const highCount = data.high_risk_conditions.length;
  return (
    <section id="results" className="max-w-6xl mx-auto px-4 md:px-8 py-12 animate-fade-in space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold">
            {data.county} County, {data.state}
          </h2>
          <p className="text-muted-foreground mt-1">
            Based on county-level data from federal health databases
          </p>
        </div>
        <div className={
          highCount > 0
            ? "text-sm font-semibold text-destructive-deep bg-destructive-soft px-3 py-2 rounded-md"
            : "text-sm font-semibold text-primary-deep bg-primary-soft px-3 py-2 rounded-md"
        }>
          {highCount > 0
            ? `${highCount} ${highCount === 1 ? "condition" : "conditions"} flagged HIGH RISK`
            : "All conditions low risk"}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CONDITION_ORDER.map((name, i) => {
          const r = data.predictions[name];
          if (!r) return null;
          return <RiskCard key={name} name={name} result={r} delayMs={i * 75} />;
        })}
      </div>

      {highCount > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive-soft px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive-deep mt-0.5 shrink-0" />
          <p className="text-sm text-destructive-deep">
            <span className="font-semibold">{data.high_risk_conditions.join(" and ")}</span>{" "}
            flagged as high risk in your county. See the AI analysis below for specific recommendations.
          </p>
        </div>
      )}

      <AIAnalysis text={data.ai_analysis} />
      <EnvironmentGrid county={data.county} state={data.state} env={data.environment} />
    </section>
  );
};
