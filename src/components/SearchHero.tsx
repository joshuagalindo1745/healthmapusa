import { useEffect, useState } from "react";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppState, PredictResponse } from "@/types";

interface Props {
  appState: AppState;
  error: string | null;
  lastResult: PredictResponse | null;
  onSubmit: (address: string) => void;
}

const LOADING_MESSAGES = [
  "Geocoding address…",
  "Running ML models…",
  "Generating AI analysis…",
];

export const SearchHero = ({ appState, error, lastResult, onSubmit }: Props) => {
  const [address, setAddress] = useState("");
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (appState !== "loading") return;
    setMsgIdx(0);
    const id = setInterval(() => setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length), 3000);
    return () => clearInterval(id);
  }, [appState]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address.trim() && appState !== "loading") onSubmit(address.trim());
  };

  return (
    <section className="bg-hero pt-28 pb-20 px-4 md:px-8">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-4">
          Powered by ML · 3,195 US Counties Analyzed
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
          Understand the health risks where you live.
        </h1>
        <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
          Enter any US address to get AI-powered health risk predictions based on your county's
          food environment, economic data, and demographics.
        </p>

        <form onSubmit={submit} className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:rounded-lg sm:shadow-card sm:border sm:border-border sm:bg-card sm:p-1.5">
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={appState === "loading"}
              placeholder="Enter your address (e.g. 123 Main St, Austin TX)"
              className="h-12 sm:border-0 sm:shadow-none sm:focus-visible:ring-0 text-base"
              aria-label="Address"
            />
            <Button
              type="submit"
              disabled={appState === "loading" || !address.trim()}
              className="h-12 px-6 font-semibold gap-2 shrink-0"
            >
              {appState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  Analyze Risk <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-3">
            Analysis takes 10–15 seconds · County-level data from USDA, CDC & Robert Wood Johnson Foundation
          </p>

          {appState === "loading" && (
            <p className="text-sm text-primary mt-4 font-medium animate-fade-in">
              {LOADING_MESSAGES[msgIdx]}
            </p>
          )}

          {lastResult && appState !== "loading" && (
            <p className="text-xs text-muted-foreground mt-4">
              Last searched: <span className="font-medium text-foreground">{lastResult.county}, {lastResult.state}</span>
            </p>
          )}

          {appState === "error" && error && (
            <div className="mt-6 mx-auto max-w-xl rounded-lg border border-destructive/30 bg-destructive-soft text-destructive-deep px-4 py-3 flex items-start gap-3 text-left animate-fade-in">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-sm">We couldn't analyze that address</p>
                <p className="text-sm mt-1">{error}</p>
                <button
                  type="button"
                  onClick={() => onSubmit(address.trim())}
                  disabled={!address.trim()}
                  className="text-sm font-semibold underline mt-2 hover:opacity-80 disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </section>
  );
};
