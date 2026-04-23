import { useCallback, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SearchHero } from "@/components/SearchHero";
import { Results } from "@/components/Results";
import { ResultsSkeleton } from "@/components/ResultsSkeleton";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import type { AppState, PredictResponse } from "@/types";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("idle");
  const [data, setData] = useState<PredictResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (address: string) => {
    setAppState("loading");
    setError(null);

    try {
      const { data: json, error: fnError } = await supabase.functions.invoke<PredictResponse>(
        "predict",
        { body: { address } },
      );

      if (fnError) {
        // FunctionsHttpError exposes the response on .context
        let detail = fnError.message;
        const ctx = (fnError as unknown as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          try {
            const j = await ctx.json();
            if (j?.detail) detail = j.detail;
          } catch { /* noop */ }
        }
        setError(detail);
        setAppState("error");
        return;
      }

      if (!json) {
        setError("Empty response from server.");
        setAppState("error");
        return;
      }

      setData(json);
      setAppState("success");
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch {
      setError("Network error. Please try again.");
      setAppState("error");
    }
  }, []);

  return (
    <div id="top" className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <SearchHero
          appState={appState}
          error={error}
          lastResult={data}
          onSubmit={handleSubmit}
        />

        {appState === "loading" && <ResultsSkeleton />}
        {appState === "success" && data && <Results data={data} />}

        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
